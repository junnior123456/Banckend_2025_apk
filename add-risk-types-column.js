const mysql = require('mysql2/promise');

async function addRiskTypesColumn() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', // Actualiza esto con tu contraseña de MySQL
    database: 'ecommerce_db'
  });

  try {
    console.log('🔄 Agregando columna riskTypes a la tabla pets...');

    // Verificar si la columna ya existe
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM pets LIKE 'riskTypes'
    `);

    if (columns.length > 0) {
      console.log('✅ La columna riskTypes ya existe');
      return;
    }

    // Agregar la columna riskTypes como JSON
    await connection.query(`
      ALTER TABLE pets 
      ADD COLUMN riskTypes JSON DEFAULT NULL
      AFTER isRisk
    `);

    console.log('✅ Columna riskTypes agregada exitosamente');

    // Actualizar mascotas en riesgo existentes con tipos de ejemplo
    const [riskPets] = await connection.query(`
      SELECT id, name FROM pets WHERE isRisk = 1
    `);

    if (riskPets.length > 0) {
      console.log(`\n🔄 Actualizando ${riskPets.length} mascotas en riesgo con tipos de ejemplo...`);

      for (const pet of riskPets) {
        // Asignar tipos de riesgo de ejemplo
        const exampleTypes = JSON.stringify(['injured', 'malnourished', 'streetAbandoned']);
        
        await connection.query(`
          UPDATE pets 
          SET riskTypes = ? 
          WHERE id = ?
        `, [exampleTypes, pet.id]);

        console.log(`  ✅ ${pet.name} actualizado con tipos de riesgo`);
      }
    }

    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Ejecutar migración
addRiskTypesColumn()
  .then(() => {
    console.log('\n🎉 ¡Migración finalizada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
