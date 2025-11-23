import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../reports/report.entity';
import { ReportRepository, REPORT_REPOSITORY } from '../../domain/reports/report_repository.interface';

@Injectable()
export class TypeOrmReportRepository implements ReportRepository {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async findAll(): Promise<Report[]> {
    return this.reportRepository.find({ relations: ['pet', 'user'] });
  }

  async findById(id: number): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id }, relations: ['pet', 'user'] });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }
    return report;
  }

  async findByPetId(petId: number): Promise<Report[]> {
    // Los reportes son polimórficos: buscar por reportableType/reportableId
    return this.reportRepository.find({ where: { reportableType: 'pet', reportableId: petId } as any, relations: ['reporter'] });
  }

  async create(data: any): Promise<Report> {
    const report = this.reportRepository.create(data) as unknown as Report;
    const saved = await this.reportRepository.save(report);
    return saved as Report;
  }

  async update(id: number, data: any): Promise<Report> {
    await this.reportRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<{ message: string }> {
    const report = await this.findById(id);
    await this.reportRepository.remove(report);
    return { message: 'Reporte eliminado exitosamente' };
  }
}

export const TypeOrmReportRepositoryProvider = {
  provide: REPORT_REPOSITORY,
  useClass: TypeOrmReportRepository,
};
