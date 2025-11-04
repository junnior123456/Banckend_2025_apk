import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './pet.entity';
import { Category } from '../categories/category.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { uploadToFirebase } from '../util/cloud_storage';

@Injectable()
export class PetsService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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
}
