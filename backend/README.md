# Backend StudyFlow AI

Base inicial para conectar la interfaz con PostgreSQL usando nombres de tablas y columnas en español.

## Ejecutar

1. Copia `.env.example` como `.env`.
2. Crea una base `studyflow_ai`.
3. Ejecuta `backend/db/schema.sql`.
4. Ejecuta `backend/db/seed.sql`.
5. Inicia la API con `npm run dev:server`.

## Endpoints incluidos

- `GET /api/salud`
- `GET /api/resumen-panel/:estudianteId`
- `GET /api/tareas/:estudianteId`
- `POST /api/tareas`

## Nota

Si ya habías cargado el esquema anterior en inglés, ahora convivirán tablas antiguas y nuevas a menos que limpies la base o hagas una migración formal. Desde este punto, la referencia correcta del proyecto es el esquema en español.
