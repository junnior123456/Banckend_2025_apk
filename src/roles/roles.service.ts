import { Injectable, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from './rol.entity';
import { CreateRolDto } from './dto/create-rol.dto';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Rol)
    private readonly roleRepository: Repository<Rol>,
  ) {}

  // 🔹 Se ejecuta automáticamente al iniciar la app
  async onModuleInit() {
    await this.ensureDefaultRoles();
  }

  // 🔹 Crear manualmente un nuevo rol (POST /api/roles)
  async create(rol: CreateRolDto) {
    try {
      const existing = await this.roleRepository.findOne({
        where: { name: rol.name },
      });

      if (existing) {
        throw new HttpException('El rol ya existe', HttpStatus.CONFLICT);
      }

      const newRol = this.roleRepository.create({
        name: rol.name.toUpperCase(),
        image: rol.image ?? '',
        route: rol.route ?? '',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedRol = await this.roleRepository.save(newRol);
      return savedRol;
    } catch (error) {
      console.error('Error al crear rol:', error);
      throw new HttpException('Error al crear rol', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 🔹 Crea los roles ADMIN y CLIENT si no existen (al iniciar)
  async ensureDefaultRoles() {
    const existingRoles = await this.roleRepository.find();
    if (existingRoles.length === 0) {
      const admin = this.roleRepository.create({
        id: '1',
        name: 'ADMIN',
        image: '',
        route: '',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const client = this.roleRepository.create({
        id: '2',
        name: 'CLIENT',
        image: '',
        route: '',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await this.roleRepository.save([admin, client]);
      console.log('✅ Roles ADMIN y CLIENT creados automáticamente.');
    } else {
      console.log('⚙️ Los roles ya existen, no se crean de nuevo.');
    }
  }

  // 🔹 Listar todos los roles
  async findAll() {
    return this.roleRepository.find();
  }
}
