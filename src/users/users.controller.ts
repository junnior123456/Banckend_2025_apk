import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user-dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { HasRoles } from 'src/auth/jwt/has-roles';
import { JwtRole } from 'src/auth/jwt/jwt-role';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';

@Controller('users') // con globalPrefix('api') => /api/users
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  // 🔹 Listar todos los usuarios
  //@HasRoles(JwtRole.CLIENT)
  //@UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  // 🔹 Buscar usuario por ID
  //@HasRoles(JwtRole.CLIENT)
  //@UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }

  // 🔹 Crear usuario
  @Post()
  create(@Body() user: CreateUserDto) {
    return this.userService.create(user);
  }

  // 🔹 Actualizar usuario sin imagen
  //@HasRoles(JwtRole.CLIENT)
  //@UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() user: UpdateUserDto) {
    return this.userService.update(id, user);
  }

  // 🔹 Actualizar usuario con imagen (Firebase)
  //@HasRoles(JwtRole.CLIENT)
  //@UseGuards(JwtAuthGuard, JwtRolesGuard)
  @Put('upload/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateWithImage(
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
    return this.userService.updateWithImage(file, id, user);
  }
}
