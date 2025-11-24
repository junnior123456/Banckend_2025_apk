-- Agregar campos adicionales para solicitudes de adopción de animales en riesgo
-- Ejecutar este script en MySQL

USE pawfinder;

-- Agregar columnas para plan de rescate y atención médica
ALTER TABLE adoption_requests 
ADD COLUMN IF NOT EXISTS rescuePlan TEXT NULL COMMENT 'Plan de rescate y cuidado del animal' AFTER hasOtherPets,
ADD COLUMN IF NOT EXISTS medicalCare TEXT NULL COMMENT 'Plan de atención médica' AFTER rescuePlan,
ADD COLUMN IF NOT EXISTS canProvideMedicalCare BOOLEAN DEFAULT FALSE COMMENT 'Puede costear atención veterinaria' AFTER medicalCare,
ADD COLUMN IF NOT EXISTS hasTransportation BOOLEAN DEFAULT FALSE COMMENT 'Tiene transporte disponible' AFTER canProvideMedicalCare;

-- Verificar que las columnas se agregaron correctamente
DESCRIBE adoption_requests;

SELECT 'Columnas agregadas exitosamente para solicitudes de adopción de animales en riesgo' AS resultado;
