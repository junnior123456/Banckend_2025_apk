import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetWeight } from './pet-weight.entity';
import { Pet } from './pet.entity';
import { CreateWeightDto } from './dto/create-weight.dto';

/**
 * Módulo 3 — Serie de peso del expediente.
 * Acceso: dueño de la mascota o usuario privilegiado (ADMIN '1' / VET '3').
 */
@Injectable()
export class WeightsService {
  constructor(
    @InjectRepository(PetWeight)
    private readonly repo: Repository<PetWeight>,
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
  ) {}

  private async assertAccess(petId: number, userId: number, roles: string[]) {
    const pet = await this.petRepo.findOne({ where: { id: petId } });
    if (!pet) {
      throw new HttpException('Mascota no encontrada', HttpStatus.NOT_FOUND);
    }
    const privileged = (roles || []).includes('1') || (roles || []).includes('3');
    if (pet.userId !== userId && !privileged) {
      throw new HttpException('No autorizado sobre esta mascota', HttpStatus.FORBIDDEN);
    }
    return pet;
  }

  async list(petId: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    return this.repo.find({ where: { petId }, order: { measuredAt: 'ASC' } });
  }

  async create(petId: number, dto: CreateWeightDto, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const w = this.repo.create({ ...dto, petId, recordedBy: userId });
    return this.repo.save(w);
  }

  async remove(petId: number, id: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const w = await this.repo.findOne({ where: { id, petId } });
    if (!w) {
      throw new HttpException('Registro no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.repo.remove(w);
    return { deleted: true };
  }
}
