import { IsInt, IsNumber, Max, Min } from 'class-validator';

/**
 * Entrada de PawMatch FELINO. Deliberadamente NO es el DTO del perro:
 * - Fuera `tamano`: en un gato es irrelevante para la convivencia.
 * - Fuera `nivel_actividad` del adoptante: un gato no se pasea; lo que importa
 *   es si le dedican juego, no si el dueño sale a correr.
 * - Dentro `acceso_exterior` y `otros_gatos`, que en gatos sí pesan (riesgo de
 *   calle y territorialidad) y en perros no aplican igual.
 */
export class PawmatchGatoDto {
  @IsInt() @Min(0) @Max(2)
  tipo_vivienda: number; // 0=Apto 1=Casa sin jardín 2=Casa con jardín

  @IsNumber() @Min(0) @Max(24)
  horas_solo_dia: number;

  @IsInt() @Min(0) @Max(20)
  ninos_en_casa: number;

  @IsInt() @Min(0) @Max(2)
  experiencia_previa: number; // 0=Sin 1=Básica 2=Avanzada

  @IsNumber() @Min(0)
  presupuesto_mensual: number;

  @IsInt() @Min(0) @Max(2)
  energia_gato: number; // 0=Tranquilo 1=Normal 2=Muy juguetón

  @IsNumber() @Min(0) @Max(30)
  edad_gato_anos: number;

  @IsInt() @Min(0) @Max(20)
  otros_gatos: number; // gatos que YA viven en la casa

  @IsInt() @Min(0) @Max(1)
  acceso_exterior: number; // 0=solo interior 1=sale a la calle

  @IsInt() @Min(0) @Max(1)
  tiempo_juego_diario: number; // 0=poco/nada 1=juega a diario con él
}
