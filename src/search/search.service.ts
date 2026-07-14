import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';

export interface SearchFilters {
  query?: string;
  category?: string;
  location?: string;
  petType?: string;
  size?: string;
  age?: string;
  isVaccinated?: boolean;
  isSterilized?: boolean;
  hasSpecialNeeds?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  pets: Pet[];
  users: User[];
  categories: Category[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  // Búsqueda global en toda la plataforma
  async globalSearch(query: string, limit: number = 10): Promise<SearchResult> {
    const searchTerm = `%${query}%`;

    // Buscar mascotas
    const pets = await this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.category', 'category')
      .leftJoinAndSelect('pet.images', 'images')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere(
        '(pet.name ILIKE :query OR pet.description ILIKE :query OR pet.breed ILIKE :query)',
        { query: searchTerm }
      )
      .orderBy('pet.createdAt', 'DESC')
      .take(limit)
      .getMany();

    // Buscar usuarios (donantes/adoptantes).
    // Este endpoint es PÚBLICO (sin JWT): proyectar SÓLO campos no sensibles.
    // Devolver la entidad completa filtraba email/teléfono/dirección de cualquier
    // usuario a un anónimo buscando por nombre.
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.lastname', 'user.image'])
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('(user.name ILIKE :query OR user.lastname ILIKE :query)',
        { query: searchTerm }
      )
      .take(limit)
      .getMany();

    // Buscar categorías
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true })
      .andWhere('category.name ILIKE :query', { query: searchTerm })
      .take(limit)
      .getMany();

    const total = pets.length + users.length + categories.length;

    return {
      pets,
      users,
      categories,
      total,
      pagination: {
        page: 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Búsqueda avanzada de mascotas con filtros múltiples
  async advancedPetSearch(filters: SearchFilters): Promise<{
    pets: Pet[];
    pagination: any;
    appliedFilters: SearchFilters;
  }> {
    const {
      query,
      category,
      location,
      petType,
      size,
      age,
      isVaccinated,
      isSterilized,
      hasSpecialNeeds,
      latitude,
      longitude,
      radius = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    let queryBuilder = this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.category', 'category')
      .leftJoinAndSelect('pet.images', 'images')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere('pet.status = :status', { status: 'available' });

    // Aplicar filtros
    if (query) {
      queryBuilder.andWhere(
        '(pet.name ILIKE :query OR pet.description ILIKE :query OR pet.breed ILIKE :query OR pet.temperament ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere('category.name ILIKE :category', { category: `%${category}%` });
    }

    if (location) {
      queryBuilder.andWhere('pet.address ILIKE :location', { location: `%${location}%` });
    }

    if (petType) {
      queryBuilder.andWhere('category.name = :petType', { petType });
    }

    if (size) {
      queryBuilder.andWhere('pet.size = :size', { size });
    }

    if (age) {
      // Implementar lógica de filtro por edad
      switch (age) {
        case 'young':
          queryBuilder.andWhere('pet.age ILIKE :youngAge', { youngAge: '%mes%' });
          break;
        case 'adult':
          queryBuilder.andWhere('pet.age ~ :adultAge', { adultAge: '^[1-5] año' });
          break;
        case 'senior':
          queryBuilder.andWhere('pet.age ~ :seniorAge', { seniorAge: '^[6-9]|^[1-9][0-9] año' });
          break;
      }
    }

    if (isVaccinated !== undefined) {
      queryBuilder.andWhere('pet.isVaccinated = :isVaccinated', { isVaccinated });
    }

    if (isSterilized !== undefined) {
      queryBuilder.andWhere('pet.isSterilized = :isSterilized', { isSterilized });
    }

    if (hasSpecialNeeds !== undefined) {
      if (hasSpecialNeeds) {
        queryBuilder.andWhere("pet.specialNeeds IS NOT NULL AND pet.specialNeeds <> ''");
      } else {
        queryBuilder.andWhere("(pet.specialNeeds IS NULL OR pet.specialNeeds = '')");
      }
    }

    // Filtro por proximidad geográfica
    if (latitude && longitude) {
      queryBuilder.andWhere('pet.latitude IS NOT NULL AND pet.longitude IS NOT NULL');
      queryBuilder.andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(pet.latitude)))) <= :radius`,
        { lat: latitude, lng: longitude, radius }
      );

      // Si se busca por proximidad, ordenar por distancia
      if (sortBy === 'distance') {
        queryBuilder.addSelect(
          `(6371 * acos(cos(radians(${latitude})) * cos(radians(pet.latitude)) * cos(radians(pet.longitude) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(pet.latitude))))`,
          'distance'
        );
        queryBuilder.orderBy('distance', sortOrder);
      }
    }

    // Ordenamiento por defecto
    if (sortBy !== 'distance') {
      queryBuilder.orderBy(`pet.${sortBy}`, sortOrder);
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
      appliedFilters: filters,
    };
  }

  // Sugerencias de búsqueda basadas en términos populares
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    const searchTerm = `%${query}%`;

    // Obtener nombres de mascotas populares
    const petNames = await this.petRepository
      .createQueryBuilder('pet')
      .select('DISTINCT pet.name', 'name')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere('pet.name ILIKE :query', { query: searchTerm })
      .orderBy('pet.name', 'ASC')
      .limit(limit)
      .getRawMany();

    // Obtener razas populares
    const breeds = await this.petRepository
      .createQueryBuilder('pet')
      .select('DISTINCT pet.breed', 'breed')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere('pet.breed ILIKE :query', { query: searchTerm })
      .andWhere("pet.breed IS NOT NULL AND pet.breed <> ''")
      .orderBy('pet.breed', 'ASC')
      .limit(limit)
      .getRawMany();

    // Obtener ubicaciones populares
    const locations = await this.petRepository
      .createQueryBuilder('pet')
      .select('DISTINCT pet.address', 'address')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere('pet.address ILIKE :query', { query: searchTerm })
      .andWhere("pet.address IS NOT NULL AND pet.address <> ''")
      .orderBy('pet.address', 'ASC')
      .limit(limit)
      .getRawMany();

    // Combinar y retornar sugerencias únicas
    const suggestions = [
      ...petNames.map(item => item.name),
      ...breeds.map(item => item.breed),
      ...locations.map(item => item.address),
    ];

    return [...new Set(suggestions)].slice(0, limit);
  }

  // Búsqueda de mascotas similares basada en características
  async findSimilarPets(petId: number, limit: number = 5): Promise<Pet[]> {
    const referencePet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['category'],
    });

    if (!referencePet) {
      return [];
    }

    return await this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.user', 'user')
      .leftJoinAndSelect('pet.category', 'category')
      .leftJoinAndSelect('pet.images', 'images')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere('pet.status = :status', { status: 'available' })
      .andWhere('pet.id != :petId', { petId })
      .andWhere(
        '(pet.categoryId = :categoryId OR pet.breed = :breed OR pet.size = :size)',
        {
          categoryId: referencePet.categoryId,
          breed: referencePet.breed,
          size: referencePet.size,
        }
      )
      .orderBy('pet.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  // Obtener filtros disponibles para la búsqueda
  async getAvailableFilters(): Promise<{
    categories: string[];
    breeds: string[];
    sizes: string[];
    locations: string[];
    temperaments: string[];
  }> {
    // Obtener categorías activas
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .select('category.name', 'name')
      .where('category.isActive = :isActive', { isActive: true })
      .getRawMany();

    // Obtener razas únicas
    const breeds = await this.petRepository
      .createQueryBuilder('pet')
      .select('DISTINCT pet.breed', 'breed')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere("pet.breed IS NOT NULL AND pet.breed <> ''")
      .orderBy('pet.breed', 'ASC')
      .getRawMany();

    // Obtener tamaños únicos
    const sizes = await this.petRepository
      .createQueryBuilder('pet')
      .select('DISTINCT pet.size', 'size')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere("pet.size IS NOT NULL AND pet.size <> ''")
      .orderBy('pet.size', 'ASC')
      .getRawMany();

    // Obtener ubicaciones únicas
    const locations = await this.petRepository
      .createQueryBuilder('pet')
      .select('DISTINCT pet.address', 'address')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere("pet.address IS NOT NULL AND pet.address <> ''")
      .orderBy('pet.address', 'ASC')
      .limit(20) // Limitar ubicaciones para evitar lista muy larga
      .getRawMany();

    // Obtener temperamentos únicos
    const temperaments = await this.petRepository
      .createQueryBuilder('pet')
      .select('DISTINCT pet.temperament', 'temperament')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere("pet.temperament IS NOT NULL AND pet.temperament <> ''")
      .orderBy('pet.temperament', 'ASC')
      .getRawMany();

    return {
      categories: categories.map(item => item.name),
      breeds: breeds.map(item => item.breed),
      sizes: sizes.map(item => item.size),
      locations: locations.map(item => item.address),
      temperaments: temperaments.map(item => item.temperament),
    };
  }

  // Estadísticas de búsqueda
  async getSearchStats(): Promise<{
    totalSearches: number;
    popularTerms: string[];
    popularFilters: any;
    searchTrends: any;
  }> {
    // En una implementación real, esto vendría de una tabla de logs de búsqueda
    // Por ahora, retornamos datos simulados basados en la base de datos actual

    const totalPets = await this.petRepository.count({
      where: { isActive: true },
    });

    const popularBreeds = await this.petRepository
      .createQueryBuilder('pet')
      .select('pet.breed', 'breed')
      .addSelect('COUNT(*)', 'count')
      .where('pet.isActive = :isActive', { isActive: true })
      .andWhere("pet.breed IS NOT NULL AND pet.breed <> ''")
      .groupBy('pet.breed')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const popularSizes = await this.petRepository
      .createQueryBuilder('pet')
      .select('pet.size', 'size')
      .addSelect('COUNT(*)', 'count')
      .where('pet.isActive = :isActive', { isActive: true })
      .groupBy('pet.size')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      totalSearches: totalPets, // Simulado
      popularTerms: popularBreeds.slice(0, 5).map(item => item.breed),
      popularFilters: {
        breeds: popularBreeds.reduce((acc, item) => {
          acc[item.breed] = parseInt(item.count);
          return acc;
        }, {}),
        sizes: popularSizes.reduce((acc, item) => {
          acc[item.size] = parseInt(item.count);
          return acc;
        }, {}),
      },
      searchTrends: {
        message: 'Análisis de tendencias pendiente de implementar con tabla de logs',
      },
    };
  }
}