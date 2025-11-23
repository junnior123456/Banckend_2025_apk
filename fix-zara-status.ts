import { DataSource } from 'typeorm';
import { Pet } from './src/domain/entities/pet.entity';
import { AdoptionRequest } from './src/domain/entities/adoption-request.entity';
import { User } from './src/domain/entities/user.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'pawfinder',
  entities: [Pet, AdoptionRequest, User],
  synchronize: false,
});

async function fixZaraStatus() {
  try {
    console.log('🔌 Conectando a la base de datos...\n');
    await AppDataSource.initialize();
    console.log('✅ Conectado exitosamente\n');

    const petRepository = AppDataSource.getRepository(Pet);
    const adoptionRepository = AppDataSource.getRepository(AdoptionRequest);

    // Buscar Zara
    console.log('🔍 Buscando mascota "Zara"...\n');
    const zara = await petRepository.findOne({
      where: { name: 'Zara' },
      relations: ['user'],
    });

    if (!zara) {
      console.log('❌ No se encontró ninguna mascota llamada "Zara"');
      return;
    }

    console.log('📋 Estado actual de Zara:');
    console.log('   ID:', zara.id);
    console.log('   Nombre:', zara.name);
    console.log('   Estado:', zara.status);
    console.log('   Dueño:', zara.user?.name || 'N/A');
    console.log('   Fecha creación:', zara.createdAt);
    console.log('   Fecha adopción:', zara.adoptedAt || 'No adoptada');
    console.log('');

    // Buscar solicitudes de adopción para Zara
    const adoptionRequests = await adoptionRepository.find({
      where: { petId: zara.id },
      relations: ['adopter'],
      order: { createdAt: 'DESC' },
    });

    console.log(`📝 Solicitudes de adopción (${adoptionRequests.length}):`);
    adoptionRequests.forEach((req, index) => {
      console.log(`\n   Solicitud ${index + 1}:`);
      console.log('   - ID:', req.id);
      console.log('   - Estado:', req.status);
      console.log('   - Adoptante:', req.adopter?.name || 'N/A');
      console.log('   - Fecha solicitud:', req.createdAt);
      console.log('   - Fecha aprobación:', req.approvedAt || 'No aprobada');
      console.log('   - Donante confirmó:', req.donorConfirmedAt || 'No');
      console.log('   - Adoptante confirmó:', req.adopterConfirmedAt || 'No');
      console.log('   - Fecha completada:', req.completedAt || 'No completada');
    });
    console.log('');

    // Verificar si hay una solicitud completada
    const completedRequest = adoptionRequests.find(req => req.status === 'completed');

    if (completedRequest) {
      console.log('✅ Hay una solicitud completada');
      
      if (zara.status !== 'adopted') {
        console.log('🔧 Actualizando estado de Zara a "adopted"...');
        
        zara.status = 'adopted';
        zara.adoptedAt = completedRequest.completedAt || new Date();
        await petRepository.save(zara);

        console.log('✅ Estado actualizado exitosamente!');
        console.log('   Nuevo estado:', zara.status);
        console.log('   Fecha adopción:', zara.adoptedAt);
      } else {
        console.log('✅ Zara ya tiene el estado correcto: "adopted"');
      }
    } else {
      console.log('⚠️  No hay solicitudes completadas para Zara');
      
      // Verificar si hay solicitud aprobada
      const approvedRequest = adoptionRequests.find(req => req.status === 'approved');
      if (approvedRequest) {
        console.log('📋 Hay una solicitud aprobada pero no completada');
        console.log('   Estado actual de la solicitud:', approvedRequest.status);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Desconectado de la base de datos');
    }
  }
}

fixZaraStatus();
