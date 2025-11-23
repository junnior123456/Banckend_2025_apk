const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('🧹 Eliminando mascotas duplicadas...\n');

async function removeDuplicates() {
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
    
    // Mostrar mascotas actuales
    console.log('📊 Mascotas actuales:');
    const [pets] = await connection.query(`
      SELECT id, name, userId, isRisk, createdAt 
      FROM pets 
      ORDER BY name, createdAt
    `);
    
    console.table(pets);
    console.log(`\n📊 Total de mascotas: ${pets.length}\n`);
    
    // Encontrar duplicados (mismo nombre y usuario)
    const [duplicates] = await connection.query(`
      SELECT name, userId, COUNT(*) as count
      FROM pets
      GROUP BY name, userId
      HAVING count > 1
    `);
    
    if (duplicates.length === 0) {
      console.log('✅ No hay duplicados\n');
      return;
    }
    
    console.log('🔍 Duplicados encontrados:');
    console.table(duplicates);
    
    // Para cada grupo de duplicados, mantener solo el más reciente
    for (const dup of duplicates) {
      console.log(`\n🗑️  Procesando duplicados de "${dup.name}" (Usuario ${dup.userId})...`);
      
      // Obtener todos los IDs de este duplicado, ordenados por fecha (más reciente primero)
      const [dupPets] = await connection.query(`
        SELECT id, createdAt
        FROM pets
        WHERE name = ? AND userId = ?
        ORDER BY createdAt DESC
      `, [dup.name, dup.userId]);
      
      // Mantener el primero (más reciente) y eliminar los demás
      const toKeep = dupPets[0].id;
      const toDelete = dupPets.slice(1).map(p => p.id);
      
      console.log(`   ✅ Manteniendo ID: ${toKeep} (${dupPets[0].createdAt})`);
      console.log(`   🗑️  Eliminando IDs: ${toDelete.join(', ')}`);
      
      if (toDelete.length > 0) {
        // Eliminar notificaciones asociadas primero
        await connection.query(`
          DELETE FROM notifications WHERE petId IN (?)
        `, [toDelete]);
        
        // Eliminar imágenes asociadas
        await connection.query(`
          DELETE FROM pet_images WHERE petId IN (?)
        `, [toDelete]);
        
        // Eliminar las mascotas duplicadas
        await connection.query(`
          DELETE FROM pets WHERE id IN (?)
        `, [toDelete]);
        
        console.log(`   ✅ Eliminados ${toDelete.length} duplicados`);
      }
    }
    
    // Mostrar resultado final
    console.log('\n📊 Mascotas después de limpiar:');
    const [finalPets] = await connection.query(`
      SELECT id, name, userId, isRisk, createdAt 
      FROM pets 
      ORDER BY name, createdAt
    `);
    
    console.table(finalPets);
    console.log(`\n✅ Total de mascotas: ${finalPets.length}`);
    console.log(`✅ Duplicados eliminados: ${pets.length - finalPets.length}\n`);
    
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
removeDuplicates();
