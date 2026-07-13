import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus, ReportableType } from './report.entity';
import { User } from '../users/user.entity';
import { Pet } from '../pets/pet.entity';
import { Comment } from '../comments/comment.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  // Crear nuevo reporte
  async createReport(createReportDto: CreateReportDto, reporterId: number): Promise<Report> {
    const { reportableType, reportableId, ...reportData } = createReportDto;

    // Una respuesta del asistente NO es una fila de la base de datos: no tiene
    // id, no tiene dueño, y el usuario puede reportar tantas como quiera. Las
    // tres comprobaciones de abajo asumen una entidad real, así que se saltan.
    const esRespuestaIa = reportableType === ReportableType.AI_RESPONSE;

    if (!esRespuestaIa) {
      // Verificar que la entidad reportada existe
      await this.validateReportableEntity(reportableType, reportableId);

      // Verificar que el usuario no esté reportando su propio contenido
      await this.validateNotSelfReport(reportableType, reportableId, reporterId);

      // Verificar que el usuario no haya reportado ya esta entidad
      const existingReport = await this.reportRepository.findOne({
        where: {
          reporterId,
          reportableType,
          reportableId,
        },
      });

      if (existingReport) {
        throw new BadRequestException('Ya has reportado este contenido anteriormente');
      }
    }

    // Crear el reporte
    const report = this.reportRepository.create({
      ...reportData,
      reportableType,
      reportableId,
      reporterId,
      status: ReportStatus.PENDING,
    });

    const savedReport = await this.reportRepository.save(report);

    // TODO: Notificar a los administradores sobre el nuevo reporte
    // await this.notificationService.sendNewReportNotification(savedReport);

    return await this.reportRepository.findOne({
      where: { id: savedReport.id },
      relations: ['reporter'],
    });
  }

  // Validar que la entidad reportada existe
  private async validateReportableEntity(type: ReportableType, id: number): Promise<void> {
    let entity;

    switch (type) {
      case ReportableType.PET:
        entity = await this.petRepository.findOne({ where: { id } });
        break;
      case ReportableType.COMMENT:
        entity = await this.commentRepository.findOne({ where: { id } });
        break;
      case ReportableType.USER:
        entity = await this.userRepository.findOne({ where: { id } });
        break;
      default:
        throw new BadRequestException('Tipo de entidad no válido');
    }

    if (!entity) {
      throw new NotFoundException('La entidad reportada no existe');
    }
  }

  // Validar que el usuario no esté reportando su propio contenido
  private async validateNotSelfReport(
    type: ReportableType,
    id: number,
    reporterId: number,
  ): Promise<void> {
    let isOwnContent = false;

    switch (type) {
      case ReportableType.PET:
        const pet = await this.petRepository.findOne({ where: { id } });
        isOwnContent = pet?.userId === reporterId;
        break;
      case ReportableType.COMMENT:
        const comment = await this.commentRepository.findOne({ where: { id } });
        isOwnContent = comment?.userId === reporterId;
        break;
      case ReportableType.USER:
        isOwnContent = id === reporterId;
        break;
    }

    if (isOwnContent) {
      throw new BadRequestException('No puedes reportar tu propio contenido');
    }
  }

  // Obtener reportes del usuario
  async getReportsByUser(reporterId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reports, total] = await this.reportRepository.findAndCount({
      where: { reporterId },
      relations: ['reviewedBy'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener detalles de un reporte específico
  async getReportById(reportId: number, userId: number): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['reporter', 'reviewedBy'],
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }

    // Solo el reportero o un admin pueden ver los detalles
    // TODO: Verificar si el usuario es admin
    if (report.reporterId !== userId) {
      throw new ForbiddenException('No tienes permisos para ver este reporte');
    }

    return report;
  }

  // === MÉTODOS PARA ADMINISTRADORES ===

  // Obtener todos los reportes (admin)
  async getAllReports(
    page: number = 1,
    limit: number = 20,
    status?: string,
    type?: string,
  ) {
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reviewedBy', 'reviewedBy')
      .orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('report.type = :type', { type });
    }

    const [reports, total] = await queryBuilder.getManyAndCount();

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Actualizar estado de reporte (admin)
  async updateReportStatus(
    reportId: number,
    updateDto: UpdateReportDto,
    adminId: number,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['reporter'],
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }

    // Actualizar el reporte
    Object.assign(report, updateDto);
    report.reviewedById = adminId;

    if (updateDto.status === ReportStatus.RESOLVED) {
      report.resolvedAt = new Date();
    }

    const updatedReport = await this.reportRepository.save(report);

    // TODO: Notificar al reportero sobre la resolución
    // await this.notificationService.sendReportResolvedNotification(report.reporterId, updatedReport);

    return updatedReport;
  }

  // Obtener estadísticas de reportes (admin)
  async getReportStats() {
    const totalReports = await this.reportRepository.count();
    
    const pendingReports = await this.reportRepository.count({
      where: { status: ReportStatus.PENDING },
    });

    const resolvedReports = await this.reportRepository.count({
      where: { status: ReportStatus.RESOLVED },
    });

    const dismissedReports = await this.reportRepository.count({
      where: { status: ReportStatus.DISMISSED },
    });

    // Reportes por tipo
    const reportsByType = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('report.type')
      .getRawMany();

    // Reportes por entidad reportada
    const reportsByEntity = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.reportableType', 'entity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('report.reportableType')
      .getRawMany();

    // Reportes por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const reportsByMonth = await this.reportRepository
      .createQueryBuilder('report')
      .select('DATE_FORMAT(report.createdAt, "%Y-%m")', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('report.createdAt >= :sixMonthsAgo', { sixMonthsAgo })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      summary: {
        total: totalReports,
        pending: pendingReports,
        resolved: resolvedReports,
        dismissed: dismissedReports,
        underReview: totalReports - pendingReports - resolvedReports - dismissedReports,
      },
      byType: reportsByType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      byEntity: reportsByEntity.reduce((acc, item) => {
        acc[item.entity] = parseInt(item.count);
        return acc;
      }, {}),
      byMonth: reportsByMonth.map(item => ({
        month: item.month,
        count: parseInt(item.count),
      })),
    };
  }

  // Obtener reportes pendientes (admin)
  async getPendingReports(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reports, total] = await this.reportRepository.findAndCount({
      where: { status: ReportStatus.PENDING },
      relations: ['reporter'],
      order: { createdAt: 'ASC' }, // Los más antiguos primero
      skip,
      take: limit,
    });

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener reportes por entidad específica (admin)
  async getReportsByEntity(
    entityType: ReportableType,
    entityId: number,
  ): Promise<Report[]> {
    return await this.reportRepository.find({
      where: {
        reportableType: entityType,
        reportableId: entityId,
      },
      relations: ['reporter', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // Marcar múltiples reportes como revisados (admin)
  async bulkUpdateReports(
    reportIds: number[],
    status: ReportStatus,
    adminNotes?: string,
    adminId?: number,
  ) {
    const updateData: any = { status };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }
    
    if (adminId) {
      updateData.reviewedById = adminId;
    }
    
    if (status === ReportStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    const result = await this.reportRepository.update(reportIds, updateData);

    return { updatedCount: result.affected };
  }
}