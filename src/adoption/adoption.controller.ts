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
import { AdoptionService } from './adoption.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAdoptionRequestDto } from './dto/create-adoption-request.dto';
import { UpdateAdoptionRequestDto } from './dto/update-adoption-request.dto';

@Controller('adoption')
@UseGuards(JwtAuthGuard)
export class AdoptionController {
  constructor(private readonly adoptionService: AdoptionService) {}

  // Crear nueva solicitud de adopción
  @Post('request')
  async createAdoptionRequest(
    @Body() createAdoptionRequestDto: CreateAdoptionRequestDto,
    @Request() req: any,
  ) {
    try {
      const adopterId = req.user.userId;
      const result = await this.adoptionService.createAdoptionRequest(
        createAdoptionRequestDto,
        adopterId,
      );
      
      return {
        ok: true,
        message: 'Solicitud de adopción creada exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al crear solicitud de adopción',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener solicitudes por mascota (para donantes)
  @Get('requests/pet/:petId')
  async getRequestsByPet(@Param('petId') petId: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.adoptionService.getRequestsByPet(
        parseInt(petId),
        userId,
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener solicitudes',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener solicitudes del adoptante
  @Get('requests/my-requests')
  async getMyRequests(@Request() req: any) {
    try {
      const adopterId = req.user.userId;
      const result = await this.adoptionService.getRequestsByAdopter(adopterId);
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener mis solicitudes',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener solicitudes recibidas (para donantes)
  @Get('requests/received')
  async getReceivedRequests(@Request() req: any) {
    try {
      const donorId = req.user.userId;
      const result = await this.adoptionService.getRequestsByDonor(donorId);
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener solicitudes recibidas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener detalles de una solicitud específica
  @Get('request/:id')
  async getRequestById(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.adoptionService.getRequestById(
        parseInt(id),
        userId,
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener solicitud',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Actualizar estado de solicitud (aprobar/rechazar)
  @Put('request/:id/status')
  async updateRequestStatus(
    @Param('id') id: string,
    @Body() updateAdoptionRequestDto: UpdateAdoptionRequestDto,
    @Request() req: any,
  ) {
    try {
      const donorId = req.user.userId;
      const result = await this.adoptionService.updateRequestStatus(
        parseInt(id),
        updateAdoptionRequestDto,
        donorId,
      );
      
      return {
        ok: true,
        message: 'Estado de solicitud actualizado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar estado de solicitud',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Donante confirma entrega de mascota
  @Put('request/:id/donor-confirm')
  async donorConfirmDelivery(@Param('id') id: string, @Request() req: any) {
    try {
      const donorId = req.user.userId;
      const result = await this.adoptionService.donorConfirmDelivery(
        parseInt(id),
        donorId,
      );
      
      return {
        ok: true,
        message: 'Entrega confirmada. Esperando confirmación del adoptante.',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al confirmar entrega',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Adoptante confirma recepción de mascota
  @Put('request/:id/adopter-confirm')
  async adopterConfirmReception(@Param('id') id: string, @Request() req: any) {
    try {
      const adopterId = req.user.userId;
      const result = await this.adoptionService.adopterConfirmReception(
        parseInt(id),
        adopterId,
      );
      
      return {
        ok: true,
        message: '¡Adopción completada exitosamente!',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al confirmar recepción',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Marcar adopción como completada (legacy - ahora usa donor-confirm)
  @Put('request/:id/complete')
  async completeAdoption(@Param('id') id: string, @Request() req: any) {
    try {
      const donorId = req.user.userId;
      const result = await this.adoptionService.completeAdoption(
        parseInt(id),
        donorId,
      );
      
      return {
        ok: true,
        message: 'Entrega confirmada. Esperando confirmación del adoptante.',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al completar adopción',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Cancelar solicitud de adopción (por el adoptante)
  @Delete('request/:id')
  async cancelRequest(@Param('id') id: string, @Request() req: any) {
    try {
      const adopterId = req.user.userId;
      const result = await this.adoptionService.cancelRequest(
        parseInt(id),
        adopterId,
      );
      
      return {
        ok: true,
        message: 'Solicitud de adopción cancelada',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al cancelar solicitud',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener estadísticas de adopción
  // Todas las solicitudes de adopción (solo ADMIN, rol '1').
  @Get('admin/all')
  async getAllAdoptionRequests(@Request() req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('1')) {
      throw new HttpException(
        { ok: false, message: 'Solo el administrador puede ver todas las solicitudes' },
        HttpStatus.FORBIDDEN,
      );
    }
    const result = await this.adoptionService.getAllRequests();
    return { ok: true, data: result };
  }

  @Get('stats')
  async getAdoptionStats(@Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.adoptionService.getAdoptionStats(userId);
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener estadísticas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}