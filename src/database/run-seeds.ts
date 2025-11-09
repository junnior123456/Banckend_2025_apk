import { DataSource } from 'typeorm';
import { runSeeds } from './seeds';
import { User } from '../users/user.entity';
import { Rol } from '../roles/rol.entity';
import { Pet } from '../pets/pet.entity';
import { PetImage } from '../pets/pet-image.entity';
import { Category } from '../categories/category.entity';
import { AdoptionRequest } from '../adoption/adoption-request.entity';
import { Comment } from '../comments/comment.entity';
import { Notification } from '../notifications/notification.entity';
import { Report } from '../reports/report.entity';

// Configuración de la base de datos
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'admin123',
  database: process.env.DB_NAME || 'ecommerce',
  entities: [
    User,
    Rol,
    Pet,
    PetImage,
    Category,
    AdoptionRequest,
    Comment,
    Notification,
    Report,
  ],
  synchronize: true,
});

async function main() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await AppDataSource.initialize();
    
    console.log('🌱 Ejecutando seeds...');
    await runSeeds(AppDataSource);
    
    console.log('✅ Seeds completados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seeds:', error);
    process.exit(1);
  }
}

main();