import { Injectable, HttpException, HttpStatus, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { Pet } from './pet.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { SearchPetsDto } from './dto/search-pets.dto';
import { PetImage } from './pet-image.entity';
import { uploadToFirebase } from '../util/cloud_storage';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(PetImage)
    private readonly petImageRepository: Repository<PetImage>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==================== CRUD BÁSICO ====================

  // Crear mascota
  async create(createPetDto: CreatePetDto, userId: number, file?: Express.Multer.File): Promise<Pet> {
    try {
      // 🔍 Verificar si ya existe una mascota con el mismo nombre del mismo usuario (prevenir duplicados)
      const existingPet = await this.petRepository.findOne({
        where: {
          name: createPetDto.name,
          userId: userId,
          isActive: true,
        },
      });

      if (existingPet) {
        // Si existe una mascota con el mismo nombre creada en los últimos 5 minutos, es probable que sea un duplicado
        const timeDiff = Date.now() - existingPet.createdAt.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeDiff < fiveMinutes) {
          console.log(`⚠️ Posible duplicado detectado: ${createPetDto.name} (creado hace ${Math.floor(timeDiff / 1000)}s)`);
          throw new HttpException(
            'Ya existe una mascota con este nombre publicada recientemente. Por favor espera unos minutos antes de publicar otra.',
            HttpStatus.CONFLICT,
          );
        }
      }

      const pet = this.petRepository.create({
        ...createPetDto,
        userId: userId,
      });

      if (file) {
        const imageUrl = await uploadToFirebase(file, 'pets/');
        pet.imageUrl = imageUrl;
      }

      const savedPet = await this.petRepository.save(pet);

      // Si hay imagen, crear también en la tabla de imágenes
      if (file && savedPet.imageUrl) {
        const petImage = this.petImageRepository.create({
          imageUrl: savedPet.imageUrl,
          isPrimary: true,
          order: 1,
          petId: savedPet.id,
        });
        await this.petImageRepository.save(petImage);
      }

      // 📢 Enviar notificaciones
      try {
        if (savedPet.isRisk) {
          // 1. Notificación personal al usuario que publicó
          await this.notificationsService.sendPetRiskPublishedNotification(userId, savedPet);
          
          // 2. Notificación comunitaria (a todos los demás usuarios)
          await this.notificationsService.notifyNewPetInRisk(savedPet);
        } else {
          // 1. Notificación personal al usuario que publicó
          await this.notificationsService.sendPetPublishedNotification(userId, savedPet);
          
          // 2. Notificación comunitaria (a todos los demás usuarios)
          await this.notificationsService.notifyNewPetForAdoption(savedPet);
        }
        console.log(`✅ Notificaciones enviadas para: ${savedPet.name}`);
      } catch (error) {
        console.error('❌ Error enviando notificaciones:', error);
        // No lanzar error, la mascota ya se creó exitosamente
      }

      return savedPet;
    } catch (error) {
      console.error('Error creating pet:', error);
      throw new HttpException('Error al crear mascota', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Obtener todas las mascotas con paginación
  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    categoryId?: number,
    status?: string,
  ): Promise<{ data: Pet[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const query = this.petRepository.createQueryBuilder('pet')
        .leftJoinAndSelect('pet.user', 'user')
        .leftJoinAndSelect('pet.images', 'images')
        .leftJoinAndSelect('pet.category', 'category')
        .where('pet.isActive = :isActive', { isActive: true });

      if (categoryId) {
        query.andWhere('pet.categoryId = :categoryId', { categoryId });
      }

      if (status) {
        query.andWhere('pet.status = :status', { status });
      }

      query.orderBy('pet.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await query.getManyAndCount();

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error finding pets:', error);
      throw new HttpException('Error al obtener mascotas', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Obtener mascota por ID
  async findOne(id: number): Promise<Pet> {
    const pet = await this.petRepository.findOne({
      where: { id },
      relations: ['user', 'images', 'category', 'comments', 'comments.user'],
    });
    
    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }
    
    return pet;
  }

  // Actualizar mascota
  async update(id: number, updatePetDto: UpdatePetDto, file?: Express.Multer.File): Promise<Pet> {
    try {
      const pet = await this.petRepository.findOne({ where: { id } });
      
      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      if (file) {
        const imageUrl = await uploadToFirebase(file, 'pets/');
        pet.imageUrl = imageUrl;
      }

      Object.assign(pet, updatePetDto);
      return await this.petRepository.save(pet);
    } catch (error) {
      console.error('Error updating pet:', error);
      throw new HttpException('Error al actualizar mascota', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Eliminar mascota
  async remove(id: number): Promise<{ message: string }> {
    try {
      const pet = await this.petRepository.findOne({ where: { id } });
      
      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }
      
      // Eliminar notificaciones asociadas primero
      await this.notificationsService.deleteNotificationsByPetId(id);
      
      // Eliminar imágenes asociadas
      await this.petImageRepository.delete({ petId: id });
      
      // Eliminar la mascota
      await this.petRepository.remove(pet);
      
      console.log(`✅ Mascota eliminada: ID ${id}, Nombre: ${pet.name}`);
      return { message: 'Mascota eliminada exitosamente' };
    } catch (error) {
      console.error('Error eliminando mascota:', error);
      throw new HttpException('Error al eliminar mascota', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== BÚSQUEDAS ESPECÍFICAS ====================

  // Obtener mascotas para adopción
  async findForAdoption(categoryId?: number): Promise<Pet[]> {
    const query = this.petRepository.createQueryBuilder('pet')
      .where('pet.status = :status', { status: 'available' })
      .andWhere('pet.isRisk = :isRisk', { isRisk: false })
      .andWhere('pet.isActive = :isActive', { isActive: true })
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.images', 'images')
      .leftJoinAndSelect('pet.category', 'category');

    if (categoryId) {
      query.andWhere('pet.categoryId = :categoryId', { categoryId });
    }

    query.orderBy('pet.createdAt', 'DESC');

    return query.getMany();
  }

  // Obtener mascotas en riesgo
  async findInRisk(categoryId?: number): Promise<Pet[]> {
    const query = this.petRepository.createQueryBuilder('pet')
      .where('pet.isRisk = :isRisk', { isRisk: true })
      .andWhere('pet.status = :status', { status: 'available' }) // ✅ Solo mostrar mascotas disponibles
      .andWhere('pet.isActive = :isActive', { isActive: true })
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.images', 'images')
      .leftJoinAndSelect('pet.category', 'category');

    if (categoryId) {
      query.andWhere('pet.categoryId = :categoryId', { categoryId });
    }

    query.orderBy('pet.createdAt', 'DESC');

    return query.getMany();
  }

  // Obtener mascotas por usuario
  async getPetsByUser(
    userId: number,
    page: number = 1,
    limit: number = 100,
    status?: string,
  ): Promise<{ data: Pet[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const query = this.petRepository.createQueryBuilder('pet')
        .distinct(true) // 🔧 Agregar DISTINCT para evitar duplicados
        .where('pet.userId = :userId', { userId })
        .andWhere('pet.isActive = :isActive', { isActive: true }) // 🔧 Solo mascotas activas
        .leftJoinAndSelect('pet.images', 'images')
        .leftJoinAndSelect('pet.category', 'category')
        .leftJoinAndSelect('pet.adoptionRequests', 'adoptionRequests');

      if (status) {
        query.andWhere('pet.status = :status', { status });
      }

      query.orderBy('pet.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await query.getManyAndCount();

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error getting user pets:', error);
      throw new HttpException('Error al obtener mascotas del usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Búsqueda avanzada
  async searchPets(searchDto: SearchPetsDto): Promise<Pet[]> {
    try {
      const query = this.petRepository.createQueryBuilder('pet')
        .leftJoinAndSelect('pet.user', 'user')
        .leftJoinAndSelect('pet.images', 'images')
        .leftJoinAndSelect('pet.category', 'category')
        .where('pet.isActive = :isActive', { isActive: true });

      if (searchDto.name) {
        query.andWhere('pet.name LIKE :name', { name: `%${searchDto.name}%` });
      }

      if (searchDto.breed) {
        query.andWhere('pet.breed LIKE :breed', { breed: `%${searchDto.breed}%` });
      }

      if (searchDto.categoryId) {
        query.andWhere('pet.categoryId = :categoryId', { categoryId: searchDto.categoryId });
      }

      if (searchDto.gender) {
        query.andWhere('pet.gender = :gender', { gender: searchDto.gender });
      }

      if (searchDto.size) {
        query.andWhere('pet.size = :size', { size: searchDto.size });
      }

      if (searchDto.isVaccinated !== undefined) {
        query.andWhere('pet.isVaccinated = :isVaccinated', { isVaccinated: searchDto.isVaccinated });
      }

      if (searchDto.isSterilized !== undefined) {
        query.andWhere('pet.isSterilized = :isSterilized', { isSterilized: searchDto.isSterilized });
      }

      if (searchDto.status) {
        query.andWhere('pet.status = :status', { status: searchDto.status });
      }

      if (searchDto.isRisk !== undefined) {
        query.andWhere('pet.isRisk = :isRisk', { isRisk: searchDto.isRisk });
      }

      query.orderBy('pet.createdAt', 'DESC');

      return query.getMany();
    } catch (error) {
      console.error('Error searching pets:', error);
      throw new HttpException('Error en la búsqueda', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Buscar mascotas cercanas
  async findNearby(
    latitude: number,
    longitude: number,
    radius: number = 10,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Pet[]; total: number; page: number; totalPages: number }> {
    try {
      // Fórmula de Haversine para calcular distancia
      const query = this.petRepository.createQueryBuilder('pet')
        .leftJoinAndSelect('pet.user', 'user')
        .leftJoinAndSelect('pet.images', 'images')
        .leftJoinAndSelect('pet.category', 'category')
        .where('pet.isActive = :isActive', { isActive: true })
        .andWhere('pet.latitude IS NOT NULL')
        .andWhere('pet.longitude IS NOT NULL')
        .andWhere(
          `(6371 * acos(cos(radians(:lat)) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(pet.latitude)))) <= :radius`,
          { lat: latitude, lng: longitude, radius }
        )
        .orderBy('pet.createdAt', 'DESC');

      const skip = (page - 1) * limit;
      query.skip(skip).take(limit);

      const [data, total] = await query.getManyAndCount();

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error finding nearby pets:', error);
      throw new HttpException('Error al buscar mascotas cercanas', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== GESTIÓN DE IMÁGENES ====================

  // Agregar múltiples imágenes
  async addImages(petId: number, files: Express.Multer.File[], userId: number): Promise<PetImage[]> {
    try {
      const pet = await this.petRepository.findOne({ where: { id: petId } });
      
      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      if (pet.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para modificar esta mascota');
      }

      const images: PetImage[] = [];
      const existingImages = await this.petImageRepository.find({ where: { petId } });
      let order = existingImages.length + 1;

      for (const file of files) {
        const imageUrl = await uploadToFirebase(file, 'pets/');
        const petImage = this.petImageRepository.create({
          imageUrl,
          isPrimary: existingImages.length === 0 && order === 1,
          order,
          petId,
        });
        const saved = await this.petImageRepository.save(petImage);
        images.push(saved);
        order++;
      }

      return images;
    } catch (error) {
      console.error('Error adding images:', error);
      throw new HttpException('Error al agregar imágenes', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Eliminar imagen
  async removeImage(petId: number, imageId: number, userId: number): Promise<void> {
    try {
      const pet = await this.petRepository.findOne({ where: { id: petId } });
      
      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      if (pet.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para modificar esta mascota');
      }

      const image = await this.petImageRepository.findOne({ where: { id: imageId, petId } });
      
      if (!image) {
        throw new NotFoundException('Imagen no encontrada');
      }

      await this.petImageRepository.remove(image);
    } catch (error) {
      console.error('Error removing image:', error);
      throw new HttpException('Error al eliminar imagen', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Establecer imagen principal
  async setPrimaryImage(petId: number, imageId: number, userId: number): Promise<PetImage> {
    try {
      const pet = await this.petRepository.findOne({ where: { id: petId } });
      
      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      if (pet.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para modificar esta mascota');
      }

      // Quitar isPrimary de todas las imágenes
      await this.petImageRepository.update({ petId }, { isPrimary: false });

      // Establecer la nueva imagen principal
      const image = await this.petImageRepository.findOne({ where: { id: imageId, petId } });
      
      if (!image) {
        throw new NotFoundException('Imagen no encontrada');
      }

      image.isPrimary = true;
      return await this.petImageRepository.save(image);
    } catch (error) {
      console.error('Error setting primary image:', error);
      throw new HttpException('Error al establecer imagen principal', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== ESTADÍSTICAS ====================

  // Estadísticas generales
  async getGeneralStats(): Promise<any> {
    try {
      const total = await this.petRepository.count({ where: { isActive: true } });
      const available = await this.petRepository.count({ where: { status: 'available', isActive: true } });
      const adopted = await this.petRepository.count({ where: { status: 'adopted', isActive: true } });
      const inRisk = await this.petRepository.count({ where: { isRisk: true, isActive: true } });

      return {
        total,
        available,
        adopted,
        inRisk,
      };
    } catch (error) {
      console.error('Error getting general stats:', error);
      throw new HttpException('Error al obtener estadísticas', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Estadísticas del usuario
  async getUserStats(userId: number): Promise<any> {
    try {
      const total = await this.petRepository.count({ where: { userId } });
      const available = await this.petRepository.count({ where: { userId, status: 'available' } });
      const adopted = await this.petRepository.count({ where: { userId, status: 'adopted' } });
      const pending = await this.petRepository.count({ where: { userId, status: 'pending' } });

      return {
        total,
        available,
        adopted,
        pending,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new HttpException('Error al obtener estadísticas del usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== OTRAS FUNCIONALIDADES ====================

  // Actualizar estado de mascota
  async updatePetStatus(petId: number, status: string, userId: number): Promise<Pet> {
    try {
      const pet = await this.petRepository.findOne({ where: { id: petId } });
      
      if (!pet) {
        throw new NotFoundException('Mascota no encontrada');
      }

      if (pet.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para modificar esta mascota');
      }

      pet.status = status;
      return await this.petRepository.save(pet);
    } catch (error) {
      console.error('Error updating pet status:', error);
      throw new HttpException('Error al actualizar estado', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Toggle favorito (placeholder - requiere tabla de favoritos)
  async toggleFavorite(petId: number, userId: number): Promise<{ isFavorite: boolean }> {
    // TODO: Implementar tabla de favoritos
    // Por ahora retornamos un placeholder
    return { isFavorite: true };
  }

  // Obtener favoritos del usuario (placeholder)
  async getFavoritesByUser(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Pet[]; total: number; page: number; totalPages: number }> {
    // TODO: Implementar tabla de favoritos
    // Por ahora retornamos vacío
    return {
      data: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }
}
