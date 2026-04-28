# StudyFlow AI

StudyFlow AI es una aplicacion web para organizar el estudio universitario en un solo lugar. El proyecto centraliza cursos, tareas, examenes, calendario, progreso, notificaciones y un asistente con IA que ayuda a priorizar actividades y planificar sesiones de estudio.

## En Que Consiste

La app esta pensada para estudiantes que necesitan convertir sus pendientes academicos en un flujo de trabajo mas claro. Desde el panel principal se puede revisar la carga de la semana, registrar tareas, preparar examenes, consultar recomendaciones y reorganizar bloques de estudio segun disponibilidad.

El asistente de IA usa el contexto real del estudiante: cursos, tareas activas, examenes, bloques del planificador y mensajes recientes. Con esa informacion puede responder preguntas, sugerir prioridades, generar planes de estudio y ayudar a distribuir actividades sin inventar datos.

## Funcionalidades Principales

- Panel academico con resumen de tareas, examenes, progreso y alertas.
- Gestion de cursos, horarios, materiales y detalles por asignatura.
- Registro de tareas con prioridad, progreso, subtareas y fechas de entrega.
- Calendario/planificador semanal con bloques de clase, estudio, repaso y examenes.
- Modulo de examenes con temas y porcentaje de preparacion.
- Asistente IA conversacional conectado al contexto del usuario.
- Notificaciones internas para pendientes, urgencias y recordatorios.
- Configuracion de perfil, tono del asistente, preferencias y disponibilidad semanal.
- Inicio de sesion tradicional y soporte para Google OAuth.

## Stack Utilizado

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Radix UI
- MUI
- Lucide React
- Recharts

### Backend

- Node.js
- Express
- PostgreSQL
- `pg`
- SQL propio en `backend/db/schema.sql` y `backend/db/seed.sql`

### Inteligencia Artificial

- Groq mediante API compatible con OpenAI
- SDK `openai`
- Modelo configurable con `GROQ_MODEL`

### Autenticacion e Integraciones

- Login con correo y contrasena
- Google OAuth con `google-auth-library`
- Variables de entorno para credenciales y conexion a base de datos

### Calidad y Build

- Vite para desarrollo y compilacion
- TypeScript para chequeo estatico
- ESLint para revision basica del codigo

## Estructura Del Proyecto

```bash
StudyFlow AI/
├── backend/
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.sql
│   ├── server.js
│   ├── auth-utils.js
│   └── mappers.js
├── public/
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── data/
│   │   └── pages/
│   ├── styles/
│   └── main.tsx
├── package.json
├── vite.config.ts
└── vercel.json
```

## Scripts

```bash
npm run dev
npm run dev:server
npm run build
npm run typecheck
npm run lint
npm run test
```

## Variables De Entorno

Usa `.env.example` como base:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/studyflow_ai
PORT=4000
GROQ_API_KEY=pega_aqui_tu_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
GOOGLE_CLIENT_ID=pega_aqui_tu_google_client_id_web
VITE_GOOGLE_CLIENT_ID=pega_aqui_tu_google_client_id_web
```

## Ejecucion Local

1. Instala dependencias con `npm install`.
2. Copia `.env.example` como `.env`.
3. Crea una base PostgreSQL llamada `studyflow_ai`.
4. Ejecuta `backend/db/schema.sql`.
5. Ejecuta `backend/db/seed.sql` si quieres datos de prueba.
6. Inicia el backend con `npm run dev:server`.
7. Inicia el frontend con `npm run dev`.
