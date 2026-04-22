/**
 * INFRASTRUCTURE LAYER - Implementación del servicio de IA con Google Gemini
 * Conecta con la API de Gemini para procesar las consultas de PawFinder
 * Contexto: App de adopción de perros en Tarapoto, San Martín, Perú
 */
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IAiService,
  DogRecommendationInput,
  DogCareContext,
} from '../domain/interfaces/ai-service.interface';

@Injectable()
export class GeminiService implements IAiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;

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
    // Inicializar Gemini con la API key del entorno
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('⚠️ GEMINI_API_KEY no configurada - IA no disponible');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    // Usar gemini-1.5-flash que es gratuito y rápido
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Recomienda qué tipo de perro es más apto para el usuario
   * Considera el clima de Tarapoto y el estilo de vida del usuario
   */
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

  /**
   * Seguimiento del cuidado del perro adoptado
   * Responde preguntas sobre alimentación, salud, comportamiento en Tarapoto
   */
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

  /**
   * Refiere a veterinarias y clínicas de mascotas en Tarapoto
   * Incluye información actualizada sobre servicios disponibles
   */
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

  /**
   * Chat general sobre perros - responde cualquier pregunta
   */
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
   * Método privado para generar respuesta con Gemini
   * Maneja errores y fallbacks
   */
  private async generateResponse(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error('❌ Error al generar respuesta con Gemini:', error);

      // Si la API key no está configurada o hay error
      if (error.message?.includes('API_KEY') || error.message?.includes('apiKey')) {
        return '⚠️ El servicio de IA no está disponible en este momento. Por favor, contacta al soporte de PawFinder.';
      }

      return '😔 Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo en unos momentos.';
    }
  }

  // Métodos de traducción para el prompt
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
