import { Injectable } from '@nestjs/common';
import { PawmatchGatoDto } from './dto/pawmatch-gato.dto';

/**
 * PawMatch FELINO — compatibilidad adoptante ↔ gato / riesgo de abandono.
 *
 * Servicio SEPARADO del canino a propósito: el de perros se deja intacto, y un
 * gato no es un perro pequeño. Las reglas de perro darían un resultado erróneo
 * en gatos (penalizan el apartamento y las horas a solas, que a un gato le dan
 * igual, y puntúan el tamaño, que en gatos no dice nada).
 *
 * ⚠️ MISMO ESTATUS QUE EL CANINO: son reglas deterministas escritas a mano con
 * pesos elegidos por criterio, NO un modelo entrenado. No hay dataset de
 * adopciones felinas con su desenlace, así que esto orienta y explica, pero no
 * está validado contra datos reales. No presentar el número como una predicción
 * científica.
 *
 * Criterio felino aplicado (diferencias bien establecidas del cuidado del gato):
 *   - Tolera la soledad mucho mejor que un perro (solo penaliza en extremos).
 *   - El apartamento es un hogar perfecto; lo que pesa es el enriquecimiento.
 *   - Salir a la calle es RIESGO (atropellos, peleas, leucemia felina), no premio.
 *   - Territorialidad: más gatos en casa exige más espacio y recursos.
 *   - Mantenerlo cuesta menos que un perro → umbrales de presupuesto más bajos.
 *
 * Entradas: ver PawmatchGatoDto.
 * Salida: misma forma que el canino (prediccion, etiqueta, probabilidad_exito,
 * riesgo con semáforo y factores), para que la app pinte ambos igual.
 */

export interface FactorGato {
  factor: string;
  impacto: 'positivo' | 'negativo';
  peso: number;
}

@Injectable()
export class PawmatchGatoService {
  private readonly VIVIENDA = ['Apartamento', 'Casa sin jardín', 'Casa con jardín'];
  private readonly EXPERIENCIA = ['sin experiencia', 'experiencia básica', 'experiencia avanzada'];
  private readonly ENERGIA = ['tranquilo', 'normal', 'muy juguetón'];

  predecir(d: PawmatchGatoDto) {
    // Base algo más optimista que en perros: el gato se adapta mejor a la vida
    // urbana y a la rutina de un adoptante medio.
    let logit = 0.6;
    const factores: FactorGato[] = [];
    const add = (delta: number, factor: string) => {
      logit += delta;
      factores.push({
        factor,
        impacto: delta >= 0 ? 'positivo' : 'negativo',
        peso: Math.abs(delta),
      });
    };

    // ── 1. Horas solo: un gato lo lleva bien; solo penaliza en extremos ───────
    if (d.horas_solo_dia >= 14) add(-0.7, `El gato pasaría ${d.horas_solo_dia} h solo al día: demasiado incluso para un gato`);
    else if (d.horas_solo_dia >= 10) add(-0.2, `Bastantes horas solo (${d.horas_solo_dia} h), aceptable si tiene entretenimiento`);
    else add(0.3, `Las horas que pasaría solo (${d.horas_solo_dia} h) no son problema para un gato`);
    // Gatito: sí necesita compañía y socialización temprana.
    if (d.edad_gato_anos < 0.5 && d.horas_solo_dia >= 8) add(-0.7, `Gatito muy pequeño que pasaría muchas horas solo`);

    // ── 2. Vivienda: el apartamento NO penaliza (al contrario que en perros) ──
    if (d.tipo_vivienda === 0) add(0.2, `Apartamento: un hogar perfectamente válido para un gato de interior`);
    else add(0.1, `${this.VIVIENDA[d.tipo_vivienda]}: espacio de sobra`);

    // ── 3. Acceso al exterior = riesgo (no premio) ───────────────────────────
    if (d.acceso_exterior === 1) {
      add(-0.8, `Saldría a la calle: riesgo de atropello, peleas y enfermedades como la leucemia felina`);
      if (d.edad_gato_anos < 1) add(-0.4, `Un gato tan joven en la calle corre aún más peligro`);
    } else {
      add(0.4, `Gato de interior: es la vida más segura y larga para él`);
    }

    // ── 4. Enriquecimiento: juego diario vs energía del gato ─────────────────
    if (d.energia_gato === 2 && d.tiempo_juego_diario === 0) add(-0.9, `Gato muy juguetón sin tiempo de juego diario: acabará frustrado y destructivo`);
    else if (d.energia_gato === 2 && d.tiempo_juego_diario === 1) add(0.5, `Gato muy juguetón con un adoptante que le dedica juego a diario`);
    else if (d.tiempo_juego_diario === 1) add(0.3, `Le dedicaría juego a diario`);
    else if (d.energia_gato === 0) add(0.1, `Gato ${this.ENERGIA[d.energia_gato]}: poco exigente`);
    else add(-0.2, `Sin tiempo de juego diario`);

    // ── 5. Territorialidad: otros gatos en casa ──────────────────────────────
    if (d.otros_gatos >= 3) add(-0.6, `Ya viven ${d.otros_gatos} gatos en casa: alto riesgo de conflicto territorial`);
    else if (d.otros_gatos >= 1 && d.tipo_vivienda === 0) add(-0.3, `Otro(s) gato(s) en un apartamento: hará falta duplicar areneros, comederos y sitios altos`);
    else if (d.otros_gatos >= 1) add(-0.1, `Ya hay otro gato en casa: la presentación debe ser gradual`);

    // ── 6. Experiencia previa ────────────────────────────────────────────────
    if (d.experiencia_previa === 2) add(0.6, `Adoptante con experiencia avanzada`);
    else if (d.experiencia_previa === 1) add(0.2, `Adoptante con experiencia básica`);
    else {
      add(-0.3, `Adoptante sin experiencia previa`);
      if (d.edad_gato_anos < 0.5) add(-0.3, `Sin experiencia y con un gatito, que exige más cuidados`);
    }

    // ── 7. Presupuesto (mantener un gato cuesta menos que un perro) ──────────
    if (d.presupuesto_mensual < 80) add(-0.8, `Presupuesto mensual muy ajustado (S/ ${Math.round(d.presupuesto_mensual)}) para comida, arena y veterinario`);
    else if (d.presupuesto_mensual < 150) add(-0.2, `Presupuesto justo (S/ ${Math.round(d.presupuesto_mensual)})`);
    else add(0.3, `Presupuesto holgado para su cuidado`);

    // ── 8. Niños en casa ─────────────────────────────────────────────────────
    if (d.ninos_en_casa >= 2) add(-0.3, `Varios niños en casa: el gato necesitará sitios altos donde refugiarse`);
    else if (d.ninos_en_casa === 1) add(-0.1, `Un niño en casa: habrá que enseñarle a respetar al gato`);

    // ── 9. Edad del gato ─────────────────────────────────────────────────────
    if (d.edad_gato_anos >= 10) {
      add(0.2, `Gato mayor: tranquilo y de rutina establecida`);
      if (d.presupuesto_mensual < 150) add(-0.3, `Un gato mayor suele necesitar más veterinario (riñón, tiroides)`);
    } else if (d.edad_gato_anos < 0.5) {
      add(-0.2, `Gatito: necesita socialización, vacunas y más atención`);
    }

    // ── Probabilidad y clase ─────────────────────────────────────────────────
    const probExito = 1 / (1 + Math.exp(-logit));
    const prediccion = probExito >= 0.5 ? 1 : 0;

    factores.sort((a, b) => b.peso - a.peso);

    return {
      especie: 'gato',
      prediccion,
      etiqueta: prediccion === 1 ? 'Compatible' : 'Riesgo de abandono',
      probabilidad_exito: Math.round(probExito * 10000) / 10000,
      riesgo: this.scoreRiesgo(probExito),
      factores: factores.slice(0, 5),
    };
  }

  /** Semáforo de riesgo. Mismos cortes que el canino para que la app los pinte igual. */
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
      mensaje = 'Riesgo elevado de abandono. Considera un perfil de gato diferente.';
    }
    return {
      nivel, color, emoji, mensaje,
      porcentaje_exito: Math.round(probExito * 1000) / 10,
      porcentaje_riesgo: Math.round(riesgo * 1000) / 10,
    };
  }
}
