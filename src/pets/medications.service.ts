import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetMedication } from './pet-medication.entity';
import { Pet } from './pet.entity';
import { CreateMedicationDto } from './dto/create-medication.dto';

/** Módulo 3 — Medicación. Acceso: dueño o privilegiado (ADMIN '1' / VET '3'). */
@Injectable()
export class MedicationsService {
  constructor(
    @InjectRepository(PetMedication)
    private readonly repo: Repository<PetMedication>,
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
    return this.repo.find({ where: { petId }, order: { startAt: 'DESC' } });
  }

  async create(petId: number, dto: CreateMedicationDto, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const m = this.repo.create({ ...dto, petId, prescribedBy: userId });
    return this.repo.save(m);
  }

  async remove(petId: number, id: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const m = await this.repo.findOne({ where: { id, petId } });
    if (!m) throw new HttpException('Registro no encontrado', HttpStatus.NOT_FOUND);
    await this.repo.remove(m);
    return { deleted: true };
  }
}
