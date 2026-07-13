import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetVaccination } from './pet-vaccination.entity';
import { Pet } from './pet.entity';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';

/**
 * Módulo 3 — Vacunas del expediente.
 * Acceso: el dueño de la mascota, o un usuario privilegiado (ADMIN '1' / VET '3').
 */
@Injectable()
export class VaccinationsService {
  constructor(
    @InjectRepository(PetVaccination)
    private readonly repo: Repository<PetVaccination>,
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
    return this.repo.find({ where: { petId }, order: { appliedAt: 'DESC' } });
  }

  async create(
    petId: number,
    dto: CreateVaccinationDto,
    userId: number,
    roles: string[],
  ) {
    await this.assertAccess(petId, userId, roles);
    const vac = this.repo.create({ ...dto, petId, appliedBy: userId });
    return this.repo.save(vac);
  }

  async remove(petId: number, id: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const vac = await this.repo.findOne({ where: { id, petId } });
    if (!vac) {
      throw new HttpException('Registro no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.repo.remove(vac);
    return { deleted: true };
  }
}
