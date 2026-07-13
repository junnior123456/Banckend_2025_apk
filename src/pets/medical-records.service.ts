import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetMedicalRecord } from './pet-medical-record.entity';
import { Pet } from './pet.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';

/**
 * Módulo 3 — Historia clínica.
 * Acceso: el dueño de la mascota, o un usuario privilegiado (ADMIN '1' / VET '3').
 */
@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(PetMedicalRecord)
    private readonly repo: Repository<PetMedicalRecord>,
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
      throw new HttpException(
        'No autorizado sobre esta mascota',
        HttpStatus.FORBIDDEN,
      );
    }
    return pet;
  }

  async list(petId: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    return this.repo.find({ where: { petId }, order: { occurredAt: 'DESC' } });
  }

  async create(
    petId: number,
    dto: CreateMedicalRecordDto,
    userId: number,
    roles: string[],
  ) {
    await this.assertAccess(petId, userId, roles);
    const record = this.repo.create({
      ...dto,
      type: dto.type || 'consulta',
      petId,
      recordedBy: userId,
    });
    return this.repo.save(record);
  }

  async remove(petId: number, id: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const record = await this.repo.findOne({ where: { id, petId } });
    if (!record) {
      throw new HttpException('Registro no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.repo.remove(record);
    return { deleted: true };
  }
}
