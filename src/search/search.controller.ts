import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SearchService, SearchFilters } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // Búsqueda global rápida
  @Get('global')
  async globalSearch(
    @Query('q') query: string,
    @Query('limit') limit: string = '10',
  ) {
    try {
      if (!query || query.trim().length < 2) {
        throw new HttpException(
          {
            ok: false,
            message: 'La búsqueda debe tener al menos 2 caracteres',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.searchService.globalSearch(
        query.trim(),
        parseInt(limit),
      );

      return {
        ok: true,
        data: result,
        query: query.trim(),
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error en la búsqueda global',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Búsqueda avanzada de mascotas
  @Post('pets/advanced')
  async advancedPetSearch(@Body() filters: SearchFilters) {
    try {
      const result = await this.searchService.advancedPetSearch(filters);

      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error en la búsqueda avanzada',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener sugerencias de búsqueda
  @Get('suggestions')
  async getSearchSuggestions(
    @Query('q') query: string,
    @Query('limit') limit: string = '5',
  ) {
    try {
      if (!query || query.trim().length < 1) {
        return {
          ok: true,
          data: [],
          message: 'Ingresa al menos 1 carácter para obtener sugerencias',
        };
      }

      const suggestions = await this.searchService.getSearchSuggestions(
        query.trim(),
        parseInt(limit),
      );

      return {
        ok: true,
        data: suggestions,
        query: query.trim(),
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener sugerencias',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Buscar mascotas similares
  @Get('pets/:id/similar')
  async findSimilarPets(
    @Param('id') petId: string,
    @Query('limit') limit: string = '5',
  ) {
    try {
      if (!petId) {
        throw new HttpException(
          {
            ok: false,
            message: 'ID de mascota requerido',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const similarPets = await this.searchService.findSimilarPets(
        parseInt(petId),
        parseInt(limit),
      );

      return {
        ok: true,
        data: similarPets,
        referenceId: parseInt(petId),
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al buscar mascotas similares',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener filtros disponibles
  @Get('filters')
  async getAvailableFilters() {
    try {
      const filters = await this.searchService.getAvailableFilters();

      return {
        ok: true,
        data: filters,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener filtros',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener estadísticas de búsqueda
  @Get('stats')
  async getSearchStats() {
    try {
      const stats = await this.searchService.getSearchStats();

      return {
        ok: true,
        data: stats,
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

  // Búsqueda por proximidad geográfica
  @Get('pets/nearby')
  async searchNearbyPets(
    @Query('lat') latitude: string,
    @Query('lng') longitude: string,
    @Query('radius') radius: string = '10',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      if (!latitude || !longitude) {
        throw new HttpException(
          {
            ok: false,
            message: 'Coordenadas de ubicación requeridas',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const filters: SearchFilters = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'distance',
        sortOrder: 'ASC',
      };

      const result = await this.searchService.advancedPetSearch(filters);

      return {
        ok: true,
        data: result,
        searchLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseFloat(radius),
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error en búsqueda por proximidad',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Búsqueda rápida por categoría
  @Get('pets/category/:categoryName')
  async searchByCategory(
    @Param('categoryName') categoryName: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      if (!categoryName) {
        throw new HttpException(
          {
            ok: false,
            message: 'Nombre de categoría requerido',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const filters: SearchFilters = {
        category: categoryName,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const result = await this.searchService.advancedPetSearch(filters);

      return {
        ok: true,
        data: result,
        category: categoryName,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error en búsqueda por categoría',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}