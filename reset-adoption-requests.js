const mysql = require('mysql2/promise');

async function resetAdoptionRequests() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin123',
    database: 'ecommerce'
  });

  try {
    console.log('🗑️ Eliminando solicitudes de adopción...');
    await connection.execute('DELETE FROM adoption_requests');
    
    console.log('🔄 Reiniciando AUTO_INCREMENT...');
    await connection.execute('ALTER TABLE adoption_requests AUTO_INCREMENT = 1');
    
    console.log('🔄 Actualizando estado de mascotas a available...');
    await connection.execute("UPDATE pets SET status = 'available' WHERE isRisk = false");
    
    console.log('✅ Solicitudes de adopción reseteadas exitosamente');
    console.log('✅ Todas las mascotas están disponibles de nuevo');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

resetAdoptionRequests();
