import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// === Módulos PawFinder ===
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { PetsModule } from './pets/pets.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadModule } from './upload/upload.module';
import { AdoptionModule } from './adoption/adoption.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { DonationsModule } from './donations/donations.module';
import { AiModule } from './ai/ai.module'; // 🤖 Módulo de IA con Google Gemini
import { VeterinariasModule } from './veterinarias/veterinarias.module';

// === Entidades PawFinder ===
import { User } from './users/user.entity';
import { Rol } from './roles/rol.entity';
import { Pet } from './pets/pet.entity';
import { Category } from './categories/category.entity';
import { PetImage } from './pets/pet-image.entity';
import { PetVaccination } from './pets/pet-vaccination.entity';
import { PetWeight } from './pets/pet-weight.entity';
import { PetAllergy } from './pets/pet-allergy.entity';
import { PetMedication } from './pets/pet-medication.entity';
import { PetMedicalRecord } from './pets/pet-medical-record.entity';
import { PetDocument } from './pets/pet-document.entity';
import { VaccineReminderLog } from './pets/vaccine-reminder.entity';
import { PetTransfer } from './pets/pet-transfer.entity';
import { AdoptionRequest } from './adoption/adoption-request.entity';
import { Comment } from './comments/comment.entity';
import { Notification } from './notifications/notification.entity';
import { Report } from './reports/report.entity';
import { Donation } from './donations/donation.entity';
import { Veterinaria } from './veterinarias/veterinaria.entity';

@Module({
  imports: [
    // 🔧 Configuración global de variables de entorno (.env y vars de Railway)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ⏰ Tareas programadas (recordatorios de vacunas). Sin esto el @Cron no corre.
    ScheduleModule.forRoot(),

    // 💾 Conexión a base de datos
    // Si existiera DATABASE_URL (PostgreSQL en otra plataforma) la usa,
    // si no, usa MySQL con las variables MYSQL_* (Railway).
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [
              User,
              Rol,
              Pet,
              Category,
              PetImage,
              AdoptionRequest,
              Comment,
              Notification,
              Report,
              Donation,
              Veterinaria,
              PetVaccination,
              PetWeight,
              PetAllergy,
              PetMedication,
              PetMedicalRecord,
              PetDocument,
              VaccineReminderLog,
              PetTransfer,
            ],
            // Sincronizar para crear tablas nuevas automáticamente
            synchronize: true,
            logging: process.env.NODE_ENV !== 'production',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            extra: {
              max: 10,
              connectionTimeoutMillis: 10000,
              idleTimeoutMillis: 30000,
            },
          }
        : {
            type: 'mysql',
            host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
            port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
            username: process.env.MYSQL_USER || process.env.DB_USER || 'root',
            password: process.env.MYSQL_PASSWORD || process.env.DB_PASS || 'admin123',
            database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'ecommerce',
            entities: [
              User,
              Rol,
              Pet,
              Category,
              PetImage,
              AdoptionRequest,
              Comment,
              Notification,
              Report,
              Donation,
              Veterinaria,
              PetVaccination,
              PetWeight,
              PetAllergy,
              PetMedication,
              PetMedicalRecord,
              PetDocument,
              VaccineReminderLog,
              PetTransfer,
            ],
            synchronize: true,
            logging: process.env.NODE_ENV !== 'production',
          },
    ),

    // 🔹 Módulos PawFinder
    UsersModule,
    AuthModule,
    RolesModule,
    PetsModule,
    CategoriesModule,
    UploadModule,
    AdoptionModule,
    CommentsModule,
    NotificationsModule,
    ReportsModule,
    SearchModule,
    DonationsModule,
    AiModule,       // 🤖 IA: Recomendación de perros, cuidado y veterinarias en Tarapoto
    VeterinariasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    console.log('✅ AppModule inicializado correctamente');
  }
}
