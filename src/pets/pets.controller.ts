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
  UploadedFiles,
  ParseIntPipe, 
  BadRequestException,
  Query,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { SearchPetsDto } from './dto/search-pets.dto';

// El saneo del `user` embebido lo hace ahora el interceptor global (main.ts).
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  // 📋 GET /api/pets - Obtener todas las mascotas con paginación
  @Get()
  async findAll(
    @Query('category') categoryId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    try {
      const result = await this.petsService.findAllPaginated(
        parseInt(page),
        parseInt(limit),
        categoryId ? parseInt(categoryId) : undefined,
        status,
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener mascotas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
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

  // 📋 GET /api/pets/my-pets - Obtener mascotas del usuario
  @Get('my-pets')
  @UseGuards(JwtAuthGuard)
  async getMyPets(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '100',
    @Query('status') status?: string,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.petsService.getPetsByUser(
        userId,
        parseInt(page),
        parseInt(limit),
        status,
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener mis mascotas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 📰 GET /api/pets/feed - Muro social (like/comentar/compartir)
  @Get('feed')
  @UseGuards(JwtAuthGuard)
  async getFeed(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const result = await this.petsService.getFeed(
        req.user.userId,
        parseInt(page),
        parseInt(limit),
      );
      return { ok: true, data: result };
    } catch (error) {
      throw new HttpException(
        { ok: false, message: error.message || 'Error al obtener el feed' },
        HttpStatus.BAD_REQUEST,
      );
    }
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

  // === NUEVAS FUNCIONALIDADES ===

  // 🔍 POST /api/pets/search - Búsqueda avanzada de mascotas
  @Post('search')
  async searchPets(@Body() searchDto: SearchPetsDto) {
    try {
      const result = await this.petsService.searchPets(searchDto);
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error en la búsqueda',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 📍 GET /api/pets/nearby - Obtener mascotas cercanas por ubicación
  @Get('nearby')
  async findNearby(
    @Query('lat') latitude: string,
    @Query('lng') longitude: string,
    @Query('radius') radius: string = '10',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      if (!latitude || !longitude) {
        throw new BadRequestException('Se requieren coordenadas de ubicación');
      }

      const result = await this.petsService.findNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius),
        parseInt(page),
        parseInt(limit),
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al buscar mascotas cercanas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 📸 POST /api/pets/:id/images - Agregar múltiples imágenes a una mascota
  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5)) // Máximo 5 imágenes
  async addImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.petsService.addImages(id, files, userId);
      
      return {
        ok: true,
        message: 'Imágenes agregadas exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al agregar imágenes',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🗑️ DELETE /api/pets/:petId/images/:imageId - Eliminar imagen específica
  @Delete(':petId/images/:imageId')
  @UseGuards(JwtAuthGuard)
  async removeImage(
    @Param('petId', ParseIntPipe) petId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      await this.petsService.removeImage(petId, imageId, userId);
      
      return {
        ok: true,
        message: 'Imagen eliminada exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al eliminar imagen',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 📸 PUT /api/pets/:petId/images/:imageId/primary - Establecer imagen principal
  @Patch(':petId/images/:imageId/primary')
  @UseGuards(JwtAuthGuard)
  async setPrimaryImage(
    @Param('petId', ParseIntPipe) petId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.petsService.setPrimaryImage(petId, imageId, userId);
      
      return {
        ok: true,
        message: 'Imagen principal actualizada',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar imagen principal',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 📊 GET /api/pets/stats - Obtener estadísticas de mascotas
  @Get('stats/general')
  async getGeneralStats() {
    try {
      const result = await this.petsService.getGeneralStats();
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener estadísticas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 📊 GET /api/pets/my-stats - Obtener estadísticas del usuario
  @Get('stats/my-stats')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.petsService.getUserStats(userId);
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener mis estadísticas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔄 PUT /api/pets/:id/status - Cambiar estado de mascota
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updatePetStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.petsService.updatePetStatus(id, status, userId);
      
      return {
        ok: true,
        message: 'Estado de mascota actualizado',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar estado',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ❤️ POST /api/pets/:id/favorite - Marcar/desmarcar como favorito
  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  async toggleFavorite(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.petsService.toggleFavorite(id, userId);
      
      return {
        ok: true,
        message: result.isFavorite ? 'Agregado a favoritos' : 'Removido de favoritos',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar favoritos',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ❤️ GET /api/pets/favorites - Obtener mascotas favoritas del usuario
  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  async getFavorites(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.petsService.getFavoritesByUser(
        userId,
        parseInt(page),
        parseInt(limit),
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener favoritos',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
