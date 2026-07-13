import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * El JWT guarda los roles como IDs ('1'=ADMIN, '2'=CLIENT, '3'=VET).
   *
   * Los endpoints /admin/* llevaban un `// TODO: Verificar que el usuario es
   * administrador` que nunca se hizo: con el guard de clase bastaba con estar
   * autenticado, así que CUALQUIER cliente podía listar todos los reportes de
   * la plataforma (quién denunció qué y a quién).
   */
  private assertAdmin(req: any): void {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('1')) {
      throw new HttpException(
        { ok: false, message: 'Solo el administrador puede ver los reportes' },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // Crear nuevo reporte
  @Post()
  async createReport(
    @Body() createReportDto: CreateReportDto,
    @Request() req: any,
  ) {
    try {
      const reporterId = req.user.userId;
      const result = await this.reportsService.createReport(
        createReportDto,
        reporterId,
      );
      
      return {
        ok: true,
        message: 'Reporte enviado exitosamente',
        data: result,
      };
    } catch (error) {
      // Un 403 (o un 404) no debe degradarse a 400: se respeta el codigo original.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al crear reporte',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener reportes del usuario
  @Get('my-reports')
  async getMyReports(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const reporterId = req.user.userId;
      const result = await this.reportsService.getReportsByUser(
        reporterId,
        parseInt(page),
        parseInt(limit),
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      // Un 403 (o un 404) no debe degradarse a 400: se respeta el codigo original.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener reportes',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener detalles de un reporte específico
  @Get(':id')
  async getReportById(@Param('id') id: string, @Request() req: any) {
    try {
      const userId = req.user.userId;
      const result = await this.reportsService.getReportById(
        parseInt(id),
        userId,
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      // Un 403 (o un 404) no debe degradarse a 400: se respeta el codigo original.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener reporte',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // === ENDPOINTS PARA ADMINISTRADORES ===

  // Obtener todos los reportes (solo admin)
  @Get('admin/all')
  async getAllReports(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    try {
      this.assertAdmin(req);
      const result = await this.reportsService.getAllReports(
        parseInt(page),
        parseInt(limit),
        status,
        type,
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      // Un 403 (o un 404) no debe degradarse a 400: se respeta el codigo original.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener reportes',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Actualizar estado de reporte (solo admin)
  @Put('admin/:id/status')
  async updateReportStatus(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Request() req: any,
  ) {
    try {
      this.assertAdmin(req);
      const adminId = req.user.userId;
      const result = await this.reportsService.updateReportStatus(
        parseInt(id),
        updateReportDto,
        adminId,
      );
      
      return {
        ok: true,
        message: 'Estado del reporte actualizado',
        data: result,
      };
    } catch (error) {
      // Un 403 (o un 404) no debe degradarse a 400: se respeta el codigo original.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar reporte',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener estadísticas de reportes (solo admin)
  @Get('admin/stats')
  async getReportStats(@Request() req: any) {
    try {
      this.assertAdmin(req);
      const result = await this.reportsService.getReportStats();
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      // Un 403 (o un 404) no debe degradarse a 400: se respeta el codigo original.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener estadísticas',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Obtener reportes pendientes (solo admin)
  @Get('admin/pending')
  async getPendingReports(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      this.assertAdmin(req);
      const result = await this.reportsService.getPendingReports(
        parseInt(page),
        parseInt(limit),
      );
      
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      // Un 403 (o un 404) no debe degradarse a 400: se respeta el codigo original.
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener reportes pendientes',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}