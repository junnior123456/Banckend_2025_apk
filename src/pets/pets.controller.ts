import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  UseInterceptors, 
  UploadedFile, 
  ParseIntPipe, 
  BadRequestException,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@Controller('pets') // /api/pets
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  // 📋 GET /api/pets - Obtener todas las mascotas
  @Get()
  findAll(@Query('category') categoryId?: string) {
    if (categoryId) {
      return this.petsService.findByCategory(parseInt(categoryId));
    }
    return this.petsService.findAll();
  }

  // 📋 GET /api/pets/adoption - Obtener mascotas para adopción
  @Get('adoption')
  findForAdoption(@Query('category') categoryId?: string) {
    const catId = categoryId ? parseInt(categoryId) : undefined;
    return this.petsService.findForAdoption(catId);
  }

  // 📋 GET /api/pets/risk - Obtener mascotas en riesgo
  @Get('risk')
  findInRisk(@Query('category') categoryId?: string) {
    const catId = categoryId ? parseInt(categoryId) : undefined;
    return this.petsService.findInRisk(catId);
  }

  // 🔍 GET /api/pets/:id - Obtener mascota por ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.petsService.findOne(id);
  }

  // ➕ POST /api/pets - Crear nueva mascota (requiere autenticación)
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() createPetDto: CreatePetDto,
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.petsService.create(createPetDto, req.user.userId, file);
  }

  // 📸 POST /api/pets/upload - Crear mascota con imagen (requiere autenticación)
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  createWithImage(
    @Body() createPetDto: CreatePetDto,
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.petsService.create(createPetDto, req.user.userId, file);
  }

  // 🔄 PATCH /api/pets/:id - Actualizar mascota (requiere autenticación)
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePetDto: UpdatePetDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.petsService.update(id, updatePetDto, file);
  }

  // 🗑️ DELETE /api/pets/:id - Eliminar mascota (requiere autenticación)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.petsService.remove(id);
  }
}
