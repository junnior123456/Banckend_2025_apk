import { Category } from '../../categories/category.entity';

export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: number): Promise<Category>;
  create(data: any): Promise<Category>;
  update(id: number, data: any): Promise<Category>;
  delete(id: number): Promise<{ message: string }>;
  findActive(): Promise<Category[]>;
}

export const CATEGORY_REPOSITORY = 'CategoryRepository';
