import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';
import { Pet } from '../pets/pet.entity';
import { AdoptionRequest } from '../adoption/adoption-request.entity';
import { PushNotificationService } from './push-notification.service';
import { ejecutarComoSistema, rlsStorage } from '../common/rls/rls.context';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(AdoptionRequest)
    private adoptionRequestRepository: Repository<AdoptionRequest>,
    private pushNotificationService: PushNotificationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Ejecuta `fn` con `app.system = on` en la transacción ACTUAL (la de la
   * petición o la del cron), restaurando el valor previo al terminar.
   *
   * Por qué: las notificaciones se crean PARA OTROS usuarios (te comentan, te
   * piden en adopción, difusión comunitaria...). El INSERT lo permite la política
   * (`WITH CHECK true`), pero TypeORM añade `RETURNING`, y Postgres aplica la
   * política de SELECT a la fila devuelta: como es de OTRO usuario, la relectura
   * falla (42501) y aborta la transacción, con lo que el write principal
   * (adopción, donación...) se pierde en el rollback.
   *
   * Se hace en la MISMA transacción (no en una aparte) para que las FK a filas
   * recién creadas y aún sin commit —p.ej. `adoptionRequestId`— resuelvan y todo
   * sea atómico. Se restaura `app.system` a su valor previo para no dejar el cron
   * (que ya corre como sistema) en un estado incorrecto. Si no hay transacción en
   * curso, se abre una propia de sistema.
   */
  private async _comoSistema<T>(fn: () => Promise<T>): Promise<T> {
    const store = rlsStorage.getStore();
    if (!store?.queryRunner) {
      return ejecutarComoSistema(this.dataSource, fn);
    }
    const qr = store.queryRunner;
    const rows = await qr.query("SELECT current_setting('app.system', true) AS v");
    const previo = rows?.[0]?.v === 'on' ? 'on' : 'off';
    await qr.query("SELECT set_config('app.system', 'on', true)");
    try {
      return await fn();
    } finally {
      await qr.query('SELECT set_config($1, $2, true)', ['app.system', previo]);
    }
  }

  private _saveSys(entities: any): Promise<any> {
    return this._comoSistema(() => this.notificationRepository.save(entities));
  }

  // Obtener notificaciones del usuario con paginación
  async getNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.pet', 'pet')
      .leftJoinAndSelect('notification.fromUser', 'fromUser')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener contador de notificaciones no leídas
  async getUnreadCount(userId: number): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: number, userId: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      return await this.notificationRepository.save(notification);
    }

    return notification;
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(userId: number) {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return { updatedCount: result.affected };
  }

  // Eliminar notificación
  async deleteNotification(notificationId: number, userId: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    await this.notificationRepository.remove(notification);
  }

  // Limpiar notificaciones antiguas (más de 30 días)
  async cleanupOldNotifications(userId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.notificationRepository.delete({
      userId,
      createdAt: LessThan(thirtyDaysAgo),
      isRead: true,
    });
  }

  // Crear nueva notificación
  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: NotificationType,
    data?: any,
    petId?: number,
    adoptionRequestId?: number,
    fromUserId?: number,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      data,
      petId,
      adoptionRequestId,
      fromUserId,
    });

    const savedNotification = await this._saveSys(notification);

    // Enviar push notification si el usuario tiene token
    await this.pushNotificationService.sendToUser(userId, {
      title,
      body: message,
      data: data ? Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {}) : undefined,
    });

    return savedNotification;
  }

  // Notificaciones específicas para diferentes eventos

  // Notificación de nueva solicitud de adopción
  async sendAdoptionRequestNotification(
    donorId: number,
    adoptionRequest: AdoptionRequest,
  ): Promise<Notification> {
    const pet = await this.petRepository.findOne({ where: { id: adoptionRequest.petId } });
    const adopter = await this.userRepository.findOne({ where: { id: adoptionRequest.adopterId } });

    // Enviar push notification específica
    await this.pushNotificationService.sendAdoptionRequestNotification(
      donorId,
      pet.name,
      adopter.name,
    );

    return await this.createNotification(
      donorId,
      'Nueva solicitud de adopción',
      `${adopter.name} ha enviado una solicitud para adoptar a ${pet.name}`,
      NotificationType.ADOPTION_REQUEST,
      {
        adoptionRequestId: adoptionRequest.id,
        petName: pet.name,
        adopterName: adopter.name,
      },
      pet.id,
      adoptionRequest.id,
      adopter.id,
    );
  }

  // Notificación de cambio de estado de solicitud
  async sendAdoptionStatusNotification(
    adopterId: number,
    adoptionRequest: AdoptionRequest,
  ): Promise<Notification> {
    const pet = await this.petRepository.findOne({ where: { id: adoptionRequest.petId } });
    
    let title: string;
    let message: string;
    let type: NotificationType;

    switch (adoptionRequest.status) {
      case 'approved':
        title = '¡Solicitud aprobada!';
        message = `Tu solicitud para adoptar a ${pet.name} ha sido aprobada`;
        type = NotificationType.ADOPTION_APPROVED;
        break;
      case 'rejected':
        title = 'Solicitud rechazada';
        message = `Tu solicitud para adoptar a ${pet.name} ha sido rechazada`;
        type = NotificationType.ADOPTION_REJECTED;
        break;
      case 'completed':
        title = '¡Adopción completada!';
        message = `¡Felicidades! La adopción de ${pet.name} ha sido completada`;
        type = NotificationType.ADOPTION_COMPLETED;
        break;
      default:
        return null;
    }

    // Enviar push notification específica
    await this.pushNotificationService.sendAdoptionStatusNotification(
      adopterId,
      pet.name,
      adoptionRequest.status as 'approved' | 'rejected' | 'completed',
    );

    return await this.createNotification(
      adopterId,
      title,
      message,
      type,
      {
        adoptionRequestId: adoptionRequest.id,
        petName: pet.name,
        status: adoptionRequest.status,
      },
      pet.id,
      adoptionRequest.id,
    );
  }

  // Notificación de nuevo comentario
  async sendNewCommentNotification(
    petOwnerId: number,
    comment: any,
  ): Promise<Notification> {
    const pet = await this.petRepository.findOne({ where: { id: comment.petId } });
    const commenter = await this.userRepository.findOne({ where: { id: comment.userId } });

    // Enviar push notification específica
    await this.pushNotificationService.sendNewCommentNotification(
      petOwnerId,
      pet.name,
      commenter.name,
    );

    return await this.createNotification(
      petOwnerId,
      'Nuevo comentario',
      `${commenter.name} comentó en la publicación de ${pet.name}`,
      NotificationType.NEW_COMMENT,
      {
        commentId: comment.id,
        petName: pet.name,
        commenterName: commenter.name,
        commentContent: comment.content.substring(0, 100),
      },
      pet.id,
      null,
      commenter.id,
    );
  }

  // Notificación de respuesta a comentario
  async sendCommentReplyNotification(
    originalCommenterId: number,
    reply: any,
  ): Promise<Notification> {
    const pet = await this.petRepository.findOne({ where: { id: reply.petId } });
    const replier = await this.userRepository.findOne({ where: { id: reply.userId } });

    // Enviar push notification específica
    await this.pushNotificationService.sendCommentReplyNotification(
      originalCommenterId,
      pet.name,
      replier.name,
    );

    return await this.createNotification(
      originalCommenterId,
      'Nueva respuesta',
      `${replier.name} respondió a tu comentario en ${pet.name}`,
      NotificationType.COMMENT_REPLY,
      {
        commentId: reply.id,
        petName: pet.name,
        replierName: replier.name,
        replyContent: reply.content.substring(0, 100),
      },
      pet.id,
      null,
      replier.id,
    );
  }

  // Notificación de mascota adoptada
  async sendPetAdoptedNotification(
    interestedUserId: number,
    pet: Pet,
  ): Promise<Notification> {
    // Enviar push notification específica
    await this.pushNotificationService.sendPetAdoptedNotification(
      interestedUserId,
      pet.name,
    );

    return await this.createNotification(
      interestedUserId,
      'Mascota adoptada',
      `${pet.name} ha sido adoptada por otra familia`,
      NotificationType.PET_ADOPTED,
      {
        petName: pet.name,
        petId: pet.id,
      },
      pet.id,
    );
  }

  // Obtener configuración de notificaciones del usuario
  async getNotificationSettings(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Por defecto, todas las notificaciones están habilitadas
    // En una implementación real, esto vendría de una tabla de configuración
    return {
      adoptionRequests: true,
      adoptionUpdates: true,
      comments: true,
      petUpdates: true,
      systemMessages: true,
      pushNotifications: !!user.notification_token,
    };
  }

  // Actualizar configuración de notificaciones
  async updateNotificationSettings(userId: number, settings: any) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // En una implementación real, esto se guardaría en una tabla de configuración
    // Por ahora, solo actualizamos el token de notificaciones push
    if (settings.pushNotifications !== undefined) {
      if (!settings.pushNotifications) {
        user.notification_token = null;
      }
      await this.userRepository.save(user);
    }

    return settings;
  }

  // Obtener estadísticas de notificaciones
  async getNotificationStats(userId: number) {
    const total = await this.notificationRepository.count({
      where: { userId },
    });

    const unread = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    const byType = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.userId = :userId', { userId })
      .groupBy('notification.type')
      .getRawMany();

    return {
      total,
      unread,
      read: total - unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  // Actualizar token de notificación
  async updateNotificationToken(userId: number, token: string) {
    const result = await this.pushNotificationService.updateUserToken(userId, token);
    
    return {
      tokenUpdated: result,
      userId,
    };
  }

  // Enviar notificación de prueba
  async sendTestNotification(userId: number): Promise<boolean> {
    return await this.pushNotificationService.sendTestNotification(userId);
  }

  // (Método movido al final del archivo para mejor organización)

  // Notificar a todos los usuarios sobre mascota en riesgo
  async notifyNewPetInRisk(pet: Pet): Promise<void> {
    try {
      // Obtener todos los usuarios activos excepto el que reportó
      const users = await this.userRepository.find({
        where: { isActive: true },
      });

      const notifications = users
        .filter(user => user.id !== pet.userId)
        .map(user => {
          return this.notificationRepository.create({
            userId: user.id,
            title: '⚠️ Mascota en riesgo reportada',
            message: `${pet.name} ha sido reportado como en riesgo`,
            type: NotificationType.PET_IN_RISK,
            petId: pet.id,
            fromUserId: pet.userId,
            data: {
              petName: pet.name,
              petCategory: pet.categoryId,
              isRisk: true,
            },
          });
        });

      if (notifications.length > 0) {
        await this._saveSys(notifications);
        console.log(`✅ Notificaciones enviadas para mascota en riesgo: ${pet.name}`);
      }
    } catch (error) {
      console.error('Error enviando notificaciones de mascota en riesgo:', error);
    }
  }

  // Notificar a todos los usuarios sobre nueva donación
  async notifyNewDonation(donation: any): Promise<void> {
    try {
      // Obtener todos los usuarios activos excepto el donante
      const users = await this.userRepository.find({
        where: { isActive: true },
      });

      const donor = await this.userRepository.findOne({
        where: { id: donation.userId },
      });

      const notifications = users
        .filter(user => user.id !== donation.userId)
        .map(user => {
          return this.notificationRepository.create({
            userId: user.id,
            title: '💝 Nueva donación recibida',
            message: `${donor?.name || 'Alguien'} ha realizado una donación de S/ ${donation.amount}`,
            type: NotificationType.NEW_DONATION,
            fromUserId: donation.userId,
            data: {
              donorName: donor?.name || 'Anónimo',
              amount: donation.amount,
              donationId: donation.id,
            },
          });
        });

      if (notifications.length > 0) {
        await this._saveSys(notifications);
        console.log(`✅ Notificaciones enviadas para nueva donación: S/ ${donation.amount}`);
      }
    } catch (error) {
      console.error('Error enviando notificaciones de nueva donación:', error);
    }
  }

  // Eliminar notificaciones asociadas a una mascota
  async deleteNotificationsByPetId(petId: number): Promise<void> {
    try {
      // Como sistema: al borrar una mascota hay que limpiar las notificaciones
      // de TODOS los usuarios sobre ella, no solo las del dueño que la borra.
      await this._comoSistema(() =>
        this.notificationRepository.delete({ petId }),
      );
      console.log(`✅ Notificaciones eliminadas para mascota ID: ${petId}`);
    } catch (error) {
      console.error('Error eliminando notificaciones de mascota:', error);
      // No lanzar error para no bloquear la eliminación de la mascota
    }
  }

  // ========== NOTIFICACIONES COMUNITARIAS (A TODOS LOS USUARIOS) ==========

  // Notificar a todos sobre nueva mascota disponible para adopción
  async notifyNewPetForAdoption(pet: Pet): Promise<void> {
    try {
      // Obtener todos los usuarios activos excepto el que publicó
      const users = await this.userRepository.find({
        where: { isActive: true },
      });

      const owner = await this.userRepository.findOne({
        where: { id: pet.userId },
      });

      const notifications = users
        .filter(user => user.id !== pet.userId)
        .map(user => {
          return this.notificationRepository.create({
            userId: user.id,
            title: '🐾 Nueva mascota disponible',
            message: `${pet.name} está disponible para adopción`,
            type: NotificationType.NEW_PET,
            petId: pet.id,
            fromUserId: pet.userId,
            data: {
              petName: pet.name,
              petCategory: pet.categoryId,
              ownerName: owner?.name || 'Usuario',
              isRisk: false,
            },
          });
        });

      if (notifications.length > 0) {
        await this._saveSys(notifications);
        console.log(`✅ Notificaciones comunitarias enviadas: Nueva mascota ${pet.name}`);
      }
    } catch (error) {
      console.error('Error enviando notificaciones de nueva mascota:', error);
    }
  }

  // Notificar a todos sobre adopción completada (estadística comunitaria)
  async notifyAdoptionCompleted(pet: Pet, adopter: User): Promise<void> {
    try {
      // Obtener todos los usuarios activos excepto el adoptante y el donante
      const users = await this.userRepository.find({
        where: { isActive: true },
      });

      // Contar adopciones completadas este mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const adoptionsThisMonth = await this.notificationRepository.count({
        where: {
          type: NotificationType.ADOPTION_COMPLETED,
          // Pasar un Date suelto genera una igualdad exacta (= medianoche del
          // día 1), que casi nunca casa. Lo correcto es ">= inicio de mes".
          createdAt: MoreThanOrEqual(startOfMonth),
        },
      });

      const notifications = users
        .filter(user => user.id !== pet.userId && user.id !== adopter.id)
        .map(user => {
          return this.notificationRepository.create({
            userId: user.id,
            title: '🎉 ¡Adopción exitosa!',
            message: `${pet.name} encontró un hogar. ¡Ya son ${adoptionsThisMonth + 1} adopciones este mes!`,
            type: NotificationType.ADOPTION_COMPLETED,
            petId: pet.id,
            fromUserId: adopter.id,
            data: {
              petName: pet.name,
              adopterName: adopter.name,
              adoptionsThisMonth: adoptionsThisMonth + 1,
              isCommunityNotification: true,
            },
          });
        });

      if (notifications.length > 0) {
        await this._saveSys(notifications);
        console.log(`✅ Notificaciones comunitarias enviadas: Adopción de ${pet.name} (${adoptionsThisMonth + 1} este mes)`);
      }
    } catch (error) {
      console.error('Error enviando notificaciones de adopción completada:', error);
    }
  }

  // Notificar a todos sobre mascota rescatada (cambió de riesgo a adopción)
  async notifyPetRescued(pet: Pet): Promise<void> {
    try {
      // Obtener todos los usuarios activos excepto el rescatador
      const users = await this.userRepository.find({
        where: { isActive: true },
      });

      const rescuer = await this.userRepository.findOne({
        where: { id: pet.userId },
      });

      const notifications = users
        .filter(user => user.id !== pet.userId)
        .map(user => {
          return this.notificationRepository.create({
            userId: user.id,
            title: '💚 ¡Mascota rescatada!',
            message: `${pet.name} fue rescatado y ahora está fuera de peligro`,
            type: NotificationType.PET_AVAILABLE,
            petId: pet.id,
            fromUserId: pet.userId,
            data: {
              petName: pet.name,
              rescuerName: rescuer?.name || 'Usuario',
              wasInRisk: true,
            },
          });
        });

      if (notifications.length > 0) {
        await this._saveSys(notifications);
        console.log(`✅ Notificaciones comunitarias enviadas: Mascota rescatada ${pet.name}`);
      }
    } catch (error) {
      console.error('Error enviando notificaciones de mascota rescatada:', error);
    }
  }

  // ========== NUEVAS NOTIFICACIONES PERSONALES ==========

  // Notificación de bienvenida al registrarse
  async sendWelcomeNotification(userId: number, userName: string): Promise<Notification> {
    try {
      return await this.createNotification(
        userId,
        '🎉 ¡Bienvenido a PawFinder!',
        `Hola ${userName}, gracias por elegirnos. Juntos ayudaremos a más mascotas a encontrar un hogar.`,
        NotificationType.WELCOME,
        {
          userName,
          registeredAt: new Date().toISOString(),
        },
      );
    } catch (error) {
      console.error('Error enviando notificación de bienvenida:', error);
      return null;
    }
  }

  // Notificación personal al publicar mascota en adopción
  async sendPetPublishedNotification(userId: number, pet: Pet): Promise<Notification> {
    try {
      return await this.createNotification(
        userId,
        '✅ Mascota publicada',
        `Has puesto en adopción a ${pet.name}. Tu publicación ya está visible para todos.`,
        NotificationType.PET_PUBLISHED,
        {
          petName: pet.name,
          petId: pet.id,
          publishedAt: new Date().toISOString(),
        },
        pet.id,
        null,
        userId,
      );
    } catch (error) {
      console.error('Error enviando notificación de mascota publicada:', error);
      return null;
    }
  }

  // Notificación personal al publicar mascota en riesgo
  async sendPetRiskPublishedNotification(userId: number, pet: Pet): Promise<Notification> {
    try {
      return await this.createNotification(
        userId,
        '⚠️ Reporte de riesgo publicado',
        `Has reportado a ${pet.name} como mascota en riesgo. La comunidad ha sido notificada.`,
        NotificationType.PET_RISK_PUBLISHED,
        {
          petName: pet.name,
          petId: pet.id,
          reportedAt: new Date().toISOString(),
        },
        pet.id,
        null,
        userId,
      );
    } catch (error) {
      console.error('Error enviando notificación de mascota en riesgo publicada:', error);
      return null;
    }
  }

  // Notificación personal al enviar solicitud de adopción
  async sendAdoptionRequestSentNotification(
    adopterId: number,
    pet: Pet,
    adoptionRequestId: number,
  ): Promise<Notification> {
    try {
      return await this.createNotification(
        adopterId,
        '📤 Solicitud enviada',
        `Has enviado una solicitud para adoptar a ${pet.name}. Te notificaremos cuando el dueño responda.`,
        NotificationType.ADOPTION_REQUEST_SENT,
        {
          petName: pet.name,
          petId: pet.id,
          adoptionRequestId,
          sentAt: new Date().toISOString(),
        },
        pet.id,
        adoptionRequestId,
        adopterId,
      );
    } catch (error) {
      console.error('Error enviando notificación de solicitud enviada:', error);
      return null;
    }
  }
}