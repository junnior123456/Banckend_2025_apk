-- La veterinaria como tienda/clínica dentro de la app, 20-ago-2026.

-- Catálogo de productos y servicios. Solo el dueño VET (o un admin) publica.
CREATE TABLE IF NOT EXISTS vet_product (
  id            serial PRIMARY KEY,
  "veterinariaId" int NOT NULL REFERENCES veterinaria(id) ON DELETE CASCADE,
  name          varchar(150) NOT NULL,
  description   text,
  -- numeric evita los errores de redondeo del float con el dinero.
  price         numeric(10,2) NOT NULL DEFAULT 0,
  -- 'producto' (se vende por unidades) o 'servicio' (no tiene stock).
  kind          varchar(20) NOT NULL DEFAULT 'producto',
  category      varchar(60),
  "imageUrl"    varchar(500),
  stock         int,          -- NULL = no se controla stock
  "isActive"    boolean NOT NULL DEFAULT true,
  "createdAt"   timestamp NOT NULL DEFAULT now(),
  "updatedAt"   timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vet_product_vet ON vet_product("veterinariaId");

-- Horario de atención, un tramo por fila: dos filas el mismo día parten la
-- jornada en mañana y tarde sin inventar campos de "pausa".
CREATE TABLE IF NOT EXISTS vet_working_hours (
  id            serial PRIMARY KEY,
  "veterinariaId" int NOT NULL REFERENCES veterinaria(id) ON DELETE CASCADE,
  -- 0=domingo ... 6=sábado, igual que Date.getDay() de JS para no traducir.
  weekday       smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  "opensAt"     time NOT NULL,
  "closesAt"    time NOT NULL,
  CHECK ("closesAt" > "opensAt")
);
CREATE INDEX IF NOT EXISTS idx_vet_hours_vet ON vet_working_hours("veterinariaId", weekday);

-- Horas ocupadas que NO son citas de la app: lo que el veterinario ya tiene
-- agendado en su propio sistema. Es lo que evita que se pisen los horarios.
CREATE TABLE IF NOT EXISTS vet_busy_slot (
  id            serial PRIMARY KEY,
  "veterinariaId" int NOT NULL REFERENCES veterinaria(id) ON DELETE CASCADE,
  "startsAt"    timestamp NOT NULL,
  "endsAt"      timestamp NOT NULL,
  title         varchar(200),
  source        varchar(20) NOT NULL DEFAULT 'external',
  "externalId"  varchar(200),
  "createdAt"   timestamp NOT NULL DEFAULT now(),
  CHECK ("endsAt" > "startsAt")
);
CREATE INDEX IF NOT EXISTS idx_vet_busy_rango ON vet_busy_slot("veterinariaId", "startsAt", "endsAt");
-- Sin este índice único, cada sincronización volvería a insertar los mismos
-- eventos en vez de actualizarlos.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vet_busy_externo
  ON vet_busy_slot("veterinariaId", "externalId") WHERE "externalId" IS NOT NULL;

-- Ajustes de agenda en la propia ficha de la veterinaria.
-- ⚠️ externalAgendaKey es una CREDENCIAL: no debe salir en respuestas públicas.
ALTER TABLE veterinaria
  ADD COLUMN IF NOT EXISTS "slotMinutes" int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "externalAgendaUrl" varchar(500),
  ADD COLUMN IF NOT EXISTS "externalAgendaKey" varchar(80),
  ADD COLUMN IF NOT EXISTS "externalAgendaSyncedAt" timestamp;
