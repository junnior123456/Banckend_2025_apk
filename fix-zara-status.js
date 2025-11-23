const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixZaraStatus() {
  try {
    console.log('🔍 Buscando mascota "Zara"...\n');

    // Buscar Zara
    const zara = await prisma.pet.findFirst({
      where: { name: 'Zara' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!zara) {
      console.log('❌ No se encontró ninguna mascota llamada "Zara"');
      return;
    }

    console.log('📋 Estado actual de Zara:');
    console.log('   ID:', zara.id);
    console.log('   Nombre:', zara.name);
    console.log('   Estado:', zara.status);
    console.log('   Dueño:', zara.user.name);
    console.log('   Email:', zara.user.email);
    console.log('   Fecha creación:', zara.createdAt);
    console.log('   Fecha adopción:', zara.adoptedAt || 'No adoptada');
    console.log('');

    // Buscar solicitudes de adopción para Zara
    const adoptionRequests = await prisma.adoptionRequest.findMany({
      where: { petId: zara.id },
      include: {
        adopter: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📝 Solicitudes de adopción (${adoptionRequests.length}):`);
    adoptionRequests.forEach((req, index) => {
      console.log(`\n   Solicitud ${index + 1}:`);
      console.log('   - Estado:', req.status);
      console.log('   - Adoptante:', req.adopter.name);
      console.log('   - Email:', req.adopter.email);
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
        
        const updated = await prisma.pet.update({
          where: { id: zara.id },
          data: {
            status: 'adopted',
            adoptedAt: completedRequest.completedAt || new Date()
          }
        });

        console.log('✅ Estado actualizado exitosamente!');
        console.log('   Nuevo estado:', updated.status);
        console.log('   Fecha adopción:', updated.adoptedAt);
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
    await prisma.$disconnect();
  }
}

fixZaraStatus();
