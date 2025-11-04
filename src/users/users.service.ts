import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { uploadToFirebase } from 'src/util/cloud_storage';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 🔹 Crear usuario
// 🔹 Crear usuario con rol por defecto
async create(user: CreateUserDto) {
  try {
    // Crear usuario
    const newUser = this.userRepository.create(user);
    const savedUser = await this.userRepository.save(newUser);

    // Contar usuarios existentes
    const totalUsers = await this.userRepository.count();

    // Si es el primero => ADMIN (1), sino => CLIENT (2)
    const roleId = totalUsers === 1 ? '1' : '2';

    // Asignar rol en la tabla pivote
    await this.userRepository
      .createQueryBuilder()
      .relation(User, 'roles')
      .of(savedUser)
      .add(roleId);

    // Retornar usuario con sus roles
    return this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['roles'],
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw new HttpException(
      'Error al crear el usuario',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}


  // 🔹 Listar todos los usuarios
  async findAll() {
    return this.userRepository.find({ relations: ['roles'] });
  }

  // 🔹 Buscar usuario por ID
  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  // 🔹 Actualizar usuario sin imagen
  async update(id: number, user: UpdateUserDto) {
    const userFound = await this.userRepository.findOneBy({ id });

    if (!userFound) {
      throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
    }

    const updatedUser = Object.assign(userFound, user);
    return this.userRepository.save(updatedUser);
  }

  // 🔹 Actualizar usuario con imagen (subida a Firebase)
  async updateWithImage(
    file: Express.Multer.File,
    id: number,
    user: UpdateUserDto,
  ) {
    try {
      const url = await uploadToFirebase(file, 'users/');
      console.log('URL Firebase:', url);

      if (!url) {
        throw new HttpException(
          'La imagen no se pudo guardar en Firebase',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const userFound = await this.userRepository.findOneBy({ id });
      if (!userFound) {
        throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
      }

      user.image = url;
      const updatedUser = Object.assign(userFound, user);
      const savedUser = await this.userRepository.save(updatedUser);

      console.log('Usuario actualizado:', savedUser);
      return savedUser;
    } catch (error) {
      console.error('Error en updateWithImage:', error);
      throw new HttpException(
        'Error al actualizar usuario con imagen',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
