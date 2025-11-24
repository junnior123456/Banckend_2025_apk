const mysql = require('mysql2/promise');
require('dotenv').config();

async function eliminarDuplicados() {
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

    // 1. Buscar duplicados
    console.log('🔍 Buscando mascotas duplicadas...\n');
    const [duplicates] = await connection.execute(`
      SELECT name, userId, COUNT(*) as count, GROUP_CONCAT(id ORDER BY createdAt DESC) as ids
      FROM pets
      WHERE isActive = true
      GROUP BY name, userId
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (duplicates.length === 0) {
      console.log('✅ No hay duplicados en la base de datos');
      return;
    }

    console.log(`⚠️  Encontrados ${duplicates.length} grupos de duplicados:\n`);

    for (const dup of duplicates) {
      console.log(`📋 "${dup.name}" - ${dup.count} copias`);
      const ids = dup.ids.split(',');
      const keepId = ids[0]; // Mantener el más reciente
      const deleteIds = ids.slice(1); // Eliminar los demás

      console.log(`   ✅ Mantener ID: ${keepId}`);
      console.log(`   ❌ Eliminar IDs: ${deleteIds.join(', ')}`);

      // Eliminar duplicados
      for (const id of deleteIds) {
        await connection.execute('DELETE FROM pets WHERE id = ?', [id]);
        console.log(`   🗑️  Eliminado ID ${id}`);
      }
      console.log('');
    }

    console.log('✅ Duplicados eliminados exitosamente\n');

    // 2. Mostrar estado final
    console.log('📊 Estado final de mascotas activas:\n');
    const [finalPets] = await connection.execute(`
      SELECT id, name, userId, isRisk, createdAt
      FROM pets
      WHERE isActive = true
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    finalPets.forEach(pet => {
      const tipo = pet.isRisk ? '🔴 Riesgo' : '🟢 Adopción';
      console.log(`${tipo} - ${pet.name} (ID: ${pet.id}, User: ${pet.userId})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Desconectado de la base de datos');
    }
  }
}

eliminarDuplicados();
