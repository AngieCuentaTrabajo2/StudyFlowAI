create extension if not exists "pgcrypto";

create table if not exists estudiantes (
  id uuid primary key default gen_random_uuid(),
  nombres text not null,
  apellidos text not null,
  correo text not null unique,
  google_sub text,
  hash_contrasena text not null,
  universidad text not null,
  carrera text not null,
  semestre text not null,
  plan text not null default 'gratis' check (plan in ('gratis', 'estudiante', 'premium')),
  horas_disponibles text,
  metodo_estudio text,
  tono_asistente text not null default 'responsable' check (tono_asistente in ('frio', 'amigable', 'responsable')),
  metas text,
  horas_estudio_diarias int default 4,
  horas_sueno int default 8,
  notif_tareas boolean not null default true,
  notif_examenes boolean not null default true,
  notif_ia boolean not null default true,
  notif_semanal boolean not null default true,
  notif_correo boolean not null default false,
  app_modo_oscuro boolean not null default false,
  app_google_calendar boolean not null default false,
  app_sugerencias_automaticas boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table estudiantes add column if not exists plan text not null default 'gratis';
alter table estudiantes add column if not exists tono_asistente text not null default 'responsable';
alter table estudiantes add column if not exists google_sub text;
create unique index if not exists estudiantes_google_sub_unique on estudiantes (google_sub) where google_sub is not null;

alter table estudiantes add column if not exists notif_tareas boolean not null default true;
alter table estudiantes add column if not exists notif_examenes boolean not null default true;
alter table estudiantes add column if not exists notif_ia boolean not null default true;
alter table estudiantes add column if not exists notif_semanal boolean not null default true;
alter table estudiantes add column if not exists notif_correo boolean not null default false;
alter table estudiantes add column if not exists app_modo_oscuro boolean not null default false;
alter table estudiantes add column if not exists app_google_calendar boolean not null default false;
alter table estudiantes add column if not exists app_sugerencias_automaticas boolean not null default true;

create table if not exists cursos (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  nombre text not null,
  docente text not null,
  horario_texto text not null,
  semestre text not null,
  color text not null default 'blue',
  descripcion text default '',
  creado_en timestamptz not null default now()
);

create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  descripcion text default '',
  fecha_entrega date not null,
  prioridad text not null check (prioridad in ('low', 'medium', 'high')),
  estado text not null default 'pending' check (estado in ('pending', 'in-progress', 'completed', 'overdue')),
  horas_estimadas numeric(4,1) not null default 1,
  progreso int not null default 0 check (progreso between 0 and 100),
  creado_en timestamptz not null default now()
);

create table if not exists examenes (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  fecha_examen date not null,
  hora_examen time not null,
  temas text[] not null default '{}',
  preparacion int not null default 0 check (preparacion between 0 and 100),
  creado_en timestamptz not null default now()
);

create table if not exists bloques_planificador (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  curso_id uuid references cursos(id) on delete set null,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio numeric(4,1) not null,
  horas_duracion numeric(4,1) not null,
  titulo text not null,
  tipo_bloque text not null default 'study' check (tipo_bloque in ('class', 'study', 'exam', 'break')),
  color text not null default 'blue',
  creado_en timestamptz not null default now()
);

create table if not exists notificaciones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  tipo text not null check (tipo in ('urgent', 'warning', 'info', 'success')),
  titulo text not null,
  mensaje text not null,
  no_leida boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists mensajes_chat (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  rol text not null check (rol in ('user', 'ai')),
  mensaje text not null,
  creado_en timestamptz not null default now()
);
