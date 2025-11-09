import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Pet } from './pet.entity';
import { PetImage } from './pet-image.entity';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { SearchPetsDto } from './dto/search-pets.dto';
import { uploadToFirebase } from '../util/cloud_storage';

@Injectable()
export class PetsService {
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

  // 📋 Obtener todas las mascotas
  async findAll(): Promise<Pet[]> {
    return this.petRepository.find({
      relations: ['user', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  // 📋 Obtener mascotas por categoría
  async findByCategory(categoryId: number): Promise<Pet[]> {
    return this.petRepository.find({
      where: { categoryId },
      relations: ['user', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  // 📋 Obtener mascotas para adopción
  async findForAdoption(categoryId?: number): Promise<Pet[]> {
    const whereCondition: any = { isRisk: false };
    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

    return this.petRepository.find({
      where: whereCondition,
      relations: ['user', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  // 📋 Obtener mascotas en riesgo
  async findInRisk(categoryId?: number): Promise<Pet[]> {
    const whereCondition: any = { isRisk: true };
    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

    return this.petRepository.find({
      where: whereCondition,
      relations: ['user', 'category'],
      order: { createdAt: 'DESC' },
    });
  }

  // 🔍 Obtener mascota por ID
  async findOne(id: number): Promise<Pet> {
    const pet = await this.petRepository.findOne({
      where: { id },
      relations: ['user', 'category'],
    });
    
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }
    
    return pet;
  }

  // ➕ Crear nueva mascota
  async create(createPetDto: CreatePetDto, userId: number, file?: Express.Multer.File): Promise<Pet> {
    // Validar que la categoría existe
    const category = await this.categoryRepository.findOne({
      where: { id: createPetDto.categoryId, isActive: true }
    });

    if (!category) {
      throw new BadRequestException('Categoría no válida');
    }

    const pet = this.petRepository.create({
      ...createPetDto,
      userId,
    });

    // Subir imagen a Firebase Storage
    if (file) {
      // Si se proporciona un archivo, subirlo directamente
      pet.imageUrl = await uploadToFirebase(file, 'pets/');
    } else if (createPetDto.imageUrl) {
      // Si se proporciona una URL, descargar la imagen y subirla a Firebase
      try {
        const firebaseUrl = await this.downloadAndUploadToFirebase(createPetDto.imageUrl, `pets/pet_${Date.now()}`);
        pet.imageUrl = firebaseUrl;
      } catch (error) {
        console.log('⚠️ Error uploading image to Firebase, using original URL:', error.message);
        // Si falla, usar la URL original como fallback
        pet.imageUrl = createPetDto.imageUrl;
      }
    }
    
    const savedPet = await this.petRepository.save(pet);
    
    // Retornar con relaciones cargadas
    return this.petRepository.findOne({
      where: { id: savedPet.id },
      relations: ['user', 'category'],
    });
  }

  // 📥 Descargar imagen de URL y subirla a Firebase Storage
  private async downloadAndUploadToFirebase(imageUrl: string, fileName: string): Promise<string> {
    const https = require('https');
    const http = require('http');
    const { uploadBufferToFirebase } = require('../util/cloud_storage');

    return new Promise((resolve, reject) => {
      const client = imageUrl.startsWith('https:') ? https : http;
      
      client.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const contentType = response.headers['content-type'] || 'image/jpeg';
            
            // Crear un objeto similar a Express.Multer.File
            const fileObject = {
              buffer,
              mimetype: contentType,
              originalname: fileName + this.getExtensionFromContentType(contentType),
            };

            const firebaseUrl = await uploadBufferToFirebase(fileObject, 'pets/');
            resolve(firebaseUrl);
          } catch (error) {
            reject(error);
          }
        });

        response.on('error', (error) => {
          reject(error);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  // 🔧 Obtener extensión de archivo basada en content-type
  private getExtensionFromContentType(contentType: string): string {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return extensions[contentType] || '.jpg';
  }

  // 🔄 Actualizar mascota
  async update(id: number, updatePetDto: UpdatePetDto, file?: Express.Multer.File): Promise<Pet> {
    const pet = await this.findOne(id);

    // Validar categoría si se está actualizando
    if (updatePetDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updatePetDto.categoryId, isActive: true }
      });

      if (!category) {
        throw new BadRequestException('Categoría no válida');
      }
    }

    Object.assign(pet, updatePetDto);

    // Actualizar imagen si se proporciona
    if (file) {
      pet.imageUrl = await uploadToFirebase(file, 'pets/');
    }

    const savedPet = await this.petRepository.save(pet);
    
    // Retornar con relaciones cargadas
    return this.petRepository.findOne({
      where: { id: savedPet.id },
      relations: ['user', 'category'],
    });
  }

  // 🗑️ Eliminar mascota
  async remove(id: number): Promise<{ message: string }> {
    const pet = await this.findOne(id);
    await this.petRepository.remove(pet);
    return { message: 'Mascota eliminada exitosamente' };
  }

  // === NUEVOS MÉTODOS ===

  // 📋 Obtener mascotas con paginación
  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    categoryId?: number,
    status?: string,
  ) {
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

    if (categoryId) {
      queryBuilder.andWhere('pet.categoryId = :categoryId', { categoryId });
    }

    if (status) {
      queryBuilder.andWhere('pet.status = :status', { status });
    }

    const [pets, total] = await queryBuilder.getManyAndCount();

    return {
      pets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 🔍 Búsqueda avanzada de mascotas
  async searchPets(searchDto: SearchPetsDto) {
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

    // Búsqueda por texto
    if (query) {
      queryBuilder.andWhere(
        '(pet.name LIKE :query OR pet.description LIKE :query OR pet.breed LIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Filtros específicos
    if (categoryId) {
      queryBuilder.andWhere('pet.categoryId = :categoryId', { categoryId });
    }

    if (breed) {
      queryBuilder.andWhere('pet.breed LIKE :breed', { breed: `%${breed}%` });
    }

    if (size) {
      queryBuilder.andWhere('pet.size = :size', { size });
    }

    if (gender) {
      queryBuilder.andWhere('pet.gender = :gender', { gender });
    }

    if (ageRange) {
      // Implementar lógica de rango de edad basada en el campo age
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

    if (isVaccinated !== undefined) {
      queryBuilder.andWhere('pet.isVaccinated = :isVaccinated', { isVaccinated });
    }

    if (isSterilized !== undefined) {
      queryBuilder.andWhere('pet.isSterilized = :isSterilized', { isSterilized });
    }

    if (location) {
      queryBuilder.andWhere('pet.address LIKE :location', { location: `%${location}%` });
    }

    if (temperament && temperament.length > 0) {
      const temperamentConditions = temperament.map((temp, index) => 
        `pet.temperament LIKE :temp${index}`
      );
      queryBuilder.andWhere(`(${temperamentConditions.join(' OR ')})`, 
        temperament.reduce((params, temp, index) => {
          params[`temp${index}`] = `%${temp}%`;
          return params;
        }, {})
      );
    }

    if (status) {
      queryBuilder.andWhere('pet.status = :status', { status });
    }

    if (hasSpecialNeeds !== undefined) {
      if (hasSpecialNeeds) {
        queryBuilder.andWhere('pet.specialNeeds IS NOT NULL AND pet.specialNeeds != ""');
      } else {
        queryBuilder.andWhere('(pet.specialNeeds IS NULL OR pet.specialNeeds = "")');
      }
    }

    // Búsqueda por proximidad geográfica
    if (latitude && longitude && radius) {
      queryBuilder.andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(pet.latitude)))) <= :radius`,
        { lat: latitude, lng: longitude, radius }
      );
    }

    // Ordenamiento
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

    return {
      pets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      searchCriteria: searchDto,
    };
  }

  // 📍 Buscar mascotas cercanas
  async findNearby(
    latitude: number,
    longitude: number,
    radius: number = 10,
    page: number = 1,
    limit: number = 10,
  ) {
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

    return {
      pets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      searchLocation: { latitude, longitude, radius },
    };
  }

  // 📸 Agregar múltiples imágenes a una mascota
  async addImages(petId: number, files: Express.Multer.File[], userId: number) {
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['images'],
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    if (pet.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para agregar imágenes a esta mascota');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron imágenes');
    }

    const uploadedImages = [];
    const currentImageCount = pet.images?.length || 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageUrl = await uploadToFirebase(file, 'pets/');
      
      const petImage = this.petImageRepository.create({
        petId,
        imageUrl,
        isPrimary: currentImageCount === 0 && i === 0, // Primera imagen es principal si no hay otras
        order: currentImageCount + i + 1,
      });

      const savedImage = await this.petImageRepository.save(petImage);
      uploadedImages.push(savedImage);
    }

    return {
      uploadedImages,
      totalImages: currentImageCount + files.length,
    };
  }

  // 🗑️ Eliminar imagen específica
  async removeImage(petId: number, imageId: number, userId: number): Promise<void> {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    if (pet.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para eliminar imágenes de esta mascota');
    }

    const image = await this.petImageRepository.findOne({
      where: { id: imageId, petId },
    });

    if (!image) {
      throw new NotFoundException('Imagen no encontrada');
    }

    await this.petImageRepository.remove(image);

    // Si era la imagen principal, establecer otra como principal
    if (image.isPrimary) {
      const nextImage = await this.petImageRepository.findOne({
        where: { petId },
        order: { order: 'ASC' },
      });

      if (nextImage) {
        nextImage.isPrimary = true;
        await this.petImageRepository.save(nextImage);
      }
    }
  }

  // 📸 Establecer imagen principal
  async setPrimaryImage(petId: number, imageId: number, userId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    if (pet.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para modificar imágenes de esta mascota');
    }

    const image = await this.petImageRepository.findOne({
      where: { id: imageId, petId },
    });

    if (!image) {
      throw new NotFoundException('Imagen no encontrada');
    }

    // Quitar el estado principal de todas las imágenes
    await this.petImageRepository.update(
      { petId },
      { isPrimary: false }
    );

    // Establecer la nueva imagen principal
    image.isPrimary = true;
    const updatedImage = await this.petImageRepository.save(image);

    return updatedImage;
  }

  // 📊 Obtener estadísticas generales
  async getGeneralStats() {
    const totalPets = await this.petRepository.count({
      where: { isActive: true },
    });

    const availablePets = await this.petRepository.count({
      where: { isActive: true, status: 'available' },
    });

    const adoptedPets = await this.petRepository.count({
      where: { isActive: true, status: 'adopted' },
    });

    const pendingPets = await this.petRepository.count({
      where: { isActive: true, status: 'pending' },
    });

    // Estadísticas por categoría
    const petsByCategory = await this.petRepository
      .createQueryBuilder('pet')
      .leftJoin('pet.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(pet.id)', 'count')
      .where('pet.isActive = :isActive', { isActive: true })
      .groupBy('category.id')
      .getRawMany();

    // Estadísticas por tamaño
    const petsBySize = await this.petRepository
      .createQueryBuilder('pet')
      .select('pet.size', 'size')
      .addSelect('COUNT(pet.id)', 'count')
      .where('pet.isActive = :isActive', { isActive: true })
      .groupBy('pet.size')
      .getRawMany();

    return {
      summary: {
        total: totalPets,
        available: availablePets,
        adopted: adoptedPets,
        pending: pendingPets,
      },
      byCategory: petsByCategory.reduce((acc, item) => {
        acc[item.categoryName] = parseInt(item.count);
        return acc;
      }, {}),
      bySize: petsBySize.reduce((acc, item) => {
        acc[item.size] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  // 📊 Obtener estadísticas del usuario
  async getUserStats(userId: number) {
    const totalPets = await this.petRepository.count({
      where: { userId, isActive: true },
    });

    const availablePets = await this.petRepository.count({
      where: { userId, isActive: true, status: 'available' },
    });

    const adoptedPets = await this.petRepository.count({
      where: { userId, isActive: true, status: 'adopted' },
    });

    const pendingPets = await this.petRepository.count({
      where: { userId, isActive: true, status: 'pending' },
    });

    return {
      totalPets,
      availablePets,
      adoptedPets,
      pendingPets,
    };
  }

  // 📋 Obtener mascotas del usuario
  async getPetsByUser(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
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

    if (status) {
      queryBuilder.andWhere('pet.status = :status', { status });
    }

    const [pets, total] = await queryBuilder.getManyAndCount();

    return {
      pets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 🔄 Actualizar estado de mascota
  async updatePetStatus(petId: number, status: string, userId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    if (pet.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para actualizar esta mascota');
    }

    const validStatuses = ['available', 'pending', 'adopted', 'removed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Estado no válido');
    }

    pet.status = status;
    pet.updatedAt = new Date();

    return await this.petRepository.save(pet);
  }

  // ❤️ Marcar/desmarcar como favorito (simulado - en una implementación real sería una tabla separada)
  async toggleFavorite(petId: number, userId: number) {
    const pet = await this.petRepository.findOne({ where: { id: petId } });
    
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    // En una implementación real, esto sería una tabla de favoritos
    // Por ahora, simulamos la funcionalidad
    return {
      petId,
      userId,
      isFavorite: true, // Simulado
      message: 'Funcionalidad de favoritos pendiente de implementar con tabla dedicada',
    };
  }

  // ❤️ Obtener mascotas favoritas del usuario (simulado)
  async getFavoritesByUser(userId: number, page: number = 1, limit: number = 10) {
    // En una implementación real, esto consultaría una tabla de favoritos
    // Por ahora, retornamos un resultado vacío
    return {
      pets: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
      message: 'Funcionalidad de favoritos pendiente de implementar con tabla dedicada',
    };
  }
}
