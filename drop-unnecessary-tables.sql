-- Script para eliminar tablas innecesarias
-- Ejecuta este script en tu gestor de base de datos (phpMyAdmin, MySQL Workbench, etc.)

USE eccommerce;

-- Eliminar tabla bookings
DROP TABLE IF EXISTS bookings;

-- Eliminar tabla amenities  
DROP TABLE IF EXISTS amenities;

-- Verificar tablas restantes
SHOW TABLES;
