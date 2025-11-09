import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import * as admin from 'firebase-admin';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
}

@Injectable()
export class PushNotificationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Enviar notificación push a un usuario específico
  async sendToUser(userId: number, notification: PushNotificationData): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user || !user.notification_token) {
        console.log(`Usuario ${userId} no tiene token de notificación`);
        return false;
      }

      const message = {
        token: user.notification_token,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
        },
        data: notification.data || {},
        android: {
          notification: {
            channelId: 'pawfinder_default',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Notificación push enviada:', response);
      return true;
    } catch (error) {
      console.error('❌ Error enviando notificación push:', error);
      
      // Si el token es inválido, limpiarlo de la base de datos
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        await this.userRepository.update(userId, { notification_token: null });
        console.log(`Token inválido removido para usuario ${userId}`);
      }
      
      return false;
    }
  }

  // Enviar notificación push a múltiples usuarios
  async sendToMultipleUsers(
    userIds: number[],
    notification: PushNotificationData,
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    const promises = userIds.map(async (userId) => {
      const result = await this.sendToUser(userId, notification);
      if (result) {
        successful++;
      } else {
        failed++;
      }
    });

    await Promise.all(promises);

    return { successful, failed };
  }

  // Enviar notificación push por tokens directamente
  async sendToTokens(
    tokens: string[],
    notification: PushNotificationData,
  ): Promise<{ successful: number; failed: number }> {
    try {
      if (tokens.length === 0) {
        return { successful: 0, failed: 0 };
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
        },
        data: notification.data || {},
        android: {
          notification: {
            channelId: 'pawfinder_default',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`✅ Notificaciones enviadas: ${response.successCount}/${tokens.length}`);
      
      // Limpiar tokens inválidos
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && 
              (resp.error?.code === 'messaging/registration-token-not-registered' ||
               resp.error?.code === 'messaging/invalid-registration-token')) {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await this.cleanupInvalidTokens(invalidTokens);
        }
      }

      return {
        successful: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      console.error('❌ Error enviando notificaciones múltiples:', error);
      return { successful: 0, failed: tokens.length };
    }
  }

  // Limpiar tokens inválidos de la base de datos
  private async cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
    try {
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ notification_token: null })
        .where('notification_token IN (:...tokens)', { tokens: invalidTokens })
        .execute();

      console.log(`🧹 Limpiados ${invalidTokens.length} tokens inválidos`);
    } catch (error) {
      console.error('❌ Error limpiando tokens inválidos:', error);
    }
  }

  // Actualizar token de notificación de un usuario
  async updateUserToken(userId: number, token: string): Promise<boolean> {
    try {
      await this.userRepository.update(userId, { notification_token: token });
      console.log(`✅ Token actualizado para usuario ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando token:', error);
      return false;
    }
  }

  // Remover token de notificación de un usuario
  async removeUserToken(userId: number): Promise<boolean> {
    try {
      await this.userRepository.update(userId, { notification_token: null });
      console.log(`✅ Token removido para usuario ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error removiendo token:', error);
      return false;
    }
  }

  // Obtener usuarios con tokens válidos
  async getUsersWithTokens(): Promise<User[]> {
    return await this.userRepository.find({
      where: {
        notification_token: { $ne: null } as any,
        isActive: true,
      },
      select: ['id', 'name', 'email', 'notification_token'],
    });
  }

  // Enviar notificación de prueba
  async sendTestNotification(userId: number): Promise<boolean> {
    const testNotification: PushNotificationData = {
      title: '🐾 PawFinder Test',
      body: 'Esta es una notificación de prueba. ¡Tu configuración funciona correctamente!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    };

    return await this.sendToUser(userId, testNotification);
  }

  // Notificaciones específicas para eventos de PawFinder

  // Notificación de nueva solicitud de adopción
  async sendAdoptionRequestNotification(
    donorId: number,
    petName: string,
    adopterName: string,
  ): Promise<boolean> {
    const notification: PushNotificationData = {
      title: '🏠 Nueva solicitud de adopción',
      body: `${adopterName} quiere adoptar a ${petName}`,
      data: {
        type: 'adoption_request',
        petName,
        adopterName,
      },
    };

    return await this.sendToUser(donorId, notification);
  }

  // Notificación de estado de adopción
  async sendAdoptionStatusNotification(
    adopterId: number,
    petName: string,
    status: 'approved' | 'rejected' | 'completed',
  ): Promise<boolean> {
    let title: string;
    let body: string;
    let emoji: string;

    switch (status) {
      case 'approved':
        emoji = '✅';
        title = 'Solicitud aprobada';
        body = `¡Tu solicitud para adoptar a ${petName} fue aprobada!`;
        break;
      case 'rejected':
        emoji = '❌';
        title = 'Solicitud rechazada';
        body = `Tu solicitud para adoptar a ${petName} fue rechazada`;
        break;
      case 'completed':
        emoji = '🎉';
        title = '¡Adopción completada!';
        body = `¡Felicidades! Ya puedes llevarte a ${petName} a casa`;
        break;
    }

    const notification: PushNotificationData = {
      title: `${emoji} ${title}`,
      body,
      data: {
        type: 'adoption_status',
        petName,
        status,
      },
    };

    return await this.sendToUser(adopterId, notification);
  }

  // Notificación de nuevo comentario
  async sendNewCommentNotification(
    petOwnerId: number,
    petName: string,
    commenterName: string,
  ): Promise<boolean> {
    const notification: PushNotificationData = {
      title: '💬 Nuevo comentario',
      body: `${commenterName} comentó en la publicación de ${petName}`,
      data: {
        type: 'new_comment',
        petName,
        commenterName,
      },
    };

    return await this.sendToUser(petOwnerId, notification);
  }

  // Notificación de respuesta a comentario
  async sendCommentReplyNotification(
    originalCommenterId: number,
    petName: string,
    replierName: string,
  ): Promise<boolean> {
    const notification: PushNotificationData = {
      title: '↩️ Nueva respuesta',
      body: `${replierName} respondió a tu comentario en ${petName}`,
      data: {
        type: 'comment_reply',
        petName,
        replierName,
      },
    };

    return await this.sendToUser(originalCommenterId, notification);
  }

  // Notificación de mascota adoptada
  async sendPetAdoptedNotification(
    interestedUserId: number,
    petName: string,
  ): Promise<boolean> {
    const notification: PushNotificationData = {
      title: '🏠 Mascota adoptada',
      body: `${petName} encontró un hogar. ¡Hay muchas otras mascotas esperando!`,
      data: {
        type: 'pet_adopted',
        petName,
      },
    };

    return await this.sendToUser(interestedUserId, notification);
  }
}