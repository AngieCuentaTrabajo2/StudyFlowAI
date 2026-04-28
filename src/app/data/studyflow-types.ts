export type Prioridad = "low" | "medium" | "high";
export type EstadoTarea = "pending" | "in-progress" | "completed" | "overdue";
export type TipoNotificacion = "urgent" | "warning" | "info" | "success";
export type JornadaPlanificacion = "manana" | "tarde" | "noche" | "flexible";
export type AlcancePlanificacion = "todo" | "tarea" | "curso";
export type ModoPlanificacionTodo =
  | "solo-calendarizado"
  | "agregar-tareas"
  | "agregar-repasos"
  | "agregar-todo";

export type FranjaDisponibilidad = "manana" | "tarde" | "noche";

export type DisponibilidadDia = {
  dia: number;
  manana: boolean;
  tarde: boolean;
  noche: boolean;
};

export type Subtarea = {
  id: string;
  titulo: string;
  completada: boolean;
};

export type PerfilUsuario = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  universidad: string;
  carrera: string;
  semestre: string;
  plan: "gratis" | "estudiante" | "premium";
  horasDisponibles: string;
  metodoEstudio: string;
  tonoAsistente: "frio" | "amigable" | "responsable";
  metas: string;
  horasEstudioDiarias: number;
  horasSueno: number;
  disponibilidadSemanal: DisponibilidadDia[];
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

export type Curso = {
  id: string;
  nombre: string;
  docente: string;
  horario: string;
  semestre: string;
  color: string;
  descripcion: string;
  materiales: Array<{ id: string; nombre: string; tipo: string }>;
};

export type Tarea = {
  id: string;
  cursoId: string;
  titulo: string;
  descripcion: string;
  fechaEntrega: string;
  prioridad: Prioridad;
  estado: EstadoTarea;
  horasEstimadas: number;
  progreso: number;
  subtareas: Subtarea[];
};

export type Examen = {
  id: string;
  cursoId: string;
  titulo: string;
  fecha: string;
  hora: string;
  temas: string[];
  preparacion: number;
};

export type BloquePlanificador = {
  id: string;
  dia: number;
  horaInicio: number;
  duracion: number;
  titulo: string;
  cursoId?: string;
  color: string;
  tipo: "class" | "study" | "exam" | "break";
};

export type NotificacionItem = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  creadaEn: string;
  noLeida: boolean;
};

export type AlertaInteligente = {
  id: string;
  titulo: string;
  descripcion: string;
  nivel: "critica" | "alta" | "media";
  tipo: "tarea" | "examen";
  destino: string;
  tareaId?: string;
  examenId?: string;
  cursoId?: string;
};

export type MensajeChat = {
  id: string;
  tipo: "user" | "ai";
  mensaje: string;
  hora: string;
};

export type ResultadoPlanificacionInteligente = {
  ok: boolean;
  mensaje: string;
  resumen: string[];
  bloquesCreados: number;
  horasProgramadas: number;
  totalHorasSolicitadas?: number;
  bloquesPrevistos?: BloquePlanificador[];
  bloquesFinales?: BloquePlanificador[];
  descripcionAplicacion?: string;
};
