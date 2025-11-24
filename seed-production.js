const mysql = require('mysql2/promise');

async function seedProduction() {
  // REEMPLAZA ESTOS VALORES CON LOS DE RAILWAY
  const connection = await mysql.createConnection({
    host: 'TU_MYSQL_HOST_DE_RAILWAY',
    port: 3306,
    user: 'TU_MYSQL_USER_DE_RAILWAY',
    password: 'TU_MYSQL_PASSWORD_DE_RAILWAY',
    database: 'TU_MYSQL_DATABASE_DE_RAILWAY'
  });

  try {
    console.log('🌱 Creando roles...');
    
    // Crear roles
    await connection.execute(`
      INSERT IGNORE INTO roles (id, name, image, route, created_at, updated_at) VALUES
      (1, 'ADMIN', '', '/admin', NOW(), NOW()),
      (2, 'CLIENT', '', '/client', NOW(), NOW())
    `);
    
    console.log('✅ Roles creados');
    
    console.log('🌱 Creando categorías...');
    
    // Crear categorías
    await connection.execute(`
      INSERT IGNORE INTO categories (id, name, created_at, updated_at) VALUES
      (1, 'Perro', NOW(), NOW()),
      (2, 'Gato', NOW(), NOW()),
      (3, 'Ave', NOW(), NOW()),
      (4, 'Otro', NOW(), NOW())
    `);
    
    console.log('✅ Categorías creadas');
    
    console.log('✅ Seeds completados exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

seedProduction();
