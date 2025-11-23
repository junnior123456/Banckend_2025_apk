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
            
            let rolesIds = [];
            
            if (user.rolesIds !== undefined && user.rolesIds !== null) { 
                // Si se especifican roles manualmente
                rolesIds = user.rolesIds;
            } else {
                // Lógica automática: primer usuario = ADMIN, resto = CLIENT
                rolesIds.push(totalUsers === 1 ? '1' : '2'); // 1=ADMIN, 2=CLIENT
            }
            
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

        console.log('🔐 Token de reseteo generado para:', email);
        console.log('🔗 Link de reseteo:', resetLink);
        console.log('⏰ Expira en:', expires);

        return {
            success: true,
            message: 'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
            // 👇 Para desarrollo/demo
            tokenDemo: token,
            resetLinkDemo: resetLink,
            expiresAt: expires,
        };
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


