import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PetDocument } from './pet-document.entity';
import { Pet } from './pet.entity';
import {
  ALLOWED_DOC_MIME,
  CreateDocumentDto,
  MAX_DOC_BYTES,
} from './dto/create-document.dto';

/** Directorio PRIVADO: fuera de /var/pawfinder/uploads, que nginx sirve al público. */
const PRIVATE_DIR = process.env.PRIVATE_DOCS_DIR || '/var/pawfinder/private';

/**
 * Módulo 3 — Documentos y galería.
 * Acceso: dueño de la mascota, o privilegiado (ADMIN '1' / VET '3').
 */
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(PetDocument)
    private readonly repo: Repository<PetDocument>,
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
  ) {
    fs.mkdirSync(PRIVATE_DIR, { recursive: true, mode: 0o700 });
  }

  private async assertAccess(petId: number, userId: number, roles: string[]) {
    const pet = await this.petRepo.findOne({ where: { id: petId } });
    if (!pet) {
      throw new HttpException('Mascota no encontrada', HttpStatus.NOT_FOUND);
    }
    const privileged = (roles || []).includes('1') || (roles || []).includes('3');
    if (pet.userId !== userId && !privileged) {
      throw new HttpException(
        'No autorizado sobre esta mascota',
        HttpStatus.FORBIDDEN,
      );
    }
    return pet;
  }

  /**
   * El `mimetype` lo envía el cliente y se puede falsificar: comprobamos la
   * firma real del archivo antes de guardarlo.
   */
  private sniff(buf: Buffer): string | null {
    if (buf.length < 12) return null;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      return 'image/png';
    }
    if (
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }
    if (buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
    return null;
  }

  /** Ruta absoluta contenida en PRIVATE_DIR (corta cualquier `..`). */
  private resolveInside(...parts: string[]): string {
    const base = path.resolve(PRIVATE_DIR);
    const abs = path.resolve(base, ...parts);
    if (abs !== base && !abs.startsWith(base + path.sep)) {
      throw new HttpException('Ruta inválida', HttpStatus.BAD_REQUEST);
    }
    return abs;
  }

  async list(petId: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const docs = await this.repo.find({
      where: { petId },
      order: { createdAt: 'DESC' },
    });
    // `storedName` no sale nunca al cliente.
    return docs.map(({ storedName, ...rest }) => rest);
  }

  async create(
    petId: number,
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: number,
    roles: string[],
  ) {
    await this.assertAccess(petId, userId, roles);

    if (!file || !file.buffer) {
      throw new HttpException('No se recibió ningún archivo', HttpStatus.BAD_REQUEST);
    }
    if (file.size > MAX_DOC_BYTES) {
      throw new HttpException('El archivo supera 10 MB', HttpStatus.PAYLOAD_TOO_LARGE);
    }

    const real = this.sniff(file.buffer);
    if (!real || !ALLOWED_DOC_MIME[real]) {
      throw new HttpException(
        'Formato no permitido. Solo JPG, PNG, WEBP o PDF.',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    const storedName = `${randomUUID()}${ALLOWED_DOC_MIME[real]}`;
    const dir = this.resolveInside(String(petId));
    await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    await fs.promises.writeFile(this.resolveInside(String(petId), storedName), file.buffer, {
      mode: 0o600,
    });

    const doc = this.repo.create({
      petId,
      title: dto.title,
      category: dto.category || 'otro',
      storedName,
      originalName: (file.originalname || 'archivo').slice(0, 255),
      mimeType: real,
      sizeBytes: file.size,
      uploadedBy: userId,
    });
    const saved = await this.repo.save(doc);
    const { storedName: _omit, ...rest } = saved;
    return rest;
  }

  /** Devuelve la ruta física para hacer streaming, tras validar el acceso. */
  async getFile(petId: number, id: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const doc = await this.repo.findOne({ where: { id, petId } });
    if (!doc) {
      throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
    }
    const abs = this.resolveInside(String(petId), doc.storedName);
    if (!fs.existsSync(abs)) {
      throw new HttpException('El archivo ya no está en el servidor', HttpStatus.GONE);
    }
    return { abs, doc };
  }

  async remove(petId: number, id: number, userId: number, roles: string[]) {
    await this.assertAccess(petId, userId, roles);
    const doc = await this.repo.findOne({ where: { id, petId } });
    if (!doc) {
      throw new HttpException('Documento no encontrado', HttpStatus.NOT_FOUND);
    }
    const abs = this.resolveInside(String(petId), doc.storedName);
    await fs.promises.unlink(abs).catch(() => undefined); // best-effort
    await this.repo.remove(doc);
    return { deleted: true };
  }

  /** Resumen para el contexto de PawBot: títulos y categorías, nunca el contenido. */
  async summaryForContext(petId: number) {
    return this.repo.find({
      where: { petId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
