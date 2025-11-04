import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { RolesService } from './roles.service';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';

@Controller('roles')
export class RolesController {

    constructor(private rolesService: RolesService) {}

    // 🔹 Listar todos los roles
    @Get()
    findAll() {
        return this.rolesService.findAll();
    }

    // 🔹 Crear nuevo rol
    /*@HasRoles(JwtRole.ADMIN)
    @UseGuards(JwtAuthGuard, JwtRolesGuard)*/
    @Post()
    create(@Body() rol: CreateRolDto) {
        return this.rolesService.create(rol);
    }
}
