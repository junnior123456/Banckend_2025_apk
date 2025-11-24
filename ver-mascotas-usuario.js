const mysql = require('mysql2/promise');
require('dotenv').config();

async function verMascotasUsuario() {
  let connection;
  
  try {
    console.log('🔌 Conectando a la base de datos...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ecommerce',
    });

    console.log('✅ Conectado exitosamente\n');

    // Ver todos los usuarios
    console.log('👥 Usuarios en el sistema:\n');
    const [users] = await connection.execute('SELECT id, name, email FROM users ORDER BY id');
    users.forEach(user => {
      console.log(`   ${user.id}. ${user.name} (${user.email})`);
    });
    console.log('');

    // Ver mascotas de cada usuario
    for (const user of users) {
      console.log(`📋 Mascotas de ${user.name} (ID: ${user.id}):\n`);
      
      const [pets] = await connection.execute(`
        SELECT id, name, isRisk, status, isActive, createdAt
        FROM pets
        WHERE userId = ?
        ORDER BY createdAt DESC
      `, [user.id]);

      if (pets.length === 0) {
        console.log('   (Sin mascotas)\n');
        continue;
      }

      pets.forEach(pet => {
        const tipo = pet.isRisk ? '🔴 Riesgo' : '🟢 Adopción';
        const estado = pet.isActive ? '✅ Activa' : '❌ Inactiva';
        console.log(`   ${tipo} ${estado} - ${pet.name} (ID: ${pet.id}, Status: ${pet.status})`);
        console.log(`      Creado: ${pet.createdAt}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Desconectado de la base de datos');
    }
  }
}

verMascotasUsuario();
