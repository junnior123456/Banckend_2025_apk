#!/usr/bin/env node
// Script para inspeccionar tablas en la base de datos MySQL usada por TypeORM
// Muestra tablas existentes y las que no están mapeadas por las entidades listadas
// en `src/app.module.ts`. Opcionalmente puede borrar tablas (usar con precaución).

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const DROP_FLAG = process.argv.includes('--drop');

async function main() {
  const env = process.env;

  const host = env.DB_HOST || 'localhost';
  const port = Number(env.DB_PORT || 3306);
  const user = env.DB_USER || 'root';
  const password = env.DB_PASS || 'admin123';
  const database = env.DB_NAME || 'ecommerce';

  console.log(`Conectando a MySQL ${user}@${host}:${port}/${database}`);

  const conn = await mysql.createConnection({ host, port, user, password, database });

  try {
    // Obtener tablas en la base de datos
    const [rows] = await conn.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?", [database]);
    const dbTables = rows.map(r => r.TABLE_NAME);

    console.log('\nTablas encontradas en la base de datos:');
    dbTables.forEach(t => console.log(' -', t));

    // Leer entidades desde src/app.module.ts
    const appModulePath = path.resolve(process.cwd(), 'src', 'app.module.ts');
    let entitiesDeclared = [];
    if (fs.existsSync(appModulePath)) {
      const content = fs.readFileSync(appModulePath, 'utf8');
      const entitiesMatch = content.match(/entities\s*:\s*\[([\s\S]*?)\]/m);
      if (entitiesMatch) {
        const inner = entitiesMatch[1];
        // Extraer identificadores simples (palabras que parezcan clase names)
        const names = inner.split(',').map(s => s.replace(/[^A-Za-z0-9_]/g, '').trim()).filter(Boolean);
        entitiesDeclared = names;
      }
    } else {
      console.warn('No se encontró src/app.module.ts. Usando lista de entidades vacía.');
    }

    console.log('\nEntidades detectadas en `src/app.module.ts`:');
    if (entitiesDeclared.length === 0) console.log(' - (ninguna detectada)');
    entitiesDeclared.forEach(e => console.log(' -', e));

    // Heurística simple: comparar nombres de entidades en minúscula con tablas
    const entityTableNames = entitiesDeclared.map(e => e.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''));

    const unmappedTables = dbTables.filter(t => {
      // conservar tablas que no parezcan corresponder a ninguna entidad
      const cleanT = t.toLowerCase();
      return !entityTableNames.some(et => cleanT.includes(et) || et.includes(cleanT) || cleanT === et || cleanT === `${et}s`);
    });

    console.log('\nTablas que NO parecen estar mapeadas por las entidades listadas (revisar manualmente):');
    if (unmappedTables.length === 0) console.log(' - (ninguna)');
    unmappedTables.forEach(t => console.log(' -', t));

    if (unmappedTables.length > 0) {
      if (!DROP_FLAG) {
        console.log('\nSi deseas borrar estas tablas, vuelve a ejecutar con --drop:');
        console.log('  npm run db:drop');
        process.exit(0);
      }

      // Pedir confirmación interactiva
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const question = (q) => new Promise(resolve => rl.question(q, ans => resolve(ans)));

      console.log('\nADVERTENCIA: vas a borrar tablas en la base de datos. Esto es irreversible si no tienes backup.');
      const answer = (await question('¿Estás seguro que quieres borrar las tablas listadas? (si/no): ')).toLowerCase();
      if (answer !== 'si' && answer !== 's' && answer !== 'yes') {
        console.log('Operación cancelada por el usuario. No se borró ninguna tabla.');
        rl.close();
        process.exit(0);
      }

      // Borrar tablas una por una
      for (const table of unmappedTables) {
        try {
          console.log(`Borrando tabla: ${table}`);
          await conn.query(`DROP TABLE \`${table}\``);
          console.log(`OK: ${table}`);
        } catch (err) {
          console.error(`Error al borrar tabla ${table}:`, err.message);
        }
      }

      rl.close();
      console.log('\nOperación de borrado completada. Recomendado: revisar la base de datos y realizar respaldo.');
    }

  } catch (err) {
    console.error('Error inspector:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
