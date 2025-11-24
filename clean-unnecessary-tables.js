const mysql = require('mysql2/promise');

async function cleanUnnecessaryTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'eccommerce'
  });

  try {
    console.log('🗑️  Eliminando tablas innecesarias...\n');

    // Eliminar tabla bookings
    await connection.execute('DROP TABLE IF EXISTS bookings');
    console.log('✅ Tabla "bookings" eliminada');

    // Eliminar tabla amenities
    await connection.execute('DROP TABLE IF EXISTS amenities');
    console.log('✅ Tabla "amenities" eliminada');

    console.log('\n✅ Tablas innecesarias eliminadas exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

cleanUnnecessaryTables();
