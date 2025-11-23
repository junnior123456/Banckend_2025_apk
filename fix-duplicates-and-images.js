const mysql = require('mysql2/promise');

async function fixIssues() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin123',
    database: 'ecommerce'
  });

  try {
    console.log('🔧 Corrigiendo problemas...\n');
    
    // 1. Eliminar duplicados
    console.log('🗑️  Eliminando duplicados...');
    const [duplicates] = await connection.query(`
      SELECT name, userId, MIN(id) as keep_id, GROUP_CONCAT(id) as all_ids
      FROM pets 
      GROUP BY name, userId
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      for (const dup of duplicates) {
        const ids = dup.all_ids.split(',').map(Number);
        const keepId = dup.keep_id;
        const deleteIds = ids.filter(id => id !== keepId);
        
        for (const id of deleteIds) {
          await connection.query('DELETE FROM pets WHERE id = ?', [id]);
          console.log(`   ✅ Eliminado duplicado: ${dup.name} (ID: ${id})`);
        }
      }
    } else {
      console.log('   ✅ No hay duplicados');
    }
    
    // 2. Verificar imágenes
    console.log('\n📸 Verificando imágenes...');
    const [pets] = await connection.query('SELECT id, name, imageUrl FROM pets');
    
    let picsumCount = 0;
    let firebaseCount = 0;
    
    for (const pet of pets) {
      if (pet.imageUrl && pet.imageUrl.includes('picsum.photos')) {
        picsumCount++;
      } else if (pet.imageUrl && pet.imageUrl.includes('firebasestorage')) {
        firebaseCount++;
      }
    }
    
    console.log(`   📊 Imágenes Picsum (placeholder): ${picsumCount}`);
    console.log(`   📊 Imágenes Firebase (reales): ${firebaseCount}`);
    
    // 3. Mostrar estado final
    console.log('\n📊 Estado final de la base de datos:');
    const [finalPets] = await connection.query('SELECT id, name, userId, isRisk, imageUrl FROM pets ORDER BY id');
    console.table(finalPets.map(p => ({
      id: p.id,
      name: p.name,
      userId: p.userId,
      isRisk: p.isRisk ? 'Sí' : 'No',
      hasImage: p.imageUrl ? (p.imageUrl.includes('firebase') ? 'Firebase' : 'Picsum') : 'No'
    })));
    
    console.log('\n✅ Correcciones completadas!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixIssues();
