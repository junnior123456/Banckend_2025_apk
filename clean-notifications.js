const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('🧹 Limpiando notificaciones de prueba...\n');

async function cleanNotifications() {
  let connection;
  
  try {
    // Conectar a MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'admin123',
      database: process.env.DB_NAME || 'ecommerce',
    });
    
    console.log('✅ Conectado a MySQL\n');
    
    // Mostrar notificaciones actuales
    console.log('📊 Notificaciones actuales:');
    const [currentNotifications] = await connection.query('SELECT * FROM notifications');
    
    if (currentNotifications.length > 0) {
      console.table(currentNotifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message.substring(0, 50) + '...',
        type: n.type,
        isRead: n.isRead ? 'Sí' : 'No',
        userId: n.userId,
      })));
    } else {
      console.log('   No hay notificaciones\n');
    }
    
    console.log(`\n📊 Total de notificaciones: ${currentNotifications.length}\n`);
    
    if (currentNotifications.length > 0) {
      // Eliminar todas las notificaciones
      console.log('🗑️  Eliminando todas las notificaciones...');
      await connection.query('DELETE FROM notifications');
      console.log('✅ Notificaciones eliminadas\n');
      
      // Verificar
      const [remainingNotifications] = await connection.query('SELECT * FROM notifications');
      console.log(`📊 Notificaciones restantes: ${remainingNotifications.length}\n`);
      
      if (remainingNotifications.length === 0) {
        console.log('✅ Base de datos limpia!\n');
      } else {
        console.log('⚠️  Aún quedan notificaciones en la base de datos\n');
      }
    } else {
      console.log('✅ No hay notificaciones para eliminar\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Conexión cerrada');
    }
  }
}

// Ejecutar limpieza
cleanNotifications();
