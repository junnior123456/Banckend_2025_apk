import { Pet } from '../../pets/pet.entity';

export interface PetRepository {
  findAll(): Promise<Pet[]>;
  findByCategory(categoryId: number): Promise<Pet[]>;
  findForAdoption(categoryId?: number): Promise<Pet[]>;
  findInRisk(categoryId?: number): Promise<Pet[]>;
  findOne(id: number): Promise<Pet>;
  create(data: any, userId: number, file?: Express.Multer.File): Promise<Pet>;
  update(id: number, data: any, file?: Express.Multer.File): Promise<Pet>;
  remove(id: number): Promise<{ message: string }>;
  // otros métodos más complejos
  findAllPaginated(page?: number, limit?: number, categoryId?: number, status?: string): Promise<any>;
  searchPets(searchDto: any): Promise<any>;
  findNearby(latitude: number, longitude: number, radius?: number, page?: number, limit?: number): Promise<any>;
  addImages(petId: number, files: Express.Multer.File[], userId: number): Promise<any>;
  removeImage(petId: number, imageId: number, userId: number): Promise<void>;
  setPrimaryImage(petId: number, imageId: number, userId: number): Promise<any>;
  getGeneralStats(): Promise<any>;
  getUserStats(userId: number): Promise<any>;
  getPetsByUser(userId: number, page?: number, limit?: number, status?: string): Promise<any>;
  updatePetStatus(petId: number, status: string, userId: number): Promise<Pet>;
  toggleFavorite(petId: number, userId: number): Promise<any>;
  getFavoritesByUser(userId: number, page?: number, limit?: number): Promise<any>;
}

export const PET_REPOSITORY = 'PetRepository';
