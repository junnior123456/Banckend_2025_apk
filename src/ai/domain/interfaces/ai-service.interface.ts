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

  /**
   * Clasifica/describe un perro a partir de su foto (visión)
   */
  classifyDogPhoto(imageUrl: string): Promise<DogPhotoAnalysis>;

  /**
   * Compara la foto de un perro perdido contra candidatos encontrados (visión)
   * y devuelve un ranking de similitud
   */
  matchPets(lostImageUrl: string, candidates: PetMatchCandidate[]): Promise<PetMatchResult[]>;

  /**
   * Chat contextual sobre una mascota concreta.
   * `contextText` es el expediente serializado y SÓLO debe pasarse si el dueño
   * dio consentimiento; si es null, el modelo responde de forma genérica.
   */
  petChat(
    userId: number,
    message: string,
    petName: string,
    contextText: string | null,
  ): Promise<string>;
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

/**
 * Resultado del análisis de una foto de perro (visión)
 */
export interface DogPhotoAnalysis {
  raza: string;
  color: string;
  tamano: string;
  edad_aproximada?: string;
  senas_particulares?: string;
  confianza: number; // 0-100
}

/**
 * Candidato a comparar en el match de mascotas
 */
export interface PetMatchCandidate {
  id: number;        // id de la mascota encontrada
  imageUrl: string;  // URL o data URL de su foto
}

/**
 * Resultado de similitud para un candidato
 */
export interface PetMatchResult {
  candidateId: number;
  score: number;   // 0-100
  reason: string;
}
