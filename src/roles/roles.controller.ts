import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';

@Controller('roles')
export class RolesController {

    constructor(private rolesService: RolesService) {}

    // 🔹 Listar todos los roles
    @Get()
    findAll() {
        return this.rolesService.findAll();
    }

    // 🔹 Crear nuevo rol — SÓLO ADMIN (rol '1').
    // Antes estaba ABIERTO (guards comentados): cualquiera creaba filas de rol.
    // No se usa JwtRolesGuard porque compara nombres ('ADMIN') y el JWT guarda
    // IDs ('1'), así que denegaría a todos; se comprueba el rol a mano.
    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Req() req: any, @Body() rol: CreateRolDto) {
        if (!(req.user?.roles ?? []).includes('1')) {
            throw new ForbiddenException('Solo el administrador puede crear roles');
        }
        return this.rolesService.create(rol);
    }
}
