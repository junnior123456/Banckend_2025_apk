import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

// === Entidades PawFinder ===
import { User } from './users/user.entity';
import { Rol } from './roles/rol.entity';
import { Pet } from './pets/pet.entity';
import { Category } from './categories/category.entity';

@Module({
  imports: [
    // 🔧 Configuración global de variables de entorno (.env)
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 💾 Conexión a MySQL
    TypeOrmModule.forRoot({
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
        Category,
      ],
      synchronize: true, // ⚠️ En desarrollo: true. En producción: false
    }),

    // 🔹 Módulos PawFinder
    UsersModule,
    AuthModule,
    RolesModule,
    PetsModule,
    CategoriesModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    // 🔥 Google Cloud Storage se inicializa automáticamente en cloud_storage.ts
    console.log('✅ AppModule inicializado correctamente');
  }
}
