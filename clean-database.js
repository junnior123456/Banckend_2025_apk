const mysql = require('mysql2/promise');

async function cleanDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin123',
    database: 'ecommerce'
  });

  try {
    console.log('🗑️  Limpiando base de datos...');
    
    // Deshabilitar foreign key checks temporalmente
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Eliminar datos de todas las tablas en orden
    console.log('📋 Eliminando solicitudes de adopción...');
    await connection.query('DELETE FROM adoption_requests');
    
    console.log('💰 Eliminando donaciones...');
    await connection.query('DELETE FROM donations');
    
    console.log('📝 Eliminando comentarios...');
    await connection.query('DELETE FROM comments');
    
    console.log('🔔 Eliminando notificaciones...');
    await connection.query('DELETE FROM notifications');
    
    console.log('📢 Eliminando reportes...');
    await connection.query('DELETE FROM reports');
    
    console.log('🖼️  Eliminando imágenes de mascotas...');
    await connection.query('DELETE FROM pet_images');
    
    console.log('🐾 Eliminando mascotas...');
    await connection.query('DELETE FROM pets');
    
    console.log('👥 Eliminando usuarios...');
    await connection.query('DELETE FROM users');
    
    console.log('🔄 Reiniciando AUTO_INCREMENT...');
    await connection.query('ALTER TABLE adoption_requests AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE donations AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE comments AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE notifications AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE reports AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE pet_images AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE pets AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE users AUTO_INCREMENT = 1');
    
    // Reactivar foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Base de datos limpiada exitosamente!');
    console.log('');
    console.log('📊 Estado actual:');
    console.log('   - Usuarios: 0');
    console.log('   - Mascotas: 0');
    console.log('   - Solicitudes de adopción: 0');
    console.log('   - Donaciones: 0');
    console.log('');
    console.log('🎉 ¡Listo para empezar con pruebas reales!');
    
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  } finally {
    await connection.end();
  }
}

cleanDatabase();
