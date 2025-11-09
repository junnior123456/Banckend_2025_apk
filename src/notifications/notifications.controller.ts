import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Obtener notificaciones del usuario
  @Get()
  async getNotifications(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationsService.getNotifications(
        userId,
        parseInt(page),
        parseInt(limit),
        unreadOnly === 'true',
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener notificaciones',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener contador de notificaciones no leídas
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const count = await this.notificationsService.getUnreadCount(userId);
      
      return {
        ok: true,
        data: { unreadCount: count },
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener contador',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Marcar notificación como leída
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationsService.markAsRead(
        parseInt(id),
        userId,
      );
      
      return {
        ok: true,
        message: 'Notificación marcada como leída',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al marcar como leída',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Marcar todas las notificaciones como leídas
  @Put('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationsService.markAllAsRead(userId);
      
      return {
        ok: true,
        message: 'Todas las notificaciones marcadas como leídas',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al marcar todas como leídas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Eliminar notificación
  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      await this.notificationsService.deleteNotification(parseInt(id), userId);
      
      return {
        ok: true,
        message: 'Notificación eliminada exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al eliminar notificación',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Limpiar notificaciones antiguas
  @Delete('cleanup/old')
  async cleanupOldNotifications(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationsService.cleanupOldNotifications(userId);
      
      return {
        ok: true,
        message: `${result.affected} notificaciones antiguas eliminadas`,
        data: { deletedCount: result.affected },
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al limpiar notificaciones',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener configuración de notificaciones del usuario
  @Get('settings')
  async getNotificationSettings(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const settings = await this.notificationsService.getNotificationSettings(userId);
      
      return {
        ok: true,
        data: settings,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener configuración',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Actualizar configuración de notificaciones
  @Put('settings')
  async updateNotificationSettings(
    @Body() settings: any,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationsService.updateNotificationSettings(
        userId,
        settings,
      );
      
      return {
        ok: true,
        message: 'Configuración actualizada exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar configuración',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Actualizar token de notificación push
  @Put('token')
  async updateNotificationToken(
    @Body('token') token: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationsService.updateNotificationToken(
        userId,
        token,
      );
      
      return {
        ok: true,
        message: 'Token de notificación actualizado',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar token',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Enviar notificación de prueba
  @Post('test')
  async sendTestNotification(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.notificationsService.sendTestNotification(userId);
      
      return {
        ok: true,
        message: result ? 'Notificación de prueba enviada' : 'No se pudo enviar la notificación',
        data: { sent: result },
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al enviar notificación de prueba',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}