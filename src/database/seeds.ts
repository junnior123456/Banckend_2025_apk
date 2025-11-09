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
    
    const maria = await userRepository.findOne({ where: { email: 'maria@example.com' } });
    const carlos = await userRepository.findOne({ where: { email: 'carlos@example.com' } });
    const dogCategory = await categoryRepository.findOne({ where: { name: 'Perros' } }) || 
                       await categoryRepository.findOne({ where: { id: 1 } }); // Fallback al primer registro
    const catCategory = await categoryRepository.findOne({ where: { name: 'Gatos' } }) ||
                       await categoryRepository.findOne({ where: { id: 2 } }); // Fallback al segundo registro

    const pets = [
      // Perros
      {
        name: 'Max',
        description: 'Perro muy cariñoso y juguetón. Ideal para familias con niños. Le encanta jugar en el parque y es muy obediente.',
        age: '2 años',
        breed: 'Labrador Retriever',
        gender: 'Macho',
        size: 'Grande',
        isVaccinated: true,
        isSterilized: true,
        address: 'Av. Principal 123, Lima, Perú',
        contactName: 'María González',
        contactPhone: '+51987654321',
        contactEmail: 'maria@example.com',
        status: 'available',
        temperament: 'Amigable, Energético, Obediente',
        medicalHistory: 'Vacunas al día, desparasitado recientemente. Chequeo veterinario mensual.',
        userId: maria.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0464,
        longitude: -77.0428,
      },
      {
        name: 'Bella',
        description: 'Perra muy dulce y protectora. Perfecta para familias. Ama a los niños y es muy leal.',
        age: '3 años',
        breed: 'Golden Retriever',
        gender: 'Hembra',
        size: 'Grande',
        isVaccinated: true,
        isSterilized: true,
        address: 'Jr. Los Olivos 456, Lima, Perú',
        contactName: 'María González',
        contactPhone: '+51987654321',
        contactEmail: 'maria@example.com',
        status: 'available',
        temperament: 'Dulce, Protectora, Leal',
        medicalHistory: 'Vacunas completas, esterilizada hace 6 meses',
        userId: maria.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0564,
        longitude: -77.0328,
      },
      {
        name: 'Rocky',
        description: 'Perro rescatado, muy leal y protector. Busca una familia amorosa que le dé una segunda oportunidad.',
        age: '4 años',
        breed: 'Pastor Alemán',
        gender: 'Macho',
        size: 'Grande',
        isVaccinated: true,
        isSterilized: false,
        address: 'Calle Secundaria 789, Lima, Perú',
        contactName: 'Carlos Rodríguez',
        contactPhone: '+51987654322',
        contactEmail: 'carlos@example.com',
        status: 'pending',
        temperament: 'Leal, Protector, Inteligente',
        medicalHistory: 'Tratamiento por desnutrición completado. Vacunas al día.',
        specialNeeds: 'Necesita ejercicio diario y socialización gradual',
        userId: carlos.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0664,
        longitude: -77.0228,
      },
      {
        name: 'Toby',
        description: 'Cachorro muy juguetón y lleno de energía. Busca una familia activa que le enseñe buenos hábitos.',
        age: '8 meses',
        breed: 'Beagle',
        gender: 'Macho',
        size: 'Mediano',
        isVaccinated: true,
        isSterilized: false,
        address: 'Av. Universitaria 321, Lima, Perú',
        contactName: 'María González',
        contactPhone: '+51987654321',
        contactEmail: 'maria@example.com',
        status: 'available',
        temperament: 'Juguetón, Energético, Curioso',
        medicalHistory: 'Vacunas de cachorro completas. Próxima cita para esterilización.',
        specialNeeds: 'Necesita entrenamiento básico y mucho ejercicio',
        userId: maria.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0364,
        longitude: -77.0528,
      },
      
      // Gatos
      {
        name: 'Luna',
        description: 'Gata muy tranquila y cariñosa. Perfecta para apartamentos. Le gusta dormir al sol y recibir caricias.',
        age: '2 años',
        breed: 'Mestiza',
        gender: 'Hembra',
        size: 'Pequeño',
        isVaccinated: true,
        isSterilized: true,
        address: 'Plaza Central 147, Lima, Perú',
        contactName: 'María González',
        contactPhone: '+51987654321',
        contactEmail: 'maria@example.com',
        status: 'available',
        temperament: 'Tranquila, Independiente, Cariñosa',
        medicalHistory: 'Esterilizada, vacunas completas. Excelente salud.',
        userId: maria.id,
        categoryId: catCategory?.id || 2,
        latitude: -12.0464,
        longitude: -77.0328,
      },
      {
        name: 'Michi',
        description: 'Gato muy sociable y juguetón. Le encanta interactuar con las personas y otros gatos.',
        age: '1 año',
        breed: 'Siamés',
        gender: 'Macho',
        size: 'Pequeño',
        isVaccinated: true,
        isSterilized: true,
        address: 'Calle Las Flores 258, Lima, Perú',
        contactName: 'Carlos Rodríguez',
        contactPhone: '+51987654322',
        contactEmail: 'carlos@example.com',
        status: 'available',
        temperament: 'Sociable, Juguetón, Vocal',
        medicalHistory: 'Vacunas al día, esterilizado hace 3 meses',
        userId: carlos.id,
        categoryId: catCategory?.id || 2,
        latitude: -12.0764,
        longitude: -77.0128,
      },
      {
        name: 'Nala',
        description: 'Gatita rescatada muy dulce. Busca un hogar tranquilo donde pueda sentirse segura y amada.',
        age: '6 meses',
        breed: 'Mestiza',
        gender: 'Hembra',
        size: 'Pequeño',
        isVaccinated: true,
        isSterilized: false,
        address: 'Jr. Amazonas 369, Lima, Perú',
        contactName: 'María González',
        contactPhone: '+51987654321',
        contactEmail: 'maria@example.com',
        status: 'available',
        temperament: 'Dulce, Tímida, Adaptable',
        medicalHistory: 'Vacunas de gatita completas. Pendiente esterilización.',
        specialNeeds: 'Necesita paciencia para adaptarse, es un poco tímida',
        userId: maria.id,
        categoryId: catCategory?.id || 2,
        latitude: -12.0264,
        longitude: -77.0628,
      },
      
      // Casos especiales
      {
        name: 'Bruno',
        description: 'Perro senior muy tranquilo y sabio. Busca un hogar donde pueda pasar sus años dorados con amor y cuidados.',
        age: '8 años',
        breed: 'Cocker Spaniel',
        gender: 'Macho',
        size: 'Mediano',
        isVaccinated: true,
        isSterilized: true,
        address: 'Av. Arequipa 741, Lima, Perú',
        contactName: 'Carlos Rodríguez',
        contactPhone: '+51987654322',
        contactEmail: 'carlos@example.com',
        status: 'available',
        temperament: 'Tranquilo, Sabio, Cariñoso',
        medicalHistory: 'Chequeos regulares por edad. Medicación para artritis.',
        specialNeeds: 'Necesita medicación diaria y caminatas suaves',
        userId: carlos.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0864,
        longitude: -77.0028,
      },
      {
        name: 'Esperanza',
        description: 'Perra rescatada de la calle que necesita cuidados especiales. Muy agradecida y leal con quien la cuida.',
        age: '5 años',
        breed: 'Mestiza',
        gender: 'Hembra',
        size: 'Mediano',
        isVaccinated: true,
        isSterilized: true,
        address: 'Calle Esperanza 852, Lima, Perú',
        contactName: 'María González',
        contactPhone: '+51987654321',
        contactEmail: 'maria@example.com',
        status: 'available',
        isRisk: true, // Mascota en riesgo
        temperament: 'Agradecida, Leal, Resiliente',
        medicalHistory: 'Recuperándose de desnutrición. Vacunas completas.',
        specialNeeds: 'Necesita dieta especial y seguimiento veterinario',
        userId: maria.id,
        categoryId: dogCategory?.id || 1,
        latitude: -12.0164,
        longitude: -77.0728,
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