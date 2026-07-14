import { Injectable,HttpException,HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { In, Repository } from 'typeorm';
import { registerAuthDto } from './dto/register-auth-dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from 'src/roles/rol.entity';
import { randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Rol) private rolesRepository: Repository<Rol>,
        private jwtService: JwtService,
        @Inject(forwardRef(() => NotificationsService))
        private notificationsService: NotificationsService
        ){}
        
        async register(user: registerAuthDto) {

            const { email, phone } = user;
            const emailExist = await this.userRepository.findOneBy({ email: email })
    
            if (emailExist) {
                // 409 CONFLICT
                throw new HttpException('El email ya esta registrado', HttpStatus.CONFLICT);
            }
    
            const phoneExist = await this.userRepository.findOneBy({phone: phone});
    
            if (phoneExist) {
                throw new HttpException('El telefono ya esta registrado', HttpStatus.CONFLICT);
            }
    
            const newUser = this.userRepository.create(user);
            const userSaved = await this.userRepository.save(newUser);

            // Contar usuarios existentes para determinar el rol
            const totalUsers = await this.userRepository.count();
            
            // El rol NUNCA se toma del cuerpo del registro: dejar que el cliente
            // mande `rolesIds` era una escalada directa a ADMIN. El registro
            // público siempre asigna el rol automático: primer usuario = ADMIN
            // (arranque del sistema), el resto = CLIENT. Cambiar de rol es una
            // acción de administrador, por otra ruta autenticada.
            const rolesIds: string[] = [totalUsers === 1 ? '1' : '2']; // 1=ADMIN, 2=CLIENT
            
            const roles = await this.rolesRepository.findBy({ id: In(rolesIds) });
            userSaved.roles = roles;
    
            // Guardar la relación de roles
            await this.userRepository.save(userSaved);
    
            // 🎉 Enviar notificación de bienvenida
            try {
                await this.notificationsService.sendWelcomeNotification(
                    userSaved.id,
                    userSaved.name
                );
                console.log(`✅ Notificación de bienvenida enviada a: ${userSaved.name}`);
            } catch (error) {
                console.error('❌ Error enviando notificación de bienvenida:', error);
                // No lanzar error, el registro fue exitoso
            }
    
            const rolesString = userSaved.roles.map(rol => rol.id); //['CLIENT', 'ADMIN']
            const payload = { id: userSaved.id, name: userSaved.name, roles: rolesString };
            const token = this.jwtService.sign(payload);
            const data = {
                user: userSaved,
                token: 'Bearer ' + token
            }
            delete data.user.password;
            return data;
        }
    
   async login(loginData: LoginAuthDto) {

    const { email, password } = loginData;
    const userFound = await this.userRepository.findOne({ 
        where: { email: email },
        relations: ['roles']
     })
    if (!userFound) {
        throw new HttpException('El email no existe', HttpStatus.NOT_FOUND);
    }
    
    const isPasswordValid = await compare(password, userFound.password);
    if (!isPasswordValid) {
        console.log('PASSWORD INCORRECTO');
        
        // 403 FORBITTEN access denied
        throw new HttpException('La contraseña es incorrecta', HttpStatus.FORBIDDEN);
    }

    const rolesIds = userFound.roles.map(rol => rol.id); //['CLIENT', 'ADMIN']

    const payload = { 
        id: userFound.id, 
        name: userFound.name, 
        roles: rolesIds 
    };
    const token = this.jwtService.sign(payload);
    const data = {
        user: userFound,
        token: 'Bearer ' + token
    }

    delete data.user.password;

    return data;
}

    // 🔍 Verificar si un correo ya existe
    async checkEmail(email: string) {
        const user = await this.userRepository.findOne({
            where: { email: email.toLowerCase().trim() },
        });

        return {
            exists: !!user,
            message: user ? 'El correo ya está registrado' : 'El correo está disponible',
        };
    }

    // 🔐 Solicitar recuperación de contraseña
    async requestPasswordReset(email: string) {
        const user = await this.userRepository.findOne({ 
            where: { email: email.toLowerCase().trim() } 
        });

        // Por seguridad, NO revelamos si el correo existe o no
        if (!user) {
            return {
                success: true,
                message: 'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
            };
        }

        // Generar token único de 32 bytes
        const token = randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1); // Token válido por 1 hora

        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;

        await this.userRepository.save(user);

        const resetLink = `pawfinder://reset-password?token=${token}`;

        // El token se ENTREGA POR CORREO al dueño de la cuenta. NUNCA se devuelve
        // en la respuesta: hacerlo permitía tomar cualquier cuenta con solo su
        // email (quien pedía el reseteo recibía el token aunque no fuera suyo).
        await this.enviarCorreoReseteo(user.email, resetLink, token);

        // Respuesta genérica idéntica exista o no el correo: no filtrar qué
        // emails están registrados.
        return {
            success: true,
            message: 'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
        };
    }

    /**
     * Envía el enlace de reseteo por correo (Gmail SMTP vía nodemailer).
     * Config en .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
     * Si no está configurado, NO se cae el flujo: se registra un aviso y la
     * petición responde igual (genérica). Así el reseteo queda seguro desde ya
     * y empieza a entregar en cuanto se rellenen las credenciales.
     */
    private async enviarCorreoReseteo(to: string, resetLink: string, token: string): Promise<void> {
        const host = process.env.SMTP_HOST;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!host || !user || !pass) {
            console.warn('⚠️  SMTP no configurado: no se pudo enviar el correo de reseteo. Rellenar SMTP_* en .env.');
            return;
        }
        try {
            const port = Number(process.env.SMTP_PORT) || 587;
            const transport = createTransport({
                host,
                port,
                secure: port === 465, // 465 = TLS directo; 587 = STARTTLS
                auth: { user, pass },
            });
            await transport.sendMail({
                from: process.env.SMTP_FROM || `PawFinder <${user}>`,
                to,
                subject: 'Recupera tu contraseña de PawFinder',
                text:
                    `Recibimos una solicitud para restablecer tu contraseña.\n\n` +
                    `Abre este enlace desde tu móvil con PawFinder instalado:\n${resetLink}\n\n` +
                    `O introduce este código en la app:\n${token}\n\n` +
                    `El enlace caduca en 1 hora. Si no fuiste tú, ignora este correo.`,
                html:
                    `<p>Recibimos una solicitud para restablecer tu contraseña.</p>` +
                    `<p><a href="${resetLink}">Restablecer mi contraseña</a></p>` +
                    `<p>O introduce este código en la app:<br><code>${token}</code></p>` +
                    `<p>El enlace caduca en 1 hora. Si no fuiste tú, ignora este correo.</p>`,
            });
            console.log('📧 Correo de reseteo enviado a:', to);
        } catch (e) {
            // No revelar al cliente si el envío falló (podría delatar el email).
            console.error('❌ Error enviando correo de reseteo:', e?.message || e);
        }
    }

    // 🔄 Resetear contraseña con token
    async resetPassword(token: string, newPassword: string) {
        const user = await this.userRepository.findOne({
            where: { resetPasswordToken: token },
        });

        if (!user) {
            throw new HttpException(
                'Token inválido o expirado',
                HttpStatus.BAD_REQUEST,
            );
        }

        // Verificar si el token ha expirado
        if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
            throw new HttpException(
                'El token ha expirado. Solicita uno nuevo.',
                HttpStatus.BAD_REQUEST,
            );
        }

        // Encriptar la nueva contraseña
        const saltRounds = Number(process.env.HASH_SALT) || 10;
        user.password = await hash(newPassword, saltRounds);

        // Limpiar tokens de reseteo
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await this.userRepository.save(user);

        console.log('✅ Contraseña actualizada para usuario:', user.email);

        return {
            success: true,
            message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
        };
    }

}


