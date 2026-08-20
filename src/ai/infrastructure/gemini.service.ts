/**
 * INFRASTRUCTURE LAYER - Servicio de IA de PawFinder
 * Proveedor ACTUAL: Google AI Studio (Gemini), capa compatible con OpenAI.
 * Antes usaba GitHub Models, RETIRADO por GitHub (HTTP 410 retirement brownout).
 * Este archivo es el ÚNICO punto de cambio de proveedor: para auto-hospedar
 * (Ollama/OpenAI-compatible) en el futuro basta cambiar endpoint/model/token.
 * Contexto: App de perros y gatos (adopción / perdidos) en Tarapoto, San Martín, Perú.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  IAiService,
  DogRecommendationInput,
  DogCareContext,
  DogPhotoAnalysis,
  PetMatchCandidate,
  PetMatchResult,
  ChatTurn,
} from '../domain/interfaces/ai-service.interface';
import { MAX_HISTORY_TURNS } from '../application/dto/chat-turn.dto';
import { VeterinariasService } from '../../veterinarias/veterinarias.service';

@Injectable()
export class GeminiService implements IAiService {
  private readonly logger = new Logger(GeminiService.name);

  // Configuración del proveedor (Google AI Studio / Gemini, compatible OpenAI)
  private readonly endpoint =
    process.env.AI_ENDPOINT ||
    'https://generativelanguage.googleapis.com/v1beta/openai';
  private readonly token = process.env.GEMINI_API_KEY || '';
  // Cadena de modelos: cada uno tiene su PROPIA cuota diaria en el nivel
  // gratuito (gemini-3.6-flash son solo 20 peticiones/dia), asi que al agotarse
  // uno se pasa al siguiente en vez de dejar la IA caida.
  private readonly models = (
    process.env.GEMINI_MODELS ||
    'gemini-3.6-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-3.5-flash-lite'
  )
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  private modelIndex = 0;

  private get model(): string {
    return this.models[this.modelIndex];
  }

  // Prompt base con contexto de Tarapoto para todas las consultas
  private readonly BASE_CONTEXT = `
    Eres PawBot, el asistente inteligente de PawFinder, una aplicación de adopción
    de perros y gatos en Tarapoto, San Martín, Perú.

    Contexto importante sobre Tarapoto:
    - Ciudad en la selva alta peruana, clima tropical cálido (25-35°C)
    - Población aproximada: 170,000 habitantes
    - Zona urbana con barrios como Morales, Banda de Shilcayo, La Unión
    - Cultura local donde las mascotas son muy valoradas
    - Mercado de mascotas en crecimiento
    - Veterinarias disponibles en la ciudad

    Siempre responde en español, de forma amigable, clara y práctica.

    ESPECIES: la app trabaja con PERROS y GATOS. Domina ambos por igual y NUNCA
    esquives una consulta por ser de gato. Ajusta SIEMPRE el consejo a la especie
    de la que te hablan: sus cuidados, su alimentación y sus riesgos son
    distintos, y dar consejo de perro a un dueño de gato es un error grave.
    Ejemplos de diferencias que debes respetar:
    - El gato es carnívoro estricto: necesita taurina; la comida de perro le hace daño.
    - Nunca recomiendes a un gato paracetamol, ibuprofeno, ajo, cebolla ni aceites
      esenciales (tea tree, eucalipto): son tóxicos para él. Tampoco antiparasitarios
      de perro con permetrina: matan gatos.
    - El gato no necesita paseos; necesita arenero limpio, rascador y altura.
    - Sus vacunas son otras (trivalente felina, leucemia felina), no las del perro.
    Si no sabes de qué especie te hablan y la respuesta cambiaría según eso,
    PREGUNTA antes de responder.
    Si te preguntan por otra especie (aves, conejos, roedores), di con honestidad
    que PawFinder solo cubre perros y gatos y sugiere acudir a un veterinario.

    Considera el clima tropical de Tarapoto en tus recomendaciones.
  `;

  constructor(private readonly veterinarias: VeterinariasService) {
    if (!this.token) {
      this.logger.warn('⚠️ GEMINI_API_KEY no configurado - IA no disponible');
    }
  }

  // ============================================================
  //  NÚCLEO: llamada al modelo (GitHub Models / OpenAI compatible)
  // ============================================================
  private async callModel(
    messages: any[],
    maxTokens = 800,
    temperature = 0.7,
    jsonMode = false,
  ): Promise<string> {
    if (!this.token) {
      throw new Error('API_KEY missing - GEMINI_API_KEY no configurado');
    }
    const body: any = {
      model: this.model,
      messages,
      max_tokens: maxTokens,
      temperature, reasoning_effort: 'minimal', // sin esto Gemini 3 gasta el presupuesto de tokens razonando
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const res: any = await (globalThis as any).fetch(
      `${this.endpoint}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      // 429 = cuota diaria agotada, 503 = modelo saturado. En ambos casos el
      // siguiente modelo de la cadena suele responder: se cambia y se reintenta.
      const agotado = res.status === 429 || res.status === 503;
      const quedanModelos = this.modelIndex < this.models.length - 1;
      if (agotado) {
        if (quedanModelos) {
          const previo = this.model;
          this.modelIndex++;
          this.logger.warn(
            `Modelo ${previo} no disponible (HTTP ${res.status}); uso ${this.model}`,
          );
          return this.callModel(messages, maxTokens, temperature, jsonMode);
        }
      }
      throw new Error(`IA (Gemini) HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  /** Genera respuesta de texto simple con manejo de errores y fallback */
  private async generateResponse(prompt: string): Promise<string> {
    try {
      return await this.callModel([{ role: 'user', content: prompt }]);
    } catch (error: any) {
      this.logger.error('❌ Error al generar respuesta con la IA:', error);
      if (String(error?.message || '').includes('API_KEY')) {
        return '⚠️ El servicio de IA no está disponible en este momento. Por favor, contacta al soporte de PawFinder.';
      }
      return '😔 Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo en unos momentos.';
    }
  }

  /** Descarga una imagen (URL http/https) y la convierte a data URL base64.
   *  Si ya viene como data URL, la devuelve tal cual. */
  private async toDataUrl(imageUrl: string): Promise<string> {
    if (!imageUrl) throw new Error('imageUrl vacío');
    if (imageUrl.startsWith('data:')) return imageUrl;
    const res: any = await (globalThis as any).fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`No se pudo descargar la imagen (HTTP ${res.status})`);
    }
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString('base64')}`;
  }

  /** Parsea JSON tolerando fences ```json ... ``` */
  private parseJson<T>(raw: string): T {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned) as T;
  }

  // ============================================================
  //  FEATURES DE TEXTO (chat asistente)
  // ============================================================
  async recommendDog(userId: number, profile: DogRecommendationInput): Promise<string> {
    const prompt = `
      ${this.BASE_CONTEXT}

      TAREA: Recomendar el tipo de perro más apto para adoptar.

      Perfil del usuario (userId: ${userId}):
      - Tipo de vivienda: ${this.translateLivingSpace(profile.livingSpace)}
      - ¿Tiene niños?: ${profile.hasChildren ? 'Sí' : 'No'}
      - ¿Tiene otras mascotas?: ${profile.hasOtherPets ? 'Sí' : 'No'}
      - Nivel de actividad física: ${this.translateActivityLevel(profile.activityLevel)}
      - Experiencia con perros: ${this.translateExperience(profile.experience)}
      - Horas que el perro estaría solo: ${profile.hoursAlone} horas/día
      - Presupuesto para cuidado: ${this.translateBudget(profile.budget)}
      - ¿Alergias al pelo?: ${profile.allergies ? 'Sí' : 'No'}

      Por favor:
      1. Recomienda 2-3 razas de perros específicas que se adapten bien al clima de Tarapoto
      2. Explica por qué cada raza es adecuada para este perfil
      3. Menciona el nivel de cuidado requerido
      4. Da consejos específicos para el clima tropical de Tarapoto
      5. Indica si hay perros mestizos/criollos que también serían buena opción

      Formato: Respuesta amigable y estructurada con emojis 🐕
    `;
    return await this.generateResponse(prompt);
  }

  async trackDogCare(userId: number, question: string, dogInfo?: DogCareContext): Promise<string> {
    const dogContext = dogInfo
      ? `
        Información de la mascota:
        - Nombre: ${dogInfo.name || 'No especificado'}
        - Raza: ${dogInfo.breed || 'No especificada'}
        - Edad: ${dogInfo.age ? `${dogInfo.age} meses` : 'No especificada'}
        - Peso: ${dogInfo.weight ? `${dogInfo.weight} kg` : 'No especificado'}
      `
      : 'No se proporcionó información específica de la mascota.';

    const prompt = `
      ${this.BASE_CONTEXT}

      TAREA: Ayudar con el seguimiento y cuidado de la mascota adoptada (perro o gato).
      Deduce la especie por la raza o por lo que cuente el dueño; si no queda clara
      y el consejo cambiaría según la especie, pregúntasela.

      ${dogContext}

      Pregunta del dueño: "${question}"

      Por favor:
      1. Responde la pregunta de forma clara y práctica
      2. Considera el clima tropical de Tarapoto (calor, humedad)
      3. Menciona productos o alimentos disponibles en Tarapoto si es relevante
      4. Si es una emergencia médica, indica claramente que debe ir al veterinario
      5. Da consejos preventivos relacionados

      Formato: Respuesta amigable con emojis 🐾
    `;
    return await this.generateResponse(prompt);
  }

  async referToVet(userId: number, concern: string): Promise<string> {
    // Directorio REAL de la app. Si hay veterinarias cargadas, el modelo debe
    // recomendar ESAS (no inventar clínicas). Si está vacío, cae al modo genérico.
    const directory = await this.veterinarias.directoryForAi();

    const directoryBlock = directory
      ? `
      VETERINARIAS REGISTRADAS EN LA APP (usa EXCLUSIVAMENTE estas, con su contacto real;
      NO inventes otras ni cambies sus datos):
      ${directory}

      Recomienda 1-3 de la lista según la urgencia y cercanía, citando su nombre y contacto.`
      : `
      (No hay veterinarias registradas en la app todavía.) Recomienda buscar veterinarias
      en Tarapoto por zonas: centro, Morales y Banda de Shilcayo. NO inventes nombres ni
      teléfonos concretos; sugiere criterios de búsqueda.`;

    const prompt = `
      ${this.BASE_CONTEXT}

      TAREA: Referir a veterinarias o clínicas de mascotas en Tarapoto, San Martín, Perú.

      Preocupación del dueño: "${concern}"
      ${directoryBlock}

      Además:
      1. Evalúa la urgencia del caso (¿es emergencia?)
      2. Menciona qué tipo de especialista necesita (veterinario general, cirujano, etc.)
      3. Da consejos de primeros auxilios si aplica mientras llega al veterinario
      4. Menciona qué información llevar al veterinario (síntomas, duración, etc.)

      IMPORTANTE: Siempre recomienda consultar con un veterinario profesional para
      diagnósticos y tratamientos. No reemplaces la consulta veterinaria.

      Formato: Respuesta clara con nivel de urgencia y pasos a seguir 🏥
    `;
    return await this.generateResponse(prompt);
  }

  async generalChat(
    userId: number,
    message: string,
    history: ChatTurn[] = [],
  ): Promise<string> {
    const system = `
      ${this.BASE_CONTEXT}

      TAREA: Orientar al usuario en cualquier consulta sobre su perro o su gato
      (cuidados, salud, comportamiento, alimentación, adopción, mascota perdida).

      Estás en medio de una conversación: NO vuelvas a saludar ni a presentarte si
      ya hay mensajes previos. Continúa el hilo con naturalidad.
      Responde a lo que te preguntan de verdad: nada de respuestas evasivas ni de
      remitir al veterinario por todo. Deriva al veterinario cuando de verdad haga
      falta (síntomas serios, urgencias, diagnóstico o medicación).
      Si la consulta no tiene relación con mascotas, dilo con amabilidad y ofrécete
      a ayudar con su perro o su gato.
    `;
    try {
      return await this.callModel([
        { role: 'system', content: system },
        ...this.trimHistory(history),
        { role: 'user', content: message },
      ]);
    } catch (error: any) {
      this.logger.error('❌ Error en generalChat:', error);
      if (String(error?.message || '').includes('API_KEY')) {
        return '⚠️ El servicio de IA no está disponible en este momento. Por favor, contacta al soporte de PawFinder.';
      }
      return '😔 Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo en unos momentos.';
    }
  }

  /** Conserva sólo los últimos turnos y descarta contenido vacío. */
  private trimHistory(history: ChatTurn[] = []): ChatTurn[] {
    return (history || [])
      .filter((t) => t && t.content && t.content.trim().length > 0)
      .slice(-MAX_HISTORY_TURNS)
      .map((t) => ({ role: t.role, content: t.content }));
  }

  /**
   * Chat contextual sobre UNA mascota del usuario.
   * Si `contextText` es null (sin consentimiento), responde genérico y jamás
   * inventa datos médicos: se le prohíbe explícitamente en el system prompt.
   */
  async petChat(
    userId: number,
    message: string,
    petName: string,
    contextText: string | null,
    history: ChatTurn[] = [],
  ): Promise<string> {
    const system = contextText
      ? `${this.BASE_CONTEXT}

        Tienes acceso al expediente digital de "${petName}" porque su dueño dio
        consentimiento explícito. Úsalo para responder de forma personalizada.

        ${contextText}

        REGLAS:
        - Basa tus respuestas ÚNICAMENTE en lo que aparece literalmente arriba.
          Cita los datos concretos (fechas, pesos, nombres de vacunas, dosis).
        - El expediente es COMPLETO: lo que no aparece arriba, NO EXISTE. Si te
          preguntan por un dato ausente, responde exactamente que no hay registro
          de eso en el expediente, y nada más. Está TERMINANTEMENTE PROHIBIDO
          insinuar que existe información parcial, decir que "se menciona" algo que
          no está escrito arriba, o suponer que un procedimiento ya se hizo.
          Ejemplo de respuesta PROHIBIDA: "no está la fecha exacta, solo se menciona
          que fue desparasitado recientemente" cuando no hay sección de
          desparasitación. La respuesta correcta es: "No hay ningún registro de
          desparasitación en el expediente de ${petName}."
        - Señala riesgos que veas: vacunas vencidas, pérdida o ganancia brusca de
          peso, interacción entre una medicación activa y una alergia registrada.
        - NO das diagnósticos. Ante cualquier síntoma serio, deriva al veterinario.
        - Estás en medio de una conversación: NO vuelvas a saludar ni a presentarte
          si ya hay mensajes previos. Continúa el hilo.`
      : `${this.BASE_CONTEXT}

        El dueño NO ha dado consentimiento para que leas el expediente de "${petName}",
        así que NO tienes ningún dato médico de esta mascota.

        REGLAS:
        - Responde de forma general y útil, sin inventar datos de "${petName}".
        - NUNCA afirmes conocer su peso, vacunas, alergias o medicación.
        - Si la pregunta requiere el expediente, dilo con naturalidad y sugiere
          activar el acceso al expediente desde la ficha de la mascota.
        - Estás en medio de una conversación: NO vuelvas a saludar ni a presentarte
          si ya hay mensajes previos. Continúa el hilo.`;

    try {
      return await this.callModel(
        [
          { role: 'system', content: system },
          ...this.trimHistory(history),
          { role: 'user', content: message },
        ],
        900,
        0.3, // baja: el chat del expediente debe ceñirse a los datos, no ser creativo
      );
    } catch (error: any) {
      this.logger.error('❌ Error en petChat:', error);
      if (String(error?.message || '').includes('API_KEY')) {
        return '⚠️ El servicio de IA no está disponible en este momento. Por favor, contacta al soporte de PawFinder.';
      }
      return '😔 Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo en unos momentos.';
    }
  }

  // ============================================================
  //  FEATURES DE VISIÓN (nuevas)
  // ============================================================

  /** Clasifica/describe un perro o un gato a partir de su foto (raza, color, tamaño, señas). */
  async classifyDogPhoto(imageUrl: string): Promise<DogPhotoAnalysis> {
    try {
      const dataUrl = await this.toDataUrl(imageUrl);
      const content = [
        {
          type: 'text',
          text:
            'Eres un veterinario experto. La foto es de un PERRO o de un GATO. ' +
            'Analízala y responde SOLO ' +
            'con un JSON válido (sin texto extra) con estas claves exactas: ' +
            'raza (string, la más probable; para un gato, la raza felina, y si es ' +
            'mestizo indícalo p.ej. "gato criollo atigrado"), color (string), ' +
            'tamano (string: "pequeño"|"mediano"|"grande"), ' +
            'edad_aproximada (string), ' +
            'senas_particulares (string con marcas/rasgos distintivos), ' +
            'confianza (number 0-100). ' +
            'Empieza el campo raza con la especie si aporta claridad. ' +
            'Solo si la imagen NO es un perro ni un gato, devuelve ' +
            'raza:"no es un perro ni un gato" y confianza:0.',
        },
        { type: 'image_url', image_url: { url: dataUrl } },
      ];
      const raw = await this.callModel([{ role: 'user', content }], 400, 0.2, true);
      return this.parseJson<DogPhotoAnalysis>(raw);
    } catch (error: any) {
      this.logger.error('❌ Error al clasificar foto:', error);
      throw error;
    }
  }

  /** Compara la foto de una mascota perdida (perro o gato) contra varios candidatos
   *  encontrados y devuelve un ranking de similitud. Máximo 6 candidatos por llamada. */
  async matchPets(
    lostImageUrl: string,
    candidates: PetMatchCandidate[],
  ): Promise<PetMatchResult[]> {
    const MAX = 6;
    const limited = candidates.slice(0, MAX);
    if (candidates.length > MAX) {
      this.logger.warn(
        `matchPets: recibidos ${candidates.length} candidatos, solo se comparan los primeros ${MAX}`,
      );
    }

    const lost = await this.toDataUrl(lostImageUrl);
    const content: any[] = [
      {
        type: 'text',
        text:
          `Eres un experto en identificación de perros y gatos. La IMAGEN 0 es una ` +
          `mascota PERDIDA. A continuación hay ${limited.length} mascotas ENCONTRADAS. ` +
          `Para cada una da un puntaje de similitud (0-100) de que sea el MISMO animal ` +
          `y una razón corta. Considera especie, raza, color, tamaño, patrones del ` +
          `pelaje y señas particulares. ` +
          `Si el candidato es de otra especie que la mascota perdida, el puntaje es 0. ` +
          `Responde SOLO JSON con esta forma exacta: ` +
          `{"resultados":[{"index":0,"score":85,"razon":"..."}]} ` +
          `donde index corresponde al número de candidato indicado.`,
      },
      { type: 'image_url', image_url: { url: lost } },
    ];
    for (let i = 0; i < limited.length; i++) {
      content.push({ type: 'text', text: `Candidato index ${i}:` });
      content.push({
        type: 'image_url',
        image_url: { url: await this.toDataUrl(limited[i].imageUrl) },
      });
    }

    const raw = await this.callModel([{ role: 'user', content }], 700, 0.2, true);
    const parsed = this.parseJson<{
      resultados: { index: number; score: number; razon: string }[];
    }>(raw);

    return (parsed.resultados || [])
      .map((r) => ({
        candidateId: limited[r.index]?.id,
        score: r.score,
        reason: r.razon,
      }))
      .filter((r) => r.candidateId !== undefined)
      .sort((a, b) => b.score - a.score);
  }

  // ============================================================
  //  Helpers de traducción para los prompts
  // ============================================================
  private translateLivingSpace(space: string): string {
    const map = {
      apartment: 'Apartamento/departamento',
      house_small: 'Casa pequeña con patio pequeño',
      house_large: 'Casa grande con jardín',
    };
    return map[space] || space;
  }

  private translateActivityLevel(level: string): string {
    const map = { low: 'Bajo (sedentario)', medium: 'Medio (caminatas ocasionales)', high: 'Alto (deportista)' };
    return map[level] || level;
  }

  private translateExperience(exp: string): string {
    const map = { none: 'Sin experiencia', some: 'Algo de experiencia', experienced: 'Muy experimentado' };
    return map[exp] || exp;
  }

  private translateBudget(budget: string): string {
    const map = { low: 'Bajo (S/. 50-100/mes)', medium: 'Medio (S/. 100-200/mes)', high: 'Alto (S/. 200+/mes)' };
    return map[budget] || budget;
  }
}
