-- Script para actualizar el estado de Zara a 'adopted'

-- 1. Ver el estado actual de Zara
SELECT 
    id,
    name,
    status,
    userId,
    createdAt,
    adoptedAt
FROM pets
WHERE name = 'Zara';

-- 2. Ver las solicitudes de adopción de Zara
SELECT 
    ar.id,
    ar.status,
    ar.petId,
    p.name as pet_name,
    ar.donorConfirmedAt,
    ar.adopterConfirmedAt,
    ar.completedAt
FROM adoption_requests ar
JOIN pets p ON ar.petId = p.id
WHERE p.name = 'Zara';

-- 3. Actualizar el estado de Zara a 'adopted'
UPDATE pets
SET 
    status = 'adopted',
    adoptedAt = NOW()
WHERE name = 'Zara';

-- 4. Verificar la actualización
SELECT 
    id,
    name,
    status,
    userId,
    createdAt,
    adoptedAt
FROM pets
WHERE name = 'Zara';
