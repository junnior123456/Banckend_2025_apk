import { Injectable } from '@nestjs/common';
import { PawmatchDto } from './dto/pawmatch.dto';

/**
 * PawMatch — modelo de compatibilidad adoptante ↔ perro / riesgo de abandono.
 *
 * Reimplementa, en reglas deterministas y explicables, el árbol de decisión que
 * el equipo prototipó en scikit-learn. Se hace en el propio backend (sin runtime
 * de Python ni un .pkl que servir) por dos razones: corre en el mismo servidor
 * que ya existe, y cada decisión es auditable (qué factor sumó o restó y cuánto),
 * que es justo lo que aportaba el árbol frente a una caja negra.
 *
 * 9 variables de entrada (mismas etiquetas que el prototipo):
 *   tipo_vivienda 0=Apto 1=Casa sin jardín 2=Casa con jardín
 *   horas_solo_dia (h)   ninos_en_casa (nº)
 *   experiencia_previa 0=Sin 1=Básica 2=Avanzada
 *   nivel_actividad 0=Sedentario 1=Moderado 2=Muy activo
 *   presupuesto_mensual (S/)
 *   tamano_perro 0=Pequeño 1=Mediano 2=Grande
 *   energia_perro 0=Baja 1=Media 2=Alta
 *   edad_perro_anos (años)
 * Salida: clase (1=compatible / 0=riesgo), probabilidad de éxito y un score de
 * riesgo con semáforo, más los factores que más pesaron (análogo a la
 * importancia de variables del árbol).
 */

export interface Factor {
  factor: string;
  impacto: 'positivo' | 'negativo';
  peso: number; // magnitud (0..1 aprox), para ordenar y pintar
}

@Injectable()
export class PawmatchService {
  private readonly VIVIENDA = ['Apartamento', 'Casa sin jardín', 'Casa con jardín'];
  private readonly EXPERIENCIA = ['sin experiencia', 'experiencia básica', 'experiencia avanzada'];
  private readonly ACTIVIDAD = ['sedentario', 'moderadamente activo', 'muy activo'];
  private readonly TAMANO = ['pequeño', 'mediano', 'grande'];
  private readonly ENERGIA = ['baja', 'media', 'alta'];

  predecir(d: PawmatchDto) {
    // logit base ligeramente optimista; cada regla lo empuja arriba/abajo.
    let logit = 0.4;
    const factores: Factor[] = [];
    const add = (delta: number, factor: string) => {
      logit += delta;
      if (delta !== 0) {
        factores.push({
          factor,
          impacto: delta > 0 ? 'positivo' : 'negativo',
          peso: Math.min(1, Math.abs(delta) / 1.6),
        });
      }
    };

    // ── 1. Energía del perro vs nivel de actividad del adoptante ──────────────
    // El desajuste más caro: un perro con más energía que su dueño.
    const gap = d.energia_perro - d.nivel_actividad;
    if (gap >= 2) add(-1.6, `Perro de energía ${this.ENERGIA[d.energia_perro]} con adoptante ${this.ACTIVIDAD[d.nivel_actividad]}`);
    else if (gap === 1) add(-0.7, `El perro tiene algo más de energía que el ritmo del adoptante`);
    else if (gap <= -1) add(0.4, `El adoptante es más activo que el perro: cubre de sobra su ejercicio`);
    else add(0.3, `Energía del perro y actividad del adoptante bien emparejadas`);

    // ── 2. Espacio (vivienda) vs tamaño del perro ─────────────────────────────
    if (d.tipo_vivienda === 0 && d.tamano_perro === 2) add(-1.2, `Perro grande en apartamento`);
    else if (d.tipo_vivienda === 0 && d.tamano_perro === 1) add(-0.4, `Perro mediano en apartamento`);
    else if (d.tipo_vivienda === 2 && d.tamano_perro === 2) add(0.6, `Perro grande con casa y jardín`);
    else if (d.tipo_vivienda === 2) add(0.2, `Vivienda con jardín, espacio de sobra`);

    // ── 3. Horas que el perro pasa solo ───────────────────────────────────────
    if (d.horas_solo_dia >= 10) add(-1.2, `El perro pasaría ${d.horas_solo_dia} h solo al día`);
    else if (d.horas_solo_dia >= 7) add(-0.6, `Bastantes horas solo al día (${d.horas_solo_dia} h)`);
    else if (d.horas_solo_dia <= 4) add(0.4, `El perro tendría compañía casi todo el día`);
    // Cachorro + muchas horas solo: castigo extra (necesita atención y educación).
    if (d.edad_perro_anos < 1 && d.horas_solo_dia >= 8) add(-0.6, `Cachorro que pasaría muchas horas solo`);

    // ── 4. Experiencia previa del adoptante ───────────────────────────────────
    if (d.experiencia_previa === 2) add(0.8, `Adoptante con experiencia avanzada`);
    else if (d.experiencia_previa === 1) add(0.2, `Adoptante con experiencia básica`);
    else {
      add(-0.3, `Adoptante sin experiencia previa`);
      if (d.tamano_perro === 2 || d.energia_perro === 2) add(-0.5, `Sin experiencia con un perro exigente (grande o de mucha energía)`);
    }

    // ── 5. Presupuesto mensual ────────────────────────────────────────────────
    if (d.presupuesto_mensual < 150) add(-0.8, `Presupuesto mensual ajustado (S/ ${Math.round(d.presupuesto_mensual)})`);
    else if (d.presupuesto_mensual > 300) add(0.3, `Presupuesto holgado para su cuidado`);
    if (d.tamano_perro === 2 && d.presupuesto_mensual < 250) add(-0.4, `Un perro grande cuesta más de mantener`);

    // ── 6. Niños en casa ──────────────────────────────────────────────────────
    if (d.ninos_en_casa >= 1 && d.energia_perro === 2 && d.tamano_perro === 2) add(-0.5, `Niños en casa con un perro grande y muy enérgico: exige supervisión`);
    else if (d.ninos_en_casa >= 1 && d.energia_perro === 2 && d.tamano_perro === 0) add(-0.2, `Niños con un perro pequeño muy nervioso`);

    // ── 7. Edad del perro ─────────────────────────────────────────────────────
    if (d.edad_perro_anos >= 8) {
      add(0.2, `Perro mayor, suele ser más tranquilo`);
      if (d.experiencia_previa === 0) add(-0.1, `Un perro mayor puede requerir cuidados médicos`);
    } else if (d.edad_perro_anos < 1) {
      add(-0.3, `Cachorro: necesita educación y tiempo`);
    }

    // ── Probabilidad y clase ──────────────────────────────────────────────────
    const probExito = 1 / (1 + Math.exp(-logit));
    const prediccion = probExito >= 0.5 ? 1 : 0;

    factores.sort((a, b) => b.peso - a.peso);

    return {
      prediccion,
      etiqueta: prediccion === 1 ? 'Compatible' : 'Riesgo de abandono',
      probabilidad_exito: Math.round(probExito * 10000) / 10000,
      riesgo: this.scoreRiesgo(probExito),
      factores: factores.slice(0, 5),
    };
  }

  /** Convierte la probabilidad de éxito en un score de riesgo con semáforo. */
  private scoreRiesgo(probExito: number) {
    const riesgo = 1 - probExito;
    let nivel: string, color: string, emoji: string, mensaje: string;
    if (riesgo < 0.3) {
      nivel = 'BAJO'; color = '#2ECC71'; emoji = '🟢';
      mensaje = 'Alta compatibilidad. ¡Esta adopción tiene muy buenas proyecciones!';
    } else if (riesgo < 0.6) {
      nivel = 'MEDIO'; color = '#F39C12'; emoji = '🟡';
      mensaje = 'Compatibilidad moderada. Se recomienda seguimiento post-adopción.';
    } else {
      nivel = 'ALTO'; color = '#E74C3C'; emoji = '🔴';
      mensaje = 'Riesgo elevado de abandono. Considera un perfil de perro diferente.';
    }
    return {
      nivel, color, emoji, mensaje,
      porcentaje_exito: Math.round(probExito * 1000) / 10,
      porcentaje_riesgo: Math.round(riesgo * 1000) / 10,
    };
  }
}
