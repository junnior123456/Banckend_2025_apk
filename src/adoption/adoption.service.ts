import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdoptionRequest, AdoptionStatus } from './adoption-request.entity';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';
import { CreateAdoptionRequestDto } from './dto/create-adoption-request.dto';
import { UpdateAdoptionRequestDto } from './dto/update-adoption-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { TransfersService } from '../pets/transfers.service';

@Injectable()
export class AdoptionService {
  constructor(
    @InjectRepository(AdoptionRequest)
    private adoptionRequestRepository: Repository<AdoptionRequest>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => TransfersService))
    private transfersService: TransfersService,
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

    // Obtener información del adoptante
    const adopter = await this.userRepository.findOne({
      where: { id: adopterId },
    });

    // 📢 Enviar notificaciones
    try {
      // 1. Notificación al dueño de la mascota (recibe la solicitud)
      await this.notificationsService.createNotification(
        pet.userId, // Usuario que recibe la notificación (dueño de la mascota)
        '🐾 Nueva Solicitud de Adopción',
        `${adopter?.name || 'Alguien'} quiere adoptar a ${pet.name}`,
        NotificationType.ADOPTION_REQUEST,
        {
          requestId: savedRequest.id,
          petId: pet.id,
          petName: pet.name,
          adopterName: adopter?.name || 'Usuario',
        },
        pet.id,
        savedRequest.id,
        adopterId, // Usuario que genera la notificación (adoptante)
      );
      console.log(`✅ Notificación enviada al dueño de ${pet.name} (userId: ${pet.userId})`);

      // 2. Notificación personal al adoptante (confirmación de envío)
      await this.notificationsService.sendAdoptionRequestSentNotification(
        adopterId,
        pet,
        savedRequest.id,
      );
      console.log(`✅ Notificación de confirmación enviada al adoptante (userId: ${adopterId})`);
    } catch (error) {
      console.error('❌ Error enviando notificaciones:', error);
      // No lanzar error, la solicitud ya se creó exitosamente
    }

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
      await this.adoptionRequestRepository
        .createQueryBuilder()
        .update(AdoptionRequest)
        .set({
          status: AdoptionStatus.REJECTED,
          rejectionReason: 'Se aprobó otra solicitud para esta mascota',
        })
        .where('petId = :petId', { petId: request.petId })
        .andWhere('status = :status', { status: AdoptionStatus.PENDING })
        .andWhere('id != :requestId', { requestId })
        .execute();
    }

    const updatedRequest = await this.adoptionRequestRepository.save(request);

    // Enviar notificación al adoptante sobre el cambio de estado
    try {
      if (updateDto.status === AdoptionStatus.APPROVED) {
        await this.notificationsService.createNotification(
          request.adopterId,
          '✅ Solicitud Aprobada',
          `¡Felicidades! Tu solicitud para adoptar a ${request.pet.name} ha sido aprobada`,
          NotificationType.ADOPTION_APPROVED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
            donorComments: updateDto.donorComments,
          },
          request.pet.id,
          request.id,
          donorId,
        );
        console.log(`✅ Notificación de aprobación enviada al adoptante (userId: ${request.adopterId})`);
      } else if (updateDto.status === AdoptionStatus.REJECTED) {
        await this.notificationsService.createNotification(
          request.adopterId,
          '❌ Solicitud Rechazada',
          `Tu solicitud para adoptar a ${request.pet.name} ha sido rechazada`,
          NotificationType.ADOPTION_REJECTED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
            rejectionReason: updateDto.rejectionReason,
          },
          request.pet.id,
          request.id,
          donorId,
        );
        console.log(`✅ Notificación de rechazo enviada al adoptante (userId: ${request.adopterId})`);
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de estado:', error);
    }

    return updatedRequest;
  }

  // Donante confirma entrega de mascota
  async donorConfirmDelivery(requestId: number, donorId: number): Promise<AdoptionRequest> {
    const request = await this.adoptionRequestRepository.findOne({
      where: { id: requestId },
      relations: ['pet', 'adopter'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario es el dueño de la mascota
    if (request.pet.userId !== donorId) {
      throw new ForbiddenException('No tienes permisos para confirmar esta entrega');
    }

    // Verificar que la solicitud está aprobada o esperando confirmación
    if (![AdoptionStatus.APPROVED, AdoptionStatus.AWAITING_ADOPTER_CONFIRMATION].includes(request.status)) {
      throw new BadRequestException('Solo se pueden confirmar entregas de solicitudes aprobadas');
    }
    
    // Si el donante ya confirmó antes, no permitir confirmar de nuevo
    if (request.donorConfirmedAt) {
      throw new BadRequestException('Ya confirmaste la entrega anteriormente');
    }

    // Marcar confirmación del donante
    request.donorConfirmedAt = new Date();

    // Si el adoptante ya confirmó, completar la adopción
    if (request.adopterConfirmedAt) {
      request.completedAt = new Date();
      request.status = AdoptionStatus.COMPLETED;
      
      // Actualizar estado de la mascota a adoptada
      await this.petRepository.update(request.petId, { status: 'adopted' });

      // El expediente viaja con la mascota: el adoptante pasa a ser su dueño.
      // Si esto falla, la adopción sigue completada; se avisa en los logs.
      try {
        await this.transfersService.transferOwnership(request.petId, request.adopterId, {
          reason: 'adoption',
          adoptionRequestId: request.id,
          performedBy: request.pet.userId,
        });
      } catch (error) {
        console.error('❌ No se pudo transferir el expediente:', error.message);
      }
      
      // Enviar notificación de adopción completada a ambos
      try {
        // Notificación al donante
        await this.notificationsService.createNotification(
          request.pet.userId,
          '🎉 ¡Adopción Completada!',
          `La adopción de ${request.pet.name} se ha completado exitosamente`,
          NotificationType.PET_ADOPTED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
            adopterName: request.adopter?.name || 'El adoptante',
          },
          request.pet.id,
          request.id,
          request.adopterId,
        );

        // Notificación al adoptante
        await this.notificationsService.createNotification(
          request.adopterId,
          '🎉 ¡Adopción Completada!',
          `¡Felicidades! La adopción de ${request.pet.name} se ha completado exitosamente`,
          NotificationType.ADOPTION_COMPLETED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
          },
          request.pet.id,
          request.id,
          request.pet.userId,
        );
        console.log(`✅ Notificaciones de adopción completada enviadas a ambos usuarios`);

        // Enviar notificación comunitaria sobre la adopción completada
        try {
          await this.notificationsService.notifyAdoptionCompleted(request.pet, request.adopter);
          console.log(`✅ Notificación comunitaria enviada sobre adopción de ${request.pet.name}`);
        } catch (error) {
          console.error('❌ Error enviando notificación comunitaria:', error);
        }
      } catch (error) {
        console.error('❌ Error enviando notificaciones de adopción completada:', error);
      }
    } else {
      // Si el adoptante no ha confirmado, cambiar a estado esperando adoptante
      request.status = AdoptionStatus.AWAITING_ADOPTER_CONFIRMATION;
      
      // Enviar notificación al adoptante para que confirme la recepción
      try {
        await this.notificationsService.createNotification(
          request.adopterId,
          '📦 Confirma la Recepción',
          `El dueño de ${request.pet.name} ha confirmado la entrega. Por favor, confirma que recibiste a tu nueva mascota`,
          NotificationType.ADOPTION_COMPLETED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
          },
          request.pet.id,
          request.id,
          donorId,
        );
        console.log(`✅ Notificación de confirmación enviada al adoptante (userId: ${request.adopterId})`);
      } catch (error) {
        console.error('❌ Error enviando notificación de confirmación:', error);
      }
    }

    const updatedRequest = await this.adoptionRequestRepository.save(request);
    return updatedRequest;
  }

  // Adoptante confirma recepción de mascota
  async adopterConfirmReception(requestId: number, adopterId: number): Promise<AdoptionRequest> {
    const request = await this.adoptionRequestRepository.findOne({
      where: { id: requestId },
      relations: ['pet', 'adopter'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Verificar que el usuario es el adoptante
    if (request.adopterId !== adopterId) {
      throw new ForbiddenException('No tienes permisos para confirmar esta recepción');
    }

    // Verificar que la solicitud está aprobada o esperando confirmación del donante
    if (![AdoptionStatus.APPROVED, AdoptionStatus.AWAITING_ADOPTER_CONFIRMATION].includes(request.status)) {
      throw new BadRequestException('Solo se pueden confirmar solicitudes aprobadas');
    }

    // Marcar confirmación del adoptante
    request.adopterConfirmedAt = new Date();

    // Si el donante ya confirmó, completar la adopción
    if (request.donorConfirmedAt) {
      request.completedAt = new Date();
      request.status = AdoptionStatus.COMPLETED;
      
      // Actualizar estado de la mascota a adoptada
      await this.petRepository.update(request.petId, { status: 'adopted' });

      // El expediente viaja con la mascota: el adoptante pasa a ser su dueño.
      // Si esto falla, la adopción sigue completada; se avisa en los logs.
      try {
        await this.transfersService.transferOwnership(request.petId, request.adopterId, {
          reason: 'adoption',
          adoptionRequestId: request.id,
          performedBy: request.pet.userId,
        });
      } catch (error) {
        console.error('❌ No se pudo transferir el expediente:', error.message);
      }
      
      // Enviar notificación de adopción completada a ambos
      try {
        // Notificación al adoptante
        await this.notificationsService.createNotification(
          request.adopterId,
          '🎉 ¡Adopción Completada!',
          `¡Felicidades! La adopción de ${request.pet.name} se ha completado exitosamente`,
          NotificationType.ADOPTION_COMPLETED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
          },
          request.pet.id,
          request.id,
          request.pet.userId,
        );

        // Notificación al donante
        await this.notificationsService.createNotification(
          request.pet.userId,
          '🎉 ¡Adopción Completada!',
          `La adopción de ${request.pet.name} se ha completado exitosamente`,
          NotificationType.PET_ADOPTED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
            adopterName: request.adopter?.name || 'El adoptante',
          },
          request.pet.id,
          request.id,
          request.adopterId,
        );
        console.log(`✅ Notificaciones de adopción completada enviadas a ambos usuarios`);

        // Enviar notificación comunitaria sobre la adopción completada
        try {
          await this.notificationsService.notifyAdoptionCompleted(request.pet, request.adopter);
          console.log(`✅ Notificación comunitaria enviada sobre adopción de ${request.pet.name}`);
        } catch (error) {
          console.error('❌ Error enviando notificación comunitaria:', error);
        }
      } catch (error) {
        console.error('❌ Error enviando notificaciones de adopción completada:', error);
      }
    } else {
      // Si el donante no ha confirmado, cambiar a estado esperando donante
      request.status = AdoptionStatus.AWAITING_ADOPTER_CONFIRMATION; // Reutilizamos este estado
      
      // Enviar notificación al donante para que confirme
      try {
        await this.notificationsService.createNotification(
          request.pet.userId,
          '📦 Confirma la Entrega',
          `${request.adopter?.name || 'El adoptante'} ha confirmado que recibió a ${request.pet.name}. Por favor, confirma la entrega`,
          NotificationType.ADOPTION_COMPLETED,
          {
            requestId: request.id,
            petId: request.pet.id,
            petName: request.pet.name,
          },
          request.pet.id,
          request.id,
          request.adopterId,
        );
        console.log(`✅ Notificación de confirmación enviada al donante (userId: ${request.pet.userId})`);
      } catch (error) {
        console.error('❌ Error enviando notificación al donante:', error);
      }
    }

    const updatedRequest = await this.adoptionRequestRepository.save(request);

    return updatedRequest;
  }

  // Método legacy para compatibilidad (ahora usa donorConfirmDelivery)
  async completeAdoption(requestId: number, donorId: number): Promise<AdoptionRequest> {
    return await this.donorConfirmDelivery(requestId, donorId);
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