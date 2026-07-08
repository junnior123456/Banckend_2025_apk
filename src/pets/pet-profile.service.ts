import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Pet } from './pet.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Módulo 3 — Perfil extendido + identificador público (QR).
 */
@Injectable()
export class PetProfileService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
  ) {}

  private async assertOwner(petId: number, userId: number, roles: string[]) {
    const pet = await this.petRepo.findOne({ where: { id: petId } });
    if (!pet) throw new HttpException('Mascota no encontrada', HttpStatus.NOT_FOUND);
    const privileged = (roles || []).includes('1') || (roles || []).includes('3');
    if (pet.userId !== userId && !privileged) {
      throw new HttpException('No autorizado sobre esta mascota', HttpStatus.FORBIDDEN);
    }
    return pet;
  }

  /** Garantiza que la mascota tenga un publicUid y lo devuelve. */
  async ensureQr(petId: number, userId: number, roles: string[]) {
    const pet = await this.assertOwner(petId, userId, roles);
    if (!pet.publicUid) {
      pet.publicUid = randomBytes(8).toString('hex'); // 16 chars
      await this.petRepo.save(pet);
    }
    return { publicUid: pet.publicUid };
  }

  async updateProfile(
    petId: number,
    dto: UpdateProfileDto,
    userId: number,
    roles: string[],
  ) {
    const pet = await this.assertOwner(petId, userId, roles);
    if (dto.species !== undefined) pet.species = dto.species;
    if (dto.birthDate !== undefined) pet.birthDate = dto.birthDate;
    if (dto.microchip !== undefined) pet.microchip = dto.microchip;
    await this.petRepo.save(pet);
    return pet;
  }

  /** Ficha pública mínima por publicUid (sin datos médicos). null si no existe. */
  async getPublicFiche(publicUid: string): Promise<Pet | null> {
    return this.petRepo.findOne({ where: { publicUid } });
  }
}
