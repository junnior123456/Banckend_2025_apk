-- Publicidad de la clínica, 20-ago-2026: cada ficha del catálogo puede llevar
-- un vídeo corto además de la foto.
ALTER TABLE vet_product
  ADD COLUMN IF NOT EXISTS "videoUrl" varchar(500);
