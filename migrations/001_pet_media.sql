-- Vídeos cortos en las publicaciones (tipo TikTok), 20-ago-2026.
-- Una fila de pet_images puede ser ahora una imagen (por defecto, como hasta
-- entonces) o un vídeo. Las filas existentes quedan como 'image'.
ALTER TABLE pet_images
  ADD COLUMN IF NOT EXISTS "mediaType" varchar(10) NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" varchar(500),
  ADD COLUMN IF NOT EXISTS "durationSec" int;
