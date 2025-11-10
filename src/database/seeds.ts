import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Rol } from '../roles/rol.entity';
import { Category } from '../categories/category.entity';
import { Pet } from '../pets/pet.entity';
import { PetImage } from '../pets/pet-image.entity';
import { AdoptionRequest, AdoptionStatus } from '../adoption/adoption-request.entity';
import { Comment } from '../comments/comment.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';
import { hash } from 'bcrypt';

export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async run() {
    console.log('🌱 Iniciando seeds de datos de prueba...');

    try {
      // Limpiar solo las nuevas tablas
      await this.clearDatabase();

      // Verificar que existan roles y categorías (no crear si ya existen)
      await this.ensureRolesExist();
      await this.ensureCategoriesExist();

      // Crear usuarios de prueba si no existen
      await this.ensureUsersExist();

      // Crear mascotas de prueba
      await this.createPets();

      // Crear imágenes de mascotas
      await this.createPetImages();

      // Crear solicitudes de adopción
      await this.createAdoptionRequests();

      // Crear comentarios
      await this.createComments();

      // Crear notificaciones
      await this.createNotifications();

      console.log('✅ Seeds completados exitosamente');
    } catch (error) {
      console.error('❌ Error ejecutando seeds:', error);
      throw error;
    }
  }

  private async clearDatabase() {
    console.log('🧹 Limpiando solo las nuevas tablas...');
    
    // Solo limpiar las nuevas entidades, mantener usuarios y roles existentes
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    
    await this.dataSource.getRepository(Notification).delete({});
    await this.dataSource.getRepository(Comment).delete({});
    await this.dataSource.getRepository(AdoptionRequest).delete({});
    await this.dataSource.getRepository(PetImage).delete({});
    
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  private async ensureRolesExist() {
    console.log('👥 Verificando roles...');
    
    const roleRepository = this.dataSource.getRepository(Rol);
    const existingRoles = await roleRepository.find();
    
    if (existingRoles.length === 0) {
      console.log('Creando roles...');
      const roles = [
        { name: 'ADMIN', image: 'admin.png', route: '/admin' },
        { name: 'DONANTE', image: 'donante.png', route: '/donante' },
        { name: 'ADOPTANTE', image: 'adoptante.png', route: '/adoptante' },
      ];

      for (const roleData of roles) {
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
      }
    } else {
      console.log('Los roles ya existen, continuando...');
    }
  }

  private async ensureCategoriesExist() {
    console.log('🏷️ Verificando categorías...');
    
    const categoryRepository = this.dataSource.getRepository(Category);
    const existingCategories = await categoryRepository.find();
    
    if (existingCategories.length === 0) {
      console.log('Creando categorías...');
      const categories = [
        { name: 'Perros', description: 'Perros de todas las razas y tamaños' },
        { name: 'Gatos', description: 'Gatos domésticos y de raza' },
        { name: 'Aves', description: 'Aves domésticas y exóticas' },
        { name: 'Conejos', description: 'Conejos domésticos' },
        { name: 'Otros', description: 'Otras mascotas' },
      ];

      for (const categoryData of categories) {
        const category = categoryRepository.create(categoryData);
        await categoryRepository.save(category);
      }
    } else {
      console.log('Las categorías ya existen, continuando...');
    }
  }

  private async ensureUsersExist() {
    console.log('👤 Verificando usuario admin...');
    
    const userRepository = this.dataSource.getRepository(User);
    const roleRepository = this.dataSource.getRepository(Rol);
    
    const adminRole = await roleRepository.findOne({ where: { name: 'ADMIN' } });
    const clienteRole = await roleRepository.findOne({ where: { name: 'CLIENTE' } });

    // Actualizar contraseña del usuario admin si existe
    let existingAdmin = await userRepository.findOne({ where: { email: 'junniorchinchay@upeu.edu.pe' } });
    if (!existingAdmin) {
      const adminUser = userRepository.create({
        name: 'Junnior',
        lastname: 'Chinchay',
        email: 'junniorchinchay@upeu.edu.pe',
        phone: '+51987654321',
        password: await hash('123456', 10),
        roles: [adminRole],
      });
      await userRepository.save(adminUser);
      console.log('✅ Usuario admin creado: junniorchinchay@upeu.edu.pe / 123456');
    } else {
      // Actualizar contraseña para asegurar que sea 123456
      existingAdmin.password = await hash('123456', 10);
      await userRepository.save(existingAdmin);
      console.log('✅ Usuario admin actualizado: junniorchinchay@upeu.edu.pe / 123456');
    }
  }

  private async createPets() {
    console.log('🐕 Creando mascotas de prueba...');
    
    const petRepository = this.dataSource.getRepository(Pet);
    const userRepository = this.dataSource.getRepository(User);
    const categoryRepository = this.dataSource.getRepository(Category);
    
    // Obtener el usuario actual (Junnior)
    const junnior = await userRepository.findOne({ where: { email: 'junniorchinchay@upeu.edu.pe' } });
    
    if (!junnior) {
      console.log('⚠️ Usuario no encontrado, saltando creación de mascotas');
      return;
    }

    const dogCategory = await categoryRepository.findOne({ where: { name: 'Perros' } }) || 
                       await categoryRepository.findOne({ where: { id: 1 } });
    const catCategory = await categoryRepository.findOne({ where: { name: 'Gatos' } }) ||
                       await categoryRepository.findOne({ where: { id: 2 } });

    const pets = [
      // 3 Mascotas para Junnior - En Adopción
      {
        name: 'Max',
        description: 'Perro muy cariñoso y juguetón. Ideal para familias con niños. Le encanta jugar en el parque y es muy obediente.',
        age: '2 años',
        breed: 'Labrador Retriever',
        gender: 'Macho',
        size: 'Grande',
        isVaccinated: true,
        isSterilized: true,
        isRisk: false,
        address: 'Av. Principal 123, Lima, Perú',
        contactName: 'Junnior Chinchay',
        contactPhone: '+51987654321',
        contactEmail: 'junniorchinchay@upeu.edu.pe',
        status: 'available',
        temperament: 'Amigable, Energético, Obediente',
        medicalHistory: 'Vacunas al día, desparasitado recientemente.',
        imageUrl: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
        userId: junnior.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0464,
        longitude: -77.0428,
      },
      {
        name: 'Luna',
        description: 'Gatita muy independiente y cariñosa. Perfecta para apartamentos. Le gusta dormir y jugar con pelotas.',
        age: '1 año',
        breed: 'Siamés',
        gender: 'Hembra',
        size: 'Pequeño',
        isVaccinated: true,
        isSterilized: true,
        isRisk: false,
        address: 'Jr. Los Olivos 456, Lima, Perú',
        contactName: 'Junnior Chinchay',
        contactPhone: '+51987654321',
        contactEmail: 'junniorchinchay@upeu.edu.pe',
        status: 'available',
        temperament: 'Independiente, Cariñosa, Tranquila',
        medicalHistory: 'Vacunas completas, esterilizada hace 3 meses',
        imageUrl: 'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg',
        userId: junnior.id,
        categoryId: catCategory?.id || 2,
        latitude: -12.0564,
        longitude: -77.0328,
      },
      {
        name: 'Rocky',
        description: 'Perro perdido encontrado en el centro de Lima. Necesita ayuda urgente. Muy amigable pero asustado.',
        age: '4 años',
        breed: 'Pastor Alemán',
        gender: 'Macho',
        size: 'Grande',
        isVaccinated: false,
        isSterilized: false,
        isRisk: true,
        address: 'Centro de Lima, Perú',
        contactName: 'Junnior Chinchay',
        contactPhone: '+51987654321',
        contactEmail: 'junniorchinchay@upeu.edu.pe',
        status: 'available',
        temperament: 'Asustado, Necesita cuidados',
        medicalHistory: 'Requiere chequeo veterinario urgente',
        imageUrl: 'https://images.pexels.com/photos/4587997/pexels-photo-4587997.jpeg',
        userId: junnior.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0464,
        longitude: -77.0428,
      },
    ];

    for (const petData of pets) {
      const pet = petRepository.create(petData);
      await petRepository.save(pet);
    }
  }

  private async createPetImages() {
    console.log('📸 Creando imágenes de mascotas...');
    
    const petImageRepository = this.dataSource.getRepository(PetImage);
    const petRepository = this.dataSource.getRepository(Pet);
    
    const max = await petRepository.findOne({ where: { name: 'Max' } });
    const luna = await petRepository.findOne({ where: { name: 'Luna' } });
    const rocky = await petRepository.findOne({ where: { name: 'Rocky' } });

    // Obtener todas las mascotas creadas para asignar imágenes
    const allPets = await petRepository.find();
    
    const images = [
      // Imágenes para Max (Labrador)
      {
        imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Max')?.id,
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=500&h=500&fit=crop',
        isPrimary: false,
        order: 2,
        petId: allPets.find(p => p.name === 'Max')?.id,
      },
      
      // Imágenes para Bella (Golden Retriever)
      {
        imageUrl: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Bella')?.id,
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop',
        isPrimary: false,
        order: 2,
        petId: allPets.find(p => p.name === 'Bella')?.id,
      },
      
      // Imágenes para Rocky (Pastor Alemán)
      {
        imageUrl: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Rocky')?.id,
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=500&h=500&fit=crop',
        isPrimary: false,
        order: 2,
        petId: allPets.find(p => p.name === 'Rocky')?.id,
      },
      
      // Imágenes para Toby (Beagle)
      {
        imageUrl: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Toby')?.id,
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=500&h=500&fit=crop',
        isPrimary: false,
        order: 2,
        petId: allPets.find(p => p.name === 'Toby')?.id,
      },
      
      // Imágenes para Luna (Gata mestiza)
      {
        imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Luna')?.id,
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500&h=500&fit=crop',
        isPrimary: false,
        order: 2,
        petId: allPets.find(p => p.name === 'Luna')?.id,
      },
      
      // Imágenes para Michi (Siamés)
      {
        imageUrl: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Michi')?.id,
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=500&h=500&fit=crop',
        isPrimary: false,
        order: 2,
        petId: allPets.find(p => p.name === 'Michi')?.id,
      },
      
      // Imágenes para Nala (Gatita)
      {
        imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Nala')?.id,
      },
      
      // Imágenes para Bruno (Cocker Spaniel senior)
      {
        imageUrl: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Bruno')?.id,
      },
      
      // Imágenes para Esperanza (Mestiza rescatada)
      {
        imageUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop',
        isPrimary: true,
        order: 1,
        petId: allPets.find(p => p.name === 'Esperanza')?.id,
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500&h=500&fit=crop',
        isPrimary: false,
        order: 2,
        petId: allPets.find(p => p.name === 'Esperanza')?.id,
      },
    ];

    for (const imageData of images) {
      const image = petImageRepository.create(imageData);
      await petImageRepository.save(image);
    }
  }

  private async createAdoptionRequests() {
    console.log('📋 Creando solicitudes de adopción...');
    
    const adoptionRepository = this.dataSource.getRepository(AdoptionRequest);
    const petRepository = this.dataSource.getRepository(Pet);
    const userRepository = this.dataSource.getRepository(User);
    
    const allPets = await petRepository.find();
    const carlos = await userRepository.findOne({ where: { email: 'carlos@example.com' } });

    const requests = [
      {
        personalInfo: 'Carlos Rodríguez, 35 años, ingeniero de sistemas. Casado con Ana, tenemos dos hijos.',
        livingSituation: 'Casa propia con patio grande de 200m², barrio tranquilo y seguro en Lima',
        adoptionReason: 'Queremos una mascota para nuestros hijos y enseñarles responsabilidad y amor por los animales',
        previousExperience: 'Tuve un perro Labrador durante 10 años hasta que falleció el año pasado. Conocemos sus cuidados.',
        familyComposition: 'Esposa Ana (32 años) e hijos Mateo (8 años) y Sofia (12 años)',
        workSchedule: 'Lunes a viernes 8am-5pm',
        hasYard: true,
        hasOtherPets: false,
        status: AdoptionStatus.PENDING,
        petId: allPets.find(p => p.name === 'Max')?.id,
        adopterId: carlos.id,
      },
      {
        personalInfo: 'Carlos Rodríguez, 35 años, ingeniero de sistemas',
        livingSituation: 'Casa propia con patio grande, barrio tranquilo',
        adoptionReason: 'Queremos ayudar a un perro rescatado y darle una segunda oportunidad',
        previousExperience: 'Experiencia con perros grandes y entrenamiento básico',
        familyComposition: 'Esposa e hijos de 8 y 12 años',
        workSchedule: 'Lunes a viernes 8am-5pm',
        hasYard: true,
        hasOtherPets: false,
        status: AdoptionStatus.APPROVED,
        donorComments: 'Familia perfecta para Rocky, tienen experiencia y espacio adecuado',
        approvedAt: new Date(),
        petId: allPets.find(p => p.name === 'Rocky')?.id,
        adopterId: carlos.id,
      },
      {
        personalInfo: 'Carlos Rodríguez, 35 años, ingeniero de sistemas',
        livingSituation: 'Casa con patio, ambiente familiar',
        adoptionReason: 'Bella parece perfecta para nuestra familia, buscamos una perra cariñosa',
        previousExperience: 'Experiencia previa con Golden Retrievers',
        familyComposition: 'Familia de 4 personas',
        workSchedule: 'Horario de oficina',
        hasYard: true,
        hasOtherPets: false,
        status: AdoptionStatus.PENDING,
        petId: allPets.find(p => p.name === 'Bella')?.id,
        adopterId: carlos.id,
      },
    ];

    for (const requestData of requests) {
      const request = adoptionRepository.create(requestData);
      await adoptionRepository.save(request);
    }
  }

  private async createComments() {
    console.log('💬 Creando comentarios...');
    
    const commentRepository = this.dataSource.getRepository(Comment);
    const petRepository = this.dataSource.getRepository(Pet);
    const userRepository = this.dataSource.getRepository(User);
    
    const allPets = await petRepository.find();
    const carlos = await userRepository.findOne({ where: { email: 'carlos@example.com' } });
    const maria = await userRepository.findOne({ where: { email: 'maria@example.com' } });

    const comments = [
      {
        content: '¿Max es bueno con los niños? Tengo dos hijos pequeños y me parece perfecto para nuestra familia.',
        petId: allPets.find(p => p.name === 'Max')?.id,
        userId: carlos.id,
      },
      {
        content: 'Sí, Max es excelente con niños. Es muy paciente y juguetón. Mis vecinos tienen niños y Max siempre juega con ellos.',
        petId: allPets.find(p => p.name === 'Max')?.id,
        userId: maria.id,
        parentCommentId: null, // Se actualizará después
      },
      {
        content: '¿Luna necesita algún cuidado especial? Vivo en un apartamento pequeño.',
        petId: allPets.find(p => p.name === 'Luna')?.id,
        userId: carlos.id,
      },
      {
        content: 'Luna es perfecta para apartamentos. Es muy tranquila y no necesita mucho espacio.',
        petId: allPets.find(p => p.name === 'Luna')?.id,
        userId: maria.id,
      },
      {
        content: 'Me interesa mucho Bella. ¿Está entrenada para hacer sus necesidades?',
        petId: allPets.find(p => p.name === 'Bella')?.id,
        userId: carlos.id,
      },
      {
        content: '¡Toby se ve adorable! ¿Qué tan grande va a crecer?',
        petId: allPets.find(p => p.name === 'Toby')?.id,
        userId: carlos.id,
      },
      {
        content: 'Los Beagles son de tamaño mediano, Toby no crecerá mucho más. Es perfecto para familias activas.',
        petId: allPets.find(p => p.name === 'Toby')?.id,
        userId: maria.id,
      },
      {
        content: 'Michi parece muy sociable. ¿Se lleva bien con otros gatos?',
        petId: allPets.find(p => p.name === 'Michi')?.id,
        userId: carlos.id,
      },
    ];

    // Crear comentarios principales
    const savedComments = [];
    for (const commentData of comments) {
      const comment = commentRepository.create(commentData);
      const saved = await commentRepository.save(comment);
      savedComments.push(saved);
    }

    // Crear respuesta al primer comentario
    const replyComment = commentRepository.create({
      content: 'Perfecto, entonces Max sería ideal para nosotros. ¿Cuándo podemos conocerlo?',
      petId: allPets.find(p => p.name === 'Max')?.id,
      userId: carlos.id,
      parentCommentId: savedComments[1].id,
    });
    await commentRepository.save(replyComment);
  }

  private async createNotifications() {
    console.log('🔔 Creando notificaciones...');
    
    const notificationRepository = this.dataSource.getRepository(Notification);
    const userRepository = this.dataSource.getRepository(User);
    const petRepository = this.dataSource.getRepository(Pet);
    
    const allPets = await petRepository.find();
    const maria = await userRepository.findOne({ where: { email: 'maria@example.com' } });
    const carlos = await userRepository.findOne({ where: { email: 'carlos@example.com' } });

    const notifications = [
      {
        title: 'Nueva solicitud de adopción',
        message: 'Carlos Rodríguez ha enviado una solicitud para adoptar a Max',
        type: NotificationType.ADOPTION_REQUEST,
        userId: maria.id,
        petId: allPets.find(p => p.name === 'Max')?.id,
        fromUserId: carlos.id,
        data: {
          adoptionRequestId: 1,
          petName: 'Max',
          adopterName: 'Carlos Rodríguez',
        },
      },
      {
        title: 'Nuevo comentario en tu publicación',
        message: 'Carlos Rodríguez comentó en la publicación de Max',
        type: NotificationType.NEW_COMMENT,
        userId: maria.id,
        petId: allPets.find(p => p.name === 'Max')?.id,
        fromUserId: carlos.id,
        data: {
          commentId: 1,
          petName: 'Max',
          commenterName: 'Carlos Rodríguez',
        },
      },
      {
        title: 'Nueva solicitud de adopción',
        message: 'Carlos Rodríguez está interesado en adoptar a Bella',
        type: NotificationType.ADOPTION_REQUEST,
        userId: maria.id,
        petId: allPets.find(p => p.name === 'Bella')?.id,
        fromUserId: carlos.id,
        data: {
          adoptionRequestId: 2,
          petName: 'Bella',
          adopterName: 'Carlos Rodríguez',
        },
      },
      {
        title: 'Nuevo comentario',
        message: 'Carlos Rodríguez preguntó sobre Luna',
        type: NotificationType.NEW_COMMENT,
        userId: maria.id,
        petId: allPets.find(p => p.name === 'Luna')?.id,
        fromUserId: carlos.id,
        data: {
          commentId: 3,
          petName: 'Luna',
          commenterName: 'Carlos Rodríguez',
        },
      },
    ];

    for (const notificationData of notifications) {
      const notification = notificationRepository.create(notificationData);
      await notificationRepository.save(notification);
    }
  }
}

// Función para ejecutar seeds
export async function runSeeds(dataSource: DataSource) {
  const seeder = new DatabaseSeeder(dataSource);
  await seeder.run();
}