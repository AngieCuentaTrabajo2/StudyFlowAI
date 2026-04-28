# 🚀 StudyFlowAI

Aplicación web enfocada en mejorar la productividad académica mediante organización inteligente, gestión de tareas, planificación de estudio y apoyo con inteligencia artificial.

<p align="left">
  <img src="https://img.shields.io/badge/Estado-En%20desarrollo-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Tipo-Web%20App-6C63FF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Enfoque-Productividad%20%2B%20IA-111827?style=for-the-badge" />
</p>

---

## 📌 Descripción

**StudyFlowAI** es una plataforma web diseñada para centralizar tareas, cursos, exámenes, recordatorios, calendario académico y asistencia inteligente en un solo entorno.

La idea del proyecto es ayudar a estudiantes a organizar mejor su flujo de estudio, priorizar pendientes importantes y distribuir su tiempo con apoyo de herramientas modernas de desarrollo web e inteligencia artificial.

---

## 🎯 Objetivo del proyecto

Brindar una solución digital que permita:

- organizar tareas y pendientes académicos
- centralizar cursos, exámenes y recordatorios
- visualizar el progreso de estudio
- planificar bloques de estudio según disponibilidad
- reducir el desorden entre múltiples herramientas
- incorporar asistencia inteligente en el flujo académico

---

## ❗ Problema que resuelve

Muchos estudiantes gestionan sus estudios en varias plataformas al mismo tiempo: tareas por un lado, horarios por otro, recordatorios en otra app y apuntes o recursos desordenados.

**StudyFlowAI** busca resolver ese problema ofreciendo una experiencia integrada, clara y orientada a productividad académica.

---

## ✨ Funcionalidades principales

- 🧠 Gestión de tareas, subtareas y prioridades
- 📚 Organización de cursos y horarios
- 📝 Registro de exámenes, temas y preparación
- 📅 Planificador semanal con bloques de clase, estudio y repaso
- 🔔 Seguimiento de pendientes, alertas y recordatorios
- 📊 Visualización clara del progreso académico
- 🤖 Asistente con IA conectado al contexto real del estudiante
- ⚙️ Configuración de perfil, disponibilidad y tono del asistente
- 🔐 Inicio de sesión tradicional y soporte con Google OAuth

---

## 🛠️ Tecnologías utilizadas

### 🎨 Frontend
<p>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</p>

### ⚙️ Backend
<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/SQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
</p>

### 🗄️ Base de datos
<p>
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/pg-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
</p>

### 🤖 IA
<p>
  <img src="https://img.shields.io/badge/Groq-111827?style=for-the-badge" />
  <img src="https://img.shields.io/badge/OpenAI%20Compatible%20API-412991?style=for-the-badge" />
  <img src="https://img.shields.io/badge/OpenAI%20SDK-111827?style=for-the-badge&logo=openai&logoColor=white" />
</p>

### 🚀 Deploy y herramientas
<p>
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" />
  <img src="https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white" />
</p>

---

## 🧱 Arquitectura general

El proyecto sigue una arquitectura fullstack moderna:

- **Frontend:** interfaz dinámica y responsive construida con React, TypeScript y Vite
- **Backend:** API con Node.js y Express para manejar lógica de negocio y endpoints
- **Base de datos:** PostgreSQL con scripts SQL propios para esquema y datos iniciales
- **IA:** integración con Groq mediante API compatible con OpenAI
- **Autenticación:** login tradicional y autenticación con Google
- **Deploy:** frontend preparado para despliegue en Vercel

---

## 📂 Estructura general del proyecto

```bash
StudyFlowAI/
├── backend/          # lógica de servidor, APIs y utilidades backend
│   ├── db/           # schema.sql y seed.sql
│   ├── server.js
│   ├── auth-utils.js
│   └── mappers.js
├── src/              # frontend principal
│   └── app/
│       ├── components/
│       ├── data/
│       └── pages/
├── public/           # recursos estáticos
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
└── README.md
```

---

## ⚙️ Scripts disponibles

```bash
npm run dev          # inicia el frontend con Vite
npm run dev:server   # inicia el backend con Express
npm run build        # genera la versión de producción
npm run typecheck    # revisa tipos con TypeScript
npm run lint         # revisa el código con ESLint
npm run test         # ejecuta typecheck y build
```

---

## 🔐 Variables de entorno

Usa `.env.example` como referencia:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/studyflow_ai
PORT=4000
GROQ_API_KEY=pega_aqui_tu_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
GOOGLE_CLIENT_ID=pega_aqui_tu_google_client_id_web
VITE_GOOGLE_CLIENT_ID=pega_aqui_tu_google_client_id_web
```

---

## ▶️ Ejecución local

1. Instala dependencias:

```bash
npm install
```

2. Copia `.env.example` como `.env`.
3. Crea una base PostgreSQL llamada `studyflow_ai`.
4. Ejecuta `backend/db/schema.sql`.
5. Ejecuta `backend/db/seed.sql` si quieres datos iniciales.
6. Inicia el backend:

```bash
npm run dev:server
```

7. Inicia el frontend:

```bash
npm run dev
```
