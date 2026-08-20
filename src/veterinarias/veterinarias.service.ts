import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Veterinaria } from './veterinaria.entity';
import { CreateVeterinariaDto } from './dto/create-veterinaria.dto';
import { UpdateVeterinariaDto } from './dto/update-veterinaria.dto';

const ADMIN = '1';
const VET = '3';

@Injectable()
export class VeterinariasService {
  constructor(
    @InjectRepository(Veterinaria)
    private readonly repo: Repository<Veterinaria>,
  ) {}

  private isAdmin(roles: string[]) {
    return (roles || []).includes(ADMIN);
  }
  private isVet(roles: string[]) {
    return (roles || []).includes(VET);
  }

  /** Directorio público: solo verificadas y activas. */
  async listPublic() {
    return this.repo.find({
      where: { isVerified: true, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findPublic(id: number) {
    const vet = await this.repo.findOne({
      where: { id, isVerified: true, isActive: true },
    });
    if (!vet) throw new NotFoundException('Veterinaria no encontrada');
    return vet;
  }

  /** Todas, para el panel de administración. */
  async listAll(roles: string[]) {
    if (!this.isAdmin(roles)) {
      throw new ForbiddenException('Solo un administrador ve el listado completo');
    }
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  /** Las fichas del veterinario logueado. */
  async listMine(userId: number) {
    return this.repo.find({
      where: { ownerUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateVeterinariaDto, userId: number, roles: string[]) {
    if (!this.isVet(roles) && !this.isAdmin(roles)) {
      throw new ForbiddenException(
        'Solo una cuenta veterinaria o el administrador pueden registrar una veterinaria',
      );
    }
    const exists = await this.repo.findOne({ where: { ruc: dto.ruc } });
    if (exists) {
      throw new ConflictException('Ya existe una veterinaria con ese RUC');
    }
    const vet = this.repo.create({ ...dto, ownerUserId: userId });
    return this.repo.save(vet);
  }

  async update(
    id: number,
    dto: UpdateVeterinariaDto,
    userId: number,
    roles: string[],
  ) {
    const vet = await this.repo.findOne({ where: { id } });
    if (!vet) throw new NotFoundException('Veterinaria no encontrada');

    const admin = this.isAdmin(roles);
    if (vet.ownerUserId !== userId && !admin) {
      throw new ForbiddenException('No puedes editar esta veterinaria');
    }

    // Verificar/activar es potestad exclusiva del admin.
    if (!admin) {
      delete dto.isVerified;
      delete dto.isActive;
    }

    if (dto.ruc && dto.ruc !== vet.ruc) {
      const other = await this.repo.findOne({ where: { ruc: dto.ruc } });
      if (other && other.id !== id) {
        throw new ConflictException('Ya existe una veterinaria con ese RUC');
      }
    }

    Object.assign(vet, dto, { updatedAt: new Date() });
    return this.repo.save(vet);
  }

  async remove(id: number, userId: number, roles: string[]) {
    const vet = await this.repo.findOne({ where: { id } });
    if (!vet) throw new NotFoundException('Veterinaria no encontrada');
    if (vet.ownerUserId !== userId && !this.isAdmin(roles)) {
      throw new ForbiddenException('No puedes eliminar esta veterinaria');
    }
    await this.repo.remove(vet);
    return { deleted: true };
  }

  /** Texto compacto del directorio real para el prompt de la IA. */
  async directoryForAi(limit = 15): Promise<string> {
    const vets = await this.repo.find({
      where: { isVerified: true, isActive: true },
      order: { name: 'ASC' },
      take: limit,
    });
    if (!vets.length) return '';
    return vets
      .map((v) => {
        const parts = [
          `• ${v.name}`,
          v.address ? `dir: ${v.address}` : '',
          v.phone ? `tel: ${v.phone}` : '',
          v.whatsapp ? `WhatsApp: ${v.whatsapp}` : '',
          v.openingHours ? `horario: ${v.openingHours}` : '',
        ].filter(Boolean);
        return parts.join(' · ');
      })
      .join('\n');
  }

  /**
   * Veterinarias cercanas a un punto, de la mas cercana a la mas lejana.
   * La distancia se calcula con la formula de Haversine en el propio SQL, asi
   * que NO hace falta PostGIS. El LEAST/GREATEST recorta el coseno a [-1, 1]:
   * sin eso, un redondeo en coma flotante puede sacar 1.0000000002 y acos()
   * revienta con NaN justo cuando la veterinaria esta encima del usuario.
   */
  async listNearby(lat: number, lng: number, radiusKm = 10, limit = 20) {
    const filas = await this.repo.query(
      `
      SELECT * FROM (
        SELECT v.*,
               6371 * acos(
                 LEAST(1, GREATEST(-1,
                   cos(radians($1)) * cos(radians(v.latitude)) *
                   cos(radians(v.longitude) - radians($2)) +
                   sin(radians($1)) * sin(radians(v.latitude))
                 ))
               ) AS "distanceKm"
        FROM veterinaria v
        WHERE v."isVerified" = true
          AND v."isActive" = true
          AND v.latitude IS NOT NULL
          AND v.longitude IS NOT NULL
      ) AS con_distancia
      WHERE "distanceKm" <= $3
      ORDER BY "distanceKm" ASC
      LIMIT $4
      `,
      [lat, lng, radiusKm, limit],
    );

    // Devolver la distancia con 2 decimales: "1.24 km" se lee mejor en la app.
    return filas.map((fila: any) => ({
      ...fila,
      distanceKm: Math.round(Number(fila.distanceKm) * 100) / 100,
    }));
  }
}
