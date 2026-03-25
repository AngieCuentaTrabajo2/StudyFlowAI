const URL_API =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL ??
  "http://localhost:4000";

async function request<T>(ruta: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${URL_API}${ruta}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const texto = await response.text();
    throw new Error(texto || `Error HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type UsuarioApi = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  universidad: string;
  carrera: string;
  semestre: string;
  plan: "gratis" | "estudiante" | "premium";
  horasDisponibles: string | null;
  metodoEstudio: string | null;
  tonoAsistente: "frio" | "amigable" | "responsable" | null;
  metas: string | null;
  horasEstudioDiarias: number | null;
  horasSueno: number | null;
  notificaciones: {
    tareas: boolean;
    examenes: boolean;
    ia: boolean;
    semanal: boolean;
    correo: boolean;
  };
  aplicacion: {
    modoOscuro: boolean;
    googleCalendar: boolean;
    sugerenciasAutomaticas: boolean;
  };
};

export type CursoApi = {
  id: string;
  nombre: string;
  docente: string;
  horario: string;
  semestre: string;
  color: string;
  descripcion: string;
};

export type TareaApi = {
  id: string;
  cursoId: string;
  titulo: string;
  descripcion: string;
  fechaEntrega: string;
  prioridad: "low" | "medium" | "high";
  estado: "pending" | "in-progress" | "completed" | "overdue";
  horasEstimadas: number;
  progreso: number;
};

export type ExamenApi = {
  id: string;
  cursoId: string;
  titulo: string;
  fecha: string;
  hora: string;
  temas: string[];
  preparacion: number;
};

export type BloquePlanificadorApi = {
  id: string;
  dia: number;
  horaInicio: number;
  duracion: number;
  titulo: string;
  cursoId?: string;
  color: string;
  tipo: "class" | "study" | "exam" | "break";
};

export type NotificacionApi = {
  id: string;
  tipo: "urgent" | "warning" | "info" | "success";
  titulo: string;
  mensaje: string;
  creadaEn: string;
  noLeida: boolean;
};

export type MensajeChatApi = {
  id: string;
  tipo: "user" | "ai";
  mensaje: string;
  hora: string;
  creadaEn?: string;
};

export type RespuestaChatApi = {
  mensajes: MensajeChatApi[];
  fuente: "groq" | "sistema";
};

export type ContextoApi = {
  usuario: UsuarioApi | null;
  cursos: CursoApi[];
  tareas: TareaApi[];
  examenes: ExamenApi[];
  bloquesPlanificador: BloquePlanificadorApi[];
  notificaciones: NotificacionApi[];
  mensajesChat: MensajeChatApi[];
};

export const api = {
  iniciarSesion(payload: { correo: string; contrasena: string }) {
    return request<{ usuario: UsuarioApi | null }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  registrarUsuario(payload: {
    nombres: string;
    apellidos: string;
    correo: string;
    contrasena: string;
    universidad: string;
    carrera: string;
    semestre: string;
    plan: "gratis" | "estudiante" | "premium";
  }) {
    return request<{ usuario: UsuarioApi }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  obtenerContexto(estudianteId: string) {
    return request<ContextoApi>(`/api/contexto/${estudianteId}`);
  },
  actualizarPerfil(
    estudianteId: string,
    payload: Partial<UsuarioApi>,
  ) {
    return request<{ usuario: UsuarioApi }>(`/api/perfil/${estudianteId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  crearCurso(payload: {
    estudianteId: string;
    nombre: string;
    docente: string;
    horario: string;
    semestre: string;
    color: string;
    descripcion: string;
  }) {
    return request<CursoApi>("/api/cursos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  actualizarCurso(
    cursoId: string,
    payload: Partial<{
      nombre: string;
      docente: string;
      horario: string;
      semestre: string;
      color: string;
      descripcion: string;
    }>,
  ) {
    return request<CursoApi>(`/api/cursos/${cursoId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  eliminarCurso(cursoId: string) {
    return request<{ ok: true }>(`/api/cursos/${cursoId}`, {
      method: "DELETE",
    });
  },
  crearTarea(payload: {
    estudianteId: string;
    cursoId: string;
    titulo: string;
    descripcion: string;
    fechaEntrega: string;
    prioridad: "low" | "medium" | "high";
    horasEstimadas: number;
  }) {
    return request<TareaApi>("/api/tareas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  crearExamen(payload: {
    estudianteId: string;
    cursoId: string;
    titulo: string;
    fecha: string;
    hora: string;
    temas: string[];
    preparacion: number;
  }) {
    return request<ExamenApi>("/api/examenes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  actualizarExamen(
    examenId: string,
    payload: Partial<{
      cursoId: string;
      titulo: string;
      fecha: string;
      hora: string;
      temas: string[];
      preparacion: number;
    }>,
  ) {
    return request<ExamenApi>(`/api/examenes/${examenId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  eliminarExamen(examenId: string) {
    return request<{ ok: true }>(`/api/examenes/${examenId}`, {
      method: "DELETE",
    });
  },
  actualizarTarea(
    tareaId: string,
    payload: Partial<{
      titulo: string;
      descripcion: string;
      fechaEntrega: string;
      prioridad: "low" | "medium" | "high";
      estado: "pending" | "in-progress" | "completed" | "overdue";
      horasEstimadas: number;
      progreso: number;
    }>,
  ) {
    return request<TareaApi>(`/api/tareas/${tareaId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  guardarPlanificador(estudianteId: string, bloques: BloquePlanificadorApi[]) {
    return request<{ bloques: BloquePlanificadorApi[] }>(`/api/planificador/${estudianteId}`, {
      method: "POST",
      body: JSON.stringify({ bloques }),
    });
  },
  crearNotificacion(payload: {
    estudianteId: string;
    tipo: "urgent" | "warning" | "info" | "success";
    titulo: string;
    mensaje: string;
    noLeida?: boolean;
  }) {
    return request<NotificacionApi>("/api/notificaciones", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  actualizarNotificacion(notificacionId: string, payload: { noLeida: boolean }) {
    return request<NotificacionApi>(`/api/notificaciones/${notificacionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  marcarTodasLasNotificacionesLeidas(estudianteId: string) {
    return request<{ ok: true }>(`/api/notificaciones/leer-todas/${estudianteId}`, {
      method: "PATCH",
    });
  },
  limpiarNotificacionesLeidas(estudianteId: string) {
    return request<{ ok: true }>(`/api/notificaciones/leidas/${estudianteId}`, {
      method: "DELETE",
    });
  },
  enviarMensajeAsistente(estudianteId: string, mensaje: string) {
    return request<RespuestaChatApi>(`/api/chat/${estudianteId}`, {
      method: "POST",
      body: JSON.stringify({ mensaje }),
    });
  },
  limpiarMensajesAsistente(estudianteId: string) {
    return request<{ ok: true }>(`/api/chat/${estudianteId}`, {
      method: "DELETE",
    });
  },
};
