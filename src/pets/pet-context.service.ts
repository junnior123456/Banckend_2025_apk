import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from './pet.entity';
import { PetVaccination } from './pet-vaccination.entity';
import { PetWeight } from './pet-weight.entity';
import { PetAllergy } from './pet-allergy.entity';
import { PetMedication } from './pet-medication.entity';
import { PetMedicalRecord } from './pet-medical-record.entity';

/**
 * Módulo 3 — Contexto del expediente para la IA.
 *
 * Reúne las rebanadas del expediente (vacunas, peso, alergias, medicación,
 * identidad) en un bloque de texto que PawBot puede leer.
 *
 * REGLA DE PRIVACIDAD: `buildContext` sólo devuelve datos médicos si la mascota
 * tiene `aiConsent = true`. Sin consentimiento devuelve `consent: false` y
 * `contextText: null`, y quien llame debe responder de forma genérica.
 * Acceso: el dueño, o un usuario privilegiado (ADMIN '1' / VET '3').
 */
export interface PetAiContext {
  petId: number;
  petName: string;
  consent: boolean;
  contextText: string | null;
}

@Injectable()
export class PetContextService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
    @InjectRepository(PetVaccination)
    private readonly vaccRepo: Repository<PetVaccination>,
    @InjectRepository(PetWeight)
    private readonly weightRepo: Repository<PetWeight>,
    @InjectRepository(PetAllergy)
    private readonly allergyRepo: Repository<PetAllergy>,
    @InjectRepository(PetMedication)
    private readonly medRepo: Repository<PetMedication>,
    @InjectRepository(PetMedicalRecord)
    private readonly recordRepo: Repository<PetMedicalRecord>,
  ) {}

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

  async getConsent(petId: number, userId: number, roles: string[]) {
    const pet = await this.assertAccess(petId, userId, roles);
    return {
      petId: pet.id,
      petName: pet.name,
      aiConsent: !!pet.aiConsent,
      aiConsentAt: pet.aiConsentAt ?? null,
    };
  }

  async setConsent(
    petId: number,
    enabled: boolean,
    userId: number,
    roles: string[],
  ) {
    const pet = await this.assertAccess(petId, userId, roles);
    pet.aiConsent = enabled;
    pet.aiConsentAt = enabled ? new Date() : null;
    pet.aiConsentBy = userId;
    await this.petRepo.save(pet);
    return {
      petId: pet.id,
      petName: pet.name,
      aiConsent: pet.aiConsent,
      aiConsentAt: pet.aiConsentAt,
    };
  }

  /** Edad en años/meses a partir de birthDate (YYYY-MM-DD). */
  private ageFrom(birthDate: string | null): string | null {
    if (!birthDate) return null;
    const born = new Date(birthDate);
    if (isNaN(born.getTime())) return null;
    const months = Math.max(
      0,
      Math.floor((Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
    );
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest ? `${years} años y ${rest} meses` : `${years} años`;
  }

  /**
   * Arma el contexto del expediente. Devuelve contextText = null si no hay
   * consentimiento: el llamador NO debe pasar datos médicos al modelo.
   */
  async buildContext(
    petId: number,
    userId: number,
    roles: string[],
  ): Promise<PetAiContext> {
    const pet = await this.assertAccess(petId, userId, roles);

    if (!pet.aiConsent) {
      return {
        petId: pet.id,
        petName: pet.name,
        consent: false,
        contextText: null,
      };
    }

    const [vaccinations, weights, allergies, medications, records] = await Promise.all([
      this.vaccRepo.find({ where: { petId }, order: { appliedAt: 'DESC' }, take: 20 }),
      this.weightRepo.find({ where: { petId }, order: { measuredAt: 'DESC' }, take: 12 }),
      this.allergyRepo.find({ where: { petId } }),
      this.medRepo.find({ where: { petId }, order: { startAt: 'DESC' }, take: 20 }),
      this.recordRepo.find({ where: { petId }, order: { occurredAt: 'DESC' }, take: 20 }),
    ]);

    const lines: string[] = [];

    lines.push('=== EXPEDIENTE DE LA MASCOTA ===');
    lines.push(`Nombre: ${pet.name}`);
    if (pet.species) lines.push(`Especie: ${pet.species}`);
    if (pet.breed) lines.push(`Raza: ${pet.breed}`);
    if (pet.gender) lines.push(`Sexo: ${pet.gender}`);
    if (pet.size) lines.push(`Tamaño: ${pet.size}`);
    const age = this.ageFrom(pet.birthDate);
    if (age) lines.push(`Edad: ${age} (nacido el ${pet.birthDate})`);
    else if (pet.age) lines.push(`Edad declarada: ${pet.age}`);
    lines.push(`Esterilizado: ${pet.isSterilized ? 'sí' : 'no'}`);
    if (pet.temperament) lines.push(`Temperamento: ${pet.temperament}`);
    if (pet.specialNeeds) lines.push(`Necesidades especiales: ${pet.specialNeeds}`);
    if (pet.medicalHistory) lines.push(`Historial médico (texto libre): ${pet.medicalHistory}`);

    const today = new Date().toISOString().slice(0, 10);

    lines.push('');
    lines.push(`--- VACUNAS (${vaccinations.length}) ---`);
    if (!vaccinations.length) lines.push('Sin vacunas registradas.');
    for (const v of vaccinations) {
      const vencida = v.nextDueAt && v.nextDueAt < today ? ' [VENCIDA]' : '';
      const prox = v.nextDueAt ? `, próxima ${v.nextDueAt}` : '';
      lines.push(`- ${v.type}: aplicada ${v.appliedAt}${prox}${vencida}${v.notes ? ` (${v.notes})` : ''}`);
    }

    lines.push('');
    lines.push(`--- PESO (${weights.length} registros, más reciente primero) ---`);
    if (!weights.length) lines.push('Sin registros de peso.');
    for (const w of weights) {
      lines.push(`- ${w.measuredAt}: ${w.weightKg} kg${w.notes ? ` (${w.notes})` : ''}`);
    }

    lines.push('');
    lines.push(`--- ALERGIAS (${allergies.length}) ---`);
    if (!allergies.length) lines.push('Sin alergias registradas.');
    for (const a of allergies) {
      lines.push(`- ${a.substance} (severidad: ${a.severity})${a.notes ? ` — ${a.notes}` : ''}`);
    }

    const activas = medications.filter((m) => !m.endAt || m.endAt >= today);
    lines.push('');
    lines.push(`--- MEDICACIÓN (${activas.length} activa(s) de ${medications.length}) ---`);
    if (!medications.length) lines.push('Sin medicación registrada.');
    for (const m of medications) {
      const estado = !m.endAt || m.endAt >= today ? 'ACTIVA' : 'finalizada';
      const rango = m.endAt ? `${m.startAt} a ${m.endAt}` : `desde ${m.startAt}`;
      lines.push(
        `- ${m.name} ${m.dose || ''} ${m.frequency || ''} (${rango}) [${estado}]${m.notes ? ` — ${m.notes}` : ''}`.replace(/\s+/g, ' '),
      );
    }

    lines.push('');
    lines.push(`--- HISTORIA CLÍNICA (${records.length} entradas) ---`);
    if (!records.length) lines.push('Sin entradas de historia clínica.');
    for (const r of records) {
      const partes = [
        `- [${r.type}] ${r.occurredAt}: ${r.title}`,
        r.vetName ? `(vet: ${r.vetName})` : '',
        r.diagnosis ? `· diagnóstico: ${r.diagnosis}` : '',
        r.treatment ? `· tratamiento: ${r.treatment}` : '',
        r.notes ? `· notas: ${r.notes}` : '',
      ].filter(Boolean);
      lines.push(partes.join(' '));
    }

    lines.push('');
    lines.push(`Fecha de hoy: ${today}`);
    lines.push('=== FIN DEL EXPEDIENTE ===');
    lines.push(
      'El expediente contiene ÚNICAMENTE las secciones anteriores: identidad, ' +
        'vacunas, peso, alergias, medicación e historia clínica. NO existe ' +
        'registro de ningún otro tema (documentos, radiografías, dieta, análisis ' +
        'de laboratorio que no aparezcan arriba). Si te preguntan por algo que no ' +
        'está escrito arriba, la respuesta correcta es que no hay registro en el ' +
        'expediente.',
    );

    return {
      petId: pet.id,
      petName: pet.name,
      consent: true,
      contextText: lines.join('\n'),
    };
  }
}
