/**
 * DOMAIN LAYER - Interfaz del servicio de IA
 * Define los casos de uso disponibles para la IA en PawFinder
 */
export interface IAiService {
  /**
   * Recomienda qué tipo de perro es más apto para el usuario
   * basado en su estilo de vida, espacio, experiencia, etc.
   */
  recommendDog(userId: number, userProfile: DogRecommendationInput): Promise<string>;

  /**
   * Hace seguimiento del cuidado del perro adoptado
   * Responde preguntas sobre alimentación, salud, comportamiento
   */
  trackDogCare(userId: number, question: string, dogInfo?: DogCareContext): Promise<string>;

  /**
   * Refiere a veterinarias o clínicas de mascotas en Tarapoto, San Martín, Perú
   */
  referToVet(userId: number, concern: string): Promise<string>;

  /**
   * Chat general sobre perros
   */
  generalChat(userId: number, message: string): Promise<string>;
}

/**
 * Datos del usuario para recomendar un perro
 */
export interface DogRecommendationInput {
  livingSpace: 'apartment' | 'house_small' | 'house_large'; // Tipo de vivienda
  hasChildren: boolean;       // ¿Tiene niños en casa?
  hasOtherPets: boolean;      // ¿Tiene otras mascotas?
  activityLevel: 'low' | 'medium' | 'high'; // Nivel de actividad física
  experience: 'none' | 'some' | 'experienced'; // Experiencia con perros
  hoursAlone: number;         // Horas que el perro estaría solo al día
  budget: 'low' | 'medium' | 'high'; // Presupuesto para el cuidado
  allergies: boolean;         // ¿Alergias a pelo de perro?
}

/**
 * Contexto del perro para seguimiento de cuidado
 */
export interface DogCareContext {
  breed?: string;    // Raza del perro
  age?: number;      // Edad en meses
  weight?: number;   // Peso en kg
  name?: string;     // Nombre del perro
}
