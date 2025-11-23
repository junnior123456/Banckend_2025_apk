import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from '../../pets/pet.entity';
import { PetImage } from '../../pets/pet-image.entity';
import { Category } from '../../categories/category.entity';
import { User } from '../../users/user.entity';
import { uploadToFirebase, uploadBufferToFirebase } from '../../util/cloud_storage';
import { PetRepository, PET_REPOSITORY } from '../../domain/pets/pet_repository.interface';

@Injectable()
export class TypeOrmPetRepository implements PetRepository {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(PetImage)
    private readonly petImageRepository: Repository<PetImage>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Pet[]> {
    return this.petRepository.find({ relations: ['user', 'category'], order: { createdAt: 'DESC' } });
  }

  async findByCategory(categoryId: number): Promise<Pet[]> {
    return this.petRepository.find({ where: { categoryId }, relations: ['user', 'category'], order: { createdAt: 'DESC' } });
  }

  async findForAdoption(categoryId?: number): Promise<Pet[]> {
    const whereCondition: any = { isRisk: false };
    if (categoryId) whereCondition.categoryId = categoryId;
    return this.petRepository.find({ where: whereCondition, relations: ['user', 'category'], order: { createdAt: 'DESC' } });
  }

  async findInRisk(categoryId?: number): Promise<Pet[]> {
    const whereCondition: any = { isRisk: true };
    if (categoryId) whereCondition.categoryId = categoryId;
    return this.petRepository.find({ where: whereCondition, relations: ['user', 'category'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Pet> {
    const pet = await this.petRepository.findOne({ where: { id }, relations: ['user', 'category'] });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    return pet;
  }

  private getExtensionFromContentType(contentType: string): string {
    const extensions: any = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return extensions[contentType] || '.jpg';
  }

  // Crear mascota (incluye subida de imagen)
  async create(createPetDto: any, userId: number, file?: Express.Multer.File): Promise<Pet> {
    const category = await this.categoryRepository.findOne({ where: { id: createPetDto.categoryId, isActive: true } });
    if (!category) throw new BadRequestException('Categoría no válida');

    const pet = this.petRepository.create({ ...createPetDto, userId }) as unknown as Pet;

    if (file) {
      pet.imageUrl = await uploadToFirebase(file, 'pets/');
    } else if (createPetDto.imageUrl) {
      try {
        // descargar y subir buffer
        const https = require('https');
        const http = require('http');
        const imageUrl = createPetDto.imageUrl;
        const client = imageUrl.startsWith('https:') ? https : http;
        const buffer = await new Promise((resolve, reject) => {
          client.get(imageUrl, (response: any) => {
            if (response.statusCode !== 200) return reject(new Error(`Failed to download image: ${response.statusCode}`));
            const chunks: Buffer[] = [];
            response.on('data', (c: Buffer) => chunks.push(c));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          }).on('error', reject);
        });

        const contentType = 'image/jpeg';
        const fileObject: any = { buffer, mimetype: contentType, originalname: `pet_${Date.now()}${this.getExtensionFromContentType(contentType)}` };
        pet.imageUrl = await uploadBufferToFirebase(fileObject, 'pets/');
      } catch (error) {
        console.log('⚠️ Error uploading image to Firebase, using original URL:', error.message);
        pet.imageUrl = createPetDto.imageUrl;
      }
    }

    const saved = await this.petRepository.save(pet) as Pet;
    return this.petRepository.findOne({ where: { id: saved.id }, relations: ['user', 'category'] });
  }

  async update(id: number, updatePetDto: any, file?: Express.Multer.File): Promise<Pet> {
    const pet = await this.findOne(id);

    if (updatePetDto.categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: updatePetDto.categoryId, isActive: true } });
      if (!category) throw new BadRequestException('Categoría no válida');
    }

    Object.assign(pet, updatePetDto);

    if (file) {
      pet.imageUrl = await uploadToFirebase(file, 'pets/');
    }

    const saved = await this.petRepository.save(pet) as Pet;
    return this.petRepository.findOne({ where: { id: saved.id }, relations: ['user', 'category'] });
  }

  async remove(id: number): Promise<{ message: string }> {
    const pet = await this.findOne(id);
    await this.petRepository.remove(pet);
    return { message: 'Mascota eliminada exitosamente' };
  }

  // Métodos adicionales: paginación, búsqueda, proximidad, imágenes y estadísticas
  async findAllPaginated(page: number = 1, limit: number = 10, categoryId?: number, status?: string) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.category', 'category')
      .leftJoinAndSelect('pet.images', 'images')
      .where('pet.isActive = :isActive', { isActive: true })
      .orderBy('pet.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (categoryId) queryBuilder.andWhere('pet.categoryId = :categoryId', { categoryId });
    if (status) queryBuilder.andWhere('pet.status = :status', { status });

    const [pets, total] = await queryBuilder.getManyAndCount();
    return { pets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async searchPets(searchDto: any) {
    const {
      query,
      categoryId,
      breed,
      size,
      gender,
      ageRange,
      isVaccinated,
      isSterilized,
      location,
      latitude,
      longitude,
      radius,
      temperament,
      status,
      hasSpecialNeeds,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
    } = searchDto;

    const skip = (page - 1) * limit;
    let queryBuilder = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.category', 'category')
      .leftJoinAndSelect('pet.images', 'images')
      .where('pet.isActive = :isActive', { isActive: true });

    if (query) queryBuilder.andWhere('(pet.name LIKE :query OR pet.description LIKE :query OR pet.breed LIKE :query)', { query: `%${query}%` });
    if (categoryId) queryBuilder.andWhere('pet.categoryId = :categoryId', { categoryId });
    if (breed) queryBuilder.andWhere('pet.breed LIKE :breed', { breed: `%${breed}%` });
    if (size) queryBuilder.andWhere('pet.size = :size', { size });
    if (gender) queryBuilder.andWhere('pet.gender = :gender', { gender });

    if (ageRange) {
      switch (ageRange) {
        case 'puppy':
          queryBuilder.andWhere('pet.age LIKE :puppyAge', { puppyAge: '%mes%' });
          break;
        case 'young':
          queryBuilder.andWhere('pet.age REGEXP :youngAge', { youngAge: '^[1-2] año' });
          break;
        case 'adult':
          queryBuilder.andWhere('pet.age REGEXP :adultAge', { adultAge: '^[3-7] año' });
          break;
        case 'senior':
          queryBuilder.andWhere('pet.age REGEXP :seniorAge', { seniorAge: '^[8-9]|^[1-9][0-9] año' });
          break;
      }
    }

    if (isVaccinated !== undefined) queryBuilder.andWhere('pet.isVaccinated = :isVaccinated', { isVaccinated });
    if (isSterilized !== undefined) queryBuilder.andWhere('pet.isSterilized = :isSterilized', { isSterilized });
    if (location) queryBuilder.andWhere('pet.address LIKE :location', { location: `%${location}%` });

    if (temperament && temperament.length > 0) {
      const temperamentConditions = temperament.map((temp: string, index: number) => `pet.temperament LIKE :temp${index}`);
      queryBuilder.andWhere(`(${temperamentConditions.join(' OR ')})`, temperament.reduce((params: any, temp: string, index: number) => {
        params[`temp${index}`] = `%${temp}%`;
        return params;
      }, {}));
    }

    if (status) queryBuilder.andWhere('pet.status = :status', { status });
    if (hasSpecialNeeds !== undefined) {
      if (hasSpecialNeeds) queryBuilder.andWhere('pet.specialNeeds IS NOT NULL AND pet.specialNeeds != ""');
      else queryBuilder.andWhere('(pet.specialNeeds IS NULL OR pet.specialNeeds = "")');
    }

    if (latitude && longitude && radius) {
      queryBuilder.andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(pet.latitude)))) <= :radius`,
        { lat: latitude, lng: longitude, radius }
      );
    }

    if (sortBy === 'distance' && latitude && longitude) {
      queryBuilder.addSelect(
        `(6371 * acos(cos(radians(${latitude})) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(pet.latitude))))`,
        'distance'
      );
      queryBuilder.orderBy('distance', sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy(`pet.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    queryBuilder.skip(skip).take(limit);
    const [pets, total] = await queryBuilder.getManyAndCount();

    return { pets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, searchCriteria: searchDto };
  }

  async findNearby(latitude: number, longitude: number, radius: number = 10, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const pets = await this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.category', 'category')
      .leftJoinAndSelect('pet.images', 'images')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere('pet.status = :status', { status: 'available' })
      .andWhere('pet.latitude IS NOT NULL AND pet.longitude IS NOT NULL')
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(pet.latitude)))) <= :radius`,
        { lat: latitude, lng: longitude, radius }
      )
      .addSelect(
        `(6371 * acos(cos(radians(${latitude})) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(pet.latitude))))`,
        'distance'
      )
      .orderBy('distance', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    const total = await this.petRepository
      .createQueryBuilder('pet')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere('pet.status = :status', { status: 'available' })
      .andWhere('pet.latitude IS NOT NULL AND pet.longitude IS NOT NULL')
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(pet.latitude)))) <= :radius`,
        { lat: latitude, lng: longitude, radius }
      )
      .getCount();

    return { pets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, searchLocation: { latitude, longitude, radius } };
  }

  async addImages(petId: number, files: Express.Multer.File[], userId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId }, relations: ['images'] });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    if (pet.userId !== userId) throw new ForbiddenException('No tienes permisos para agregar imágenes a esta mascota');
    if (!files || files.length === 0) throw new BadRequestException('No se proporcionaron imágenes');

    const uploadedImages = [];
    const currentImageCount = pet.images?.length || 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageUrl = await uploadToFirebase(file, 'pets/');
      const petImage = this.petImageRepository.create({ petId, imageUrl, isPrimary: currentImageCount === 0 && i === 0, order: currentImageCount + i + 1 });
      const savedImage = await this.petImageRepository.save(petImage);
      uploadedImages.push(savedImage);
    }

    return { uploadedImages, totalImages: currentImageCount + files.length };
  }

  async removeImage(petId: number, imageId: number, userId: number): Promise<void> {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    if (pet.userId !== userId) throw new ForbiddenException('No tienes permisos para eliminar imágenes de esta mascota');

    const image = await this.petImageRepository.findOne({ where: { id: imageId, petId } });
    if (!image) throw new NotFoundException('Imagen no encontrada');

    await this.petImageRepository.remove(image);

    if (image.isPrimary) {
      const nextImage = await this.petImageRepository.findOne({ where: { petId }, order: { order: 'ASC' } });
      if (nextImage) { nextImage.isPrimary = true; await this.petImageRepository.save(nextImage); }
    }
  }

  async setPrimaryImage(petId: number, imageId: number, userId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    if (pet.userId !== userId) throw new ForbiddenException('No tienes permisos para modificar imágenes de esta mascota');

    const image = await this.petImageRepository.findOne({ where: { id: imageId, petId } });
    if (!image) throw new NotFoundException('Imagen no encontrada');

    await this.petImageRepository.update({ petId }, { isPrimary: false });
    image.isPrimary = true;
    return this.petImageRepository.save(image);
  }

  async getGeneralStats() {
    const totalPets = await this.petRepository.count({ where: { isActive: true } });
    const availablePets = await this.petRepository.count({ where: { isActive: true, status: 'available' } });
    const adoptedPets = await this.petRepository.count({ where: { isActive: true, status: 'adopted' } });
    const pendingPets = await this.petRepository.count({ where: { isActive: true, status: 'pending' } });

    const petsByCategory = await this.petRepository
      .createQueryBuilder('pet')
      .leftJoin('pet.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(pet.id)', 'count')
      .where('pet.isActive = :isActive', { isActive: true })
      .groupBy('category.id')
      .getRawMany();

    const petsBySize = await this.petRepository
      .createQueryBuilder('pet')
      .select('pet.size', 'size')
      .addSelect('COUNT(pet.id)', 'count')
      .where('pet.isActive = :isActive', { isActive: true })
      .groupBy('pet.size')
      .getRawMany();

    return {
      summary: { total: totalPets, available: availablePets, adopted: adoptedPets, pending: pendingPets },
      byCategory: petsByCategory.reduce((acc: any, item: any) => { acc[item.categoryName] = parseInt(item.count); return acc; }, {}),
      bySize: petsBySize.reduce((acc: any, item: any) => { acc[item.size] = parseInt(item.count); return acc; }, {}),
    };
  }

  async getUserStats(userId: number) {
    const totalPets = await this.petRepository.count({ where: { userId, isActive: true } });
    const availablePets = await this.petRepository.count({ where: { userId, isActive: true, status: 'available' } });
    const adoptedPets = await this.petRepository.count({ where: { userId, isActive: true, status: 'adopted' } });
    const pendingPets = await this.petRepository.count({ where: { userId, isActive: true, status: 'pending' } });
    return { totalPets, availablePets, adoptedPets, pendingPets };
  }

  async getPetsByUser(userId: number, page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.category', 'category')
      .leftJoinAndSelect('pet.images', 'images')
      .where('pet.userId = :userId', { userId })
      .andWhere('pet.isActive = :isActive', { isActive: true })
      .orderBy('pet.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) queryBuilder.andWhere('pet.status = :status', { status });
    const [pets, total] = await queryBuilder.getManyAndCount();
    return { pets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updatePetStatus(petId: number, status: string, userId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    if (pet.userId !== userId) throw new ForbiddenException('No tienes permisos para actualizar esta mascota');

    const validStatuses = ['available', 'pending', 'adopted', 'removed'];
    if (!validStatuses.includes(status)) throw new BadRequestException('Estado no válido');

    pet.status = status;
    pet.updatedAt = new Date();
    return this.petRepository.save(pet);
  }

  async toggleFavorite(petId: number, userId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    return { petId, userId, isFavorite: true, message: 'Funcionalidad de favoritos pendiente de implementar con tabla dedicada' };
  }

  async getFavoritesByUser(userId: number, page: number = 1, limit: number = 10) {
    return { pets: [], pagination: { page, limit, total: 0, totalPages: 0 }, message: 'Funcionalidad de favoritos pendiente de implementar con tabla dedicada' };
  }
}

export const TypeOrmPetRepositoryProvider = {
  provide: PET_REPOSITORY,
  useClass: TypeOrmPetRepository,
};
