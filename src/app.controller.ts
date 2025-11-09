import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  //Raiz -> /
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Health check endpoint para testing de conectividad
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Backend is running'
    };
  }

  @Get('storage-status')
  getStorageStatus() {
    try {
      // Importar y verificar el estado de cloud_storage
      const { storage } = require('./util/cloud_storage');
      
      return {
        status: 'ready',
        message: '🔹 Google Cloud Storage configurado correctamente.',
        bucketName: 'pawfinder-4b099.appspot.com',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: '❌ Error en configuración de storage.',
        error: error.message,
      };
    }
  }
}
