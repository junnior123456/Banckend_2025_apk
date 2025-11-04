import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async onModuleInit() {
    await this.seedCategories();
  }

  // 🌱 Crear categorías por defecto si no existen
  private async seedCategories() {
    const count = await this.categoryRepository.count();
    
    if (count === 0) {
      const defaultCategories = [
        { id: 1, name: 'Perros', emoji: '🐕', description: 'Perros de todas las razas y tamaños' },
        { id: 2, name: 'Gatos', emoji: '🐱', description: 'Gatos domésticos y de diferentes razas' },
        { id: 3, name: 'Aves', emoji: '🐦', description: 'Aves domésticas y exóticas' },
        { id: 4, name: 'Conejos', emoji: '🐰', description: 'Conejos domésticos de diferentes razas' },
        { id: 5, name: 'Otros', emoji: '🐹', description: 'Otras mascotas como hamsters, reptiles, etc.' },
      ];

      for (const categoryData of defaultCategories) {
        const category = this.categoryRepository.create(categoryData);
        await this.categoryRepository.save(category);
      }

      console.log('✅ Categorías de mascotas creadas exitosamente');
    } else {
      console.log('⚙️ Las categorías ya existen, no se crean de nuevo.');
    }
  }

  // 📋 Obtener todas las categorías activas
  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  // 🔍 Obtener categoría por ID
  async findOne(id: number): Promise<Category> {
    return this.categoryRepository.findOne({
      where: { id, isActive: true },
    });
  }

  // 📊 Obtener categorías con conteo de mascotas
  async findAllWithPetCount(): Promise<any[]> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.pets', 'pet')
      .select([
        'category.id',
        'category.name',
        'category.emoji',
        'category.description',
      ])
      .addSelect('COUNT(pet.id)', 'petCount')
      .where('category.isActive = :isActive', { isActive: true })
      .groupBy('category.id')
      .orderBy('category.id', 'ASC')
      .getRawMany();
  }
}