import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { api, type ContextoApi, type TareaApi, type UsuarioApi } from "./api";
import { construirBloquesClaseDesdeCurso } from "./course-schedule";
import type {
  AlcancePlanificacion,
  AlertaInteligente,
  BloquePlanificador,
  Curso,
  DisponibilidadDia,
  EstadoTarea,
  Examen,
  FranjaDisponibilidad,
  JornadaPlanificacion,
  MensajeChat,
  ModoPlanificacionTodo,
  NotificacionItem,
  PerfilUsuario,
  Prioridad,
  ResultadoPlanificacionInteligente,
  Subtarea,
  Tarea,
} from "./studyflow-types";

export type {
  AlcancePlanificacion,
  AlertaInteligente,
  BloquePlanificador,
  Curso,
  DisponibilidadDia,
  EstadoTarea,
  Examen,
  FranjaDisponibilidad,
  JornadaPlanificacion,
  MensajeChat,
  ModoPlanificacionTodo,
  NotificacionItem,
  PerfilUsuario,
  Prioridad,
  ResultadoPlanificacionInteligente,
  Subtarea,
  Tarea,
} from "./studyflow-types";

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

type RespuestaMovimientoPlanificador = {
  ok: boolean;
  mensaje: string;
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
  verificarCorreo: (token: string) => Promise<boolean>;
  reenviarVerificacionCorreo: () => Promise<{ ok: boolean; mensaje: string }>;
  cerrarSesion: () => void;
  actualizarPerfil: (cambios: Partial<PerfilUsuario>) => void;
  completarPerfilAcademico: (datos: {
    universidad: string;
    carrera: string;
    semestre: string;
  }) => Promise<boolean>;
  agregarTarea: (
    tarea: Omit<Tarea, "id" | "estado" | "progreso" | "subtareas"> & {
      estado?: EstadoTarea;
      progreso?: number;
      subtareas?: Subtarea[];
    },
  ) => void;
  actualizarTarea: (tareaId: string, cambios: Partial<Tarea>) => void;
  alternarTareaCompletada: (tareaId: string) => void;
  agregarSubtarea: (tareaId: string, titulo: string) => { ok: boolean; mensaje: string };
  alternarSubtarea: (tareaId: string, subtareaId: string) => void;
  eliminarSubtarea: (tareaId: string, subtareaId: string) => void;
  posponerTarea: (tareaId: string, dias?: number) => { ok: boolean; mensaje: string; nuevaFecha?: string };
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
  permisoNotificacionesNavegador: NotificationPermission | "unsupported";
  solicitarPermisoNotificacionesNavegador: () => Promise<NotificationPermission | "unsupported">;
  enviarMensajeAsistente: (mensaje: string) => void;
  anexarMensajesAsistenteLocales: (
    mensajes: Array<{ tipo: "user" | "ai"; mensaje: string }>,
    fuente?: EstadoStudyFlow["fuenteAsistente"],
  ) => void;
  limpiarMensajesAsistente: () => void;
  generarHorarioInteligente: () => void;
  previsualizarReplanificacionHorario: (configuracion: {
    alcance: AlcancePlanificacion;
    objetivoId?: string;
    diasBloqueados: number[];
    jornada: JornadaPlanificacion;
    modoTodo?: ModoPlanificacionTodo;
  }) => ResultadoPlanificacionInteligente;
  replanificarHorarioInteligente: (configuracion: {
    alcance: AlcancePlanificacion;
    objetivoId?: string;
    diasBloqueados: number[];
    jornada: JornadaPlanificacion;
    modoTodo?: ModoPlanificacionTodo;
  }) => ResultadoPlanificacionInteligente;
  moverBloquePlanificador: (bloqueId: string, dia: number, horaInicio: number) => void;
  actualizarBloquePlanificador: (bloqueId: string, cambios: Partial<BloquePlanificador>) => void;
  eliminarBloquePlanificador: (bloqueId: string) => void;
  puedeDeshacerPlanificador: boolean;
  puedeRehacerPlanificador: boolean;
  deshacerCambiosPlanificador: () => RespuestaMovimientoPlanificador;
  rehacerCambiosPlanificador: () => RespuestaMovimientoPlanificador;
  obtenerCursoPorId: (cursoId?: string) => Curso | undefined;
  sincronizarConBackend: () => Promise<void>;
};

const CLAVE_ALMACENAMIENTO = "studyflow-ai-state-v1";
const etiquetasDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HORA_MIN_PLANIFICADOR = 7;
const HORA_MAX_PLANIFICADOR = 23;
const HORAS_PREFERIDAS_REPASO = [18, 19, 20, 16, 17, 14, 15, 10, 11, 12, 13, 8, 9, 21, 7];
const HORAS_POR_FRANJA: Record<FranjaDisponibilidad, number[]> = {
  manana: [7, 8, 9, 10, 11],
  tarde: [12, 13, 14, 15, 16, 17],
  noche: [18, 19, 20, 21],
};
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
  cursoId?: string;
  color: string;
  fechaObjetivo: string;
  horasSolicitadas: number;
  tipo: "tarea" | "repaso" | "bloque";
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

function normalizarTextoPlanificacion(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ordenarBloquesPlanificador(bloques: BloquePlanificador[]) {
  return [...bloques].sort((a, b) => a.dia - b.dia || a.horaInicio - b.horaInicio);
}

function clonarBloquesPlanificador(bloques: BloquePlanificador[]) {
  return bloques.map((bloque) => ({ ...bloque }));
}

function sonBloquesPlanificadorIguales(
  bloquesA: BloquePlanificador[],
  bloquesB: BloquePlanificador[],
) {
  return JSON.stringify(ordenarBloquesPlanificador(bloquesA)) === JSON.stringify(ordenarBloquesPlanificador(bloquesB));
}

function crearDisponibilidadSemanalBase(): DisponibilidadDia[] {
  return etiquetasDias.map((_, indice) => ({
    dia: indice,
    manana: true,
    tarde: true,
    noche: indice !== 5,
  }));
}

function normalizarDisponibilidadSemanal(
  disponibilidad: DisponibilidadDia[] | null | undefined,
) {
  const base = crearDisponibilidadSemanalBase();

  return base.map((diaBase) => {
    const actual = disponibilidad?.find((item) => item.dia === diaBase.dia);

    return {
      dia: diaBase.dia,
      manana: typeof actual?.manana === "boolean" ? actual.manana : diaBase.manana,
      tarde: typeof actual?.tarde === "boolean" ? actual.tarde : diaBase.tarde,
      noche: typeof actual?.noche === "boolean" ? actual.noche : diaBase.noche,
    };
  });
}

function normalizarSubtareas(subtareas: Subtarea[] | null | undefined): Subtarea[] {
  if (!Array.isArray(subtareas)) {
    return [];
  }

  return subtareas
    .filter((subtarea) => subtarea && typeof subtarea === "object")
    .map((subtarea) => ({
      id: typeof subtarea.id === "string" && subtarea.id ? subtarea.id : crearId("subtask"),
      titulo: typeof subtarea.titulo === "string" ? subtarea.titulo.trim() : "",
      completada: Boolean(subtarea.completada),
    }))
    .filter((subtarea) => subtarea.titulo.length > 0);
}

function recalcularEstadoDesdeSubtareas(tarea: Tarea): Tarea {
  const subtareas = normalizarSubtareas(tarea.subtareas);
  if (!subtareas.length) {
    return {
      ...tarea,
      subtareas,
    };
  }

  const totalCompletadas = subtareas.filter((subtarea) => subtarea.completada).length;
  const progreso = Math.round((totalCompletadas / subtareas.length) * 100);
  const estado: EstadoTarea =
    progreso >= 100
      ? "completed"
      : tarea.estado === "completed"
        ? "in-progress"
        : tarea.estado;

  return {
    ...tarea,
    subtareas,
    progreso,
    estado,
  };
}

function normalizarTareaApi(tarea: TareaApi, subtareas?: Subtarea[] | null): Tarea {
  return {
    ...tarea,
    prioridad: tarea.prioridad,
    estado: tarea.estado,
    subtareas: normalizarSubtareas(subtareas),
  };
}

function extraerPayloadTareaApi(cambios: Partial<Tarea>) {
  const { subtareas: _subtareas, ...payload } = cambios;
  return payload;
}

function extraerPayloadPerfilApi(cambios: Partial<PerfilUsuario>): Partial<UsuarioApi> {
  const {
    disponibilidadSemanal: _disponibilidadSemanal,
    ...payload
  } = cambios;

  return payload;
}

function debeMostrarNotificacionDelNavegador(
  notificacion: NotificacionItem,
  usuario: PerfilUsuario | null,
) {
  if (!usuario) {
    return false;
  }

  const texto = normalizarTextoPlanificacion(`${notificacion.titulo} ${notificacion.mensaje}`);

  if (texto.includes("examen") || texto.includes("evaluacion") || texto.includes("parcial") || texto.includes("control")) {
    return usuario.notificaciones.examenes;
  }

  if (
    texto.includes("tarea") ||
    texto.includes("entrega") ||
    texto.includes("repaso") ||
    texto.includes("calendario") ||
    texto.includes("curso")
  ) {
    return usuario.notificaciones.tareas;
  }

  if (
    texto.includes("ia") ||
    texto.includes("asistente") ||
    texto.includes("planificacion") ||
    texto.includes("horario")
  ) {
    return usuario.notificaciones.ia;
  }

  if (texto.includes("semanal") || texto.includes("resumen")) {
    return usuario.notificaciones.semanal;
  }

  return true;
}

function obtenerFranjaDesdeHora(hora: number): FranjaDisponibilidad {
  if (hora <= 11) return "manana";
  if (hora <= 17) return "tarde";
  return "noche";
}

function obtenerDisponibilidadDia(
  disponibilidadSemanal: DisponibilidadDia[] | undefined,
  dia: number,
) {
  return (
    disponibilidadSemanal?.find((item) => item.dia === dia) ??
    crearDisponibilidadSemanalBase().find((item) => item.dia === dia)!
  );
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

function obtenerHorasCandidatasRepaso(
  dia: number,
  disponibilidadSemanal?: DisponibilidadDia[],
) {
  const ahora = new Date();
  const diaActual = obtenerDiaPlanificadorDesdeFecha(ahora);
  const horaActual = ahora.getHours();

  return HORAS_PREFERIDAS_REPASO.filter((hora) => {
    const disponibilidadDia = obtenerDisponibilidadDia(disponibilidadSemanal, dia);
    const franja = obtenerFranjaDesdeHora(hora);
    const disponible =
      franja === "manana"
        ? disponibilidadDia.manana
        : franja === "tarde"
          ? disponibilidadDia.tarde
          : disponibilidadDia.noche;

    return disponible && (dia === diaActual ? hora > horaActual : true);
  });
}

function obtenerHorasCandidatasSegunJornada(
  dia: number,
  jornada: JornadaPlanificacion,
  disponibilidadSemanal?: DisponibilidadDia[],
) {
  const disponibilidadDia = obtenerDisponibilidadDia(disponibilidadSemanal, dia);
  const franjasDisponibles = (["manana", "tarde", "noche"] as FranjaDisponibilidad[]).filter(
    (franja) => disponibilidadDia[franja],
  );
  const horasPermitidas = new Set(
    (jornada === "flexible"
      ? franjasDisponibles.flatMap((franja) => HORAS_POR_FRANJA[franja])
      : disponibilidadDia[jornada]
        ? HORAS_PLANIFICACION_POR_JORNADA[jornada]
        : []
    ).filter((hora) => hora >= HORA_MIN_PLANIFICADOR && hora <= HORA_MAX_PLANIFICADOR),
  );
  const horasBase =
    jornada === "flexible"
      ? HORAS_PREFERIDAS_REPASO.filter((hora) => horasPermitidas.has(hora))
      : (HORAS_PLANIFICACION_POR_JORNADA[jornada] ?? HORAS_PREFERIDAS_REPASO).filter((hora) =>
          horasPermitidas.has(hora),
        );
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

function obtenerObjetivoDesdeBloqueExistente(
  bloque: BloquePlanificador,
  cursos: Curso[],
  tareas: Tarea[],
  examenes: Examen[],
) {
  const curso = cursos.find((item) => item.id === bloque.cursoId);
  const tituloNormalizado = normalizarTextoPlanificacion(bloque.titulo);
  const tituloSinTarea = bloque.titulo.replace(/^tarea:\s*/i, "").trim();
  const tituloSinRepaso = bloque.titulo.replace(/^repaso:\s*/i, "").trim();
  const fechaFallback = bloque.cursoId
    ? obtenerFechaObjetivoCurso(bloque.cursoId, tareas, examenes)
    : format(addDays(startOfToday(), 7), "yyyy-MM-dd");

  if (tituloNormalizado.startsWith("tarea:")) {
    const tarea = tareas.find(
      (item) =>
        (!bloque.cursoId || item.cursoId === bloque.cursoId) &&
        normalizarTextoPlanificacion(item.titulo) === normalizarTextoPlanificacion(tituloSinTarea),
    );

    return {
      clave: tarea
        ? `task-${tarea.id}`
        : `scheduled-task-${bloque.cursoId ?? "sin-curso"}-${normalizarTextoPlanificacion(tituloSinTarea)}`,
      titulo: `Tarea: ${tarea?.titulo ?? tituloSinTarea}`,
      cursoId: tarea?.cursoId ?? bloque.cursoId,
      color: curso?.color ?? bloque.color ?? "purple",
      fechaObjetivo: tarea?.fechaEntrega ?? fechaFallback,
      horasSolicitadas: bloque.duracion,
      tipo: "tarea" as const,
      resumen: `${tarea?.titulo ?? tituloSinTarea}${curso ? ` (${curso.nombre})` : ""}`,
    };
  }

  if (tituloNormalizado.startsWith("repaso:")) {
    const cursoRepaso =
      cursos.find((item) => item.id === bloque.cursoId) ??
      cursos.find(
        (item) =>
          normalizarTextoPlanificacion(item.nombre) ===
          normalizarTextoPlanificacion(tituloSinRepaso),
      );

    return {
      clave: cursoRepaso
        ? `review-${cursoRepaso.id}`
        : `scheduled-review-${bloque.cursoId ?? "sin-curso"}-${normalizarTextoPlanificacion(tituloSinRepaso)}`,
      titulo: `Repaso: ${cursoRepaso?.nombre ?? tituloSinRepaso}`,
      cursoId: cursoRepaso?.id ?? bloque.cursoId,
      color: cursoRepaso?.color ?? bloque.color ?? "blue",
      fechaObjetivo: cursoRepaso
        ? obtenerFechaObjetivoCurso(cursoRepaso.id, tareas, examenes)
        : fechaFallback,
      horasSolicitadas: bloque.duracion,
      tipo: "repaso" as const,
      resumen: `Repaso de ${cursoRepaso?.nombre ?? tituloSinRepaso}`,
    };
  }

  return {
    clave: `scheduled-block-${bloque.cursoId ?? "sin-curso"}-${normalizarTextoPlanificacion(
      bloque.titulo,
    )}`,
    titulo: bloque.titulo,
    cursoId: bloque.cursoId,
    color: curso?.color ?? bloque.color ?? "blue",
    fechaObjetivo: fechaFallback,
    horasSolicitadas: bloque.duracion,
    tipo: "bloque" as const,
    resumen: `${bloque.titulo}${curso ? ` (${curso.nombre})` : ""}`,
  };
}

function ordenarObjetivosPlanificacion(objetivos: ObjetivoPlanificacionAutomatica[]) {
  const ordenTipo = { tarea: 0, bloque: 1, repaso: 2 };
  return [...objetivos].sort((a, b) => {
    const diferenciaFecha = a.fechaObjetivo.localeCompare(b.fechaObjetivo);
    if (diferenciaFecha !== 0) return diferenciaFecha;
    return ordenTipo[a.tipo] - ordenTipo[b.tipo];
  });
}

function construirObjetivosDesdeBloquesExistentes(
  cursos: Curso[],
  tareas: Tarea[],
  examenes: Examen[],
  bloquesPlanificador: BloquePlanificador[],
) {
  const objetivosAgrupados = new Map<string, ObjetivoPlanificacionAutomatica>();
  const tareasYaCalendarizadas = new Set<string>();
  const repasosYaCalendarizados = new Set<string>();

  bloquesPlanificador
    .filter((bloque) => bloque.tipo === "study")
    .forEach((bloque) => {
      const objetivoBase = obtenerObjetivoDesdeBloqueExistente(
        bloque,
        cursos,
        tareas,
        examenes,
      );

      if (objetivoBase.clave.startsWith("task-")) {
        tareasYaCalendarizadas.add(objetivoBase.clave.replace("task-", ""));
      }

      if (objetivoBase.clave.startsWith("review-")) {
        repasosYaCalendarizados.add(objetivoBase.clave.replace("review-", ""));
      }

      const previo = objetivosAgrupados.get(objetivoBase.clave);
      if (previo) {
        objetivosAgrupados.set(objetivoBase.clave, {
          ...previo,
          horasSolicitadas: previo.horasSolicitadas + bloque.duracion,
        });
        return;
      }

      objetivosAgrupados.set(objetivoBase.clave, objetivoBase);
    });

  return {
    objetivos: ordenarObjetivosPlanificacion([...objetivosAgrupados.values()]),
    tareasYaCalendarizadas,
    repasosYaCalendarizados,
  };
}

function construirObjetivosPlanificacionTodo(
  cursos: Curso[],
  tareas: Tarea[],
  examenes: Examen[],
  bloquesPlanificador: BloquePlanificador[],
  modoTodo: ModoPlanificacionTodo,
) {
  const {
    objetivos: objetivosExistentes,
    tareasYaCalendarizadas,
    repasosYaCalendarizados,
  } = construirObjetivosDesdeBloquesExistentes(cursos, tareas, examenes, bloquesPlanificador);

  if (modoTodo === "solo-calendarizado") {
    return objetivosExistentes;
  }

  const incluirTareas =
    modoTodo === "agregar-tareas" || modoTodo === "agregar-todo";
  const incluirRepasos =
    modoTodo === "agregar-repasos" || modoTodo === "agregar-todo";

  const objetivosTareas: ObjetivoPlanificacionAutomatica[] = incluirTareas
    ? tareas
    .filter((tarea) => esTareaActiva(tarea))
    .filter((tarea) => !tareasYaCalendarizadas.has(tarea.id))
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
    })
    : [];

  const examenesPorCurso = new Map<string, Examen>();
  examenes
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach((examen) => {
      if (!examenesPorCurso.has(examen.cursoId)) {
        examenesPorCurso.set(examen.cursoId, examen);
      }
    });

  const objetivosRepaso: ObjetivoPlanificacionAutomatica[] = incluirRepasos
    ? [...examenesPorCurso.values()]
        .filter((examen) => !repasosYaCalendarizados.has(examen.cursoId))
        .map((examen) => {
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
        })
    : [];

  return ordenarObjetivosPlanificacion([
    ...objetivosExistentes,
    ...objetivosTareas,
    ...objetivosRepaso,
  ]);
}

function programarObjetivosConRestricciones({
  objetivos,
  bloquesBase,
  horasDiariasMaximas,
  diasBloqueados,
  jornada,
  disponibilidadSemanal,
}: {
  objetivos: ObjetivoPlanificacionAutomatica[];
  bloquesBase: BloquePlanificador[];
  horasDiariasMaximas: number;
  diasBloqueados: number[];
  jornada: JornadaPlanificacion;
  disponibilidadSemanal?: DisponibilidadDia[];
}) {
  const bloquesProgramados: BloquePlanificador[] = [];
  const resumen: string[] = [];

  for (const objetivo of objetivos) {
    let horasRestantes = objetivo.horasSolicitadas;
    const diasCandidatos = obtenerDiasCandidatosPlanificacion(objetivo.fechaObjetivo).filter(
      (dia) => !diasBloqueados.includes(dia),
    );

    for (const dia of diasCandidatos) {
      for (const hora of obtenerHorasCandidatasSegunJornada(dia, jornada, disponibilidadSemanal)) {
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
  disponibilidadSemanal?: DisponibilidadDia[],
) {
  const bloquesProgramados: BloquePlanificador[] = [];
  let horasRestantes = Math.max(1, Math.round(horasSolicitadas));

  for (const dia of obtenerDiasCandidatosPlanificacion(configuracion.fechaObjetivo)) {
    for (const hora of obtenerHorasCandidatasRepaso(dia, disponibilidadSemanal)) {
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

function resolverPlanificacionInteligenteBase({
  estado,
  alcance,
  objetivoId,
  diasBloqueados,
  jornada,
  modoTodo = "solo-calendarizado",
}: {
  estado: EstadoStudyFlow;
  alcance: AlcancePlanificacion;
  objetivoId?: string;
  diasBloqueados: number[];
  jornada: JornadaPlanificacion;
  modoTodo?: ModoPlanificacionTodo;
}): ResultadoPlanificacionInteligente {
  const diasRestringidos = [...new Set(diasBloqueados)].filter((dia) => dia >= 0 && dia <= 6);
  if (diasRestringidos.length >= 7) {
    return {
      ok: false,
      mensaje: "No puedo planificar si todos los días están bloqueados. Deja al menos un día disponible.",
      resumen: [],
      bloquesCreados: 0,
      horasProgramadas: 0,
      totalHorasSolicitadas: 0,
      bloquesPrevistos: [],
      bloquesFinales: [],
    };
  }

  const tareaObjetivo = alcance === "tarea" ? estado.tareas.find((item) => item.id === objetivoId) ?? null : null;
  const cursoObjetivo = alcance === "curso" ? estado.cursos.find((item) => item.id === objetivoId) ?? null : null;

  if (alcance === "tarea" && !tareaObjetivo) {
    return {
      ok: false,
      mensaje: "No encontré la tarea que quieres reorganizar.",
      resumen: [],
      bloquesCreados: 0,
      horasProgramadas: 0,
      totalHorasSolicitadas: 0,
      bloquesPrevistos: [],
      bloquesFinales: [],
    };
  }

  if (alcance === "curso" && !cursoObjetivo) {
    return {
      ok: false,
      mensaje: "No encontré el curso que quieres reorganizar.",
      resumen: [],
      bloquesCreados: 0,
      horasProgramadas: 0,
      totalHorasSolicitadas: 0,
      bloquesPrevistos: [],
      bloquesFinales: [],
    };
  }

  const bloquesBase = limpiarBloquesEstudioSegunAlcance(estado.bloquesPlanificador, alcance, {
    tarea: tareaObjetivo,
    curso: cursoObjetivo,
  });

  let objetivos: ObjetivoPlanificacionAutomatica[] = [];

  if (alcance === "todo") {
    objetivos = construirObjetivosPlanificacionTodo(
      estado.cursos,
      estado.tareas,
      estado.examenes,
      estado.bloquesPlanificador,
      modoTodo,
    );
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
      mensaje:
        alcance === "todo" && modoTodo === "solo-calendarizado"
          ? "No encontré bloques de estudio ya calendarizados. Primero agrega una tarea o repaso al calendario, o elige incluir nuevos pendientes."
          : "No encontré tareas o repasos para reorganizar con esa opción.",
      resumen: [],
      bloquesCreados: 0,
      horasProgramadas: 0,
      totalHorasSolicitadas: 0,
      bloquesPrevistos: [],
      bloquesFinales: [],
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
    disponibilidadSemanal: estado.usuarioActual?.disponibilidadSemanal,
  });
  const bloquesFinales = ordenarBloquesPlanificador([
    ...bloquesBase,
    ...resultado.bloques,
  ]);
  const descripcionAplicacion =
    alcance === "todo"
      ? `Replanifiqué ${resultado.bloques.length} bloques de tareas y repasos.`
      : alcance === "tarea"
        ? `Reorganicé la tarea ${tareaObjetivo?.titulo ?? ""}.`
        : `Reorganicé el repaso de ${cursoObjetivo?.nombre ?? ""}.`;

  if (resultado.horasProgramadas === 0) {
    return {
      ok: false,
      mensaje:
        "No encontré huecos libres con esas restricciones. Prueba liberando un día o usando una franja más flexible.",
      resumen: resultado.resumen,
      bloquesCreados: 0,
      horasProgramadas: 0,
      totalHorasSolicitadas,
      bloquesPrevistos: [],
      bloquesFinales,
      descripcionAplicacion,
    };
  }

  return {
    ok: true,
    mensaje:
      resultado.horasProgramadas < totalHorasSolicitadas
        ? `Apliqué la planificación, pero solo encontré ${resultado.horasProgramadas}h libres de ${totalHorasSolicitadas}h posibles.`
        : `Listo. Reorganicé tu horario y reservé ${resultado.horasProgramadas}h en espacios libres.`,
    resumen: resultado.resumen,
    bloquesCreados: resultado.bloques.length,
    horasProgramadas: resultado.horasProgramadas,
    totalHorasSolicitadas,
    bloquesPrevistos: ordenarBloquesPlanificador(resultado.bloques),
    bloquesFinales,
    descripcionAplicacion,
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
    emailVerificado: true,
    horasDisponibles: "4-6",
    metodoEstudio: "pomodoro",
    tonoAsistente: "responsable",
    metas: "Mantener un promedio alto, llegar con orden a exámenes y reducir el estrés académico.",
    horasEstudioDiarias: 4,
    horasSueno: 8,
    disponibilidadSemanal: crearDisponibilidadSemanalBase(),
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
    emailVerificado: usuario.emailVerificado ?? base.emailVerificado,
    horasDisponibles: usuario.horasDisponibles ?? base.horasDisponibles,
    metodoEstudio: usuario.metodoEstudio ?? base.metodoEstudio,
    tonoAsistente: usuario.tonoAsistente ?? base.tonoAsistente,
    metas: usuario.metas ?? base.metas,
    horasEstudioDiarias: usuario.horasEstudioDiarias ?? base.horasEstudioDiarias,
    horasSueno: usuario.horasSueno ?? base.horasSueno,
    disponibilidadSemanal: base.disponibilidadSemanal,
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
    emailVerificado:
      typeof candidato.emailVerificado === "boolean"
        ? candidato.emailVerificado
        : base.emailVerificado,
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
    disponibilidadSemanal: normalizarDisponibilidadSemanal(candidato.disponibilidadSemanal),
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
      horario: "Lun, Mié 08:00 - 10:00",
      semestre: "5",
      color: "blue",
      descripcion: "Modelo relacional, normalización, SQL avanzado y diseño de esquemas.",
      materiales: [
        { id: "m1", nombre: "Normalizacion paso a paso", tipo: "PDF" },
        { id: "m2", nombre: "Casos practicos de SQL", tipo: "PDF" },
        { id: "m3", nombre: "Repaso de transacciones", tipo: "Video" },
      ],
    },
    {
      id: "course-prog",
      nombre: "Programación II",
      docente: "Ing. María Lopez",
      horario: "Mar, Jue 10:00 - 12:00",
      semestre: "5",
      color: "purple",
      descripcion: "Programación orientada a objetos, APIs, buenas prácticas y testing.",
      materiales: [
        { id: "m4", nombre: "Patrones de diseño", tipo: "PDF" },
        { id: "m5", nombre: "POO en Java", tipo: "Video" },
      ],
    },
    {
      id: "course-calc",
      nombre: "Cálculo II",
      docente: "Mat. Juan Perez",
      horario: "Lun, Mié 14:00 - 16:00",
      semestre: "5",
      color: "green",
      descripcion: "Integrales, series y aplicaciones al análisis matemático.",
      materiales: [
        { id: "m6", nombre: "Guia de integrales", tipo: "PDF" },
        { id: "m7", nombre: "Ejercicios resueltos", tipo: "PDF" },
      ],
    },
    {
      id: "course-fis",
      nombre: "Física II",
      docente: "Dra. Ana Martinez",
      horario: "Mar, Vie 08:00 - 10:00",
      semestre: "5",
      color: "orange",
      descripcion: "Electromagnetismo, óptica y resolución de problemas aplicados.",
      materiales: [
        { id: "m8", nombre: "Laboratorio 3", tipo: "Documento" },
        { id: "m9", nombre: "Resumen de ondas", tipo: "PDF" },
      ],
    },
    {
      id: "course-soft",
      nombre: "Ingeniería de Software",
      docente: "Ing. Roberto Silva",
      horario: "Jue, Vie 14:00 - 16:00",
      semestre: "5",
      color: "red",
      descripcion: "Metodologías ágiles, levantamiento de requisitos y trabajo colaborativo.",
      materiales: [{ id: "m10", nombre: "Plantilla de backlog", tipo: "Documento" }],
    },
  ];

  const tareas: Tarea[] = [
    {
      id: "task-1",
      cursoId: "course-bd",
      titulo: "Proyecto final - Parte 2",
      descripcion: "Completar el modelo lógico y consultas del caso final.",
      fechaEntrega: format(addDays(hoy, 3), "yyyy-MM-dd"),
      prioridad: "high",
      estado: "in-progress",
      horasEstimadas: 3,
      progreso: 40,
      subtareas: [
        { id: "task-1-sub-1", titulo: "Ajustar el modelo lógico", completada: true },
        { id: "task-1-sub-2", titulo: "Validar consultas clave", completada: false },
        { id: "task-1-sub-3", titulo: "Documentar el caso final", completada: false },
      ],
    },
    {
      id: "task-2",
      cursoId: "course-prog",
      titulo: "Implementar API REST",
      descripcion: "Completar endpoints de autenticación y pruebas básicas.",
      fechaEntrega: format(addDays(hoy, 2), "yyyy-MM-dd"),
      prioridad: "high",
      estado: "pending",
      horasEstimadas: 4,
      progreso: 15,
      subtareas: [
        { id: "task-2-sub-1", titulo: "Completar autenticación", completada: false },
        { id: "task-2-sub-2", titulo: "Agregar pruebas básicas", completada: false },
      ],
    },
  ];

  const examenes: Examen[] = [
    {
      id: "exam-1",
      cursoId: "course-bd",
      titulo: "Examen parcial 2",
      fecha: format(addDays(hoy, 3), "yyyy-MM-dd"),
      hora: "08:00",
      temas: ["Normalización", "SQL avanzado", "Transacciones"],
      preparacion: 75,
    },
    {
      id: "exam-2",
      cursoId: "course-prog",
      titulo: "Evaluación de Programación",
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
      titulo: "Mañana tienes examen de Base de Datos",
      mensaje: "Tu examen parcial es mañana a las 08:00. Prioriza SQL avanzado y normalización.",
      creadaEn: new Date(hoy.getTime() - 1000 * 60 * 60).toISOString(),
      noLeida: true,
    },
    {
      id: "notif-2",
      tipo: "warning",
      titulo: "Tu tarea de Programación vence en 2 días",
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
        "Hola, Jhan 😊 Todo bien. Ya revisé tus cursos, tareas y exámenes, así que de una puedo ayudarte a organizar tu semana, resumir temas o armarte un plan de estudio bacán.",
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

function normalizarTareas(tareas: Tarea[]): Tarea[] {
  const hoy = startOfToday();
  return tareas.map((tarea) => {
    const tareaNormalizada = recalcularEstadoDesdeSubtareas({
      ...tarea,
      subtareas: normalizarSubtareas(tarea.subtareas),
    });

    if (tareaNormalizada.estado === "completed") {
      return { ...tareaNormalizada, progreso: 100 };
    }

    const diasRestantes = differenceInCalendarDays(parseISO(tareaNormalizada.fechaEntrega), hoy);
    if (diasRestantes < 0) {
      return { ...tareaNormalizada, estado: "overdue" as const };
    }

    return tareaNormalizada;
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

function integrarContexto(estadoActual: EstadoStudyFlow, contexto: ContextoApi): EstadoStudyFlow {
  const cursos: Curso[] = contexto.cursos.map((curso) => ({
    ...curso,
    materiales: estadoActual.cursos.find((item) => item.id === curso.id)?.materiales ?? [],
  }));

  const tareasIntegradas: Tarea[] = contexto.tareas.map((tarea) =>
    normalizarTareaApi(
      tarea,
      estadoActual.tareas.find((item) => item.id === tarea.id)?.subtareas,
    ),
  );

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
          emailVerificado:
            contexto.usuario?.emailVerificado ?? estadoActual.usuarioActual.emailVerificado,
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
          disponibilidadSemanal: estadoActual.usuarioActual.disponibilidadSemanal,
          notificaciones:
            contexto.usuario?.notificaciones ?? estadoActual.usuarioActual.notificaciones,
          aplicacion: contexto.usuario?.aplicacion ?? estadoActual.usuarioActual.aplicacion,
        }
      : estadoActual.usuarioActual,
    cursos,
    tareas: normalizarTareas(tareasIntegradas),
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
  const [historialPlanificador, setHistorialPlanificador] = useState<BloquePlanificador[][]>([]);
  const [futuroPlanificador, setFuturoPlanificador] = useState<BloquePlanificador[][]>([]);
  const [permisoNotificacionesNavegador, setPermisoNotificacionesNavegador] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    return window.Notification.permission;
  });
  const notificacionesConocidasRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(estado));
  }, [estado]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermisoNotificacionesNavegador("unsupported");
      return;
    }

    setPermisoNotificacionesNavegador(window.Notification.permission);
  }, []);

  useEffect(() => {
    setHistorialPlanificador([]);
    setFuturoPlanificador([]);
  }, [estado.usuarioActual?.id]);

  useEffect(() => {
    if (!notificacionesConocidasRef.current.size) {
      notificacionesConocidasRef.current = new Set(estado.notificaciones.map((item) => item.id));
      return;
    }

    const nuevas = estado.notificaciones.filter(
      (item) => item.noLeida && !notificacionesConocidasRef.current.has(item.id),
    );

    notificacionesConocidasRef.current = new Set(estado.notificaciones.map((item) => item.id));

    if (
      permisoNotificacionesNavegador !== "granted" ||
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    nuevas
      .filter((item) => debeMostrarNotificacionDelNavegador(item, estado.usuarioActual))
      .forEach((item) => {
        try {
          new window.Notification(`StudyFlow AI · ${item.titulo}`, {
            body: item.mensaje,
            tag: item.id,
          });
        } catch {
          // Ignora errores del navegador sin romper la app.
        }
      });
  }, [estado.notificaciones, estado.usuarioActual, permisoNotificacionesNavegador]);

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
    const registrarCambioPlanificador = (bloquesAntes: BloquePlanificador[]) => {
      const snapshot = clonarBloquesPlanificador(bloquesAntes);

      setHistorialPlanificador((actual) => {
        const ultimo = actual[actual.length - 1];
        if (ultimo && sonBloquesPlanificadorIguales(ultimo, snapshot)) {
          return actual;
        }

        return [...actual, snapshot].slice(-30);
      });
      setFuturoPlanificador([]);
    };
    const guardarPlanificadorEnBackend = (bloques: BloquePlanificador[]) => {
      if (!usuarioId) {
        return;
      }

      api
        .guardarPlanificador(usuarioId, bloques)
        .then((resultado) => {
          setEstado((actual) => ({
            ...actual,
            bloquesPlanificador: sincronizarBloquesClaseConCursos(
              actual.cursos,
              resultado.bloques,
            ),
          }));
        })
        .catch(() => {});
    };

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
            mensaje: siguienteUsuario.emailVerificado
              ? "Tu perfil fue creado y tu panel académico está listo para empezar."
              : "Tu perfil fue creado. Revisa tu correo para activar las notificaciones por email.",
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
            emailVerificado: false,
          };

          setEstado((actual) => ({
            ...actual,
            usuarioActual: siguienteUsuario,
          }));

          return true;
        }
      },
      verificarCorreo: async (token) => {
        try {
          const resultado = await api.verificarCorreo({ token });
          setEstado((actual) => ({
            ...actual,
            usuarioActual: normalizarUsuarioApi(resultado.usuario, {
              base: actual.usuarioActual,
            }),
          }));
          return true;
        } catch (_error) {
          return false;
        }
      },
      reenviarVerificacionCorreo: async () => {
        const usuario = estado.usuarioActual;
        if (!usuario) {
          return { ok: false, mensaje: "Primero inicia sesión para reenviar la verificación." };
        }

        if (usuario.emailVerificado) {
          return { ok: true, mensaje: "Tu correo ya está verificado." };
        }

        try {
          const resultado = await api.reenviarVerificacionCorreo({ estudianteId: usuario.id });
          if (resultado.yaVerificado) {
            setEstado((actual) => ({
              ...actual,
              usuarioActual: actual.usuarioActual
                ? { ...actual.usuarioActual, emailVerificado: true }
                : actual.usuarioActual,
            }));
            return { ok: true, mensaje: "Tu correo ya estaba verificado." };
          }

          if (resultado.omitido) {
            return {
              ok: false,
              mensaje: "El backend todavía no tiene RESEND_API_KEY configurada para enviar correos.",
            };
          }

          return {
            ok: resultado.ok,
            mensaje: resultado.ok
              ? "Te enviamos un nuevo enlace de verificación."
              : "No se pudo enviar el correo de verificación.",
          };
        } catch (_error) {
          return { ok: false, mensaje: "No se pudo reenviar el correo de verificación." };
        }
      },
      cerrarSesion: () => {
        setEstado((actual) => ({ ...actual, usuarioActual: null }));
      },
      actualizarPerfil: (cambios) => {
        const cambiosNormalizados =
          "disponibilidadSemanal" in cambios
            ? {
                ...cambios,
                disponibilidadSemanal: normalizarDisponibilidadSemanal(cambios.disponibilidadSemanal),
              }
            : cambios;
        setEstado((actual) => ({
          ...actual,
          usuarioActual: actual.usuarioActual ? { ...actual.usuarioActual, ...cambiosNormalizados } : null,
        }));

        if (usuarioId) {
          api
            .actualizarPerfil(usuarioId, extraerPayloadPerfilApi(cambiosNormalizados))
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
          subtareas: normalizarSubtareas(tarea.subtareas),
        };
        const notificacionLocal: NotificacionItem = {
          id: crearId("notif"),
          tipo: "info",
          titulo: "Nueva tarea creada",
          mensaje: `Se agregó "${tarea.titulo}" para ${curso?.nombre ?? "tu curso"}.`,
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
                  actual.tareas.map((item) =>
                    item.id === tareaLocal.id
                      ? normalizarTareaApi(nuevaTarea, item.subtareas)
                      : item,
                  ),
                ),
              }));
            })
            .catch(() => {});

          persistirNotificacion(usuarioId, notificacionLocal);
        }
      },
      actualizarTarea: (tareaId, cambios) => {
        const cambiosNormalizados =
          "subtareas" in cambios
            ? { ...cambios, subtareas: normalizarSubtareas(cambios.subtareas) }
            : cambios;
        setEstado((actual) => ({
          ...actual,
          tareas: normalizarTareas(
            actual.tareas.map((tarea) => (tarea.id === tareaId ? { ...tarea, ...cambiosNormalizados } : tarea)),
          ),
        }));

        api.actualizarTarea(tareaId, extraerPayloadTareaApi(cambiosNormalizados)).catch(() => {});
      },
      alternarTareaCompletada: (tareaId) => {
        const tareaActual = estado.tareas.find((item) => item.id === tareaId);
        const notificacionLocal =
          tareaActual && usuarioId
            ? {
                id: crearId("notif"),
                tipo: "success" as const,
                titulo: tareaActual.estado === "completed" ? "Tarea reabierta" : "Tarea completada",
                mensaje: `"${tareaActual.titulo}" actualizó su estado en tu panel académico.`,
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
                    subtareas:
                      item.estado === "completed"
                        ? item.subtareas
                        : normalizarSubtareas(item.subtareas).map((subtarea) => ({
                            ...subtarea,
                            completada: true,
                          })),
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
      agregarSubtarea: (tareaId, titulo) => {
        const tituloLimpio = titulo.trim();
        if (!tituloLimpio) {
          return {
            ok: false,
            mensaje: "Escribe primero la subtarea que quieres agregar.",
          };
        }

        setEstado((actual) => ({
          ...actual,
          tareas: normalizarTareas(
            actual.tareas.map((tarea) =>
              tarea.id === tareaId
                ? {
                    ...tarea,
                    subtareas: [
                      ...normalizarSubtareas(tarea.subtareas),
                      { id: crearId("subtask"), titulo: tituloLimpio, completada: false },
                    ],
                  }
                : tarea,
            ),
          ),
        }));

        return {
          ok: true,
          mensaje: "Subtarea agregada al checklist.",
        };
      },
      alternarSubtarea: (tareaId, subtareaId) => {
        setEstado((actual) => ({
          ...actual,
          tareas: normalizarTareas(
            actual.tareas.map((tarea) =>
              tarea.id === tareaId
                ? {
                    ...tarea,
                    subtareas: normalizarSubtareas(tarea.subtareas).map((subtarea) =>
                      subtarea.id === subtareaId
                        ? { ...subtarea, completada: !subtarea.completada }
                        : subtarea,
                    ),
                  }
                : tarea,
            ),
          ),
        }));
      },
      eliminarSubtarea: (tareaId, subtareaId) => {
        setEstado((actual) => ({
          ...actual,
          tareas: normalizarTareas(
            actual.tareas.map((tarea) =>
              tarea.id === tareaId
                ? {
                    ...tarea,
                    subtareas: normalizarSubtareas(tarea.subtareas).filter(
                      (subtarea) => subtarea.id !== subtareaId,
                    ),
                  }
                : tarea,
            ),
          ),
        }));
      },
      posponerTarea: (tareaId, dias = 1) => {
        const tareaActual = estado.tareas.find((item) => item.id === tareaId);
        if (!tareaActual) {
          return {
            ok: false,
            mensaje: "No pude encontrar esa tarea para moverla.",
          };
        }

        const diasValidos = Math.max(1, Math.round(Number(dias) || 1));
        const nuevaFecha = format(addDays(parseISO(tareaActual.fechaEntrega), diasValidos), "yyyy-MM-dd");
        const notificacionLocal: NotificacionItem = {
          id: crearId("notif"),
          tipo: "info",
          titulo: "Entrega reprogramada",
          mensaje: `"${tareaActual.titulo}" ahora vence el ${formatearFechaCorta(nuevaFecha)}.`,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        setEstado((actual) => ({
          ...actual,
          tareas: normalizarTareas(
            actual.tareas.map((item) =>
              item.id === tareaId ? { ...item, fechaEntrega: nuevaFecha } : item,
            ),
          ),
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        api.actualizarTarea(tareaId, { fechaEntrega: nuevaFecha }).catch(() => {});

        if (usuarioId) {
          persistirNotificacion(usuarioId, notificacionLocal);
        }

        return {
          ok: true,
          mensaje: `Listo. La moví para ${formatearFechaCorta(nuevaFecha)}.`,
          nuevaFecha,
        };
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
          estado.usuarioActual?.disponibilidadSemanal,
        );

        if (resultado.horasProgramadas === 0) {
          return {
            ok: false,
            mensaje: "No encontré espacios libres antes de la entrega. Prueba con menos horas o mueve bloques en el planificador.",
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
              : `Reservé ${resultado.horasProgramadas}h para trabajar "${tareaObjetivo.titulo}" en espacios libres del calendario.`,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        registrarCambioPlanificador(estado.bloquesPlanificador);
        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: bloquesActualizados,
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        if (usuarioId) {
          guardarPlanificadorEnBackend(bloquesActualizados);
          persistirNotificacion(usuarioId, notificacionLocal);
        }

        return {
          ok: true,
          mensaje:
            resultado.horasProgramadas < horasSolicitadas
              ? `Se programaron ${resultado.horasProgramadas}h. No encontré más huecos libres por ahora.`
              : `Listo. Ya te reservé ${resultado.horasProgramadas}h para esa tarea en el calendario.`,
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
          estado.usuarioActual?.disponibilidadSemanal,
        );

        if (resultado.horasProgramadas === 0) {
          return {
            ok: false,
            mensaje: "No encontré espacios libres para ese curso. Prueba con menos horas o libera bloques en el planificador.",
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
              : `Reservé ${resultado.horasProgramadas}h de repaso general para ${cursoObjetivo.nombre}.`,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        registrarCambioPlanificador(estado.bloquesPlanificador);
        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: bloquesActualizados,
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        if (usuarioId) {
          guardarPlanificadorEnBackend(bloquesActualizados);
          persistirNotificacion(usuarioId, notificacionLocal);
        }

        return {
          ok: true,
          mensaje:
            resultado.horasProgramadas < horasSolicitadas
              ? `Se programaron ${resultado.horasProgramadas}h de repaso para el curso.`
              : `Listo. Ya te reservé ${resultado.horasProgramadas}h de repaso para ese curso.`,
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
      permisoNotificacionesNavegador,
      solicitarPermisoNotificacionesNavegador: async () => {
        if (typeof window === "undefined" || !("Notification" in window)) {
          setPermisoNotificacionesNavegador("unsupported");
          return "unsupported";
        }

        try {
          const permiso = await window.Notification.requestPermission();
          setPermisoNotificacionesNavegador(permiso);
          return permiso;
        } catch {
          return permisoNotificacionesNavegador;
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
                mensaje: "Inicia sesión para usar el asistente con Groq.",
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
      previsualizarReplanificacionHorario: ({
        alcance,
        objetivoId,
        diasBloqueados,
        jornada,
        modoTodo = "solo-calendarizado",
      }) =>
        resolverPlanificacionInteligenteBase({
          estado,
          alcance,
          objetivoId,
          diasBloqueados,
          jornada,
          modoTodo,
        }),
      replanificarHorarioInteligente: ({
        alcance,
        objetivoId,
        diasBloqueados,
        jornada,
        modoTodo = "solo-calendarizado",
      }) => {
        const diasRestringidos = [...new Set(diasBloqueados)].filter((dia) => dia >= 0 && dia <= 6);
        if (diasRestringidos.length >= 7) {
          return {
            ok: false,
            mensaje: "No puedo planificar si todos los días están bloqueados. Deja al menos un día disponible.",
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
            mensaje: "No encontré la tarea que quieres reorganizar.",
            resumen: [],
            bloquesCreados: 0,
            horasProgramadas: 0,
          };
        }

        if (alcance === "curso" && !cursoObjetivo) {
          return {
            ok: false,
            mensaje: "No encontré el curso que quieres reorganizar.",
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
          objetivos = construirObjetivosPlanificacionTodo(
            estado.cursos,
            estado.tareas,
            estado.examenes,
            estado.bloquesPlanificador,
            modoTodo,
          );
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
            mensaje:
              alcance === "todo" && modoTodo === "solo-calendarizado"
                ? "No encontré bloques de estudio ya calendarizados. Primero agrega una tarea o repaso al calendario, o elige incluir nuevos pendientes."
                : "No encontré tareas o repasos para reorganizar con esa opción.",
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
          disponibilidadSemanal: estado.usuarioActual?.disponibilidadSemanal,
        });

        if (resultado.horasProgramadas === 0) {
          return {
            ok: false,
            mensaje:
              "No encontré huecos libres con esas restricciones. Prueba liberando un día o usando una franja más flexible.",
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
            ? `Replanifiqué ${resultado.bloques.length} bloques de tareas y repasos.`
            : alcance === "tarea"
              ? `Reorganicé la tarea ${tareaObjetivo?.titulo ?? ""}.`
              : `Reorganicé el repaso de ${cursoObjetivo?.nombre ?? ""}.`;
        const notificacionLocal: NotificacionItem = {
          id: crearId("notif"),
          tipo: resultado.horasProgramadas < totalHorasSolicitadas ? "warning" : "success",
          titulo:
            resultado.horasProgramadas < totalHorasSolicitadas
              ? "Planificación aplicada parcialmente"
              : "Horario reorganizado con IA",
          mensaje: resumenPlanificacion,
          creadaEn: new Date().toISOString(),
          noLeida: true,
        };

        registrarCambioPlanificador(estado.bloquesPlanificador);
        setEstado((actual) => ({
          ...actual,
          fuenteAsistente: "sistema",
          bloquesPlanificador: bloquesActualizados,
          notificaciones: [notificacionLocal, ...actual.notificaciones],
        }));

        if (usuarioId) {
          guardarPlanificadorEnBackend(bloquesActualizados);
          persistirNotificacion(usuarioId, notificacionLocal);
        }

        return {
          ok: true,
          mensaje:
            resultado.horasProgramadas < totalHorasSolicitadas
              ? `Apliqué la planificación, pero solo encontré ${resultado.horasProgramadas}h libres de ${totalHorasSolicitadas}h posibles.`
              : `Listo. Reorganicé tu horario y reservé ${resultado.horasProgramadas}h en espacios libres.`,
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

        if (sonBloquesPlanificadorIguales(bloquesActualizados, estado.bloquesPlanificador)) {
          return;
        }

        registrarCambioPlanificador(estado.bloquesPlanificador);
        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.map((bloque) =>
            bloque.id === bloqueId ? { ...bloque, dia, horaInicio } : bloque,
          ),
        }));

        guardarPlanificadorEnBackend(bloquesActualizados);
      },
      actualizarBloquePlanificador: (bloqueId, cambios) => {
        const bloqueObjetivo = estado.bloquesPlanificador.find((bloque) => bloque.id === bloqueId);
        if (bloqueObjetivo?.tipo === "class") {
          return;
        }

        const bloquesActualizados = estado.bloquesPlanificador.map((bloque) =>
          bloque.id === bloqueId ? { ...bloque, ...cambios } : bloque,
        );

        if (sonBloquesPlanificadorIguales(bloquesActualizados, estado.bloquesPlanificador)) {
          return;
        }

        registrarCambioPlanificador(estado.bloquesPlanificador);
        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.map((bloque) =>
            bloque.id === bloqueId ? { ...bloque, ...cambios } : bloque,
          ),
        }));

        guardarPlanificadorEnBackend(bloquesActualizados);
      },
      eliminarBloquePlanificador: (bloqueId) => {
        const bloqueObjetivo = estado.bloquesPlanificador.find((bloque) => bloque.id === bloqueId);
        if (bloqueObjetivo?.tipo === "class") {
          return;
        }

        const bloquesActualizados = estado.bloquesPlanificador.filter((bloque) => bloque.id !== bloqueId);

        registrarCambioPlanificador(estado.bloquesPlanificador);
        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: actual.bloquesPlanificador.filter((bloque) => bloque.id !== bloqueId),
        }));

        guardarPlanificadorEnBackend(bloquesActualizados);
      },
      puedeDeshacerPlanificador: historialPlanificador.length > 0,
      puedeRehacerPlanificador: futuroPlanificador.length > 0,
      deshacerCambiosPlanificador: () => {
        const snapshotAnterior = historialPlanificador[historialPlanificador.length - 1];
        if (!snapshotAnterior) {
          return {
            ok: false,
            mensaje: "Por ahora no hay cambios del planner para deshacer.",
          };
        }

        const snapshotActual = clonarBloquesPlanificador(estado.bloquesPlanificador);
        const snapshotRestaurado = clonarBloquesPlanificador(snapshotAnterior);

        setHistorialPlanificador((actual) => actual.slice(0, -1));
        setFuturoPlanificador((actual) => [...actual, snapshotActual].slice(-30));
        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: snapshotRestaurado,
        }));
        guardarPlanificadorEnBackend(snapshotRestaurado);

        return {
          ok: true,
          mensaje: "Deshice el ultimo cambio del planificador.",
        };
      },
      rehacerCambiosPlanificador: () => {
        const snapshotSiguiente = futuroPlanificador[futuroPlanificador.length - 1];
        if (!snapshotSiguiente) {
          return {
            ok: false,
            mensaje: "Por ahora no hay cambios pendientes para rehacer.",
          };
        }

        const snapshotActual = clonarBloquesPlanificador(estado.bloquesPlanificador);
        const snapshotAplicado = clonarBloquesPlanificador(snapshotSiguiente);

        setFuturoPlanificador((actual) => actual.slice(0, -1));
        setHistorialPlanificador((actual) => [...actual, snapshotActual].slice(-30));
        setEstado((actual) => ({
          ...actual,
          bloquesPlanificador: snapshotAplicado,
        }));
        guardarPlanificadorEnBackend(snapshotAplicado);

        return {
          ok: true,
          mensaje: "Rehice el cambio mas reciente del planificador.",
        };
      },
    };
  }, [estado, futuroPlanificador, historialPlanificador, permisoNotificacionesNavegador]);

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
  return `Hace ${dias} días`;
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
        tareaId: tarea.id,
        cursoId: tarea.cursoId,
        prioridad: 0,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes === 0) {
      alertas.push({
        id: `smart-task-today-${tarea.id}`,
        titulo: `${tarea.titulo} vence hoy`,
        descripcion: `${curso?.nombre ?? "Tu curso"} necesita atención inmediata para que no se te pase.`,
        nivel: tarea.prioridad === "high" ? "critica" : "alta",
        tipo: "tarea",
        destino: `/app/tasks?focus=${tarea.id}`,
        tareaId: tarea.id,
        cursoId: tarea.cursoId,
        prioridad: tarea.prioridad === "high" ? 1 : 2,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes === 1 && tarea.progreso < 80) {
      alertas.push({
        id: `smart-task-soon-${tarea.id}`,
        titulo: `${tarea.titulo} vence mañana`,
        descripcion: `${curso?.nombre ?? "Tu curso"} aún va en ${tarea.progreso}%. Te conviene cerrarla hoy.`,
        nivel: "alta",
        tipo: "tarea",
        destino: `/app/tasks?focus=${tarea.id}`,
        tareaId: tarea.id,
        cursoId: tarea.cursoId,
        prioridad: 3,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes <= 3 && tarea.prioridad === "high" && tarea.progreso < 60) {
      alertas.push({
        id: `smart-task-priority-${tarea.id}`,
        titulo: `${tarea.titulo} ya debería avanzar`,
        descripcion: `${curso?.nombre ?? "Tu curso"} es prioridad alta y vence pronto. Mejor no dejarla para el último día.`,
        nivel: "media",
        tipo: "tarea",
        destino: `/app/tasks?focus=${tarea.id}`,
        tareaId: tarea.id,
        cursoId: tarea.cursoId,
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
        titulo: `${examen.titulo} está demasiado cerca`,
        descripcion: `${curso?.nombre ?? "Tu curso"} llega en ${diasRestantes === 0 ? "horas" : "1 día"} y tu preparación va en ${examen.preparacion}%.`,
        nivel: "critica",
        tipo: "examen",
        destino: `/app/exams?focus=${examen.id}`,
        examenId: examen.id,
        cursoId: examen.cursoId,
        prioridad: diasRestantes === 0 ? 0 : 1,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes <= 3 && examen.preparacion < 60) {
      alertas.push({
        id: `smart-exam-soon-${examen.id}`,
        titulo: `${examen.titulo} necesita repaso`,
        descripcion: `${curso?.nombre ?? "Tu curso"} está cerca y tu preparación aún no llega a una zona segura.`,
        nivel: "alta",
        tipo: "examen",
        destino: `/app/exams?focus=${examen.id}`,
        examenId: examen.id,
        cursoId: examen.cursoId,
        prioridad: 2,
        diasRestantes,
      });
      return;
    }

    if (diasRestantes <= 5 && bloquesCurso.length === 0) {
      alertas.push({
        id: `smart-exam-plan-${examen.id}`,
        titulo: `Aún no tienes bloques para ${examen.titulo}`,
        descripcion: `${curso?.nombre ?? "Tu curso"} se acerca y todavía no aparece en tu planificador.`,
        nivel: "media",
        tipo: "examen",
        destino: `/app/planner`,
        examenId: examen.id,
        cursoId: examen.cursoId,
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

