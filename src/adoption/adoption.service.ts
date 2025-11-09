import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdoptionRequest, AdoptionStatus } from './adoption-request.entity';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';
import { CreateAdoptionRequestDto } from './dto/create-adoption-request.dto';
import { UpdateAdoptionRequestDto } from './dto/update-adoption-request.dto';

@Injectable()
export class AdoptionService {
  constructor(
    @InjectRepository(AdoptionRequest)
    private adoptionRequestRepository: Repository<AdoptionRequest>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Crear nueva solicitud de adopción
  async createAdoptionRequest(
    createAdoptionRequestDto: CreateAdoptionRequestDto,
    adopterId: number,
  ): Promise<AdoptionRequest> {
    const { petId, ...requestData } = createAdoptionRequestDto;

    // Verificar que la mascota existe y está disponible
    const pet = await this.petRepository.findOne({
      where: { id: petId },
      relations: ['user'],
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    if (pet.status !== 'available') {
      throw new BadRequestException('La mascota no está disponible para adopción');
    }

    // Verificar que el adoptante no sea el dueño de la mascota
    if (pet.userId === adopterId) {
      throw new BadRequestException('No puedes adoptar tu propia mascota');
    }

    // Verificar que no exista una solicitud pendiente del mismo adoptante para esta mascota
    const existingRequest = await this.adoptionRequestRepository.findOne({
      where: {
        petId,
        adopterId,
        status: AdoptionStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('Ya tienes una solicitud pendiente para esta mascota');
    }

    // Crear la solicitud
    const adoptionRequest = this.adoptionRequestRepository.create({
      ...requestData,
      petId,
      adopterId,
      status: AdoptionStatus.PENDING,
    });

    const savedRequest = await this.adoptionRequestRepository.save(adoptionRequest);

    // TODO: Enviar notificación al dueño de la mascota
    // await this.notificationService.sendAdoptionRequestNotification(pet.userId, savedRequest);

    return await this.adoptionRequestRepository.findOne({
      where: { id: savedRequest.id },
      relations: ['pet', 'adopter'],
    });
  }

  // Obtener solicitudes por mascota (para donantes)
  async getRequestsByPet(petId: number, userId: number): Promise<AdoptionRequest[]> {
    // Verificar que el usuario es el dueño de la mascota
    const pet = await this.petRepository.findOne({
      where: { id: petId, userId },
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada o no tienes permisos');
    }

    return await this.adoptionRequestRepository.find({
      where: { petId },
      relations: ['adopter', 'pet'],
      order: { createdAt: 'DESC' },
    });
  }

  // Obtener solicitudes del adoptante
  async getRequestsByAdopter(adopterId: number): Promise<AdoptionRequest[]> {
    return await this.adoptionRequestRepository.find({
      where: { adopterId },
      relations: ['pet', 'pet.user'],
      order: { createdAt: 'DESC' },
    });
  }

  // Obtener solicitudes recibidas (para donantes)
  async getRequestsByDonor(donorId: number): Promise<AdoptionRequest[]> {
    return await this.adoptionRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.pet', 'pet')
      .leftJoinAndSelect('request.adopter', 'adopter')
      .where('pet.userId = :donorId', { donorId })
      .orderBy('request.createdAt', 'DESC')
      .getMany();
  }

  // Obtener detalles de una solicitud específica
  async getRequestById(requestId: number, userId: number): Promise<AdoptionRequest> {
    const request = await this.adoptionRequestRepository.findOne({
      where: { id: requestId },
      relations: ['pet', 'pet.user', 'adopter'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario tiene permisos (es el adoptante o el dueño de la mascota)
    if (request.adopterId !== userId && request.pet.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para ver esta solicitud');
    }

    return request;
  }

  // Actualizar estado de solicitud (aprobar/rechazar)
  async updateRequestStatus(
    requestId: number,
    updateDto: UpdateAdoptionRequestDto,
    donorId: number,
  ): Promise<AdoptionRequest> {
    const request = await this.adoptionRequestRepository.findOne({
      where: { id: requestId },
      relations: ['pet', 'adopter'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario es el dueño de la mascota
    if (request.pet.userId !== donorId) {
      throw new ForbiddenException('No tienes permisos para actualizar esta solicitud');
    }

    // Verificar que la solicitud está en estado pendiente
    if (request.status !== AdoptionStatus.PENDING) {
      throw new BadRequestException('Solo se pueden actualizar solicitudes pendientes');
    }

    // Actualizar la solicitud
    Object.assign(request, updateDto);

    if (updateDto.status === AdoptionStatus.APPROVED) {
      request.approvedAt = new Date();
      // Cambiar estado de la mascota a "pending"
      await this.petRepository.update(request.petId, { status: 'pending' });
      
      // Rechazar automáticamente otras solicitudes pendientes para esta mascota
      await this.adoptionRequestRepository.update(
        {
          petId: request.petId,
          status: AdoptionStatus.PENDING,
          id: { $ne: requestId } as any,
        },
        {
          status: AdoptionStatus.REJECTED,
          rejectionReason: 'Se aprobó otra solicitud para esta mascota',
        },
      );
    }

    const updatedRequest = await this.adoptionRequestRepository.save(request);

    // TODO: Enviar notificación al adoptante
    // await this.notificationService.sendAdoptionStatusNotification(request.adopterId, updatedRequest);

    return updatedRequest;
  }

  // Marcar adopción como completada
  async completeAdoption(requestId: number, donorId: number): Promise<AdoptionRequest> {
    const request = await this.adoptionRequestRepository.findOne({
      where: { id: requestId },
      relations: ['pet', 'adopter'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario es el dueño de la mascota
    if (request.pet.userId !== donorId) {
      throw new ForbiddenException('No tienes permisos para completar esta adopción');
    }

    // Verificar que la solicitud está aprobada
    if (request.status !== AdoptionStatus.APPROVED) {
      throw new BadRequestException('Solo se pueden completar solicitudes aprobadas');
    }

    // Actualizar la solicitud y la mascota
    request.status = AdoptionStatus.COMPLETED;
    request.completedAt = new Date();

    await this.petRepository.update(request.petId, { status: 'adopted' });
    
    const completedRequest = await this.adoptionRequestRepository.save(request);

    // TODO: Enviar notificación de adopción completada
    // await this.notificationService.sendAdoptionCompletedNotification(request.adopterId, completedRequest);

    return completedRequest;
  }

  // Cancelar solicitud de adopción (por el adoptante)
  async cancelRequest(requestId: number, adopterId: number): Promise<AdoptionRequest> {
    const request = await this.adoptionRequestRepository.findOne({
      where: { id: requestId, adopterId },
      relations: ['pet'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Solo se pueden cancelar solicitudes pendientes o aprobadas
    if (![AdoptionStatus.PENDING, AdoptionStatus.APPROVED].includes(request.status)) {
      throw new BadRequestException('No se puede cancelar esta solicitud');
    }

    // Si la solicitud estaba aprobada, volver la mascota a disponible
    if (request.status === AdoptionStatus.APPROVED) {
      await this.petRepository.update(request.petId, { status: 'available' });
    }

    request.status = AdoptionStatus.CANCELLED;
    
    return await this.adoptionRequestRepository.save(request);
  }

  // Obtener estadísticas de adopción
  async getAdoptionStats(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const stats: any = {};

    // Estadísticas como adoptante
    const adoptionRequests = await this.adoptionRequestRepository.count({
      where: { adopterId: userId },
    });

    const approvedRequests = await this.adoptionRequestRepository.count({
      where: { adopterId: userId, status: AdoptionStatus.APPROVED },
    });

    const completedAdoptions = await this.adoptionRequestRepository.count({
      where: { adopterId: userId, status: AdoptionStatus.COMPLETED },
    });

    stats.asAdopter = {
      totalRequests: adoptionRequests,
      approvedRequests,
      completedAdoptions,
    };

    // Estadísticas como donante
    const petsOwned = await this.petRepository.count({
      where: { userId },
    });

    const requestsReceived = await this.adoptionRequestRepository
      .createQueryBuilder('request')
      .leftJoin('request.pet', 'pet')
      .where('pet.userId = :userId', { userId })
      .getCount();

    const petsAdopted = await this.petRepository.count({
      where: { userId, status: 'adopted' },
    });

    stats.asDonor = {
      totalPets: petsOwned,
      requestsReceived,
      petsAdopted,
    };

    return stats;
  }
}