import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetAllergy } from './pet-allergy.entity';
import { Pet } from './pet.entity';
import { CreateAllergyDto } from './dto/create-allergy.dto';

/** Módulo 3 — Alergias. Acceso: dueño o privilegiado (ADMIN '1' / VET '3'). */
@Injectable()
export class AllergiesService {
  constructor(
    @InjectRepository(PetAllergy)
    private readonly repo: Repository<PetAllergy>,
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
  ) {}

  private async assertAccess(petId: number, userId: number, roles: string[]) {
    const pet = await this.petRepo.findOne({ where: { id: petId } });
    if (!pet) throw new HttpException('Mascota no encontrada', HttpStatus.NOT_FOUND);
    const privileged = (roles || []).includes('1') || (roles || []).includes('3');
    if (pet.userId !== userId && !privileged) {
      throw new HttpException('No autorizado sobre esta mascota', HttpStatus.FORBIDDEN);
    }
    return pet;
  }

  async list(petId: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    return this.repo.find({ where: { petId }, order: { createdAt: 'DESC' } });
  }

  async create(petId: number, dto: CreateAllergyDto, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const a = this.repo.create({ ...dto, petId, recordedBy: userId });
    return this.repo.save(a);
  }

  async remove(petId: number, id: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const a = await this.repo.findOne({ where: { id, petId } });
    if (!a) throw new HttpException('Registro no encontrado', HttpStatus.NOT_FOUND);
    await this.repo.remove(a);
    return { deleted: true };
  }
}
