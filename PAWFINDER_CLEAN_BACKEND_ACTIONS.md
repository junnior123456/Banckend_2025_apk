Resumen de acciones sugeridas para migrar a Clean Architecture y pasos realizados

Objetivo
- Organizar `eccomerce-bankend` con capas: `domain`, `application` (use-cases), `infrastructure` (ORM/DB), `interfaces` (controllers), y `core` (config/DI), manteniendo compatibilidad con las rutas actuales.
- Proveer una herramienta segura para identificar y borrar tablas MySQL no usadas.
- Entregar ejemplo de refactor incremental para la entidad `Pet`.

Acciones ya aplicadas
- Añadido script `tools/db_inspector.js` que: conecta a la DB (usa `.env`), lista tablas, compara con entidades declaradas en `src/app.module.ts` y opcionalmente borra tablas tras confirmación interactiva.
- Añadidos scripts npm: `npm run db:inspect` y `npm run db:drop`.

Cómo usar `db_inspector.js`
1. Hacer respaldo de la base de datos (dump) antes de cualquier borrado.
2. Configurar `.env` en la raíz de `eccomerce-bankend` con las variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`.
3. Ejecutar:

   npm run db:inspect

   Esto listará tablas detectadas y las que no parecen corresponder a entidades.
4. Si revisas la lista y estás seguro, ejecuta:

   npm run db:drop

   Te pedirá confirmación interactiva escribiendo `si`.

Recomendaciones antes de borrar tablas
- Realiza un dump: `mysqldump -u root -p --databases <DB_NAME> > backup.sql`
- Revisa manualmente cada tabla reportada por el script. El heurístico es simple y puede producir falsos positivos.

Plan de migración a Clean Architecture (sugerido)
1. Crear carpetas raíz: `src/domain`, `src/application`, `src/infrastructure`, `src/interfaces`, `src/core`.
2. Mover entidades a `src/domain/entities` (mantener decoradores TypeORM si vas a migrar gradualmente) o crear DTO/Entity adaptadores.
3. Crear interfaces (contracts) en `domain/repositories` (ej: `pet_repository.ts`) que definan operaciones necesarias.
4. Implementar adaptadores en `infrastructure/typeorm` que usen `@InjectRepository` o `DataSource` para implementar las interfaces.
5. Implementar use-cases en `application/use_cases` que dependan solo de las interfaces del dominio.
6. Actualizar controllers en `interfaces/http` para delegar a use-cases.
7. Añadir pruebas unitarias para cada capa (empezar por use-cases).
8. Repetir por módulo (pets, users, adoption, comments, notifications, reports).

Estrategia incremental propuesta
- Paso 1 (rápido): Crear las carpetas y mover una copia de `Pet` a `src/domain` y crear un `PetRepository` interface.
- Paso 2: Crear `src/infrastructure/typeorm/pet_repository_impl.ts` que implementa la interface usando TypeORM.
- Paso 3: Modificar `PetsService` para que dependa de la interface y usar el provider que apunta a la implementación. Esto permite tests e intercambiabilidad.
- Paso 4: Repetir para `User` y `Category`.

Ejemplo (implementación mínima)
- `src/domain/pets/pet.ts` (entidad/domain model)
- `src/domain/pets/pet_repository.ts` (interface)
- `src/infrastructure/typeorm/pet_repository_impl.ts` (implementación TypeORM)
- Cambiar `PetsModule` para proveer el binding: `{ provide: 'PetRepository', useClass: TypeOrmPetRepository }

Soporte Flutter (BLoC)
- Recomendado crear carpeta `lib/application/bloc` con `pets` feature como ejemplo.
- Añadir `pets_bloc.dart`, `pets_event.dart`, `pets_state.dart` y conectar al `PetService` existente.
- Migrar pantallas a usar BLoC para manejar estados (cargando/éxito/error) en lugar de llamadas directas a servicios.

Siguientes pasos que puedo ejecutar si me das permiso
- Ejecutar `npm run db:inspect` localmente (requiere credenciales en `.env` y acceso a la DB desde este entorno). No ejecuto borrados sin tu autorización explícita.
- Implementar el ejemplo de Clean Architecture para `Pet` (crear las interfaces e implementación, actualizar `PetsModule` y `PetsService` para usar inyección basada en interfaces).
- Añadir BLoC completo para `pets` en `PawFinder/lib/application/bloc/pets` y un ejemplo de integración en una pantalla.

Si quieres que continúe, dime qué prefieres primero:
- `A` -> Ejecutar inspección y generar lista de tablas a borrar (no borra nada).
- `B` -> Crear refactor incremental de ejemplo para `Pet` en backend (Clean Architecture skeleton + wiring).
- `C` -> Añadir BLoC y ejemplo de UI en Flutter para `pets`.
- `D` -> Todo lo anterior en orden (tardará más y lo haré por pasos, pidiendo confirmaciones para borrado).
