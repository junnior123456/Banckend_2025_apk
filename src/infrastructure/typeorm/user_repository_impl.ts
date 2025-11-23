import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { UserRepository, USER_REPOSITORY } from '../../domain/users/user_repository.interface';
import { uploadToFirebase } from '../../util/cloud_storage';
import { getRepositoryToken } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly userRepository: Repository<User>) {}

  async create(data: any): Promise<User> {
    try {
      const newUser = this.userRepository.create(data);
      const savedUser = await this.userRepository.save(newUser);

      const totalUsers = await this.userRepository.count();
      const roleId = totalUsers === 1 ? '1' : '2';

      await this.userRepository
        .createQueryBuilder()
        .relation(User, 'roles')
        .of(savedUser)
        .add(roleId);

      const userWithRoles = await this.userRepository.findOne({
        where: { id: (savedUser as any).id },
        relations: ['roles'],
      });
      return userWithRoles;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw new HttpException('Error al crear el usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['roles'] });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['roles'] });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async update(id: number, data: any): Promise<User> {
    const userFound = await this.userRepository.findOneBy({ id });
    if (!userFound) {
      throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
    }
    const updatedUser = Object.assign(userFound, data);
    return this.userRepository.save(updatedUser);
  }

  async updateWithImage(file: Express.Multer.File, id: number, data: any): Promise<User> {
    try {
      const url = await uploadToFirebase(file, 'users/');
      if (!url) {
        throw new HttpException('La imagen no se pudo guardar en Firebase', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      const userFound = await this.userRepository.findOneBy({ id });
      if (!userFound) {
        throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
      }
      const updatedUser = Object.assign(userFound, { ...data, profileImage: url });
      return this.userRepository.save(updatedUser);
    } catch (error) {
      console.error('Error al actualizar usuario con imagen:', error);
      throw new HttpException('Error al actualizar el usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async delete(id: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
    }
    await this.userRepository.remove(user);
    return { message: 'Usuario eliminado exitosamente' };
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email }, relations: ['roles'] });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async assignRoleToUser(userId: number, roleId: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new HttpException('Usuario no existe', HttpStatus.NOT_FOUND);
    }
    await this.userRepository.createQueryBuilder().relation(User, 'roles').of(user).add(roleId);
  }
}

export const TypeOrmUserRepositoryProvider = {
  provide: USER_REPOSITORY,
  useFactory: (userRepository: Repository<User>) => {
    return new TypeOrmUserRepository(userRepository as Repository<User>);
  },
  inject: [getRepositoryToken(User)],
};
