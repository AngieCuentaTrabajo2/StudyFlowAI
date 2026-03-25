# StudyFlow AI

Aplicacion web funcional basada en el diseno original de Figma para una plataforma academica con enfoque SaaS/EdTech.

## Que incluye

- Landing page, login y registro.
- Dashboard del estudiante con datos conectados.
- Modulos funcionales de cursos, tareas, examenes, planificador, asistente, progreso, notificaciones y configuracion.
- Backend con Express y PostgreSQL listo para trabajar con Neon.
- Asistente IA con integracion base para Groq usando una API OpenAI-compatible.

## Frontend

```bash
npm install
npm run dev
```

Para verificar produccion:

```bash
npm run build
```

## Backend PostgreSQL

Archivos importantes:

- `backend/server.js`
- `backend/db/schema.sql`
- `backend/db/seed.sql`
- `.env.example`

Pasos base:

1. Copia `.env.example` como `.env`.
2. Configura `DATABASE_URL` con tu base PostgreSQL o Neon.
3. Ejecuta `backend/db/schema.sql`.
4. Ejecuta `backend/db/seed.sql`.
5. Inicia la API con `npm run dev:server`.

## Groq

La clave va en el archivo `.env` de la raiz del proyecto:

```env
GROQ_API_KEY=tu_api_key_aqui
GROQ_MODEL=llama-3.1-8b-instant
```

Notas:

- Si `GROQ_API_KEY` no existe, el backend devolvera un error explicito en el modulo del asistente.
- Cuando agregues la clave, reinicia el backend con `npm run dev:server`.
- El endpoint que usa el chat es `POST /api/chat/:estudianteId`.

## Estado actual de IA

El asistente ya usa el contexto real del estudiante desde la base de datos para construir respuestas. Si configuras Groq, el backend llamara al modelo y devolvera respuestas reales desde la app.
