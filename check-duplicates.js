const mysql = require('mysql2/promise');

async function checkDuplicates() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin123',
    database: 'ecommerce'
  });

  try {
    console.log('🔍 Verificando mascotas duplicadas...\n');
    
    const [pets] = await connection.query('SELECT id, name, userId, isRisk, createdAt FROM pets ORDER BY id DESC LIMIT 10');
    
    console.log('📊 Últimas 10 mascotas:');
    console.table(pets);
    
    // Buscar duplicados por nombre
    const [duplicates] = await connection.query(`
      SELECT name, COUNT(*) as count 
      FROM pets 
      GROUP BY name 
      HAVING count > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  Mascotas duplicadas encontradas:');
      console.table(duplicates);
      
      // Eliminar duplicados (mantener solo el más reciente)
      for (const dup of duplicates) {
        const [instances] = await connection.query(
          'SELECT id FROM pets WHERE name = ? ORDER BY id ASC',
          [dup.name]
        );
        
        // Eliminar todos excepto el último
        for (let i = 0; i < instances.length - 1; i++) {
          await connection.query('DELETE FROM pets WHERE id = ?', [instances[i].id]);
          console.log(`🗑️  Eliminado duplicado: ${dup.name} (ID: ${instances[i].id})`);
        }
      }
      
      console.log('\n✅ Duplicados eliminados!');
    } else {
      console.log('\n✅ No se encontraron duplicados');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkDuplicates();
