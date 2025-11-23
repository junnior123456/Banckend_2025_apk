import { Report } from '../../reports/report.entity';

export interface ReportRepository {
  findAll(): Promise<Report[]>;
  findById(id: number): Promise<Report>;
  findByPetId(petId: number): Promise<Report[]>;
  create(data: any): Promise<Report>;
  update(id: number, data: any): Promise<Report>;
  delete(id: number): Promise<{ message: string }>;
}

export const REPORT_REPOSITORY = 'ReportRepository';
