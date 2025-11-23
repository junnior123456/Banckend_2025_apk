import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation, DonationStatus } from './donation.entity';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // 💰 Crear nueva donación
  async create(userId: number, createDonationDto: CreateDonationDto): Promise<Donation> {
    try {
      const donation = this.donationRepository.create({
        ...createDonationDto,
        userId,
        status: DonationStatus.PENDING,
      });

      const savedDonation = await this.donationRepository.save(donation);
      console.log(`✅ Donación creada: ID ${savedDonation.id}, Monto: ${savedDonation.amount}`);
      
      // Notificar a todos los usuarios sobre la nueva donación
      await this.notificationsService.notifyNewDonation(savedDonation);
      
      return savedDonation;
    } catch (error) {
      console.error('❌ Error creando donación:', error);
      throw new BadRequestException('Error al crear la donación');
    }
  }

  // 📋 Obtener todas las donaciones (admin)
  async findAll(): Promise<Donation[]> {
    return this.donationRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // 👤 Obtener donaciones de un usuario
  async findByUser(userId: number): Promise<Donation[]> {
    return this.donationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 🔍 Obtener una donación por ID
  async findOne(id: number): Promise<Donation> {
    const donation = await this.donationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!donation) {
      throw new NotFoundException(`Donación con ID ${id} no encontrada`);
    }

    return donation;
  }

  // ✅ Confirmar donación
  async confirm(id: number, transactionId: string): Promise<Donation> {
    const donation = await this.findOne(id);

    if (donation.status === DonationStatus.COMPLETED) {
      throw new BadRequestException('Esta donación ya fue confirmada');
    }

    donation.status = DonationStatus.COMPLETED;
    donation.transactionId = transactionId;
    donation.completedAt = new Date();

    const updated = await this.donationRepository.save(donation);
    console.log(`✅ Donación confirmada: ID ${id}`);
    
    return updated;
  }

  // 🔄 Actualizar donación
  async update(id: number, updateDonationDto: UpdateDonationDto): Promise<Donation> {
    const donation = await this.findOne(id);

    Object.assign(donation, updateDonationDto);

    if (updateDonationDto.status === DonationStatus.COMPLETED && !donation.completedAt) {
      donation.completedAt = new Date();
    }

    return this.donationRepository.save(donation);
  }

  // 📊 Obtener estadísticas públicas
  async getStats(): Promise<any> {
    const donations = await this.donationRepository.find({
      where: { status: DonationStatus.COMPLETED },
    });

    const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0);
    const totalDonations = donations.length;
    const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

    // Agrupar por mes
    const monthlyTotals: { [key: string]: number } = {};
    donations.forEach(donation => {
      const month = donation.completedAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyTotals[month] = (monthlyTotals[month] || 0) + Number(donation.amount);
    });

    // Contar por método de pago
    const paymentMethodCounts: { [key: string]: number } = {};
    donations.forEach(donation => {
      paymentMethodCounts[donation.paymentMethod] = 
        (paymentMethodCounts[donation.paymentMethod] || 0) + 1;
    });

    return {
      totalAmount,
      totalDonations,
      averageDonation,
      monthlyTotals,
      paymentMethodCounts,
    };
  }

  // 🎯 Obtener donaciones recientes (públicas)
  async getRecent(limit: number = 10): Promise<Donation[]> {
    return this.donationRepository.find({
      where: { status: DonationStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  // 🏆 Obtener top donadores
  async getTopDonors(limit: number = 5): Promise<any[]> {
    const result = await this.donationRepository
      .createQueryBuilder('donation')
      .select('donation.userId', 'userId')
      .addSelect('SUM(donation.amount)', 'totalAmount')
      .addSelect('COUNT(donation.id)', 'donationCount')
      .leftJoin('donation.user', 'user')
      .addSelect('user.name', 'userName')
      .addSelect('user.email', 'userEmail')
      .where('donation.status = :status', { status: DonationStatus.COMPLETED })
      .groupBy('donation.userId')
      .orderBy('totalAmount', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(row => ({
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      totalAmount: parseFloat(row.totalAmount),
      donationCount: parseInt(row.donationCount),
    }));
  }

  // 🗑️ Eliminar donación (solo admin)
  async remove(id: number): Promise<void> {
    const donation = await this.findOne(id);
    await this.donationRepository.remove(donation);
    console.log(`🗑️ Donación eliminada: ID ${id}`);
  }
}
