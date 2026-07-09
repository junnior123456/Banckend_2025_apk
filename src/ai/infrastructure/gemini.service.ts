/**
 * INFRASTRUCTURE LAYER - Servicio de IA de PawFinder
 * Proveedor ACTUAL: GitHub Models (endpoint compatible con OpenAI).
 * Antes usaba Google Gemini; migrado para NO depender de la API de Gemini.
 * Este archivo es el ÚNICO punto de cambio de proveedor: para auto-hospedar
 * (Ollama/OpenAI-compatible) en el futuro basta cambiar endpoint/model/token.
 * Contexto: App de perros (adopción / perdidos) en Tarapoto, San Martín, Perú.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  IAiService,
  DogRecommendationInput,
  DogCareContext,
  DogPhotoAnalysis,
  PetMatchCandidate,
  PetMatchResult,
} from '../domain/interfaces/ai-service.interface';

@Injectable()
export class GeminiService implements IAiService {
  private readonly logger = new Logger(GeminiService.name);

  // Configuración del proveedor (GitHub Models, compatible OpenAI)
  private readonly endpoint =
    process.env.GITHUB_MODELS_ENDPOINT || 'https://models.github.ai/inference';
  private readonly token = process.env.GITHUB_TOKEN || '';
  private readonly model = process.env.GITHUB_MODEL || 'openai/gpt-4o-mini';

  // Prompt base con contexto de Tarapoto para todas las consultas
  private readonly BASE_CONTEXT = `
    Eres PawBot, el asistente inteligente de PawFinder, una aplicación de adopción
    de perros en Tarapoto, San Martín, Perú.

    Contexto importante sobre Tarapoto:
    - Ciudad en la selva alta peruana, clima tropical cálido (25-35°C)
    - Población aproximada: 170,000 habitantes
    - Zona urbana con barrios como Morales, Banda de Shilcayo, La Unión
    - Cultura local donde las mascotas son muy valoradas
    - Mercado de mascotas en crecimiento
    - Veterinarias disponibles en la ciudad

    Siempre responde en español, de forma amigable, clara y práctica.
    Enfócate SOLO en perros (canes).
    Considera el clima tropical de Tarapoto en tus recomendaciones.
  `;

  constructor() {
    if (!this.token) {
      this.logger.warn('⚠️ GITHUB_TOKEN no configurado - IA no disponible');
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
      throw new Error('API_KEY missing - GITHUB_TOKEN no configurado');
    }
    const body: any = {
      model: this.model,
      messages,
      max_tokens: maxTokens,
      temperature,
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
      throw new Error(`GitHub Models HTTP ${res.status}: ${txt.slice(0, 300)}`);
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
        Información del perro:
        - Nombre: ${dogInfo.name || 'No especificado'}
        - Raza: ${dogInfo.breed || 'No especificada'}
        - Edad: ${dogInfo.age ? `${dogInfo.age} meses` : 'No especificada'}
        - Peso: ${dogInfo.weight ? `${dogInfo.weight} kg` : 'No especificado'}
      `
      : 'No se proporcionó información específica del perro.';

    const prompt = `
      ${this.BASE_CONTEXT}

      TAREA: Ayudar con el seguimiento y cuidado del perro adoptado.

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
    const prompt = `
      ${this.BASE_CONTEXT}

      TAREA: Referir a veterinarias o clínicas de mascotas en Tarapoto, San Martín, Perú.

      Preocupación del dueño: "${concern}"

      Por favor:
      1. Evalúa la urgencia del caso (¿es emergencia?)
      2. Recomienda buscar veterinarias en Tarapoto con estos criterios:
         - Zona centro de Tarapoto
         - Zona Morales
         - Zona Banda de Shilcayo
      3. Menciona qué tipo de especialista necesita (veterinario general, cirujano, etc.)
      4. Da consejos de primeros auxilios si aplica mientras llega al veterinario
      5. Menciona qué información llevar al veterinario (síntomas, duración, etc.)
      6. Indica el costo aproximado de consulta veterinaria en Tarapoto (S/. 30-80 soles)

      IMPORTANTE: Siempre recomienda consultar con un veterinario profesional para
      diagnósticos y tratamientos. No reemplaces la consulta veterinaria.

      Formato: Respuesta clara con nivel de urgencia y pasos a seguir 🏥
    `;
    return await this.generateResponse(prompt);
  }

  async generalChat(userId: number, message: string): Promise<string> {
    const prompt = `
      ${this.BASE_CONTEXT}

      TAREA: Responder consulta general sobre perros.

      Mensaje del usuario: "${message}"

      Responde de forma amigable, informativa y práctica.
      Si la pregunta no es sobre perros, redirige amablemente al tema de mascotas.
      Considera siempre el contexto de Tarapoto, San Martín, Perú.
    `;
    return await this.generateResponse(prompt);
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
        - NO das diagnósticos. Ante cualquier síntoma serio, deriva al veterinario.`
      : `${this.BASE_CONTEXT}

        El dueño NO ha dado consentimiento para que leas el expediente de "${petName}",
        así que NO tienes ningún dato médico de esta mascota.

        REGLAS:
        - Responde de forma general y útil, sin inventar datos de "${petName}".
        - NUNCA afirmes conocer su peso, vacunas, alergias o medicación.
        - Si la pregunta requiere el expediente, dilo con naturalidad y sugiere
          activar el acceso al expediente desde la ficha de la mascota.`;

    try {
      return await this.callModel(
        [
          { role: 'system', content: system },
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

  /** Clasifica/describe un perro a partir de su foto (raza, color, tamaño, señas). */
  async classifyDogPhoto(imageUrl: string): Promise<DogPhotoAnalysis> {
    try {
      const dataUrl = await this.toDataUrl(imageUrl);
      const content = [
        {
          type: 'text',
          text:
            'Eres un veterinario experto. Analiza la foto del perro y responde SOLO ' +
            'con un JSON válido (sin texto extra) con estas claves exactas: ' +
            'raza (string, la más probable), color (string), ' +
            'tamano (string: "pequeño"|"mediano"|"grande"), ' +
            'edad_aproximada (string), ' +
            'senas_particulares (string con marcas/rasgos distintivos), ' +
            'confianza (number 0-100). ' +
            'Si la imagen NO es un perro, devuelve raza:"no es un perro" y confianza:0.',
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

  /** Compara la foto de un perro perdido contra varios candidatos encontrados
   *  y devuelve un ranking de similitud. Máximo 6 candidatos por llamada. */
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
          `Eres un experto en identificación canina. La IMAGEN 0 es un perro PERDIDO. ` +
          `A continuación hay ${limited.length} perros ENCONTRADOS. ` +
          `Para cada uno da un puntaje de similitud (0-100) de que sea el MISMO perro ` +
          `y una razón corta. Considera raza, color, tamaño, patrones del pelaje y señas. ` +
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
