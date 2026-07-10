import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VetRequest } from './vet-request.entity';
import { CreateVetRequestDto } from './dto/create-vet-request.dto';
import { User } from '../users/user.entity';

const VET_ROLE = '3';

@Injectable()
export class VetRequestsService {
  constructor(
    @InjectRepository(VetRequest)
    private readonly repo: Repository<VetRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** El cliente envía su solicitud. */
  async create(userId: number, dto: CreateVetRequestDto): Promise<VetRequest> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    const isVet = (user.roles ?? []).some((r) => r.id === VET_ROLE);
    if (isVet) {
      throw new HttpException('Ya eres veterinario', HttpStatus.CONFLICT);
    }
    const pending = await this.repo.findOne({
      where: { userId, status: 'pending' },
    });
    if (pending) {
      throw new HttpException(
        'Ya tienes una solicitud pendiente de revisión',
        HttpStatus.CONFLICT,
      );
    }
    const request = this.repo.create({ ...dto, userId, status: 'pending' });
    return this.repo.save(request);
  }

  /** El cliente ve su última solicitud (para saber el estado). */
  async mine(userId: number): Promise<VetRequest | null> {
    return this.repo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** El admin lista las solicitudes, opcionalmente por estado, con datos del solicitante. */
  async list(status?: string): Promise<any[]> {
    const where = status ? { status } : {};
    const requests = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    if (requests.length === 0) return [];
    const userIds = [...new Set(requests.map((r) => r.userId))];
    const users = await this.userRepo.find({ where: { id: In(userIds) } });
    const byId = new Map(users.map((u) => [u.id, u]));
    return requests.map((r) => {
      const u = byId.get(r.userId);
      return {
        ...r,
        user: u
          ? { id: u.id, name: u.name, lastname: u.lastname, email: u.email }
          : null,
      };
    });
  }

  /** El admin aprueba: marca approved y asciende la cuenta a VET. */
  async approve(id: number, adminId: number): Promise<VetRequest> {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) {
      throw new HttpException('Solicitud no encontrada', HttpStatus.NOT_FOUND);
    }
    if (request.status === 'approved') {
      throw new HttpException('La solicitud ya fue aprobada', HttpStatus.CONFLICT);
    }
    // Ascender la cuenta a VET (reemplaza los roles actuales, igual que UsersService.setRole).
    const user = await this.userRepo.findOne({
      where: { id: request.userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new HttpException(
        'El usuario de la solicitud ya no existe',
        HttpStatus.NOT_FOUND,
      );
    }
    const rolesToRemove = (user.roles ?? [])
      .map((r) => r.id)
      .filter((rid) => rid !== VET_ROLE);
    await this.userRepo
      .createQueryBuilder()
      .relation(User, 'roles')
      .of(request.userId)
      .addAndRemove([VET_ROLE], rolesToRemove);

    request.status = 'approved';
    request.reviewedBy = adminId;
    return this.repo.save(request);
  }

  /** El admin rechaza con una nota opcional. */
  async reject(id: number, adminId: number, note?: string): Promise<VetRequest> {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) {
      throw new HttpException('Solicitud no encontrada', HttpStatus.NOT_FOUND);
    }
    request.status = 'rejected';
    request.reviewedBy = adminId;
    if (note) request.reviewNote = note;
    return this.repo.save(request);
  }
}
