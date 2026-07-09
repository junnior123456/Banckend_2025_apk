import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  FileTypeValidator,
  MaxFileSizeValidator,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  /**
   * El JWT guarda los roles como IDs ('1'=ADMIN, '2'=CLIENT, '3'=VET) — por eso
   * `JwtRolesGuard` (que compara nombres) nunca casaba y los guards acabaron
   * comentados, dejando estos endpoints ABIERTOS. Se comprueba a mano.
   */
  private isAdmin(req: any): boolean {
    const roles: string[] = req.user?.roles ?? [];
    return roles.includes('1');
  }

  /** Sólo el propio usuario o un administrador. */
  private assertSelfOrAdmin(req: any, id: number) {
    if (this.isAdmin(req)) return;
    if (Number(req.user?.userId) === Number(id)) return;
    throw new HttpException(
      'No autorizado sobre este usuario',
      HttpStatus.FORBIDDEN,
    );
  }

  // 🔹 Listar todos los usuarios — SOLO ADMIN
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    if (!this.isAdmin(req)) {
      throw new HttpException(
        'Solo el administrador puede listar usuarios',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.userService.findAll();
  }

  // 🔹 Buscar usuario por ID — el propio usuario o un ADMIN
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    this.assertSelfOrAdmin(req, id);
    return this.userService.findById(id);
  }

  // 🔹 Crear usuario (solo ADMIN; el registro público es POST /auth/register).
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() user: CreateUserDto, @Req() req: any) {
    if (!this.isAdmin(req)) {
      throw new HttpException(
        'Solo un administrador puede crear usuarios por esta vía',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.userService.create(user);
  }

  // 🔹 Actualizar usuario sin imagen — el propio usuario o un ADMIN
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() user: UpdateUserDto,
  ) {
    this.assertSelfOrAdmin(req, id);
    return this.userService.update(id, user);
  }

  // 🔹 Actualizar usuario con imagen — el propio usuario o un ADMIN
  @UseGuards(JwtAuthGuard)
  @Put('upload/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateWithImage(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /image\/(jpeg|png|jpg)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Param('id', ParseIntPipe) id: number,
    @Body() user: UpdateUserDto,
  ) {
    this.assertSelfOrAdmin(req, id);
    return this.userService.updateWithImage(file, id, user);
  }

  // 🔹 Cambiar el rol de un usuario — SOLO ADMIN.
  //    Body: { "roleId": "3" }  (1=ADMIN, 2=CLIENT, 3=VET)
  //    El JWT guarda los roles como IDs; '1' identifica al ADMIN.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/role')
  setRole(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { roleId: string },
  ) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('1')) {
      throw new HttpException(
        'Solo el administrador puede cambiar roles',
        HttpStatus.FORBIDDEN,
      );
    }
    if (!body?.roleId) {
      throw new HttpException('Falta roleId', HttpStatus.BAD_REQUEST);
    }
    return this.userService.setRole(id, body.roleId);
  }
}
