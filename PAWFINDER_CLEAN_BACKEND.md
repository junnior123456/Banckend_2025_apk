# 🐾 PawFinder Backend - Clean Architecture Aligned

## ✅ **BACKEND LIMPIO Y OPTIMIZADO PARA TU FRONTEND FLUTTER**

### **🧹 Módulos Eliminados (No necesarios para PawFinder):**
- ❌ `amenities/` - Eliminado
- ❌ `bookings/` - Eliminado  
- ❌ `payments/` - Eliminado
- ❌ `room-types/` - Eliminado
- ❌ `rooms/` - Eliminado

### **✅ Módulos Mantenidos (Necesarios para PawFinder):**
- ✅ `auth/` - Autenticación JWT
- ✅ `users/` - Gestión de usuarios
- ✅ `roles/` - Roles de usuario
- ✅ `pets/` - Gestión de mascotas
- ✅ `categories/` - Categorías de mascotas
- ✅ `config/` - Configuración Firebase
- ✅ `util/` - Utilidades (Firebase Storage)

---

## 🗄️ **ESTRUCTURA DE BASE DE DATOS OPTIMIZADA**

### **Tabla: users**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  lastname VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(255) UNIQUE,
  image VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  notification_token VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **Tabla: categories**
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

-- Seed automático
INSERT INTO categories (id, name, emoji, description) VALUES
(1, 'Perros', '🐕', 'Perros de todas las razas y tamaños'),
(2, 'Gatos', '🐱', 'Gatos domésticos y de diferentes razas'),
(3, 'Aves', '🐦', 'Aves domésticas y exóticas'),
(4, 'Conejos', '🐰', 'Conejos domésticos de diferentes razas'),
(5, 'Otros', '🐹', 'Otras mascotas como hamsters, reptiles, etc.');
```

### **Tabla: pets (Alineada con tu entidad Pet de Flutter)**
```sql
CREATE TABLE pets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  imageUrl VARCHAR(500),
  isRisk BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  userId INT NOT NULL,
  address TEXT DEFAULT '',
  age VARCHAR(20) DEFAULT '',
  breed VARCHAR(50) DEFAULT '',
  gender VARCHAR(10) DEFAULT 'Macho',
  size VARCHAR(20) DEFAULT 'Mediano',
  isVaccinated BOOLEAN DEFAULT FALSE,
  isSterilized BOOLEAN DEFAULT FALSE,
  contactName VARCHAR(100) DEFAULT '',
  contactPhone VARCHAR(20) DEFAULT '',
  contactEmail VARCHAR(100) DEFAULT '',
  categoryId INT DEFAULT 1,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);
```

---

## 🌐 **API ENDPOINTS ALINEADOS CON TU FRONTEND**

### **Autenticación (AuthService):**
```typescript
POST   /api/auth/login     // AuthService.login()
POST   /api/auth/register  // AuthService.register()
```

### **Usuarios (ProfileService):**
```typescript
GET    /api/users/:id         // ProfileService.getCurrentUserProfile()
PUT    /api/users/:id         // ProfileService.updateProfile()
PUT    /api/users/upload/:id  // ProfileService.updateProfileWithImage()
```

### **Categorías (CategoryService):**
```typescript
GET    /api/categories              // CategoryService.getAllCategories()
GET    /api/categories/:id          // Categoría específica
GET    /api/categories/stats/count  // Con conteo de mascotas
```

### **Mascotas (PetService):**
```typescript
GET    /api/pets                    // PetService.getAllPets()
GET    /api/pets/adoption           // PetService.getPetsForAdoption()
GET    /api/pets/risk               // PetService.getPetsInRisk()
GET    /api/pets/:id                // Mascota específica
POST   /api/pets                    // PetService.createPet()
POST   /api/pets/upload             // PetService.createPet() con imagen
PATCH  /api/pets/:id                // Actualizar mascota
DELETE /api/pets/:id                // Eliminar mascota
```

---

## 🔄 **MAPEO EXACTO: FRONTEND ↔ BACKEND**

### **Pet Entity (Flutter) ↔ Pet Entity (NestJS):**
```dart
// Flutter Pet Entity
class Pet {
  final String id;           ↔  @PrimaryGeneratedColumn() id: number;
  final String name;         ↔  @Column() name: string;
  final String description;  ↔  @Column() description: string;
  final String imageUrl;     ↔  @Column() imageUrl: string;
  final bool isRisk;         ↔  @Column() isRisk: boolean;
  final DateTime createdAt;  ↔  @Column() createdAt: Date;
  final String userId;       ↔  @Column() userId: number;
  final String address;      ↔  @Column() address: string;
  final String age;          ↔  @Column() age: string;
  final String breed;        ↔  @Column() breed: string;
  final String gender;       ↔  @Column() gender: string;
  final String size;         ↔  @Column() size: string;
  final bool isVaccinated;   ↔  @Column() isVaccinated: boolean;
  final bool isSterilized;   ↔  @Column() isSterilized: boolean;
  final String contactName;  ↔  @Column() contactName: string;
  final String contactPhone; ↔  @Column() contactPhone: string;
  final String contactEmail; ↔  @Column() contactEmail: string;
  final PetCategory category; ↔  @Column() categoryId: number;
}
```

### **PetCategory (Flutter) ↔ Category (NestJS):**
```dart
// Flutter PetCategory Enum
enum PetCategory {
  dog('Perros', '🐕', 1),    ↔  { id: 1, name: 'Perros', emoji: '🐕' }
  cat('Gatos', '🐱', 2),     ↔  { id: 2, name: 'Gatos', emoji: '🐱' }
  bird('Aves', '🐦', 3),     ↔  { id: 3, name: 'Aves', emoji: '🐦' }
  rabbit('Conejos', '🐰', 4), ↔  { id: 4, name: 'Conejos', emoji: '🐰' }
  other('Otros', '🐹', 5);   ↔  { id: 5, name: 'Otros', emoji: '🐹' }
}
```

---

## 🔥 **FIREBASE STORAGE INTEGRADO**

### **Configuración:**
- ✅ Proyecto: `pawfinder-4b099`
- ✅ Bucket: `pawfinder-4b099.firebasestorage.app`
- ✅ Servicio: `cloud_storage.ts` funcional
- ✅ Subida automática desde `PetService.createPet()`

### **Flujo de Imágenes:**
```
Flutter ImageService.takePhoto() / pickFromGallery()
    ↓
PetService.createPet(imageFile: file)
    ↓
POST /api/pets/upload (multipart/form-data)
    ↓
Backend uploadToFirebase(file, 'pets/')
    ↓
Firebase Storage: pets/timestamp-filename.ext
    ↓
URL pública retornada: pet.imageUrl
```

---

## 🔐 **AUTENTICACIÓN JWT ALINEADA**

### **Flujo de Autenticación:**
```
Flutter AuthService.login(email, password)
    ↓
POST /api/auth/login
    ↓
Backend valida credenciales
    ↓
Retorna: { token: 'jwt_token', user: {...} }
    ↓
Flutter guarda en SharedPreferences
    ↓
HttpService.setAuthToken() para futuras peticiones
```

### **Endpoints Protegidos:**
- `POST /api/pets` - Crear mascota
- `POST /api/pets/upload` - Crear con imagen
- `PATCH /api/pets/:id` - Actualizar mascota
- `DELETE /api/pets/:id` - Eliminar mascota
- `PUT /api/users/:id` - Actualizar perfil
- `PUT /api/users/upload/:id` - Actualizar perfil con imagen

---

## 🚀 **CÓMO EJECUTAR EL BACKEND LIMPIO**

### **1. Instalar dependencias:**
```bash
cd eccomerce-bankend
npm install
```

### **2. Configurar variables de entorno (.env):**
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
FIREBASE_STORAGE_BUCKET=pawfinder-4b099.firebasestorage.app

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here
```

### **3. Ejecutar en desarrollo:**
```bash
npm run start:dev
```

### **4. Verificar funcionamiento:**
```bash
# Categorías
curl http://localhost:3000/api/categories

# Mascotas para adopción
curl http://localhost:3000/api/pets/adoption

# Filtrar gatos para adopción
curl http://localhost:3000/api/pets/adoption?category=2
```

---

## 📊 **LOGS ESPERADOS AL INICIAR:**

```
✅ Categorías de mascotas creadas exitosamente
🔹 Firebase conectado correctamente
🚀 Aplicación ejecutándose en puerto 3000
```

---

## 🎯 **RESULTADO FINAL**

### **Backend completamente alineado con tu Clean Architecture Flutter:**
- ✅ **Entidades sincronizadas** - Pet ↔ Pet, PetCategory ↔ Category
- ✅ **Endpoints exactos** - Coinciden con tus servicios Flutter
- ✅ **Estructura limpia** - Solo módulos necesarios para PawFinder
- ✅ **Firebase integrado** - Subida de imágenes funcional
- ✅ **Autenticación JWT** - Compatible con AuthService
- ✅ **Base de datos optimizada** - Campos exactos de tu entidad Pet

**¡El backend está 100% optimizado para tu frontend Flutter con Clean Architecture!** 🎉