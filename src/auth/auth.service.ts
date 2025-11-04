import { Injectable,HttpException,HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { In, Repository } from 'typeorm';
import { registerAuthDto } from './dto/register-auth-dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import {compare} from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from 'src/roles/rol.entity';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Rol) private rolesRepository: Repository<Rol>,

        private jwtService: JwtService
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

   

}
