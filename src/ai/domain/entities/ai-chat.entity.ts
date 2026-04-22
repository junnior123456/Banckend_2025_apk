/**
 * DOMAIN LAYER - Entidad AiChat
 * Representa un mensaje en la conversación con la IA
 * Contexto: PawFinder - App de adopción de perros en Tarapoto, San Martín, Perú
 */
export class AiChat {
  id?: number;
  userId: number;          // Usuario que hace la consulta
  message: string;         // Mensaje del usuario
  response: string;        // Respuesta de la IA
  chatType: AiChatType;    // Tipo de consulta
  context?: string;        // Contexto adicional (datos del perro, etc.)
  createdAt?: Date;
}

/**
 * Tipos de consulta disponibles en la IA
 */
export enum AiChatType {
  DOG_RECOMMENDATION = 'dog_recommendation',  // Recomienda qué perro adoptar
  CARE_TRACKING = 'care_tracking',            // Seguimiento del cuidado del perro
  VET_REFERRAL = 'vet_referral',              // Referencia a veterinarias en Tarapoto
  GENERAL = 'general',                        // Consulta general sobre perros
}
