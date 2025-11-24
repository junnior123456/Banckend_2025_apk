const mysql = require('mysql2/promise');

async function migrateRiskAdoptionFields() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajusta tu contraseña
    database: 'pawfinder',
  });

  try {
    console.log('🔄 Iniciando migración de campos de adopción para animales en riesgo...\n');

    // Verificar si las columnas ya existen
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'pawfinder' 
        AND TABLE_NAME = 'adoption_requests' 
        AND COLUMN_NAME IN ('rescuePlan', 'medicalCare', 'canProvideMedicalCare', 'hasTransportation')
    `);

    if (columns.length === 4) {
      console.log('✅ Las columnas ya existen en la base de datos.');
      console.log('   No es necesario ejecutar la migración.\n');
      await connection.end();
      return;
    }

    // Agregar columnas
    console.log('📝 Agregando columnas a la tabla adoption_requests...');
    
    await connection.query(`
      ALTER TABLE adoption_requests 
      ADD COLUMN IF NOT EXISTS rescuePlan TEXT NULL COMMENT 'Plan de rescate y cuidado del animal' AFTER hasOtherPets
    `);
    console.log('   ✓ rescuePlan agregada');

    await connection.query(`
      ALTER TABLE adoption_requests 
      ADD COLUMN IF NOT EXISTS medicalCare TEXT NULL COMMENT 'Plan de atención médica' AFTER rescuePlan
    `);
    console.log('   ✓ medicalCare agregada');

    await connection.query(`
      ALTER TABLE adoption_requests 
      ADD COLUMN IF NOT EXISTS canProvideMedicalCare BOOLEAN DEFAULT FALSE COMMENT 'Puede costear atención veterinaria' AFTER medicalCare
    `);
    console.log('   ✓ canProvideMedicalCare agregada');

    await connection.query(`
      ALTER TABLE adoption_requests 
      ADD COLUMN IF NOT EXISTS hasTransportation BOOLEAN DEFAULT FALSE COMMENT 'Tiene transporte disponible' AFTER canProvideMedicalCare
    `);
    console.log('   ✓ hasTransportation agregada');

    console.log('\n✅ Migración completada exitosamente!');
    console.log('   Las solicitudes de adopción ahora soportan campos adicionales para animales en riesgo.\n');

    // Mostrar estructura de la tabla
    const [tableStructure] = await connection.query('DESCRIBE adoption_requests');
    console.log('📋 Estructura actualizada de adoption_requests:');
    console.table(tableStructure.map(col => ({
      Campo: col.Field,
      Tipo: col.Type,
      Nulo: col.Null,
      Default: col.Default
    })));

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Ejecutar migración
migrateRiskAdoptionFields()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
