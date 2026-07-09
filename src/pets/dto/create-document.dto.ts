import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const DOCUMENT_CATEGORIES = [
  'radiografia',
  'analisis',
  'receta',
  'foto',
  'otro',
] as const;

/** MIME permitidos: imágenes + PDF. */
export const ALLOWED_DOC_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB

export class CreateDocumentDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsIn(DOCUMENT_CATEGORIES as unknown as string[])
  @IsOptional()
  category?: string;
}
