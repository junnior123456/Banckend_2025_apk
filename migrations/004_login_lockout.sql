-- Bloqueo por intentos de acceso fallidos, 20-ago-2026 (auditoría).
-- nginx ya limita a 1 intento/s por IP, pero eso deja ~86.000 pruebas al día
-- contra una cuenta: hace falta también un freno POR CUENTA.
--
-- 🔑 El contador va en la BD y no en memoria porque el backend corre en
-- cluster con 2 procesos: cada uno tendría el suyo y no se enterarían.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" timestamp;
