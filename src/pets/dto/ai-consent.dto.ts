import { IsBoolean } from 'class-validator';

/** Módulo 3 — Otorgar o revocar el consentimiento de lectura del expediente por la IA. */
export class AiConsentDto {
  @IsBoolean()
  enabled: boolean;
}
