import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parseISO,
  startOfToday,
} from "date-fns";
import { api, type ContextoApi, type UsuarioApi } from "./api";

export type Prioridad = "low" | "medium" | "high";
export type EstadoTarea = "pending" | "in-progress" | "completed" | "overdue";
export type TipoNotificacion = "urgent" | "warning" | "info" | "success";

export type PerfilUsuario = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
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

export type MensajeChat = {
  id: string;
  tipo: "user" | "ai";
  mensaje: string;
  hora: string;
};

type EstadoStudyFlow = {
  usuarioActual: PerfilUsuario | null;
  cursos: Curso[];
  tareas: Tarea[];
  examenes: Examen[];
  bloquesPlanificador: BloquePlanificador[];
  notificaciones: NotificacionItem[];
  mensajesChat: MensajeChat[];
  fuenteAsistente: "groq" | "sistema" | "error" | null;
};

type DatosRegistro = {
  name: string;
  email: string;
  password: string;
  university: string;
  career: string;
  semester: string;
  plan: "gratis" | "estudiante" | "premium";
};

type ValorContextoStudyFlow = EstadoStudyFlow & {
  iniciarSesion: (correo: string, contrasena: string) => Promise<boolean>;
  registrarUsuario: (datos: DatosRegistro) => Promise<boolean>;
  cerrarSesion: () => void;
  actualizarPerfil: (cambios: Partial<PerfilUsuario>) => void;
  agregarTarea: (
    tarea: Omit<Tarea, "id" | "estado" | "progreso"> & { estado?: EstadoTarea; progreso?: number },
  ) => void;
  actualizarTarea: (tareaId: string, cambios: Partial<Tarea>) => void;
  alternarTareaCompletada: (tareaId: string) => void;
  agregarCurso: (curso: Omit<Curso, "id" | "materiales"> & { materiales?: Curso["materiales"] }) => void;
  actualizarCurso: (cursoId: string, cambios: Partial<Curso>) => void;
  eliminarCurso: (cursoId: string) => void;
  agregarExamen: (examen: Omit<Examen, "id">) => void;
  actualizarExamen: (examenId: string, cambios: Partial<Examen>) => void;
  eliminarExamen: (examenId: string) => void;
  marcarNotificacionLeida: (notificacionId: string) => void;
  marcarTodasNotificacionesLeidas: () => void;
  limpiarNotificacionesLeidas: () => void;
  enviarMensajeAsistente: (mensaje: string) => void;
  limpiarMensajesAsistente: () => void;
  generarHorarioInteligente: () => void;
  moverBloquePlanificador: (bloqueId: string, dia: number, horaInicio: number) => void;
  actualizarBloquePlanificador: (bloqueId: string, cambios: Partial<BloquePlanificador>) => void;
  eliminarBloquePlanificador: (bloqueId: string) => void;
  obtenerCursoPorId: (cursoId?: string) => Curso | undefined;
  sincronizarConBackend: () => Promise<void>;
};

const CLAVE_ALMACENAMIENTO = "studyflow-ai-state-v1";
const etiquetasDias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function crearId(prefijo: string) {
  return `${prefijo}-${Math.random().toString(36).slice(2, 10)}`;
}

function esErrorConexion(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("Load failed"))
  );
}

function formatearHoraChat() {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function obtenerColorCurso(color: string) {
  const paleta: Record<string, string> = {
    blue: "#2563eb",
    purple: "#7c3aed",
    green: "#16a34a",
    orange: "#ea580c",
    red: "#dc2626",
    teal: "#0f766e",
  };

  return paleta[color] ?? "#2563eb";
}

function crearPerfilBase(): PerfilUsuario {
  return {
    id: "user-jhan",
    nombres: "Jhan",
    apellidos: "Perez",
    correo: "jhan.perez@universidad.edu",
    contrasena: "123456",
    universidad: "Universidad Nacional de Ingenieria",
    carrera: "Ingenieria de Sistemas",
    semestre: "5",
    plan: "estudiante",
    horasDisponibles: "4-6",
    metodoEstudio: "pomodoro",
    tonoAsistente: "responsable",
    metas: "Mantener un promedio alto, llegar con orden a examenes y reducir el estres academico.",
    horasEstudioDiarias: 4,
    horasSueno: 8,
    notificaciones: {
      tareas: true,
      examenes: true,
      ia: true,
      semanal: true,
      correo: false,
    },
    aplicacion: {
      modoOscuro: false,
      googleCalendar: false,
      sugerenciasAutomaticas: true,
    },
  };
}

function normalizarUsuarioApi(
  usuario: UsuarioApi,
  opciones?: { contrasena?: string; base?: PerfilUsuario | null },
): PerfilUsuario {
  const base = opciones?.base ?? crearPerfilBase();

  return {
    ...base,
    ...usuario,
    contrasena: opciones?.contrasena ?? base.contrasena,
    horasDisponibles: usuario.horasDisponibles ?? base.horasDisponibles,
    metodoEstudio: usuario.metodoEstudio ?? base.metodoEstudio,
    tonoAsistente: usuario.tonoAsistente ?? base.tonoAsistente,
    metas: usuario.metas ?? base.metas,
    horasEstudioDiarias: usuario.horasEstudioDiarias ?? base.horasEstudioDiarias,
    horasSueno: usuario.horasSueno ?? base.horasSueno,
    notificaciones: usuario.notificaciones ?? base.notificaciones,
    aplicacion: usuario.aplicacion ?? base.aplicacion,
  };
}

function crearEstadoInicial(): EstadoStudyFlow {
  const usuario = crearPerfilBase();
  const hoy = startOfToday();

  const cursos: Curso[] = [
    {
      id: "course-bd",
      nombre: "Base de Datos",
      docente: "Dr. Carlos Ramirez",
      horario: "Lun, Mie 08:00 - 10:00",
      semestre: "5",
      color: "blue",
      descripcion: "Modelo relacional, normalizacion, SQL avanzado y diseno de esquemas.",
      materiales: [
        { id: "m1", nombre: "Normalizacion paso a paso", tipo: "PDF" },
        { id: "m2", nombre: "Casos practicos de SQL", tipo: "PDF" },
        { id: "m3", nombre: "Repaso de transacciones", tipo: "Video" },
      ],
    },
    {
      id: "course-prog",
      nombre: "Programacion II",
      docente: "Ing. Maria Lopez",
      horario: "Mar, Jue 10:00 - 12:00",
      semestre: "5",
      color: "purple",
      descripcion: "Programacion orientada a objetos, APIs, buenas practicas y testing.",
      materiales: [
        { id: "m4", nombre: "Patrones de diseno", tipo: "PDF" },
        { id: "m5", nombre: "POO en Java", tipo: "Video" },
      ],
    },
    {
      id: "course-calc",
      nombre: "Calculo II",
      docente: "Mat. Juan Perez",
      horario: "Lun, Mie 14:00 - 16:00",
      semestre: "5",
      color: "green",
      descripcion: "Integrales, series y aplicaciones al analisis matematico.",
      materiales: [
        { id: "m6", nombre: "Guia de integrales", tipo: "PDF" },
        { id: "m7", nombre: "Ejercicios resueltos", tipo: "PDF" },
      ],
    },
    {
      id: "course-fis",
      nombre: "Fisica II",
      docente: "Dra. Ana Martinez",
      horario: "Mar, Vie 08:00 - 10:00",
      semestre: "5",
      color: "orange",
      descripcion: "Electromagnetismo, optica y resolucion de problemas aplicados.",
      materiales: [
        { id: "m8", nombre: "Laboratorio 3", tipo: "Documento" },
        { id: "m9", nombre: "Resumen de ondas", tipo: "PDF" },
      ],
    },
    {
      id: "course-soft",
      nombre: "Ingenieria de Software",
      docente: "Ing. Roberto Silva",
      horario: "Jue, Vie 14:00 - 16:00",
      semestre: "5",
      color: "red",
      descripcion: "Metodologias agiles, levantamiento de requisitos y trabajo colaborativo.",
      materiales: [{ id: "m10", nombre: "Plantilla de backlog", tipo: "Documento" }],
    },
  ];

  const tareas: Tarea[] = [
    {
      id: "task-1",
      cursoId: "course-bd",
      titulo: "Proyecto final - Parte 2",
      descripcion: "Completar el modelo logico y consultas del caso final.",
      fechaEntrega: format(addDays(hoy, 3), "yyyy-MM-dd"),
      prioridad: "high",
      estado: "in-progress",
      horasEstimadas: 3,
      progreso: 40,
    },
    {
      id: "task-2",
      cursoId: "course-prog",
      titulo: "Implementar API REST",
      descripcion: "Completar endpoints de autenticacion y pruebas basicas.",
      fechaEntrega: format(addDays(hoy, 2), "yyyy-MM-dd"),
      prioridad: "high",
      estado: "pending",
      horasEstimadas: 4,
      progreso: 15,
    },
  ];

  const examenes: Examen[] = [
    {
      id: "exam-1",
      cursoId: "course-bd",
      titulo: "Examen parcial 2",
      fecha: format(addDays(hoy, 3), "yyyy-MM-dd"),
      hora: "08:00",
      temas: ["Normalizacion", "SQL avanzado", "Transacciones"],
      preparacion: 75,
    },
    {
      id: "exam-2",
      cursoId: "course-prog",
      titulo: "Evaluacion de Programacion",
      fecha: format(addDays(hoy, 5), "yyyy-MM-dd"),
      hora: "10:00",
      temas: ["POO", "API REST", "Testing"],
      preparacion: 60,
    },
  ];

  const bloquesPlanificador: BloquePlanificador[] = [
    {
      id: "pb1",
      dia: 0,
      horaInicio: 8,
      duracion: 2,
      titulo: "Base de Datos",
      cursoId: "course-bd",
      color: "blue",
      tipo: "class",
    },
    {
      id: "pb2",
      dia: 1,
      horaInicio: 10,
      duracion: 2,
      titulo: "Programacion II",
      cursoId: "course-prog",
      color: "purple",
      tipo: "class",
    },
    {
      id: "pb3",
      dia: 2,
      horaInicio: 16,
      duracion: 1.5,
      titulo: "Repaso Base de Datos",
      cursoId: "course-bd",
      color: "blue",
      tipo: "study",
    },
  ];

  const notificaciones: NotificacionItem[] = [
    {
      id: "notif-1",
      tipo: "urgent",
      titulo: "Manana tienes examen de Base de Datos",
      mensaje: "Tu examen parcial es manana a las 08:00. Prioriza SQL avanzado y normalizacion.",
      creadaEn: new Date(hoy.getTime() - 1000 * 60 * 60).toISOString(),
      noLeida: true,
    },
    {
      id: "notif-2",
      tipo: "warning",
      titulo: "Tu tarea de Programacion vence en 2 dias",
      mensaje: "La tarea Implementar API REST va en 15%. Te conviene avanzar hoy.",
      creadaEn: new Date(hoy.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      noLeida: true,
    },
  ];

  const mensajesChat: MensajeChat[] = [
    {
      id: "chat-1",
      tipo: "ai",
      mensaje:
        "Hola, Jhan 😊 Todo bien. Ya revise tus cursos, tareas y examenes, asi que de una puedo ayudarte a organizar tu semana, resumir temas o armarte un plan de estudio bacan.",
      hora: "10:30",
    },
  ];

  return {
    usuarioActual: usuario,
    cursos,
    tareas,
    examenes,
    bloquesPlanificador,
    notificaciones,
    mensajesChat,
    fuenteAsistente: null,
  };
}

function normalizarTareas(tareas: Tarea[]) {
  const hoy = startOfToday();
  return tareas.map((tarea) => {
    if (tarea.estado === "completed") {
      return { ...tarea, progreso: 100 };
    }

    const diasRestantes = differenceInCalendarDays(parseISO(tarea.fechaEntrega), hoy);
    if (diasRestantes < 0) {
      return { ...tarea, estado: "overdue" as const };
    }

    return tarea;
  });
}

function generarHorarioDesdeEstado(estado: EstadoStudyFlow) {
  const examenesOrdenados = [...estado.examenes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const tareasOrdenadas = [...estado.tareas]
    .filter((tarea) => tarea.estado !== "completed")
    .sort((a, b) => {
      const pesoPrioridad = { high: 0, medium: 1, low: 2 };
      return (
        pesoPrioridad[a.prioridad] - pesoPrioridad[b.prioridad] ||
        a.fechaEntrega.localeCompare(b.fechaEntrega)
      );
    });

  const bloques: BloquePlanificador[] = [];
  let diaActual = 0;
  const horaActual = 16;

  examenesOrdenados.slice(0, 3).forEach((examen) => {
    const curso = estado.cursos.find((item) => item.id === examen.cursoId);
    bloques.push({
      id: crearId("planner"),
      dia: diaActual,
      horaInicio: horaActual,
      duracion: 1.5,
      titulo: `Repaso ${curso?.nombre ?? "examen"}`,
      cursoId: examen.cursoId,
      color: curso?.color ?? "blue",
      tipo: "study",
    });
    diaActual = (diaActual + 1) % 7;
  });

  tareasOrdenadas.slice(0, 4).forEach((tarea) => {
    const curso = estado.cursos.find((item) => item.id === tarea.cursoId);
    bloques.push({
      id: crearId("planner"),
      dia: diaActual,
      horaInicio: horaActual,
      duracion: Math.min(Math.max(tarea.horasEstimadas, 1), 2),
      titulo: tarea.titulo,
      cursoId: tarea.cursoId,
      color: curso?.color ?? "purple",
      tipo: "study",
    });
    diaActual = (diaActual + 1) % 7;
  });

  return [...estado.bloquesPlanificador.filter((bloque) => bloque.tipo === "class"), ...bloques];
}

function integrarContexto(estadoActual: EstadoStudyFlow, contexto: ContextoApi) {
  return {
    ...estadoActual,
    usuarioActual: estadoActual.usuarioActual
      ? {
          ...estadoActual.usuarioActual,
          nombres: contexto.usuario?.nombres ?? estadoActual.usuarioActual.nombres,
          apellidos: contexto.usuario?.apellidos ?? estadoActual.usuarioActual.apellidos,
          correo: contexto.usuario?.correo ?? estadoActual.usuarioActual.correo,
          universidad: contexto.usuario?.universidad ?? estadoActual.usuarioActual.universidad,
          carrera: contexto.usuario?.carrera ?? estadoActual.usuarioActual.carrera,
          semestre: contexto.usuario?.semestre ?? estadoActual.usuarioActual.semestre,
          plan: contexto.usuario?.plan ?? estadoActual.usuarioActual.plan,
          horasDisponibles:
            contexto.usuario?.horasDisponibles ?? estadoActual.usuarioActual.horasDisponibles,
          metodoEstudio:
            contexto.usuario?.metodoEstudio ?? estadoActual.usuarioActual.metodoEstudio,
          tonoAsistente:
            contexto.usuario?.tonoAsistente ?? estadoActual.usuarioActual.tonoAsistente,
          metas: contexto.usuario?.metas ?? estadoActual.usuarioActual.metas,
          horasEstudioDiarias:
            contexto.usuario?.horasEstudioDiarias ?? estadoActual.usuarioActual.horasEstudioDiarias,
          horasSueno: contexto.usuario?.horasSueno ?? estadoActual.usuarioActual.horasSueno,
          notificaciones:
            contexto.usuario?.notificaciones ?? estadoActual.usuarioActual.notificaciones,
          aplicacion: contexto.usuario?.aplicacion ?? estadoActual.usuarioActual.aplicacion,
        }
      : estadoActual.usuarioActual,
    cursos: contexto.cursos.map((curso) => ({
      ...curso,
      materiales: estadoActual.cursos.find((item) => item.id === curso.id)?.materiales ?? [],
    })),
    tareas: normalizarTareas(contexto.tareas),
    examenes: contexto.examenes,
    bloquesPlanificador: contexto.bloquesPlanificador,
    notificaciones: contexto.notificaciones,
    mensajesChat: contexto.mensajesChat,
  };
}

const StudyFlowContext = createContext<ValorContextoStudyFlow | null>(null);

export function StudyFlowProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoStudyFlow>(() => {
    if (typeof window === "undefined") {
      return crearEstadoInicial();
    }

    const guardado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!guardado) {
      return crearEstadoInicial();
    }

    try {
      const parseado = JSON.parse(guardado) as EstadoStudyFlow;
      return {
        ...parseado,
        tareas: normalizarTareas(parseado.tareas ?? []),
      };
    } catch {
      return crearEstadoInicial();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(estado));
  }, [estado]);

  useEffect(() => {
    if (!estado.usuarioActual?.id) return;

    api
      .obtenerContexto(estado.usuarioActual.id)
      .then((contexto) => {
        setEstado((actual) => integrarContexto(actual, contexto));
      })
      .catch(() => {
        // Mantiene fallback local si la API aun no esta disponible.
      });
  }, [estado.usuarioActual?.id]);

  const valor = useMemo<ValorContextoStudyFlow>(() => {
    const obtenerCursoPorId = (cursoId?: string) =>
      estado.cursos.find((curso) => curso.id === cursoId);

    const persistirNotificacion = (estudianteId: string, temporal: NotificacionItem) => {
      api
        .crearNotificacion({
          estudianteId,
          tipo: temporal.tipo,
          titulo: temporal.titulo,
          mensaje: temporal.mensaje,
          noLeida: temporal.noLeida,
        })
        .then((notificacion) => {
          setEstado((actual) => ({
            ...actual,
            notificaciones: actual.notificaciones.map((item) =>
              item.id === temporal.id ? notificacion : item,
            ),
          }));
        })
        .catch(() => {});
    };

    return {
      ...estado,
      obtenerCursoPorId,
      sincronizarConBackend: async () => {
        if (!estado.usuarioActual?.id) return;
        const contexto = await api.obtenerContexto(estado.usuarioActual.id);
        setEstado((actual) => integrarContexto(actual, contexto));
      },
      iniciarSesion: async (correo, contrasena) => {
        try {
          const resultado = await api.iniciarSesion({ correo, contrasena });
          const usuario = resultado.usuario;
          if (!usuario) {
            return false;
          }

          setEstado((actual) => ({
            ...actual,
            usuarioActual: normalizarUsuarioApi(usuario, {
              contrasena,
              base: actual.usuarioActual,
            }),
          }));

          return true;
        } catch (error) {
          if (!esErrorConexion(error)) {
            return false;
          }

          const coincide =
            estado.usuarioActual &&
            estado.usuarioActual.correo.toLowerCase() === correo.toLowerCase() &&
            estado.usuarioActual.contrasena === contrasena;

          return Boolean(coincide);
        }
      },
      registrarUsuario: async (datos) => {
        const [nombres, ...restoApellidos] = datos.name.trim().split(" ");

        try {
          const resultado = await api.registrarUsuario({
            nombres: nombres || "Estudiante",
            apellidos: restoApellidos.join(" "),
            correo: datos.email,
            contrasena: datos.password,
            universidad: datos.university,
            carrera: datos.career,
            semestre: datos.semester,
            plan: datos.plan,
          });

          const siguienteUsuario = normalizarUsuarioApi(resultado.usuario, {
            contrasena: datos.password,
          });
          const notificacionBienvenida: NotificacionItem = {
            id: crearId("notif"),
            tipo: "success",
            titulo: "Bienvenido a StudyFlow AI",
            mensaje: "Tu perfil fue creado y tu panel academico esta listo para empezar.",
            creadaEn: new Date().toISOString(),
            noLeida: true,
          };

          setEstado((actual) => ({
            ...actual,
            usuarioActual: siguienteUsuario,
            cursos: [],
            tareas: [],
            examenes: [],
            bloquesPlanificador: [],
            mensajesChat: [],
            notificaciones: [notificacionBienvenida, ...actual.notificaciones],
          }));

          persistirNotificacion(siguienteUsuario.id, notificacionBienvenida);
          return true;
        } catch (error) {
          if (!esErrorConexion(error)) {
            return false;
          }

          const siguienteUsuario: PerfilUsuario = {
            ...crearPerfilBase(),
            id: crearId("user"),
            nombres: nombres || "Estudiante",
            apellidos: restoApellidos.join(" "),
            correo: datos.email,
            contrasena: datos.password,
            universidad: datos.university,
            carrera: datos.career,
            semestre: datos.semester,
            plan: datos.plan,
          };

          setEstado((actual) => ({
            ...actual,
            usuarioActual: siguienteUsuario,
          }));

          return true;
        }
      },
      cerrarSesion: () => {
        setEstado((actual) => ({ ...actual, usuarioActual: null }));
      },
      actualizarPerfil: (cambios) => {
        setEstado((actual) => ({
          ...actual,
          usuarioActual: actual.usuarioActual ? { ...actual.usuarioActual, ...cambios } : null,
        }));

        if (estado.usuarioActual?.id) {
          api
            .actualizarPerfil(estado.usuarioActual.id, cambios)
            .then((resultado) => {
              setEstado((actual) => ({
                ...actual,
                usuarioActual: actual.usuarioActual
                  ? normalizarUsuarioApi(resultado.usuario, {
                      contrasena: actual.usuarioActual.contrasena,
                      base: actual.usuarioActual,
                    })
                  : actual.usuarioActual,
              }));
            })
            .catch(() => {});
        }
      },
      agregarTarea: (tarea) => {
        const curso = obtenerCursoPorId(tarea.cursoId);
        const tareaLocal: Tarea = {
          ...tarea,
          id: crearId("task"),
          estado: tarea.estado ?? "pending",
          progreso: tarea.progreso ?? 0,
        };
        const notificacionLocal: NotificacionItem = {
          id: crearId("notif"),
          tipo: "info",
          titulo: "Nueva tarea creada",
          mensaje: `Se agrego "${tarea.titulo}" para ${curso?.nombre ?? "tu curso"}.`,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        setEstado((actual) => ({
          ...actual,
          tareas: [tareaLocal, ...actual.tareas],
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        if (estado.usuarioActual?.id) {
          api
            .crearTarea({
              estudianteId: estado.usuarioActual.id,
              cursoId: tarea.cursoId,
              titulo: tarea.titulo,
              descripcion: tarea.descripcion,
              fechaEntrega: tarea.fechaEntrega,
              prioridad: tarea.prioridad,
              horasEstimadas: tarea.horasEstimadas,
            })
            .then((nuevaTarea) => {
              setEstado((actual) => ({
                ...actual,
                tareas: normalizarTareas(
                  actual.tareas.map((item) => (item.id === tareaLocal.id ? nuevaTarea : item)),
                ),
              }));
            })
            .catch(() => {});

          persistirNotificacion(estado.usuarioActual.id, notificacionLocal);
        }
      },
      actualizarTarea: (tareaId, cambios) => {
        setEstado((actual) => ({
          ...actual,
          tareas: normalizarTareas(
            actual.tareas.map((tarea) => (tarea.id === tareaId ? { ...tarea, ...cambios } : tarea)),
          ),
        }));

        api.actualizarTarea(tareaId, cambios).catch(() => {});
      },
      alternarTareaCompletada: (tareaId) => {
        const tareaActual = estado.tareas.find((item) => item.id === tareaId);
        const notificacionLocal =
          tareaActual && estado.usuarioActual?.id
            ? {
                id: crearId("notif"),
                tipo: "success" as const,
                titulo: tareaActual.estado === "completed" ? "Tarea reabierta" : "Tarea completada",
                mensaje: `"${tareaActual.titulo}" actualizo su estado en tu panel academico.`,
                creadaEn: new Date().toISOString(),
                noLeida: true,
              }
            : null;

        setEstado((actual) => ({
          ...actual,
          tareas: normalizarTareas(
            actual.tareas.map((item) =>
              item.id === tareaId
                ? {
                    ...item,
                    estado: item.estado === "completed" ? "pending" : "completed",
                    progreso: item.estado === "completed" ? Math.max(item.progreso, 0) : 100,
                  }
                : item,
            ),
          ),
          notificaciones: notificacionLocal
            ? [notificacionLocal, ...actual.notificaciones]
            : actual.notificaciones,
        }));

        if (tareaActual) {
          api
            .actualizarTarea(tareaId, {
              estado: tareaActual.estado === "completed" ? "pending" : "completed",
              progreso: tareaActual.estado === "completed" ? tareaActual.progreso : 100,
            })
            .catch(() => {});

          if (estado.usuarioActual?.id && notificacionLocal) {
            persistirNotificacion(estado.usuarioActual.id, notificacionLocal);
          }
        }
      },
      agregarCurso: (curso) => {
        const cursoLocal: Curso = {
          ...curso,
          id: crearId("course"),
          materiales: curso.materiales ?? [],
        };

        setEstado((actual) => ({
          ...actual,
          cursos: [cursoLocal, ...actual.cursos],
        }));

        if (estado.usuarioActual?.id) {
          api
            .crearCurso({
              estudianteId: estado.usuarioActual.id,
              nombre: curso.nombre,
              docente: curso.docente,
              horario: curso.horario,
              semestre: curso.semestre,
              color: curso.color,
              descripcion: curso.descripcion,
            })
            .then((cursoBackend) => {
              setEstado((actual) => ({
                ...actual,
                cursos: actual.cursos.map((item) =>
                  item.id === cursoLocal.id
                    ? { ...cursoBackend, materiales: item.materiales }
                    : item,
                ),
              }));
            })
              .catch(() => {});
          }
        },
      actualizarCurso: (cursoId, cambios) => {
        setEstado((actual) => ({
          ...actual,
          cursos: actual.cursos.map((curso) => (curso.id === cursoId ? { ...curso, ...cambios } : curso)),
        }));

        api.actualizarCurso(cursoId, cambios).catch(() => {});
      },
      eliminarCurso: (cursoId) => {
        setEstado((actual) => ({
          ...actual,
          cursos: actual.cursos.filter((curso) => curso.id !== cursoId),
          tareas: actual.tareas.filter((tarea) => tarea.cursoId !== cursoId),
          examenes: actual.examenes.filter((examen) => examen.cursoId !== cursoId),
          bloquesPlanificador: actual.bloquesPlanificador.filter((bloque) => bloque.cursoId !== cursoId),
        }));

        api.eliminarCurso(cursoId).catch(() => {});
      },
      agregarExamen: (examen) => {
        const examenLocal: Examen = { ...examen, id: crearId("exam") };
        setEstado((actual) => ({
          ...actual,
          examenes: [...actual.examenes, examenLocal].sort((a, b) => a.fecha.localeCompare(b.fecha)),
        }));

        if (estado.usuarioActual?.id) {
          api
            .crearExamen({
              estudianteId: estado.usuarioActual.id,
              cursoId: examen.cursoId,
              titulo: examen.titulo,
              fecha: examen.fecha,
              hora: examen.hora,
              temas: examen.temas,
              preparacion: examen.preparacion,
            })
            .then((examenBackend) => {
              setEstado((actual) => ({
                ...actual,
                examenes: actual.examenes
                  .map((item) => (item.id === examenLocal.id ? examenBackend : item))
                  .sort((a, b) => a.fecha.localeCompare(b.fecha)),
              }));
            })
            .catch(() => {});
        }
      },
      actualizarExamen: (examenId, cambios) => {
        setEstado((actual) => ({
          ...actual,
          examenes: actual.examenes
            .map((examen) => (examen.id === examenId ? { ...examen, ...cambios } : examen))
            .sort((a, b) => a.fecha.localeCompare(b.fecha)),
        }));

        api.actualizarExamen(examenId, cambios).catch(() => {});
      },
      eliminarExamen: (examenId) => {
        setEstado((actual) => ({
          ...actual,
          examenes: actual.examenes.filter((examen) => examen.id !== examenId),
        }));

        api.eliminarExamen(examenId).catch(() => {});
      },
      marcarNotificacionLeida: (notificacionId) => {
        setEstado((actual) => ({
          ...actual,
          notificaciones: actual.notificaciones.map((notificacion) =>
            notificacion.id === notificacionId ? { ...notificacion, noLeida: false } : notificacion,
          ),
        }));

        api.actualizarNotificacion(notificacionId, { noLeida: false }).catch(() => {});
      },
      marcarTodasNotificacionesLeidas: () => {
        setEstado((actual) => ({
          ...actual,
          notificaciones: actual.notificaciones.map((notificacion) => ({
            ...notificacion,
            noLeida: false,
          })),
        }));

        if (estado.usuarioActual?.id) {
          api.marcarTodasLasNotificacionesLeidas(estado.usuarioActual.id).catch(() => {});
        }
      },
      limpiarNotificacionesLeidas: () => {
        setEstado((actual) => ({
          ...actual,
          notificaciones: actual.notificaciones.filter((notificacion) => notificacion.noLeida),
        }));

        if (estado.usuarioActual?.id) {
          api.limpiarNotificacionesLeidas(estado.usuarioActual.id).catch(() => {});
        }
      },
      enviarMensajeAsistente: (mensaje) => {
        const mensajeUsuario: MensajeChat = {
          id: crearId("chat"),
          tipo: "user",
          mensaje,
          hora: formatearHoraChat(),
        };
        const mensajeTemporal: MensajeChat = {
          id: crearId("chat"),
          tipo: "ai",
          mensaje: "Pensando tu respuesta con Groq...",
          hora: formatearHoraChat(),
        };

        setEstado((actual) => ({
          ...actual,
          fuenteAsistente: null,
          mensajesChat: [...actual.mensajesChat, mensajeUsuario, mensajeTemporal],
        }));

        if (estado.usuarioActual?.id) {
          api
            .enviarMensajeAsistente(estado.usuarioActual.id, mensaje)
            .then((resultado) => {
              setEstado((actual) => ({
                ...actual,
                fuenteAsistente: resultado.fuente,
                mensajesChat: [
                  ...actual.mensajesChat.filter(
                    (item) => item.id !== mensajeUsuario.id && item.id !== mensajeTemporal.id,
                  ),
                  ...resultado.mensajes,
                ],
              }));
            })
            .catch((error) => {
              const detalle =
                error instanceof Error
                  ? error.message.replace(/^"|"$/g, "")
                  : "No se pudo conectar con Groq.";

              setEstado((actual) => ({
                ...actual,
                fuenteAsistente: "error",
                mensajesChat: [
                  ...actual.mensajesChat.filter((item) => item.id !== mensajeTemporal.id),
                  {
                    id: crearId("chat"),
                    tipo: "ai",
                    mensaje: `No pude obtener respuesta real de Groq.\n\nDetalle: ${detalle}`,
                    hora: formatearHoraChat(),
                  },
                ],
              }));
            });
        } else {
          setEstado((actual) => ({
            ...actual,
            fuenteAsistente: "error",
            mensajesChat: [
              ...actual.mensajesChat.filter((item) => item.id !== mensajeTemporal.id),
              {
                id: crearId("chat"),
                tipo: "ai",
                mensaje: "Inicia sesion para usar el asistente con Groq.",
                hora: formatearHoraChat(),
              },
            ],
          }));
        }
      },
      limpiarMensajesAsistente: () => {
        setEstado((actual) => ({
          ...actual,
          fuenteAsistente: null,
          mensajesChat: [],
        }));

        if (estado.usuarioActual?.id) {
          api.limpiarMensajesAsistente(estado.usuarioActual.id).catch(() => {});
        }
      },
      generarHorarioInteligente: () => {
        return;
      },
      moverBloquePlanificador: (bloqueId, dia, horaInicio) => {
        const bloquesActualizados = estado.bloquesPlanificador.map((bloque) =>
          bloque.id === bloqueId ? { ...bloque, dia, horaInicio } : bloque,
        );

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.map((bloque) =>
            bloque.id === bloqueId ? { ...bloque, dia, horaInicio } : bloque,
          ),
        }));

        if (estado.usuarioActual?.id) {
          api.guardarPlanificador(estado.usuarioActual.id, bloquesActualizados).then((resultado) => {
            setEstado((actual) => ({
              ...actual,
              bloquesPlanificador: resultado.bloques,
            }));
          }).catch(() => {});
        }
      },
      actualizarBloquePlanificador: (bloqueId, cambios) => {
        const bloquesActualizados = estado.bloquesPlanificador.map((bloque) =>
          bloque.id === bloqueId ? { ...bloque, ...cambios } : bloque,
        );

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.map((bloque) =>
            bloque.id === bloqueId ? { ...bloque, ...cambios } : bloque,
          ),
        }));

        if (estado.usuarioActual?.id) {
          api
            .guardarPlanificador(estado.usuarioActual.id, bloquesActualizados)
            .then((resultado) => {
              setEstado((actual) => ({
                ...actual,
                bloquesPlanificador: resultado.bloques,
              }));
            })
            .catch(() => {});
        }
      },
      eliminarBloquePlanificador: (bloqueId) => {
        const bloquesActualizados = estado.bloquesPlanificador.filter((bloque) => bloque.id !== bloqueId);

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.filter((bloque) => bloque.id !== bloqueId),
        }));

        if (estado.usuarioActual?.id) {
          api
            .guardarPlanificador(estado.usuarioActual.id, bloquesActualizados)
            .then((resultado) => {
              setEstado((actual) => ({
                ...actual,
                bloquesPlanificador: resultado.bloques,
              }));
            })
            .catch(() => {});
        }
      },
    };
  }, [estado]);

  return <StudyFlowContext.Provider value={valor}>{children}</StudyFlowContext.Provider>;
}

export function useStudyFlow() {
  const contexto = useContext(StudyFlowContext);
  if (!contexto) {
    throw new Error("useStudyFlow must be used inside StudyFlowProvider");
  }

  return contexto;
}

export function formatearFechaLarga(fecha: string) {
  return format(parseISO(fecha), "dd 'de' MMM");
}

export function formatearFechaCorta(fecha: string) {
  return format(parseISO(fecha), "dd MMM yyyy");
}

export function obtenerDiasRestantes(fecha: string) {
  return differenceInCalendarDays(parseISO(fecha), startOfToday());
}

export function obtenerEstadoVisualTarea(tarea: Tarea): EstadoTarea {
  if (tarea.estado === "completed") {
    return "completed";
  }
  if (parseISO(tarea.fechaEntrega) < startOfToday()) {
    return "overdue";
  }
  return tarea.estado;
}

export function obtenerTiempoRelativoNotificacion(creadaEn: string) {
  const fecha = new Date(creadaEn);
  const diferenciaMs = Date.now() - fecha.getTime();
  const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));

  if (horas < 1) return "Hace menos de 1 hora";
  if (horas < 24) return `Hace ${horas} hora${horas === 1 ? "" : "s"}`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "Ayer";
  return `Hace ${dias} dias`;
}

export function obtenerEtiquetaDiaPlanificador(dia: number) {
  return etiquetasDias[dia] ?? "";
}

export function esTareaParaHoy(tarea: Tarea) {
  return isSameDay(parseISO(tarea.fechaEntrega), startOfToday());
}

export function obtenerPorcentajeCumplimiento(tareas: Tarea[]) {
  if (!tareas.length) return 0;
  return Math.round((tareas.filter((tarea) => tarea.estado === "completed").length / tareas.length) * 100);
}

export function obtenerColorValor(color: string) {
  return obtenerColorCurso(color);
}
