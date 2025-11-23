const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateZaraStatus() {
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

    // 1. Buscar Zara
    console.log('🔍 Buscando mascota "Zara"...\n');
    const [pets] = await connection.execute(
      'SELECT id, name, status, userId, createdAt FROM pets WHERE name = ?',
      ['Zara']
    );

    if (pets.length === 0) {
      console.log('❌ No se encontró ninguna mascota llamada "Zara"');
      return;
    }

    const zara = pets[0];
    console.log('📋 Estado actual de Zara:');
    console.log('   ID:', zara.id);
    console.log('   Nombre:', zara.name);
    console.log('   Estado:', zara.status);
    console.log('   User ID:', zara.userId);
    console.log('   Fecha creación:', zara.createdAt);
    console.log('');

    // 2. Buscar solicitudes de adopción
    const [requests] = await connection.execute(
      `SELECT 
        ar.id,
        ar.status,
        ar.petId,
        ar.adopterId,
        ar.donorConfirmedAt,
        ar.adopterConfirmedAt,
        ar.completedAt,
        ar.createdAt,
        u.name as adopter_name
      FROM adoption_requests ar
      LEFT JOIN users u ON ar.adopterId = u.id
      WHERE ar.petId = ?
      ORDER BY ar.createdAt DESC`,
      [zara.id]
    );

    console.log(`📝 Solicitudes de adopción (${requests.length}):`);
    requests.forEach((req, index) => {
      console.log(`\n   Solicitud ${index + 1}:`);
      console.log('   - ID:', req.id);
      console.log('   - Estado:', req.status);
      console.log('   - Adoptante:', req.adopter_name || 'N/A');
      console.log('   - Fecha solicitud:', req.createdAt);
      console.log('   - Donante confirmó:', req.donorConfirmedAt || 'No');
      console.log('   - Adoptante confirmó:', req.adopterConfirmedAt || 'No');
      console.log('   - Fecha completada:', req.completedAt || 'No completada');
    });
    console.log('');

    // 3. Verificar si hay solicitud completada
    const completedRequest = requests.find(req => req.status === 'completed');

    if (completedRequest) {
      console.log('✅ Hay una solicitud completada');
      
      if (zara.status !== 'adopted') {
        console.log('🔧 Actualizando estado de Zara a "adopted"...\n');
        
        await connection.execute(
          'UPDATE pets SET status = ? WHERE id = ?',
          ['adopted', zara.id]
        );

        console.log('✅ Estado actualizado exitosamente!');
        console.log('   Nuevo estado: adopted');
      } else {
        console.log('✅ Zara ya tiene el estado correcto: "adopted"');
      }
    } else {
      console.log('⚠️  No hay solicitudes completadas para Zara');
      console.log('');
      
      // Verificar si hay solicitud aprobada
      const approvedRequest = requests.find(req => req.status === 'approved');
      if (approvedRequest) {
        console.log('📋 Hay una solicitud aprobada pero no completada');
        console.log('   Estado actual de la solicitud:', approvedRequest.status);
        console.log('');
        console.log('💡 Opciones:');
        console.log('   1. Esperar a que se complete el proceso de confirmación bidireccional');
        console.log('   2. Actualizar manualmente el estado a "adopted" (no recomendado)');
      } else {
        console.log('💡 No hay solicitudes aprobadas ni completadas');
        console.log('   Actualizando estado a "adopted" de todas formas...\n');
        
        await connection.execute(
          'UPDATE pets SET status = ? WHERE id = ?',
          ['adopted', zara.id]
        );

        console.log('✅ Estado actualizado a "adopted"');
      }
    }

    // 4. Mostrar estado final
    console.log('\n📊 Estado final de Zara:');
    const [finalPets] = await connection.execute(
      'SELECT id, name, status FROM pets WHERE id = ?',
      [zara.id]
    );
    
    if (finalPets.length > 0) {
      const finalZara = finalPets[0];
      console.log('   Estado:', finalZara.status);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Desconectado de la base de datos');
    }
  }
}

updateZaraStatus();
