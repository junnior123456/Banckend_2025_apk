import { IsInt, IsNumber, Max, Min } from 'class-validator';

/**
 * Entrada del modelo PawMatch. Los enteros categóricos van 0..2 (mismas
 * etiquetas que el prototipo del árbol); las magnitudes son numéricas.
 */
export class PawmatchDto {
  @IsInt() @Min(0) @Max(2)
  tipo_vivienda: number; // 0=Apto 1=Casa sin jardín 2=Casa con jardín

  @IsNumber() @Min(0) @Max(24)
  horas_solo_dia: number;

  @IsInt() @Min(0) @Max(20)
  ninos_en_casa: number;

  @IsInt() @Min(0) @Max(2)
  experiencia_previa: number; // 0=Sin 1=Básica 2=Avanzada

  @IsInt() @Min(0) @Max(2)
  nivel_actividad: number; // 0=Sedentario 1=Moderado 2=Muy activo

  @IsNumber() @Min(0)
  presupuesto_mensual: number;

  @IsInt() @Min(0) @Max(2)
  tamano_perro: number; // 0=Pequeño 1=Mediano 2=Grande

  @IsInt() @Min(0) @Max(2)
  energia_perro: number; // 0=Baja 1=Media 2=Alta

  @IsNumber() @Min(0) @Max(30)
  edad_perro_anos: number;
}
