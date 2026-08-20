# Migraciones de esquema

`synchronize` está **apagado en producción** (`DB_SYNC`), y con razón: cuando
estuvo activo borraba los índices en cada arranque. Eso significa que **las
tablas y columnas nuevas NO se crean solas**: hay que aplicar estos ficheros.

Aplícalos en orden sobre la base de datos:

```bash
cd /opt/pawfinder-backend
export $(grep ^DATABASE_URL .env | xargs)
for f in migrations/*.sql; do echo "-- $f"; psql "$DATABASE_URL" -f "$f"; done
```

Todos son **idempotentes** (`IF NOT EXISTS`): volver a pasarlos no rompe nada
ni duplica columnas, así que se pueden correr sin miedo sobre una base que ya
esté al día.

| Fichero | Qué añade |
|---|---|
| `001_pet_media.sql` | Vídeos cortos en las publicaciones |
| `002_vet_store.sql` | Catálogo, horario y agenda de la veterinaria |
| `003_vet_product_video.sql` | Vídeo de publicidad en el catálogo |
| `004_login_lockout.sql` | Bloqueo por intentos de acceso fallidos |
