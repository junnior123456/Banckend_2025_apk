import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories') // /api/categories
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // 📋 GET /api/categories - Obtener todas las categorías
  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  // 🔍 GET /api/categories/:id - Obtener categoría por ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  // 📊 GET /api/categories/stats/count - Obtener categorías con conteo
  @Get('stats/count')
  async findAllWithCount() {
    return this.categoriesService.findAllWithPetCount();
  }
}