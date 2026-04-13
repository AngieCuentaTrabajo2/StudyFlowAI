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
import { construirBloquesClaseDesdeCurso } from "./course-schedule";

export type Prioridad = "low" | "medium" | "high";
export type EstadoTarea = "pending" | "in-progress" | "completed" | "overdue";
export type TipoNotificacion = "urgent" | "warning" | "info" | "success";
export type JornadaPlanificacion = "manana" | "tarde" | "noche" | "flexible";
export type AlcancePlanificacion = "todo" | "tarea" | "curso";

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

export type AlertaInteligente = {
  id: string;
  titulo: string;
  descripcion: string;
  nivel: "critica" | "alta" | "media";
  tipo: "tarea" | "examen";
  destino: string;
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

type ResultadoInicioSesionGoogle = "ok" | "completar-perfil" | "error";

type ValorContextoStudyFlow = EstadoStudyFlow & {
  requiereCompletarPerfilAcademico: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<boolean>;
  iniciarSesionConGoogle: (credential: string) => Promise<ResultadoInicioSesionGoogle>;
  registrarUsuario: (datos: DatosRegistro) => Promise<boolean>;
  cerrarSesion: () => void;
  actualizarPerfil: (cambios: Partial<PerfilUsuario>) => void;
  completarPerfilAcademico: (datos: {
    universidad: string;
    carrera: string;
    semestre: string;
  }) => Promise<boolean>;
  agregarTarea: (
    tarea: Omit<Tarea, "id" | "estado" | "progreso"> & { estado?: EstadoTarea; progreso?: number },
  ) => void;
  actualizarTarea: (tareaId: string, cambios: Partial<Tarea>) => void;
  alternarTareaCompletada: (tareaId: string) => void;
  agendarTareaEnCalendario: (
    tareaId: string,
    horas: number,
  ) => { ok: boolean; mensaje: string; horasProgramadas: number };
  agendarRepasoCurso: (
    cursoId: string,
    horas: number,
  ) => { ok: boolean; mensaje: string; horasProgramadas: number };
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
  anexarMensajesAsistenteLocales: (
    mensajes: Array<{ tipo: "user" | "ai"; mensaje: string }>,
    fuente?: EstadoStudyFlow["fuenteAsistente"],
  ) => void;
  limpiarMensajesAsistente: () => void;
  generarHorarioInteligente: () => void;
  replanificarHorarioInteligente: (configuracion: {
    alcance: AlcancePlanificacion;
    objetivoId?: string;
    diasBloqueados: number[];
    jornada: JornadaPlanificacion;
  }) => ResultadoPlanificacionInteligente;
  moverBloquePlanificador: (bloqueId: string, dia: number, horaInicio: number) => void;
  actualizarBloquePlanificador: (bloqueId: string, cambios: Partial<BloquePlanificador>) => void;
  eliminarBloquePlanificador: (bloqueId: string) => void;
  obtenerCursoPorId: (cursoId?: string) => Curso | undefined;
  sincronizarConBackend: () => Promise<void>;
};

const CLAVE_ALMACENAMIENTO = "studyflow-ai-state-v1";
const etiquetasDias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const HORA_MIN_PLANIFICADOR = 7;
const HORA_MAX_PLANIFICADOR = 23;
const HORAS_PREFERIDAS_REPASO = [18, 19, 20, 16, 17, 14, 15, 10, 11, 12, 13, 8, 9, 21, 7];
const HORAS_PLANIFICACION_POR_JORNADA: Record<JornadaPlanificacion, number[]> = {
  manana: [8, 9, 10, 11],
  tarde: [14, 15, 16, 17, 18],
  noche: [18, 19, 20, 21],
  flexible: HORAS_PREFERIDAS_REPASO,
};
const CUENTA_DEMO = {
  correo: "jhan.perez@universidad.edu",
  contrasena: "123456",
};

type ObjetivoPlanificacionAutomatica = {
  clave: string;
  titulo: string;
  cursoId: string;
  color: string;
  fechaObjetivo: string;
  horasSolicitadas: number;
  tipo: "tarea" | "repaso";
  resumen: string;
};

function tieneTextoPerfilAcademicoValido(valor: string | null | undefined) {
  return typeof valor === "string" && valor.trim().length > 0 && valor.trim().toLowerCase() !== "por definir";
}

function usuarioRequiereCompletarPerfilAcademico(
  usuario:
    | Pick<PerfilUsuario, "universidad" | "carrera" | "semestre">
    | Pick<UsuarioApi, "universidad" | "carrera" | "semestre">
    | null,
) {
  if (!usuario) return false;

  return !(
    tieneTextoPerfilAcademicoValido(usuario.universidad) &&
    tieneTextoPerfilAcademicoValido(usuario.carrera) &&
    tieneTextoPerfilAcademicoValido(usuario.semestre)
  );
}

function crearId(prefijo: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (caracter) => {
    const random = Math.floor(Math.random() * 16);
    const valor = caracter === "x" ? random : (random & 0x3) | 0x8;
    return valor.toString(16);
  });
}

function ordenarBloquesPlanificador(bloques: BloquePlanificador[]) {
  return [...bloques].sort((a, b) => a.dia - b.dia || a.horaInicio - b.horaInicio);
}

function sincronizarBloquesClaseConCursos(cursos: Curso[], bloquesPlanificador: BloquePlanificador[]) {
  const bloquesNoClase = bloquesPlanificador.filter((bloque) => bloque.tipo !== "class");
  const bloquesClaseActuales = bloquesPlanificador.filter((bloque) => bloque.tipo === "class");
  const bloquesClaseDerivados = cursos.flatMap((curso) => {
    const bloquesDesdeHorario = construirBloquesClaseDesdeCurso(curso);
    if (bloquesDesdeHorario.length > 0) {
      return bloquesDesdeHorario;
    }

    return bloquesClaseActuales.filter((bloque) => bloque.cursoId === curso.id);
  });

  return ordenarBloquesPlanificador([
    ...bloquesNoClase,
    ...bloquesClaseDerivados,
  ]);
}

function obtenerDiaPlanificadorDesdeFecha(fecha: Date) {
  return (fecha.getDay() + 6) % 7;
}

function haySolapamientoBloque(
  bloques: BloquePlanificador[],
  dia: number,
  horaInicio: number,
  duracion: number,
) {
  const inicio = horaInicio;
  const fin = horaInicio + duracion;

  return bloques.some((bloque) => {
    if (bloque.dia !== dia) return false;
    const inicioExistente = bloque.horaInicio;
    const finExistente = bloque.horaInicio + bloque.duracion;
    return inicio < finExistente && fin > inicioExistente;
  });
}

function obtenerDiasCandidatosPlanificacion(fechaObjetivo: string) {
  const hoy = startOfToday();
  const fechaLimite = parseISO(fechaObjetivo);
  const diferencia = differenceInCalendarDays(fechaLimite, hoy);
  const cantidadDias = diferencia < 0 ? 7 : Math.min(diferencia + 1, 7);

  return Array.from({ length: cantidadDias }, (_, indice) =>
    obtenerDiaPlanificadorDesdeFecha(addDays(hoy, indice)),
  );
}

function obtenerHorasCandidatasRepaso(dia: number) {
  const ahora = new Date();
  const diaActual = obtenerDiaPlanificadorDesdeFecha(ahora);
  const horaActual = ahora.getHours();

  return HORAS_PREFERIDAS_REPASO.filter((hora) => (dia === diaActual ? hora > horaActual : true));
}

function obtenerHorasCandidatasSegunJornada(dia: number, jornada: JornadaPlanificacion) {
  const horasBase = HORAS_PLANIFICACION_POR_JORNADA[jornada] ?? HORAS_PREFERIDAS_REPASO;
  const ahora = new Date();
  const diaActual = obtenerDiaPlanificadorDesdeFecha(ahora);
  const horaActual = ahora.getHours();

  return horasBase.filter((hora) => (dia === diaActual ? hora > horaActual : true));
}

function obtenerHorasDeEstudioProgramadasEnDia(bloques: BloquePlanificador[], dia: number) {
  return bloques
    .filter((bloque) => bloque.dia === dia && bloque.tipo === "study")
    .reduce((acumulado, bloque) => acumulado + bloque.duracion, 0);
}

function calcularHorasRestantesTarea(tarea: Tarea) {
  const factorPendiente = Math.max(0.25, 1 - tarea.progreso / 100);
  return Math.max(1, Math.min(6, Math.ceil(tarea.horasEstimadas * factorPendiente)));
}

function calcularHorasRepasoExamen(examen: Examen) {
  if (examen.preparacion < 35) return 3;
  if (examen.preparacion < 70) return 2;
  return 1;
}

function limpiarBloquesEstudioSegunAlcance(
  bloques: BloquePlanificador[],
  alcance: AlcancePlanificacion,
  objetivo: { tarea?: Tarea | null; curso?: Curso | null },
) {
  if (alcance === "todo") {
    return bloques.filter((bloque) => bloque.tipo !== "study");
  }

  if (alcance === "tarea" && objetivo.tarea) {
    const tituloObjetivo = `Tarea: ${objetivo.tarea.titulo}`.trim().toLowerCase();
    return bloques.filter(
      (bloque) => bloque.tipo !== "study" || bloque.titulo.trim().toLowerCase() !== tituloObjetivo,
    );
  }

  if (alcance === "curso" && objetivo.curso) {
    const tituloObjetivo = `Repaso: ${objetivo.curso.nombre}`.trim().toLowerCase();
    return bloques.filter(
      (bloque) =>
        bloque.tipo !== "study" ||
        !(
          bloque.cursoId === objetivo.curso?.id &&
          bloque.titulo.trim().toLowerCase() === tituloObjetivo
        ),
    );
  }

  return bloques;
}

function construirObjetivosPlanificacionGlobal(
  cursos: Curso[],
  tareas: Tarea[],
  examenes: Examen[],
) {
  const objetivosTareas: ObjetivoPlanificacionAutomatica[] = tareas
    .filter((tarea) => esTareaActiva(tarea))
    .sort((a, b) => {
      const diferenciaFecha = a.fechaEntrega.localeCompare(b.fechaEntrega);
      if (diferenciaFecha !== 0) return diferenciaFecha;
      const prioridadValor = { high: 0, medium: 1, low: 2 };
      return prioridadValor[a.prioridad] - prioridadValor[b.prioridad];
    })
    .map((tarea) => {
      const curso = cursos.find((item) => item.id === tarea.cursoId);
      return {
        clave: `task-${tarea.id}`,
        titulo: `Tarea: ${tarea.titulo}`,
        cursoId: tarea.cursoId,
        color: curso?.color ?? "purple",
        fechaObjetivo: tarea.fechaEntrega,
        horasSolicitadas: calcularHorasRestantesTarea(tarea),
        tipo: "tarea",
        resumen: `${tarea.titulo} (${curso?.nombre ?? "Curso"})`,
      };
    });

  const examenesPorCurso = new Map<string, Examen>();
  examenes
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach((examen) => {
      if (!examenesPorCurso.has(examen.cursoId)) {
        examenesPorCurso.set(examen.cursoId, examen);
      }
    });

  const objetivosRepaso: ObjetivoPlanificacionAutomatica[] = [...examenesPorCurso.values()].map((examen) => {
    const curso = cursos.find((item) => item.id === examen.cursoId);
    return {
      clave: `review-${examen.cursoId}`,
      titulo: `Repaso: ${curso?.nombre ?? "Curso"}`,
      cursoId: examen.cursoId,
      color: curso?.color ?? "blue",
      fechaObjetivo: examen.fecha,
      horasSolicitadas: calcularHorasRepasoExamen(examen),
      tipo: "repaso",
      resumen: `Repaso de ${curso?.nombre ?? "curso"} por ${examen.titulo}`,
    };
  });

  return [...objetivosTareas, ...objetivosRepaso].sort((a, b) => {
    const diferenciaFecha = a.fechaObjetivo.localeCompare(b.fechaObjetivo);
    if (diferenciaFecha !== 0) return diferenciaFecha;
    if (a.tipo === b.tipo) return 0;
    return a.tipo === "tarea" ? -1 : 1;
  });
}

function programarObjetivosConRestricciones({
  objetivos,
  bloquesBase,
  horasDiariasMaximas,
  diasBloqueados,
  jornada,
}: {
  objetivos: ObjetivoPlanificacionAutomatica[];
  bloquesBase: BloquePlanificador[];
  horasDiariasMaximas: number;
  diasBloqueados: number[];
  jornada: JornadaPlanificacion;
}) {
  const bloquesProgramados: BloquePlanificador[] = [];
  const resumen: string[] = [];

  for (const objetivo of objetivos) {
    let horasRestantes = objetivo.horasSolicitadas;
    const diasCandidatos = obtenerDiasCandidatosPlanificacion(objetivo.fechaObjetivo).filter(
      (dia) => !diasBloqueados.includes(dia),
    );

    for (const dia of diasCandidatos) {
      for (const hora of obtenerHorasCandidatasSegunJornada(dia, jornada)) {
        if (horasRestantes <= 0) {
          break;
        }

        const bloquesOcupados = [...bloquesBase, ...bloquesProgramados];
        const horasEstudioDia = obtenerHorasDeEstudioProgramadasEnDia(bloquesOcupados, dia);
        const horasRestantesEnDia = Math.max(0, horasDiariasMaximas - horasEstudioDia);

        if (horasRestantesEnDia < 1) {
          continue;
        }

        let duracion = 0;

        if (
          horasRestantes >= 2 &&
          horasRestantesEnDia >= 2 &&
          hora + 2 <= HORA_MAX_PLANIFICADOR &&
          !haySolapamientoBloque(bloquesOcupados, dia, hora, 2)
        ) {
          duracion = 2;
        } else if (
          hora + 1 <= HORA_MAX_PLANIFICADOR &&
          !haySolapamientoBloque(bloquesOcupados, dia, hora, 1)
        ) {
          duracion = 1;
        }

        if (duracion === 0) {
          continue;
        }

        bloquesProgramados.push({
          id: crearId("planner"),
          dia,
          horaInicio: hora,
          duracion,
          titulo: objetivo.titulo,
          cursoId: objetivo.cursoId,
          color: objetivo.color,
          tipo: "study",
        });
        horasRestantes -= duracion;
      }

      if (horasRestantes <= 0) {
        break;
      }
    }

    const horasAsignadas = objetivo.horasSolicitadas - horasRestantes;
    if (horasAsignadas > 0) {
      resumen.push(
        horasAsignadas < objetivo.horasSolicitadas
          ? `${objetivo.resumen}: ${horasAsignadas}h reservadas de ${objetivo.horasSolicitadas}h.`
          : `${objetivo.resumen}: ${horasAsignadas}h reservadas.`,
      );
    } else {
      resumen.push(`${objetivo.resumen}: no encontre huecos libres con esas restricciones.`);
    }
  }

  return {
    bloques: bloquesProgramados,
    resumen,
    horasProgramadas: bloquesProgramados.reduce((acumulado, bloque) => acumulado + bloque.duracion, 0),
  };
}

function programarBloquesAutomaticos(
  configuracion: {
    titulo: string;
    cursoId: string;
    color: string;
    fechaObjetivo: string;
  },
  bloquesActuales: BloquePlanificador[],
  horasSolicitadas: number,
) {
  const bloquesProgramados: BloquePlanificador[] = [];
  let horasRestantes = Math.max(1, Math.round(horasSolicitadas));

  for (const dia of obtenerDiasCandidatosPlanificacion(configuracion.fechaObjetivo)) {
    for (const hora of obtenerHorasCandidatasRepaso(dia)) {
      if (horasRestantes <= 0) {
        break;
      }

      const bloquesOcupados = [...bloquesActuales, ...bloquesProgramados];
      let duracion = 0;

      if (horasRestantes >= 2 && hora + 2 <= HORA_MAX_PLANIFICADOR && !haySolapamientoBloque(bloquesOcupados, dia, hora, 2)) {
        duracion = 2;
      } else if (hora + 1 <= HORA_MAX_PLANIFICADOR && !haySolapamientoBloque(bloquesOcupados, dia, hora, 1)) {
        duracion = 1;
      }

      if (duracion === 0) {
        continue;
      }

      bloquesProgramados.push({
        id: crearId("planner"),
        dia,
        horaInicio: hora,
        duracion,
        titulo: configuracion.titulo,
        cursoId: configuracion.cursoId,
        color: configuracion.color,
        tipo: "study",
      });
      horasRestantes -= duracion;
    }

    if (horasRestantes <= 0) {
      break;
    }
  }

  return {
    bloques: bloquesProgramados,
    horasProgramadas: Math.max(0, Math.round(horasSolicitadas) - horasRestantes),
  };
}

function obtenerFechaObjetivoCurso(cursoId: string, tareas: Tarea[], examenes: Examen[]) {
  const hoy = startOfToday();
  const candidatos = [
    ...tareas
      .filter((tarea) => tarea.cursoId === cursoId && obtenerEstadoVisualTarea(tarea) !== "completed")
      .map((tarea) => tarea.fechaEntrega),
    ...examenes
      .filter((examen) => differenceInCalendarDays(parseISO(examen.fecha), hoy) >= 0 && examen.cursoId === cursoId)
      .map((examen) => examen.fecha),
  ].sort();

  return candidatos[0] ?? format(addDays(hoy, 7), "yyyy-MM-dd");
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
    universidad: "Universidad Nacional de Ingenieria",
    carrera: "Ingenieria de Sistemas",
    semestre: "5",
    plan: "premium",
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
  opciones?: { base?: PerfilUsuario | null },
): PerfilUsuario {
  const base = opciones?.base ?? crearPerfilBase();

  return {
    ...base,
    ...usuario,
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

function normalizarUsuarioPersistido(usuario: unknown): PerfilUsuario | null {
  if (!usuario || typeof usuario !== "object") {
    return null;
  }

  const base = crearPerfilBase();
  const candidato = usuario as Partial<PerfilUsuario>;

  return {
    id: typeof candidato.id === "string" ? candidato.id : base.id,
    nombres: typeof candidato.nombres === "string" ? candidato.nombres : base.nombres,
    apellidos: typeof candidato.apellidos === "string" ? candidato.apellidos : base.apellidos,
    correo: typeof candidato.correo === "string" ? candidato.correo : base.correo,
    universidad: typeof candidato.universidad === "string" ? candidato.universidad : base.universidad,
    carrera: typeof candidato.carrera === "string" ? candidato.carrera : base.carrera,
    semestre: typeof candidato.semestre === "string" ? candidato.semestre : base.semestre,
    plan:
      candidato.plan === "gratis" || candidato.plan === "estudiante" || candidato.plan === "premium"
        ? candidato.plan
        : base.plan,
    horasDisponibles:
      typeof candidato.horasDisponibles === "string"
        ? candidato.horasDisponibles
        : base.horasDisponibles,
    metodoEstudio:
      typeof candidato.metodoEstudio === "string" ? candidato.metodoEstudio : base.metodoEstudio,
    tonoAsistente:
      candidato.tonoAsistente === "frio" ||
      candidato.tonoAsistente === "amigable" ||
      candidato.tonoAsistente === "responsable"
        ? candidato.tonoAsistente
        : base.tonoAsistente,
    metas: typeof candidato.metas === "string" ? candidato.metas : base.metas,
    horasEstudioDiarias:
      typeof candidato.horasEstudioDiarias === "number"
        ? candidato.horasEstudioDiarias
        : base.horasEstudioDiarias,
    horasSueno: typeof candidato.horasSueno === "number" ? candidato.horasSueno : base.horasSueno,
    notificaciones:
      candidato.notificaciones && typeof candidato.notificaciones === "object"
        ? {
            tareas:
              typeof candidato.notificaciones.tareas === "boolean"
                ? candidato.notificaciones.tareas
                : base.notificaciones.tareas,
            examenes:
              typeof candidato.notificaciones.examenes === "boolean"
                ? candidato.notificaciones.examenes
                : base.notificaciones.examenes,
            ia:
              typeof candidato.notificaciones.ia === "boolean"
                ? candidato.notificaciones.ia
                : base.notificaciones.ia,
            semanal:
              typeof candidato.notificaciones.semanal === "boolean"
                ? candidato.notificaciones.semanal
                : base.notificaciones.semanal,
            correo:
              typeof candidato.notificaciones.correo === "boolean"
                ? candidato.notificaciones.correo
                : base.notificaciones.correo,
          }
        : base.notificaciones,
    aplicacion:
      candidato.aplicacion && typeof candidato.aplicacion === "object"
        ? {
            modoOscuro:
              typeof candidato.aplicacion.modoOscuro === "boolean"
                ? candidato.aplicacion.modoOscuro
                : base.aplicacion.modoOscuro,
            googleCalendar:
              typeof candidato.aplicacion.googleCalendar === "boolean"
                ? candidato.aplicacion.googleCalendar
                : base.aplicacion.googleCalendar,
            sugerenciasAutomaticas:
              typeof candidato.aplicacion.sugerenciasAutomaticas === "boolean"
                ? candidato.aplicacion.sugerenciasAutomaticas
                : base.aplicacion.sugerenciasAutomaticas,
          }
        : base.aplicacion,
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
    bloquesPlanificador: sincronizarBloquesClaseConCursos(cursos, bloquesPlanificador),
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
  const cursos = contexto.cursos.map((curso) => ({
    ...curso,
    materiales: estadoActual.cursos.find((item) => item.id === curso.id)?.materiales ?? [],
  }));

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
    cursos,
    tareas: normalizarTareas(contexto.tareas),
    examenes: contexto.examenes,
    bloquesPlanificador: sincronizarBloquesClaseConCursos(cursos, contexto.bloquesPlanificador),
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
      const cursos = parseado.cursos ?? [];
      return {
        ...parseado,
        usuarioActual: normalizarUsuarioPersistido(parseado.usuarioActual),
        cursos,
        tareas: normalizarTareas(parseado.tareas ?? []),
        bloquesPlanificador: sincronizarBloquesClaseConCursos(
          cursos,
          parseado.bloquesPlanificador ?? [],
        ),
      };
    } catch {
      return crearEstadoInicial();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(estado));
  }, [estado]);

  useEffect(() => {
    const usuarioId = estado.usuarioActual?.id;
    if (!usuarioId) return;

    api
      .obtenerContexto(usuarioId)
      .then((contexto) => {
        setEstado((actual) => integrarContexto(actual, contexto));
      })
      .catch(() => {
        // Mantiene fallback local si la API aun no esta disponible.
      });
  }, [estado.usuarioActual?.id]);

  const valor = useMemo<ValorContextoStudyFlow>(() => {
    const usuarioId = estado.usuarioActual?.id;
    const obtenerCursoPorId = (cursoId?: string) =>
      estado.cursos.find((curso) => curso.id === cursoId);
    const requiereCompletarPerfilAcademico = usuarioRequiereCompletarPerfilAcademico(
      estado.usuarioActual,
    );

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
      requiereCompletarPerfilAcademico,
      obtenerCursoPorId,
      sincronizarConBackend: async () => {
        if (!usuarioId) return;
        const contexto = await api.obtenerContexto(usuarioId);
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
              base: actual.usuarioActual,
            }),
          }));

          return true;
        } catch (error) {
          if (!esErrorConexion(error)) {
            return false;
          }

          const coincide =
            correo.toLowerCase() === CUENTA_DEMO.correo.toLowerCase() &&
            contrasena === CUENTA_DEMO.contrasena;

          return Boolean(coincide);
        }
      },
      iniciarSesionConGoogle: async (credential) => {
        try {
          const resultado = await api.iniciarSesionConGoogle({ credential });
          const usuario = resultado.usuario;
          if (!usuario) {
            return "error";
          }

          setEstado((actual) => ({
            ...actual,
            usuarioActual: normalizarUsuarioApi(usuario, {
              base: actual.usuarioActual,
            }),
          }));

          return (
            resultado.requiereCompletarPerfilAcademico ??
            usuarioRequiereCompletarPerfilAcademico(usuario)
          )
            ? "completar-perfil"
            : "ok";
        } catch (_error) {
          return "error";
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

          const siguienteUsuario = normalizarUsuarioApi(resultado.usuario);
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

        if (usuarioId) {
          api
            .actualizarPerfil(usuarioId, cambios)
            .then((resultado) => {
              setEstado((actual) => ({
                ...actual,
                usuarioActual: actual.usuarioActual
                  ? normalizarUsuarioApi(resultado.usuario, {
                      base: actual.usuarioActual,
                    })
                  : actual.usuarioActual,
              }));
            })
            .catch(() => {});
        }
      },
      completarPerfilAcademico: async (datos) => {
        if (!usuarioId) {
          return false;
        }

        try {
          const resultado = await api.actualizarPerfil(usuarioId, {
            universidad: datos.universidad.trim(),
            carrera: datos.carrera.trim(),
            semestre: datos.semestre.trim(),
          });

          setEstado((actual) => ({
            ...actual,
            usuarioActual: actual.usuarioActual
              ? normalizarUsuarioApi(resultado.usuario, {
                  base: actual.usuarioActual,
                })
              : actual.usuarioActual,
          }));

          return true;
        } catch (_error) {
          return false;
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

        if (usuarioId) {
          api
            .crearTarea({
              estudianteId: usuarioId,
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

          persistirNotificacion(usuarioId, notificacionLocal);
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
          tareaActual && usuarioId
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

          if (usuarioId && notificacionLocal) {
            persistirNotificacion(usuarioId, notificacionLocal);
          }
        }
      },
      agendarTareaEnCalendario: (tareaId, horas) => {
        const tareaObjetivo = estado.tareas.find((item) => item.id === tareaId);
        if (!tareaObjetivo) {
          return {
            ok: false,
            mensaje: "No pude encontrar esa tarea para llevarla al calendario.",
            horasProgramadas: 0,
          };
        }

        const horasNumericas = Number(horas);
        const horasSolicitadas = Number.isFinite(horasNumericas)
          ? Math.max(1, Math.round(horasNumericas))
          : 1;
        const curso = estado.cursos.find((item) => item.id === tareaObjetivo.cursoId);
        const resultado = programarBloquesAutomaticos(
          {
            titulo: `Tarea: ${tareaObjetivo.titulo}`,
            cursoId: tareaObjetivo.cursoId,
            color: curso?.color ?? "purple",
            fechaObjetivo: tareaObjetivo.fechaEntrega,
          },
          estado.bloquesPlanificador,
          horasSolicitadas,
        );

        if (resultado.horasProgramadas === 0) {
          return {
            ok: false,
            mensaje: "No encontre espacios libres antes de la entrega. Prueba con menos horas o mueve bloques en el planificador.",
            horasProgramadas: 0,
          };
        }

        const bloquesActualizados = ordenarBloquesPlanificador([
          ...estado.bloquesPlanificador,
          ...resultado.bloques,
        ]);

        const notificacionLocal: NotificacionItem = {
          id: crearId("notif"),
          tipo: resultado.horasProgramadas < horasSolicitadas ? "warning" : "success",
          titulo:
            resultado.horasProgramadas < horasSolicitadas
              ? "Tarea programada parcialmente"
              : "Tarea agregada al calendario",
          mensaje:
            resultado.horasProgramadas < horasSolicitadas
              ? `Solo pude reservar ${resultado.horasProgramadas}h de ${horasSolicitadas}h para "${tareaObjetivo.titulo}".`
              : `Reserve ${resultado.horasProgramadas}h para trabajar "${tareaObjetivo.titulo}" en espacios libres del calendario.`,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: bloquesActualizados,
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        if (usuarioId) {
          api.guardarPlanificador(usuarioId, bloquesActualizados).catch(() => {});
          persistirNotificacion(usuarioId, notificacionLocal);
        }

        return {
          ok: true,
          mensaje:
            resultado.horasProgramadas < horasSolicitadas
              ? `Se programaron ${resultado.horasProgramadas}h. No encontre mas huecos libres por ahora.`
              : `Listo. Ya te reserve ${resultado.horasProgramadas}h para esa tarea en el calendario.`,
          horasProgramadas: resultado.horasProgramadas,
        };
      },
      agendarRepasoCurso: (cursoId, horas) => {
        const cursoObjetivo = estado.cursos.find((item) => item.id === cursoId);
        if (!cursoObjetivo) {
          return {
            ok: false,
            mensaje: "No pude encontrar ese curso para programar el repaso.",
            horasProgramadas: 0,
          };
        }

        const horasNumericas = Number(horas);
        const horasSolicitadas = Number.isFinite(horasNumericas)
          ? Math.max(1, Math.round(horasNumericas))
          : 1;
        const fechaObjetivo = obtenerFechaObjetivoCurso(cursoId, estado.tareas, estado.examenes);
        const resultado = programarBloquesAutomaticos(
          {
            titulo: `Repaso: ${cursoObjetivo.nombre}`,
            cursoId,
            color: cursoObjetivo.color,
            fechaObjetivo,
          },
          estado.bloquesPlanificador,
          horasSolicitadas,
        );

        if (resultado.horasProgramadas === 0) {
          return {
            ok: false,
            mensaje: "No encontre espacios libres para ese curso. Prueba con menos horas o libera bloques en el planificador.",
            horasProgramadas: 0,
          };
        }

        const bloquesActualizados = ordenarBloquesPlanificador([
          ...estado.bloquesPlanificador,
          ...resultado.bloques,
        ]);

        const notificacionLocal: NotificacionItem = {
          id: crearId("notif"),
          tipo: resultado.horasProgramadas < horasSolicitadas ? "warning" : "success",
          titulo:
            resultado.horasProgramadas < horasSolicitadas
              ? "Repaso de curso programado parcialmente"
              : "Repaso de curso agregado al planificador",
          mensaje:
            resultado.horasProgramadas < horasSolicitadas
              ? `Solo pude reservar ${resultado.horasProgramadas}h de ${horasSolicitadas}h para ${cursoObjetivo.nombre}.`
              : `Reserve ${resultado.horasProgramadas}h de repaso general para ${cursoObjetivo.nombre}.`,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: bloquesActualizados,
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        if (usuarioId) {
          api.guardarPlanificador(usuarioId, bloquesActualizados).catch(() => {});
          persistirNotificacion(usuarioId, notificacionLocal);
        }

        return {
          ok: true,
          mensaje:
            resultado.horasProgramadas < horasSolicitadas
              ? `Se programaron ${resultado.horasProgramadas}h de repaso para el curso.`
              : `Listo. Ya te reserve ${resultado.horasProgramadas}h de repaso para ese curso.`,
          horasProgramadas: resultado.horasProgramadas,
        };
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
          bloquesPlanificador: sincronizarBloquesClaseConCursos(
            [cursoLocal, ...actual.cursos],
            actual.bloquesPlanificador,
          ),
        }));

        if (usuarioId) {
          api
            .crearCurso({
              estudianteId: usuarioId,
              nombre: curso.nombre,
              docente: curso.docente,
              horario: curso.horario,
              semestre: curso.semestre,
              color: curso.color,
              descripcion: curso.descripcion,
            })
            .then((cursoBackend) => {
              let bloquesActualizados: BloquePlanificador[] = [];

              setEstado((actual) => {
                const cursosActualizados = actual.cursos.map((item) =>
                  item.id === cursoLocal.id
                    ? { ...cursoBackend, materiales: item.materiales }
                    : item,
                );
                bloquesActualizados = sincronizarBloquesClaseConCursos(
                  cursosActualizados,
                  actual.bloquesPlanificador.filter((bloque) => bloque.cursoId !== cursoLocal.id),
                );

                return {
                  ...actual,
                  cursos: cursosActualizados,
                  bloquesPlanificador: bloquesActualizados,
                };
              });

              api.guardarPlanificador(usuarioId, bloquesActualizados).catch(() => {});
            })
            .catch(() => {});
        }
      },
      actualizarCurso: (cursoId, cambios) => {
        let bloquesActualizados: BloquePlanificador[] = [];

        setEstado((actual) => {
          const cursosActualizados = actual.cursos.map((curso) =>
            curso.id === cursoId ? { ...curso, ...cambios } : curso,
          );
          bloquesActualizados = sincronizarBloquesClaseConCursos(
            cursosActualizados,
            actual.bloquesPlanificador,
          );

          return {
            ...actual,
            cursos: cursosActualizados,
            bloquesPlanificador: bloquesActualizados,
          };
        });

        api.actualizarCurso(cursoId, cambios).catch(() => {});
        if (usuarioId) {
          api.guardarPlanificador(usuarioId, bloquesActualizados).catch(() => {});
        }
      },
      eliminarCurso: (cursoId) => {
        let bloquesActualizados: BloquePlanificador[] = [];

        setEstado((actual) => {
          const cursosActualizados = actual.cursos.filter((curso) => curso.id !== cursoId);
          bloquesActualizados = sincronizarBloquesClaseConCursos(
            cursosActualizados,
            actual.bloquesPlanificador.filter((bloque) => bloque.cursoId !== cursoId),
          );

          return {
            ...actual,
            cursos: cursosActualizados,
            tareas: actual.tareas.filter((tarea) => tarea.cursoId !== cursoId),
            examenes: actual.examenes.filter((examen) => examen.cursoId !== cursoId),
            bloquesPlanificador: bloquesActualizados,
          };
        });

        api.eliminarCurso(cursoId).catch(() => {});
        if (usuarioId) {
          api.guardarPlanificador(usuarioId, bloquesActualizados).catch(() => {});
        }
      },
      agregarExamen: (examen) => {
        const examenLocal: Examen = { ...examen, id: crearId("exam") };
        setEstado((actual) => ({
          ...actual,
          examenes: [...actual.examenes, examenLocal].sort((a, b) => a.fecha.localeCompare(b.fecha)),
        }));

        if (usuarioId) {
          api
            .crearExamen({
              estudianteId: usuarioId,
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

        if (usuarioId) {
          api.marcarTodasLasNotificacionesLeidas(usuarioId).catch(() => {});
        }
      },
      limpiarNotificacionesLeidas: () => {
        setEstado((actual) => ({
          ...actual,
          notificaciones: actual.notificaciones.filter((notificacion) => notificacion.noLeida),
        }));

        if (usuarioId) {
          api.limpiarNotificacionesLeidas(usuarioId).catch(() => {});
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

        if (usuarioId) {
          api
            .enviarMensajeAsistente(usuarioId, mensaje)
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
      anexarMensajesAsistenteLocales: (mensajes, fuente = "sistema") => {
        if (!mensajes.length) {
          return;
        }

        setEstado((actual) => ({
          ...actual,
          fuenteAsistente: fuente,
          mensajesChat: [
            ...actual.mensajesChat,
            ...mensajes.map((item) => ({
              id: crearId("chat"),
              tipo: item.tipo,
              mensaje: item.mensaje,
              hora: formatearHoraChat(),
            })),
          ],
        }));
      },
      limpiarMensajesAsistente: () => {
        setEstado((actual) => ({
          ...actual,
          fuenteAsistente: null,
          mensajesChat: [],
        }));

        if (usuarioId) {
          api.limpiarMensajesAsistente(usuarioId).catch(() => {});
        }
      },
      replanificarHorarioInteligente: ({ alcance, objetivoId, diasBloqueados, jornada }) => {
        const diasRestringidos = [...new Set(diasBloqueados)].filter((dia) => dia >= 0 && dia <= 6);
        if (diasRestringidos.length >= 7) {
          return {
            ok: false,
            mensaje: "No puedo planificar si todos los dias estan bloqueados. Deja al menos un dia disponible.",
            resumen: [],
            bloquesCreados: 0,
            horasProgramadas: 0,
          };
        }

        const tareaObjetivo = alcance === "tarea" ? estado.tareas.find((item) => item.id === objetivoId) ?? null : null;
        const cursoObjetivo = alcance === "curso" ? estado.cursos.find((item) => item.id === objetivoId) ?? null : null;

        if (alcance === "tarea" && !tareaObjetivo) {
          return {
            ok: false,
            mensaje: "No encontre la tarea que quieres reorganizar.",
            resumen: [],
            bloquesCreados: 0,
            horasProgramadas: 0,
          };
        }

        if (alcance === "curso" && !cursoObjetivo) {
          return {
            ok: false,
            mensaje: "No encontre el curso que quieres reorganizar.",
            resumen: [],
            bloquesCreados: 0,
            horasProgramadas: 0,
          };
        }

        const bloquesBase = limpiarBloquesEstudioSegunAlcance(estado.bloquesPlanificador, alcance, {
          tarea: tareaObjetivo,
          curso: cursoObjetivo,
        });

        let objetivos: ObjetivoPlanificacionAutomatica[] = [];

        if (alcance === "todo") {
          objetivos = construirObjetivosPlanificacionGlobal(estado.cursos, estado.tareas, estado.examenes);
        }

        if (alcance === "tarea" && tareaObjetivo) {
          const curso = estado.cursos.find((item) => item.id === tareaObjetivo.cursoId);
          objetivos = [
            {
              clave: `task-${tareaObjetivo.id}`,
              titulo: `Tarea: ${tareaObjetivo.titulo}`,
              cursoId: tareaObjetivo.cursoId,
              color: curso?.color ?? "purple",
              fechaObjetivo: tareaObjetivo.fechaEntrega,
              horasSolicitadas: calcularHorasRestantesTarea(tareaObjetivo),
              tipo: "tarea",
              resumen: `${tareaObjetivo.titulo} (${curso?.nombre ?? "Curso"})`,
            },
          ];
        }

        if (alcance === "curso" && cursoObjetivo) {
          const examenCurso = estado.examenes
            .filter((examen) => examen.cursoId === cursoObjetivo.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

          objetivos = [
            {
              clave: `review-${cursoObjetivo.id}`,
              titulo: `Repaso: ${cursoObjetivo.nombre}`,
              cursoId: cursoObjetivo.id,
              color: cursoObjetivo.color,
              fechaObjetivo: obtenerFechaObjetivoCurso(cursoObjetivo.id, estado.tareas, estado.examenes),
              horasSolicitadas: examenCurso ? calcularHorasRepasoExamen(examenCurso) : 2,
              tipo: "repaso",
              resumen: `Repaso de ${cursoObjetivo.nombre}`,
            },
          ];
        }

        if (!objetivos.length) {
          return {
            ok: false,
            mensaje: "No encontre tareas o repasos para reorganizar con esa opcion.",
            resumen: [],
            bloquesCreados: 0,
            horasProgramadas: 0,
          };
        }

        const horasDiariasMaximas = Math.max(1, estado.usuarioActual?.horasEstudioDiarias ?? 2);
        const totalHorasSolicitadas = objetivos.reduce(
          (acumulado, objetivo) => acumulado + objetivo.horasSolicitadas,
          0,
        );
        const resultado = programarObjetivosConRestricciones({
          objetivos,
          bloquesBase,
          horasDiariasMaximas,
          diasBloqueados: diasRestringidos,
          jornada,
        });

        if (resultado.horasProgramadas === 0) {
          return {
            ok: false,
            mensaje:
              "No encontre huecos libres con esas restricciones. Prueba liberando un dia o usando una franja mas flexible.",
            resumen: resultado.resumen,
            bloquesCreados: 0,
            horasProgramadas: 0,
          };
        }

        const bloquesActualizados = ordenarBloquesPlanificador([
          ...bloquesBase,
          ...resultado.bloques,
        ]);
        const resumenPlanificacion =
          alcance === "todo"
            ? `Replanifique ${resultado.bloques.length} bloques de tareas y repasos.`
            : alcance === "tarea"
              ? `Reorganicé la tarea ${tareaObjetivo?.titulo ?? ""}.`
              : `Reorganicé el repaso de ${cursoObjetivo?.nombre ?? ""}.`;
        const notificacionLocal: NotificacionItem = {
          id: crearId("notif"),
          tipo: resultado.horasProgramadas < totalHorasSolicitadas ? "warning" : "success",
          titulo:
            resultado.horasProgramadas < totalHorasSolicitadas
              ? "Planificacion aplicada parcialmente"
              : "Horario reorganizado con IA",
          mensaje: resumenPlanificacion,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        setEstado((actual) => ({
          ...actual,
          fuenteAsistente: "sistema",
          bloquesPlanificador: bloquesActualizados,
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        if (usuarioId) {
          api.guardarPlanificador(usuarioId, bloquesActualizados).catch(() => {});
          persistirNotificacion(usuarioId, notificacionLocal);
        }

        return {
          ok: true,
          mensaje:
            resultado.horasProgramadas < totalHorasSolicitadas
              ? `Aplique la planificacion, pero solo encontre ${resultado.horasProgramadas}h libres de ${totalHorasSolicitadas}h posibles.`
              : `Listo. Reorganicé tu horario y reserve ${resultado.horasProgramadas}h en espacios libres.`,
          resumen: resultado.resumen,
          bloquesCreados: resultado.bloques.length,
          horasProgramadas: resultado.horasProgramadas,
        };
      },
      generarHorarioInteligente: () => {
        return;
      },
      moverBloquePlanificador: (bloqueId, dia, horaInicio) => {
        const bloqueObjetivo = estado.bloquesPlanificador.find((bloque) => bloque.id === bloqueId);
        if (bloqueObjetivo?.tipo === "class") {
          return;
        }

        const bloquesActualizados = estado.bloquesPlanificador.map((bloque) =>
          bloque.id === bloqueId ? { ...bloque, dia, horaInicio } : bloque,
        );

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.map((bloque) =>
            bloque.id === bloqueId ? { ...bloque, dia, horaInicio } : bloque,
          ),
        }));

        if (usuarioId) {
          api.guardarPlanificador(usuarioId, bloquesActualizados).then((resultado) => {
            setEstado((actual) => ({
              ...actual,
              bloquesPlanificador: resultado.bloques,
            }));
          }).catch(() => {});
        }
      },
      actualizarBloquePlanificador: (bloqueId, cambios) => {
        const bloqueObjetivo = estado.bloquesPlanificador.find((bloque) => bloque.id === bloqueId);
        if (bloqueObjetivo?.tipo === "class") {
          return;
        }

        const bloquesActualizados = estado.bloquesPlanificador.map((bloque) =>
          bloque.id === bloqueId ? { ...bloque, ...cambios } : bloque,
        );

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.map((bloque) =>
            bloque.id === bloqueId ? { ...bloque, ...cambios } : bloque,
          ),
        }));

        if (usuarioId) {
          api
            .guardarPlanificador(usuarioId, bloquesActualizados)
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
        const bloqueObjetivo = estado.bloquesPlanificador.find((bloque) => bloque.id === bloqueId);
        if (bloqueObjetivo?.tipo === "class") {
          return;
        }

        const bloquesActualizados = estado.bloquesPlanificador.filter((bloque) => bloque.id !== bloqueId);

        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.filter((bloque) => bloque.id !== bloqueId),
        }));

        if (usuarioId) {
          api
            .guardarPlanificador(usuarioId, bloquesActualizados)
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

export function esTareaActiva(tarea: Tarea) {
  return obtenerEstadoVisualTarea(tarea) !== "completed";
}

export function esTareaPendienteVigente(tarea: Tarea) {
  const estadoVisual = obtenerEstadoVisualTarea(tarea);
  return estadoVisual === "pending" || estadoVisual === "in-progress";
}

export function esTareaAtrasada(tarea: Tarea) {
  return obtenerEstadoVisualTarea(tarea) === "overdue";
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

export function obtenerAlertasInteligentes(
  cursos: Curso[],
  tareas: Tarea[],
  examenes: Examen[],
  bloquesPlanificador: BloquePlanificador[],
) {
  const alertas: Array<AlertaInteligente & { prioridad: number; diasRestantes: number }> = [];

  tareas.forEach((tarea) => {
    const estadoVisual = obtenerEstadoVisualTarea(tarea);
    if (estadoVisual === "completed") {
      return;
    }

    const curso = cursos.find((item) => item.id === tarea.cursoId);
    const diasRestantes = obtenerDiasRestantes(tarea.fechaEntrega);

    if (estadoVisual === "overdue") {
      alertas.push({
        id: `smart-task-overdue-${tarea.id}`,
        titulo: `${tarea.titulo} esta atrasada`,
        descripcion: `${curso?.nombre ?? "Tu curso"} ya supero la fecha limite. Conviene retomarla hoy mismo.`,
        nivel: "critica",
        tipo: "tarea",
        destino: `/app/tasks?focus=${tarea.id}`,
        prioridad: 0,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes === 0) {
      alertas.push({
        id: `smart-task-today-${tarea.id}`,
        titulo: `${tarea.titulo} vence hoy`,
        descripcion: `${curso?.nombre ?? "Tu curso"} necesita atencion inmediata para que no se te pase.`,
        nivel: tarea.prioridad === "high" ? "critica" : "alta",
        tipo: "tarea",
        destino: `/app/tasks?focus=${tarea.id}`,
        prioridad: tarea.prioridad === "high" ? 1 : 2,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes === 1 && tarea.progreso < 80) {
      alertas.push({
        id: `smart-task-soon-${tarea.id}`,
        titulo: `${tarea.titulo} vence manana`,
        descripcion: `${curso?.nombre ?? "Tu curso"} aun va en ${tarea.progreso}%. Te conviene cerrarla hoy.`,
        nivel: "alta",
        tipo: "tarea",
        destino: `/app/tasks?focus=${tarea.id}`,
        prioridad: 3,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes <= 3 && tarea.prioridad === "high" && tarea.progreso < 60) {
      alertas.push({
        id: `smart-task-priority-${tarea.id}`,
        titulo: `${tarea.titulo} ya deberia avanzar`,
        descripcion: `${curso?.nombre ?? "Tu curso"} es prioridad alta y vence pronto. Mejor no dejarla para el ultimo dia.`,
        nivel: "media",
        tipo: "tarea",
        destino: `/app/tasks?focus=${tarea.id}`,
        prioridad: 5,
        diasRestantes,
      });
    }
  });

  examenes.forEach((examen) => {
    const diasRestantes = obtenerDiasRestantes(examen.fecha);
    if (diasRestantes < 0) {
      return;
    }

    const curso = cursos.find((item) => item.id === examen.cursoId);
    const bloquesCurso = bloquesPlanificador.filter(
      (bloque) => bloque.tipo === "study" && bloque.cursoId === examen.cursoId,
    );

    if (diasRestantes <= 1 && examen.preparacion < 70) {
      alertas.push({
        id: `smart-exam-critical-${examen.id}`,
        titulo: `${examen.titulo} esta demasiado cerca`,
        descripcion: `${curso?.nombre ?? "Tu curso"} llega en ${diasRestantes === 0 ? "horas" : "1 dia"} y tu preparacion va en ${examen.preparacion}%.`,
        nivel: "critica",
        tipo: "examen",
        destino: `/app/exams?focus=${examen.id}`,
        prioridad: diasRestantes === 0 ? 0 : 1,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes <= 3 && examen.preparacion < 60) {
      alertas.push({
        id: `smart-exam-soon-${examen.id}`,
        titulo: `${examen.titulo} necesita repaso`,
        descripcion: `${curso?.nombre ?? "Tu curso"} esta cerca y tu preparacion aun no llega a una zona segura.`,
        nivel: "alta",
        tipo: "examen",
        destino: `/app/exams?focus=${examen.id}`,
        prioridad: 2,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes <= 5 && bloquesCurso.length === 0) {
      alertas.push({
        id: `smart-exam-plan-${examen.id}`,
        titulo: `Aun no tienes bloques para ${examen.titulo}`,
        descripcion: `${curso?.nombre ?? "Tu curso"} se acerca y todavia no aparece en tu planificador.`,
        nivel: "media",
        tipo: "examen",
        destino: `/app/planner`,
        prioridad: 4,
        diasRestantes,
      });
    }
  });

  return alertas
    .sort((a, b) => a.prioridad - b.prioridad || a.diasRestantes - b.diasRestantes)
    .slice(0, 5)
    .map(({ prioridad, diasRestantes, ...alerta }) => alerta);
}
