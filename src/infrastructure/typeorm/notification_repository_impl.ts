import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../notifications/notification.entity';
import { NotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/notifications/notification_repository.interface';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({ relations: ['user'] });
  }

  async findById(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({ where: { id }, relations: ['user'] });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return notification;
  }

  async findByUserId(userId: number): Promise<Notification[]> {
    return this.notificationRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async create(data: any): Promise<Notification> {
    const notification = this.notificationRepository.create(data) as unknown as Notification;
    const saved = await this.notificationRepository.save(notification);
    return saved as Notification;
  }

  async update(id: number, data: any): Promise<Notification> {
    await this.notificationRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<{ message: string }> {
    const notification = await this.findById(id);
    await this.notificationRepository.remove(notification);
    return { message: 'Notificación eliminada exitosamente' };
  }

  async markAsRead(id: number): Promise<Notification> {
    await this.notificationRepository.update(id, { isRead: true });
    return this.findById(id);
  }
}

export const TypeOrmNotificationRepositoryProvider = {
  provide: NOTIFICATION_REPOSITORY,
  useClass: TypeOrmNotificationRepository,
};
