# 🐾 PawFinder Backend - Configuración Completa

## ✅ **Estado: COMPLETAMENTE CONFIGURADO**

### **🏗️ Estructura del Backend**

```
eccomerce-bankend/
├── src/
│   ├── categories/           # 📂 Módulo de Categorías
│   │   ├── category.entity.ts
│   │   ├── categories.service.ts
│   │   ├── categories.controller.ts
│   │   └── categories.module.ts
│   ├── pets/                 # 🐕 Módulo de Mascotas
│   │   ├── pet.entity.ts
│   │   ├── pets.service.ts
│   │   ├── pets.controller.ts
│   │   ├── pets.module.ts
│   │   └── dto/
│   │       ├── create-pet.dto.ts
│   │       └── update-pet.dto.ts
│   ├── auth/                 # 🔐 Autenticación JWT
│   │   ├── jwt-auth.guard.ts
│   │   └── ...
│   ├── config/               # ⚙️ Configuración
│   │   └── firebase.config.ts
│   └── util/                 # 🛠️ Utilidades
│       └── cloud_storage.ts  # Firebase Storage
├── .env                      # Variables de entorno
├── serviceAccountKey.json    # Credenciales Firebase
└── package.json
```

### **🗄️ Base de Datos MySQL**

#### **Tabla: categories**
```sql
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Datos iniciales (seed automático)
INSERT INTO categories (id, name, emoji, description) VALUES
(1, 'Perros', '🐕', 'Perros de todas las razas y tamaños'),
(2, 'Gatos', '🐱', 'Gatos domésticos y de diferentes razas'),
(3, 'Aves', '🐦', 'Aves domésticas y exóticas'),
(4, 'Conejos', '🐰', 'Conejos domésticos de diferentes razas'),
(5, 'Otros', '🐹', 'Otras mascotas como hamsters, reptiles, etc.');
```

#### **Tabla: pets**
```sql
CREATE TABLE pets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  imageUrl VARCHAR(255),
  isRisk BOOLEAN DEFAULT FALSE,
  age VARCHAR(20),
  breed VARCHAR(50),
  gender VARCHAR(10),
  size VARCHAR(20),
  isVaccinated BOOLEAN DEFAULT FALSE,
  isSterilized BOOLEAN DEFAULT FALSE,
  contactName VARCHAR(100),
  contactPhone VARCHAR(20),
  contactEmail VARCHAR(100),
  address TEXT,
  userId INT NOT NULL,
  categoryId INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);
```

### **🔥 Firebase Storage**

#### **Configuración:**
- **Proyecto**: pawfinder-4b099
- **Bucket**: pawfinder-4b099.appspot.com
- **Carpeta de imágenes**: `/pets/`
- **Formato de nombres**: `pets/timestamp-filename.ext`

#### **Funcionalidades:**
- ✅ Subida automática de imágenes
- ✅ URLs públicas generadas automáticamente
- ✅ Compresión y optimización de imágenes
- ✅ Tokens únicos de descarga

### **🌐 API Endpoints**

#### **Categorías:**
```typescript
GET    /api/categories              // Todas las categorías activas
GET    /api/categories/:id          // Categoría específica
GET    /api/categories/stats/count  // Categorías con conteo de mascotas
```

#### **Mascotas:**
```typescript
GET    /api/pets                    // Todas las mascotas (?category=id)
GET    /api/pets/adoption           // Solo para adopción (?category=id)
GET    /api/pets/risk               // Solo en riesgo (?category=id)
GET    /api/pets/:id                // Mascota específica
POST   /api/pets                    // Crear mascota (requiere JWT)
POST   /api/pets/upload             // Crear con imagen (requiere JWT)
PATCH  /api/pets/:id                // Actualizar mascota (requiere JWT)
DELETE /api/pets/:id                // Eliminar mascota (requiere JWT)
```

### **🔐 Autenticación**

#### **JWT Guard:**
- Protege endpoints de creación/edición
- Token requerido en header: `Authorization: Bearer <token>`
- Extrae `userId` del token para asociar mascotas

#### **Endpoints Protegidos:**
- `POST /api/pets`
- `POST /api/pets/upload`
- `PATCH /api/pets/:id`
- `DELETE /api/pets/:id`

### **📋 DTOs y Validación**

#### **CreatePetDto:**
```typescript
{
  name: string;           // Requerido, máx 100 chars
  description?: string;   // Opcional
  categoryId: number;     // Requerido, 1-5
  isRisk?: boolean;       // Opcional, default false
  age?: string;           // Opcional
  breed?: string;         // Opcional
  gender?: string;        // Opcional
  size?: string;          // Opcional
  isVaccinated?: boolean; // Opcional
  isSterilized?: boolean; // Opcional
  contactName?: string;   // Opcional
  contactPhone?: string;  // Opcional
  contactEmail?: string;  // Opcional
  address?: string;       // Opcional
}
```

### **🚀 Cómo Ejecutar**

#### **1. Instalar Dependencias:**
```bash
cd eccomerce-bankend
npm install
```

#### **2. Configurar Base de Datos:**
```bash
# Crear base de datos MySQL
mysql -u root -p
CREATE DATABASE ecommerce;
```

#### **3. Configurar Firebase:**
- Colocar `serviceAccountKey.json` en la raíz del proyecto
- Verificar configuración en `.env`

#### **4. Ejecutar en Desarrollo:**
```bash
npm run start:dev
```

#### **5. Verificar:**
- Backend: http://localhost:3000
- Categorías: http://localhost:3000/api/categories
- Mascotas: http://localhost:3000/api/pets

### **🧪 Pruebas de API**

#### **Obtener Categorías:**
```bash
curl http://localhost:3000/api/categories
```

#### **Obtener Mascotas para Adopción:**
```bash
curl http://localhost:3000/api/pets/adoption
```

#### **Filtrar Gatos para Adopción:**
```bash
curl http://localhost:3000/api/pets/adoption?category=2
```

#### **Crear Mascota (con JWT):**
```bash
curl -X POST http://localhost:3000/api/pets \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Firulais",
    "description": "Perro muy cariñoso",
    "categoryId": 1,
    "isRisk": false,
    "contactName": "Juan Pérez",
    "contactPhone": "555-1234",
    "contactEmail": "juan@email.com"
  }'
```

### **📊 Funcionalidades Implementadas**

#### **✅ Completamente Funcional:**
1. **Seed Automático** de categorías al iniciar
2. **CRUD Completo** de mascotas con validación
3. **Filtrado por Categoría** con queries optimizadas
4. **Subida de Imágenes** a Firebase Storage
5. **Autenticación JWT** para operaciones protegidas
6. **Relaciones TypeORM** entre User, Pet y Category
7. **Validación de DTOs** con class-validator
8. **URLs Públicas** automáticas para imágenes
9. **Endpoints RESTful** siguiendo mejores prácticas
10. **Manejo de Errores** con mensajes descriptivos

### **🔧 Variables de Entorno (.env)**

```env
# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=admin123
DB_NAME=ecommerce
HASH_SALT=10

# Firebase PawFinder
GCLOUD_PROJECT_ID=pawfinder-4b099
FIREBASE_STORAGE_BUCKET=pawfinder-4b099.appspot.com

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here
```

### **📝 Logs del Sistema**

Al iniciar el backend, verás:
```
✅ Categorías de mascotas creadas exitosamente
🔹 Firebase conectado correctamente
🚀 Aplicación ejecutándose en puerto 3000
```

### **🎯 Integración con Frontend**

El backend está **100% listo** para recibir peticiones del frontend Flutter:
- ✅ Endpoints compatibles con `PetService`
- ✅ Estructura de datos coincidente con entidades Dart
- ✅ Filtrado por categoría funcional
- ✅ Subida de imágenes desde móvil
- ✅ Autenticación JWT integrada

**¡El backend PawFinder está completamente configurado y listo para producción!** 🎉