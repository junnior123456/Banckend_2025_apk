import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { uploadToFirebase } from 'src/util/cloud_storage';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Borra la cuenta del usuario y todo lo suyo. Google Play lo exige a toda app
   * con registro, y la Ley 29733 lo llama derecho de cancelación.
   *
   * Corre dentro de la transacción de la petición (el interceptor de RLS ya la
   * abrió), así que o se borra todo o no se borra nada.
   *
   * Se eleva a contexto de sistema porque hay que tocar filas de OTROS usuarios:
   * las notificaciones del tipo "fulano comentó tu publicación" viven en el buzón
   * ajeno, y las políticas de RLS —con razón— no dejan al usuario tocarlas.
   */
  async deleteOwnAccount(userId: number): Promise<{ ok: boolean; message: string }> {
    const em = this.dataSource.manager;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    // Elevación deliberada y acotada a esta transacción (SET LOCAL).
    await em.query("SELECT set_config('app.system', 'on', true)");

    const mascotas = `(SELECT id FROM pets WHERE "userId" = $1)`;

    // 1) Todo lo que cuelga de SUS mascotas.
    await em.query(
      `DELETE FROM vaccine_reminder_log WHERE "vaccinationId" IN
         (SELECT id FROM pet_vaccinations WHERE "petId" IN ${mascotas})`,
      [userId],
    );
    for (const tabla of [
      'pet_vaccinations',
      'pet_weights',
      'pet_allergies',
      'pet_medications',
      'pet_medical_records',
      'pet_document',
      'pet_images',
      'pet_like',
      'comments',
      'adoption_requests',
      'notifications',
      'pet_transfer',
    ]) {
      await em.query(`DELETE FROM ${tabla} WHERE "petId" IN ${mascotas}`, [userId]);
    }

    // 2) Lo suyo repartido por otras tablas.
    await em.query(`DELETE FROM comments WHERE "userId" = $1`, [userId]);
    await em.query(`DELETE FROM pet_like WHERE "userId" = $1`, [userId]);
    await em.query(`DELETE FROM adoption_requests WHERE "adopterId" = $1`, [userId]);
    await em.query(`DELETE FROM notifications WHERE "userId" = $1 OR "fromUserId" = $1`, [userId]);
    await em.query(`DELETE FROM donations WHERE "userId" = $1`, [userId]);
    await em.query(`DELETE FROM reports WHERE "reporterId" = $1`, [userId]);
    // Los reportes que él MODERÓ no se borran (son de otros): se desvincula.
    await em.query(`UPDATE reports SET "reviewedById" = NULL WHERE "reviewedById" = $1`, [userId]);
    await em.query(`DELETE FROM veterinaria WHERE "ownerUserId" = $1`, [userId]);
    await em.query(`DELETE FROM vet_request WHERE "userId" = $1`, [userId]);
    await em.query(
      `DELETE FROM pet_transfer WHERE "fromUserId" = $1 OR "toUserId" = $1`,
      [userId],
    );

    // 3) Sus mascotas, sus roles y él.
    await em.query(`DELETE FROM pets WHERE "userId" = $1`, [userId]);
    await em.query(`DELETE FROM user_has_roles WHERE id_user = $1`, [userId]);
    await em.query(`DELETE FROM users WHERE id = $1`, [userId]);

    this.logger.log(`Cuenta ${userId} eliminada a petición del propio usuario`);
    return { ok: true, message: 'Tu cuenta y tus datos han sido eliminados' };
  }

  // 🔹 Crear usuario
// 🔹 Crear usuario con rol por defecto
async create(user: CreateUserDto) {
  try {
    // El password lo hashea el hook @BeforeInsert de la entidad User
    // (NO hashear aquí: sería doble hash y el login fallaría).
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

  // 🔹 Cambiar el rol de un usuario (usado por el ADMIN para promover a VET).
  //    roleId: '1'=ADMIN, '2'=CLIENT, '3'=VET. Reemplaza los roles actuales.
  async setRole(userId: number, roleId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    const rolesToRemove = user.roles
      .map((r) => r.id)
      .filter((id) => id !== roleId);
    await this.userRepository
      .createQueryBuilder()
      .relation(User, 'roles')
      .of(userId)
      .addAndRemove([roleId], rolesToRemove);
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
  }
}
