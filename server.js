#!/usr/bin/env node

// Script de inicio simple para Render
// Este archivo se ejecuta directamente y carga el main compilado

const path = require('path');
const fs = require('fs');

// Determinar la ruta correcta del archivo main
const possiblePaths = [
  path.join(__dirname, 'dist', 'main.js'),
  path.join(__dirname, 'dist', 'main'),
  path.join(process.cwd(), 'dist', 'main.js'),
  path.join(process.cwd(), 'dist', 'main'),
];

let mainPath = null;

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    mainPath = p;
    console.log(`✅ Encontrado archivo main en: ${p}`);
    break;
  }
  if (fs.existsSync(p + '.js')) {
    mainPath = p + '.js';
    console.log(`✅ Encontrado archivo main en: ${p}.js`);
    break;
  }
}

if (!mainPath) {
  console.error('❌ No se pudo encontrar dist/main.js');
  console.error('Directorio actual:', process.cwd());
  console.error('__dirname:', __dirname);
  console.error('Contenido del directorio:');
  
  try {
    const files = fs.readdirSync(process.cwd());
    console.error(files);
    
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      console.error('Contenido de dist:');
      const distFiles = fs.readdirSync(path.join(process.cwd(), 'dist'));
      console.error(distFiles);
    }
  } catch (e) {
    console.error('Error listando archivos:', e);
  }
  
  process.exit(1);
}

// Cargar y ejecutar el main
console.log('🚀 Iniciando aplicación desde:', mainPath);
require(mainPath);
