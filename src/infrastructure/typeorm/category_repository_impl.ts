import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../categories/category.entity';
import { CategoryRepository, CATEGORY_REPOSITORY } from '../../domain/categories/category_repository.interface';

@Injectable()
export class TypeOrmCategoryRepository implements CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  async create(data: any): Promise<Category> {
    const category = this.categoryRepository.create(data) as unknown as Category;
    const saved = await this.categoryRepository.save(category);
    return saved as Category;
  }

  async update(id: number, data: any): Promise<Category> {
    await this.categoryRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<{ message: string }> {
    const category = await this.findById(id);
    await this.categoryRepository.remove(category);
    return { message: 'Categoría eliminada exitosamente' };
  }

  async findActive(): Promise<Category[]> {
    return this.categoryRepository.find({ where: { isActive: true } });
  }
}

export const TypeOrmCategoryRepositoryProvider = {
  provide: CATEGORY_REPOSITORY,
  useClass: TypeOrmCategoryRepository,
};
