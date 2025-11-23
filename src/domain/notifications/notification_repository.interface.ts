import { Notification } from '../../notifications/notification.entity';

export interface NotificationRepository {
  findAll(): Promise<Notification[]>;
  findById(id: number): Promise<Notification>;
  findByUserId(userId: number): Promise<Notification[]>;
  create(data: any): Promise<Notification>;
  update(id: number, data: any): Promise<Notification>;
  delete(id: number): Promise<{ message: string }>;
  markAsRead(id: number): Promise<Notification>;
}

export const NOTIFICATION_REPOSITORY = 'NotificationRepository';
