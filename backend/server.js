import "dotenv/config";
import cors from "cors";
import express from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import OpenAI from "openai";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
const puerto = Number(process.env.PORT || 4000);
const urlBaseDeDatos = process.env.DATABASE_URL;
const groqApiKey = process.env.GROQ_API_KEY;
const modeloGroq = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

app.use(cors());
app.use(express.json());

const pool = urlBaseDeDatos ? new Pool({ connectionString: urlBaseDeDatos }) : null;
const clienteGroq = groqApiKey
  ? new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

function crearHashContrasena(contrasena) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(contrasena, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function esHashSeguroContrasena(valor) {
  return typeof valor === "string" && valor.startsWith("scrypt$");
}

function verificarContrasena(contrasena, hashGuardado) {
  if (!esHashSeguroContrasena(hashGuardado)) {
    return false;
  }

  const [, salt, hashHex] = hashGuardado.split("$");
  const hashCalculado = scryptSync(contrasena, salt, 64);
  const hashOriginal = Buffer.from(hashHex, "hex");

  if (hashOriginal.length !== hashCalculado.length) {
    return false;
  }

  return timingSafeEqual(hashOriginal, hashCalculado);
}

function responderSinBase(response) {
  response.status(500).json({ mensaje: "DATABASE_URL no configurada." });
}

function mapearUsuario(row) {
  if (!row) return null;

  return {
    id: row.id,
    nombres: row.nombres,
    apellidos: row.apellidos,
    correo: row.correo,
    universidad: row.universidad,
    carrera: row.carrera,
    semestre: row.semestre,
    plan: row.plan ?? "gratis",
    horasDisponibles: row.horasDisponibles ?? null,
    metodoEstudio: row.metodoEstudio ?? null,
    tonoAsistente: row.tonoAsistente ?? "responsable",
    metas: row.metas ?? null,
    horasEstudioDiarias: row.horasEstudioDiarias ?? null,
    horasSueno: row.horasSueno ?? null,
    notificaciones: {
      tareas: row.notificacionesTareas ?? true,
      examenes: row.notificacionesExamenes ?? true,
      ia: row.notificacionesIa ?? true,
      semanal: row.notificacionesSemanal ?? true,
      correo: row.notificacionesCorreo ?? false,
    },
    aplicacion: {
      modoOscuro: row.aplicacionModoOscuro ?? false,
      googleCalendar: row.aplicacionGoogleCalendar ?? false,
      sugerenciasAutomaticas: row.aplicacionSugerenciasAutomaticas ?? true,
    },
  };
}

function construirInstruccionTono(tonoAsistente) {
  if (tonoAsistente === "amigable") {
    return "Adopta un tono amigable, cercano y alentador desde la primera respuesta. Usa al menos 1 emoji en casi todas las respuestas casuales, de saludo o de apoyo, y puedes llegar a 2 si suma calidez o claridad, sin exagerar ni sonar infantil. Habla como un asistente cercano para un estudiante peruano: usa de forma natural giros ligeros como 'bacan', 'tranqui', 'de una', 'todo bien', 'pilas', 'ojo' o 'chevere'. En saludos o respuestas breves, evita sonar neutro o demasiado formal; entra en confianza desde el arranque.";
  }

  if (tonoAsistente === "frio") {
    return "Adopta un tono frio, sobrio y directo. Ve al punto, evita emojis y reduce al minimo el lenguaje emocional.";
  }

  return "Adopta un tono responsable, claro y sereno. Organiza bien las ideas, prioriza utilidad practica y evita el exceso de emojis o informalidad.";
}

function mapearCurso(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    docente: row.docente,
    horario: row.horario,
    semestre: row.semestre,
    color: row.color,
    descripcion: row.descripcion,
  };
}

function mapearTarea(row) {
  return {
    id: row.id,
    cursoId: row.cursoId,
    titulo: row.titulo,
    descripcion: row.descripcion,
    fechaEntrega: row.fechaEntrega,
    prioridad: row.prioridad,
    estado: row.estado,
    horasEstimadas: Number(row.horasEstimadas),
    progreso: row.progreso,
  };
}

function mapearExamen(row) {
  return {
    id: row.id,
    cursoId: row.cursoId,
    titulo: row.titulo,
    fecha: row.fecha,
    hora: typeof row.hora === "string" ? row.hora.slice(0, 5) : row.hora,
    temas: row.temas ?? [],
    preparacion: row.preparacion,
  };
}

function mapearBloque(row) {
  return {
    id: row.id,
    dia: row.dia,
    horaInicio: Number(row.horaInicio),
    duracion: Number(row.duracion),
    titulo: row.titulo,
    cursoId: row.cursoId ?? undefined,
    color: row.color,
    tipo: row.tipo,
  };
}

function mapearNotificacion(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensaje: row.mensaje,
    creadaEn: row.creadaEn,
    noLeida: row.noLeida,
  };
}

function mapearMensajeChat(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    mensaje: row.mensaje,
    hora: row.hora,
    creadaEn: row.creadaEn,
  };
}

function convertirFechaAOrdenable(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return valor;
  if (valor instanceof Date) return valor.toISOString();
  return String(valor);
}

function formatearFechaRespuesta(valor) {
  if (!valor) return "sin fecha";
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

function normalizarTexto(valor) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function obtenerInicioDelDiaActual() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

function obtenerEstadoVisualTarea(tarea) {
  if (!tarea) return "pending";
  if (tarea.estado === "completed") {
    return "completed";
  }

  const fechaEntrega = tarea.fechaEntrega ? new Date(tarea.fechaEntrega) : null;
  if (fechaEntrega && !Number.isNaN(fechaEntrega.getTime()) && fechaEntrega < obtenerInicioDelDiaActual()) {
    return "overdue";
  }

  return tarea.estado ?? "pending";
}

function describirEstadoTarea(estado) {
  const mapaEstados = {
    pending: "pendiente",
    "in-progress": "en progreso",
    completed: "completada",
    overdue: "atrasada (ya vencio)",
  };

  return mapaEstados[estado] ?? String(estado || "pendiente");
}

function ordenarTareasPorUrgencia(a, b) {
  const prioridadEstado = {
    overdue: 0,
    "in-progress": 1,
    pending: 2,
    completed: 3,
  };
  const estadoA = a.estadoVisual ?? obtenerEstadoVisualTarea(a);
  const estadoB = b.estadoVisual ?? obtenerEstadoVisualTarea(b);
  const diferenciaEstado = (prioridadEstado[estadoA] ?? 9) - (prioridadEstado[estadoB] ?? 9);

  if (diferenciaEstado !== 0) {
    return diferenciaEstado;
  }

  return convertirFechaAOrdenable(a.fechaEntrega).localeCompare(convertirFechaAOrdenable(b.fechaEntrega));
}

function limpiarMarcadoresHerramientas(texto) {
  return String(texto || "")
    .replace(/<function(?:=|:)\s*[a-z_][a-z0-9_:-]*[^>]*>/gi, "")
    .replace(/<\/function>/gi, "")
    .replace(/<tool(?:=|:)\s*[a-z_][a-z0-9_:-]*[^>]*>/gi, "")
    .replace(/<\/tool>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extraerHerramientasSolicitadasEnTexto(texto, herramientasLocales) {
  const herramientas = new Set();
  const patronFuncion = /<function(?:=|:)\s*([a-z_][a-z0-9_]*)[^>]*>/gi;
  let coincidencia = patronFuncion.exec(texto || "");

  while (coincidencia) {
    const nombre = coincidencia[1];
    if (nombre && typeof herramientasLocales[nombre] === "function") {
      herramientas.add(nombre);
    }
    coincidencia = patronFuncion.exec(texto || "");
  }

  return [...herramientas];
}

function detectarSolicitudPreguntasPracticaAmbigua(mensaje, cursos) {
  const texto = normalizarTexto(mensaje || "");
  const pidePractica =
    texto.includes("preguntas de practica") ||
    texto.includes("pregunta de practica") ||
    texto.includes("practiquemos") ||
    (texto.includes("hazme preguntas") && texto.includes("practica"));

  if (!pidePractica) {
    return false;
  }

  const mencionaCurso = cursos.some((curso) => texto.includes(normalizarTexto(curso.nombre)));
  return !mencionaCurso;
}

function construirRespuestaAclaratoriaPractica(contexto) {
  const cursos = deduplicarPorClave(contexto.cursos, (curso) => `${curso.nombre}-${curso.docente}-${curso.horario}`).slice(0, 4);

  if (!cursos.length) {
    return "Claro. Puedo hacerte preguntas de practica, pero primero dime de que curso o tema quieres que sean.";
  }

  return `Claro. Te hago preguntas de practica, pero primero dime de que curso quieres que sean.\n\nPuedes elegir uno de estos: ${cursos.map((curso) => curso.nombre).join(", ")}.`;
}

function deduplicarPorClave(elementos, obtenerClave) {
  const vistos = new Set();
  return elementos.filter((elemento) => {
    const clave = obtenerClave(elemento);
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

function construirHistorialConversacion(mensajesChat, limite = 4) {
  return mensajesChat
    .slice(-limite)
    .map((mensaje) => `${mensaje.tipo === "user" ? "Usuario" : "Asistente"}: ${String(mensaje.mensaje).slice(0, 220)}`)
    .join("\n");
}

function construirResumenContextualTexto(contextoCompacto) {
  const secciones = [];

  if (contextoCompacto.usuario) {
    secciones.push(
      `Estudiante: ${contextoCompacto.usuario.nombres}, carrera ${contextoCompacto.usuario.carrera}, semestre ${contextoCompacto.usuario.semestre}.`,
    );
  }

  if (contextoCompacto.cursos.length) {
    secciones.push(
      `Cursos actuales: ${contextoCompacto.cursos
        .map((curso) => `${curso.nombre} (${curso.horario})`)
        .join("; ")}.`,
    );
  }

  secciones.push(
    `Resumen de tareas: ${contextoCompacto.resumenContextual.totalTareasActivas} activas en total; ${contextoCompacto.resumenContextual.totalTareasPendientes} pendientes vigentes y ${contextoCompacto.resumenContextual.totalTareasAtrasadas} atrasadas.`,
  );

  if (contextoCompacto.resumenContextual.tareasPendientes.length) {
    secciones.push(
      `Tareas pendientes vigentes: ${contextoCompacto.resumenContextual.tareasPendientes
        .map(
          (tarea) =>
            `${tarea.titulo} en ${tarea.curso}, vence ${convertirFechaAOrdenable(tarea.fechaEntrega)}, prioridad ${tarea.prioridad}, estado ${tarea.estadoDescripcion}, progreso ${tarea.progreso}%`,
        )
        .join("; ")}.`,
    );
  } else {
    secciones.push("No hay tareas pendientes vigentes registradas.");
  }

  if (contextoCompacto.resumenContextual.tareasAtrasadas.length) {
    secciones.push(
      `Tareas atrasadas o ya vencidas: ${contextoCompacto.resumenContextual.tareasAtrasadas
        .map(
          (tarea) =>
            `${tarea.titulo} en ${tarea.curso}, vencio ${convertirFechaAOrdenable(tarea.fechaEntrega)}, prioridad ${tarea.prioridad}, estado ${tarea.estadoDescripcion}, progreso ${tarea.progreso}%`,
        )
        .join("; ")}.`,
    );
  } else {
    secciones.push("No hay tareas atrasadas registradas.");
  }

  if (contextoCompacto.resumenContextual.examenesProximos.length) {
    secciones.push(
      `Examenes proximos reales: ${contextoCompacto.resumenContextual.examenesProximos
        .map(
          (examen) =>
            `${examen.titulo} de ${examen.curso} el ${convertirFechaAOrdenable(examen.fecha)} a las ${examen.hora}, preparacion ${examen.preparacion}%`,
        )
        .join("; ")}.`,
    );
  } else {
    secciones.push("No hay examenes proximos registrados.");
  }

  return secciones.join("\n");
}

function ajustarRespuestaAsistente(mensaje) {
  const texto = limpiarMarcadoresHerramientas(mensaje);
  if (!texto) {
    return "No pude darte una respuesta clara esta vez. Intenta preguntarme de nuevo con otras palabras o dime si quieres que te ayude con tareas, cursos, examenes o estudio.";
  }

  const textoNormalizado = normalizarTexto(texto);
  const patronesConfusion = [
    "no entendi",
    "no entiendo",
    "no comprendo",
    "no me quedo claro",
    "no tengo claro",
  ];

  if (patronesConfusion.some((patron) => textoNormalizado.includes(patron))) {
    return "No lo capte del todo. Puedes preguntarmelo de nuevo con otras palabras o decirme si quieres ayuda con tus tareas, cursos, examenes o con una explicacion academica.";
  }

  return texto;
}

function construirDatosHerramientas(contexto) {
  const cursos = deduplicarPorClave(contexto.cursos, (curso) => `${curso.nombre}-${curso.docente}-${curso.horario}`);
  const cursosPorId = new Map(cursos.map((curso) => [curso.id, curso]));
  const tareasActivas = deduplicarPorClave(
    contexto.tareas
      .map((tarea) => ({
        ...tarea,
        estadoVisual: obtenerEstadoVisualTarea(tarea),
      }))
      .filter((tarea) => tarea.estadoVisual !== "completed"),
    (tarea) => `${tarea.titulo}-${tarea.cursoId}-${convertirFechaAOrdenable(tarea.fechaEntrega)}`,
  )
    .sort(ordenarTareasPorUrgencia);
  const tareasPendientes = tareasActivas.filter((tarea) => tarea.estadoVisual !== "overdue");
  const tareasAtrasadas = tareasActivas.filter((tarea) => tarea.estadoVisual === "overdue");
  const examenesProximos = deduplicarPorClave(
    contexto.examenes,
    (examen) => `${examen.titulo}-${examen.cursoId}-${convertirFechaAOrdenable(examen.fecha)}-${examen.hora}`,
  )
    .sort((a, b) => convertirFechaAOrdenable(a.fecha).localeCompare(convertirFechaAOrdenable(b.fecha)))
    .slice(0, 2);

  return { cursos, cursosPorId, tareasActivas, tareasPendientes, tareasAtrasadas, examenesProximos };
}

function construirHerramientasLocales(contexto) {
  const { cursos, cursosPorId, tareasActivas, tareasPendientes, tareasAtrasadas, examenesProximos } =
    construirDatosHerramientas(contexto);
  const mapearTareaHerramienta = (tarea) => ({
    titulo: tarea.titulo,
    curso: cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado",
    fechaEntrega: formatearFechaRespuesta(tarea.fechaEntrega),
    prioridad: tarea.prioridad,
    estado: tarea.estadoVisual,
    estadoDescripcion: describirEstadoTarea(tarea.estadoVisual),
    vencida: tarea.estadoVisual === "overdue",
    progreso: tarea.progreso,
  });

  return {
    obtener_cursos_actuales: () => ({
      total: cursos.length,
      cursos: cursos.slice(0, 4).map((curso) => ({
        nombre: curso.nombre,
        docente: curso.docente,
        horario: curso.horario,
        semestre: curso.semestre,
      })),
    }),
    listar_tareas_pendientes: () => ({
      total: tareasActivas.length,
      totalActivas: tareasActivas.length,
      totalPendientes: tareasPendientes.length,
      totalPendientesVigentes: tareasPendientes.length,
      totalAtrasadas: tareasAtrasadas.length,
      notaEstados:
        "Si una tarea aparece con estado overdue, significa que esta atrasada y su fecha de entrega ya vencio.",
      notaConteo:
        "Las listas incluidas aqui son una muestra corta. Para responder cantidades usa totalActivas, totalPendientesVigentes y totalAtrasadas.",
      tareasMuestra: tareasActivas.slice(0, 4).map(mapearTareaHerramienta),
      tareasAtrasadasMuestra: tareasAtrasadas.slice(0, 3).map(mapearTareaHerramienta),
    }),
    listar_examenes_proximos: () => ({
      total: examenesProximos.length,
      examenes: examenesProximos.map((examen) => ({
        titulo: examen.titulo,
        curso: cursosPorId.get(examen.cursoId)?.nombre ?? "Curso no identificado",
        fecha: formatearFechaRespuesta(examen.fecha),
        hora: examen.hora,
        preparacion: examen.preparacion,
      })),
    }),
    obtener_prioridades_hoy: () => ({
      prioridades: [
        ...tareasAtrasadas.slice(0, 2).map((tarea) => ({
          tipo: "tarea_atrasada",
          texto: `${tarea.titulo} en ${cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado"}`,
          fecha: formatearFechaRespuesta(tarea.fechaEntrega),
          prioridad: tarea.prioridad,
          estado: tarea.estadoVisual,
          estadoDescripcion: describirEstadoTarea(tarea.estadoVisual),
          progreso: tarea.progreso,
        })),
        ...tareasPendientes.slice(0, 2).map((tarea) => ({
          tipo: "tarea",
          texto: `${tarea.titulo} en ${cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado"}`,
          fecha: formatearFechaRespuesta(tarea.fechaEntrega),
          prioridad: tarea.prioridad,
          estado: tarea.estadoVisual,
          estadoDescripcion: describirEstadoTarea(tarea.estadoVisual),
          progreso: tarea.progreso,
        })),
        ...examenesProximos.slice(0, 2).map((examen) => ({
          tipo: "examen",
          texto: `${examen.titulo} de ${cursosPorId.get(examen.cursoId)?.nombre ?? "Curso no identificado"}`,
          fecha: formatearFechaRespuesta(examen.fecha),
          preparacion: examen.preparacion,
        })),
      ],
    }),
    obtener_contexto_general: () => ({
      estudiante: contexto.usuario
        ? {
            nombres: contexto.usuario.nombres,
            carrera: contexto.usuario.carrera,
            semestre: contexto.usuario.semestre,
          }
        : null,
      cursos: cursos.length,
      tareasActivas: tareasActivas.length,
      tareasPendientes: tareasPendientes.length,
      tareasPendientesVigentes: tareasPendientes.length,
      tareasAtrasadas: tareasAtrasadas.length,
      examenesProximos: examenesProximos.length,
      bloquesEstudio: contexto.bloquesPlanificador.filter((bloque) => bloque.tipo === "study").length,
    }),
  };
}

function ejecutarHerramientasBase(herramientasLocales) {
  return {
    obtener_contexto_general: herramientasLocales.obtener_contexto_general(),
    obtener_cursos_actuales: herramientasLocales.obtener_cursos_actuales(),
    listar_tareas_pendientes: herramientasLocales.listar_tareas_pendientes(),
    listar_examenes_proximos: herramientasLocales.listar_examenes_proximos(),
    obtener_prioridades_hoy: herramientasLocales.obtener_prioridades_hoy(),
  };
}

function obtenerDefinicionesHerramientas() {
  return [
    {
      type: "function",
      function: {
        name: "obtener_cursos_actuales",
        description: "Obtiene la lista de cursos actuales del estudiante con docente y horario.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "listar_tareas_pendientes",
        description: "Obtiene las tareas pendientes reales del estudiante.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "listar_examenes_proximos",
        description: "Obtiene los examenes proximos reales del estudiante.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "obtener_prioridades_hoy",
        description: "Obtiene las prioridades academicas actuales del estudiante usando tareas y examenes cercanos.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "obtener_contexto_general",
        description: "Obtiene un resumen general del estado academico del estudiante.",
        parameters: { type: "object", properties: {} },
      },
    },
  ];
}

function construirContextoIA(contexto) {
  const { cursos, cursosPorId, tareasActivas, tareasPendientes, tareasAtrasadas, examenesProximos } =
    construirDatosHerramientas(contexto);
  const mapearTareaContexto = (tarea) => ({
    titulo: tarea.titulo,
    curso: cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado",
    fechaEntrega: tarea.fechaEntrega,
    prioridad: tarea.prioridad,
    estado: tarea.estadoVisual,
    estadoDescripcion: describirEstadoTarea(tarea.estadoVisual),
    progreso: tarea.progreso,
  });

  return {
    usuario: contexto.usuario
      ? {
          nombres: contexto.usuario.nombres,
          carrera: contexto.usuario.carrera,
          semestre: contexto.usuario.semestre,
          horasDisponibles: contexto.usuario.horasDisponibles,
          metodoEstudio: contexto.usuario.metodoEstudio,
          tonoAsistente: contexto.usuario.tonoAsistente,
          horasEstudioDiarias: contexto.usuario.horasEstudioDiarias,
          horasSueno: contexto.usuario.horasSueno,
          plan: contexto.usuario.plan,
        }
      : null,
    cursos: cursos.slice(0, 4).map((curso) => ({
      id: curso.id,
      nombre: curso.nombre,
      docente: curso.docente,
      horario: curso.horario,
      color: curso.color,
    })),
    tareasMuestra: tareasActivas.slice(0, 4).map((tarea) => ({
      id: tarea.id,
      cursoId: tarea.cursoId,
      cursoNombre: cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado",
      titulo: tarea.titulo,
      fechaEntrega: tarea.fechaEntrega,
      prioridad: tarea.prioridad,
      estado: tarea.estadoVisual,
      estadoDescripcion: describirEstadoTarea(tarea.estadoVisual),
      progreso: tarea.progreso,
      horasEstimadas: tarea.horasEstimadas,
    })),
    examenes: contexto.examenes.slice(0, 3).map((examen) => ({
      id: examen.id,
      cursoId: examen.cursoId,
      cursoNombre: cursosPorId.get(examen.cursoId)?.nombre ?? "Curso no identificado",
      titulo: examen.titulo,
      fecha: examen.fecha,
      hora: examen.hora,
      temas: examen.temas,
      preparacion: examen.preparacion,
    })),
    bloquesPlanificador: contexto.bloquesPlanificador.slice(0, 4).map((bloque) => ({
      dia: bloque.dia,
      horaInicio: bloque.horaInicio,
      duracion: bloque.duracion,
      titulo: bloque.titulo,
      cursoId: bloque.cursoId,
      cursoNombre: bloque.cursoId ? cursosPorId.get(bloque.cursoId)?.nombre ?? "Curso no identificado" : null,
      tipo: bloque.tipo,
    })),
    resumenContextual: {
      totalCursos: cursos.length,
      totalTareas: contexto.tareas.length,
      totalTareasActivas: tareasActivas.length,
      totalTareasPendientes: tareasPendientes.length,
      totalTareasPendientesVigentes: tareasPendientes.length,
      totalTareasAtrasadas: tareasAtrasadas.length,
      notaConteo:
        "Para responder cantidades usa estos totales. Las listas de tareas del contexto son solo una muestra corta.",
      tareasPendientes: tareasPendientes.slice(0, 3).map(mapearTareaContexto),
      tareasAtrasadas: tareasAtrasadas.slice(0, 3).map(mapearTareaContexto),
      examenesProximos: examenesProximos.slice(0, 2).map((examen) => ({
        titulo: examen.titulo,
        curso: cursosPorId.get(examen.cursoId)?.nombre ?? "Curso no identificado",
        fecha: examen.fecha,
        hora: examen.hora,
        preparacion: examen.preparacion,
      })),
    },
  };
}

async function generarRespuestaConIA({ mensaje, contexto }) {
  if (!clienteGroq) {
    throw new Error("GROQ_API_KEY no configurada en el backend.");
  }

  const contextoCompacto = construirContextoIA(contexto);
  const resumenContextualTexto = construirResumenContextualTexto(contextoCompacto);
  const historialConversacion = construirHistorialConversacion(contexto.mensajesChat);
  const herramientasLocales = construirHerramientasLocales(contexto);
  const herramientasBase = ejecutarHerramientasBase(herramientasLocales);
  const instruccionTono = construirInstruccionTono(contextoCompacto.usuario?.tonoAsistente);
  const messages = [
    {
      role: "system",
      content:
        `Eres StudyFlow AI, un asistente academico universitario en espanol. Responde con tono claro, util, conversacional, humano y profesional. ${instruccionTono} Debes basarte en los datos reales del sistema y en las herramientas disponibles. No inventes datos del estudiante. Si el usuario pregunta por tareas, cursos, examenes, prioridades, seguimiento de lo hablado o referencias como 'eso', 'esas tareas', 'lo anterior', debes apoyarte en el historial reciente y en los resultados reales de herramientas antes de responder. Cuando hables de cantidades, usa siempre los totales explicitos del contexto y de las herramientas; no infieras cantidades por el largo de listas de muestra o preview porque pueden venir truncadas. Si aplica, distingue entre tareas activas, pendientes vigentes y atrasadas. Nunca digas que falta informacion si ya existe en el contexto o en las herramientas base cargadas. Evita sonar como bot automatico o menu fijo; responde como un asesor academico que recuerda la conversacion.`,
    },
    {
      role: "system",
      content:
        `Contexto compacto del estudiante:\n${JSON.stringify(contextoCompacto)}\n\n` +
        `Resumen humano del contexto:\n${resumenContextualTexto}\n\n` +
        `Historial reciente de la conversacion:\n${historialConversacion || "Sin mensajes previos relevantes."}\n\n` +
        `Resultados de herramientas base ya consultadas para este turno:\n${JSON.stringify(herramientasBase)}`,
    },
    ...contexto.mensajesChat.slice(-2).map((item) => ({
      role: item.tipo === "user" ? "user" : "assistant",
      content: String(item.mensaje).slice(0, 500),
    })),
    {
      role: "user",
      content: mensaje,
    },
  ];

  const primeraRespuesta = await clienteGroq.chat.completions.create({
    model: modeloGroq,
    messages,
    tools: obtenerDefinicionesHerramientas(),
    tool_choice: "auto",
    temperature: 0.3,
  });

  const opcionInicial = primeraRespuesta.choices[0]?.message;
  if (!opcionInicial) {
    throw new Error("Groq no devolvio una respuesta valida.");
  }

  if (opcionInicial.tool_calls?.length) {
    messages.push(opcionInicial);

    for (const toolCall of opcionInicial.tool_calls) {
      const nombreFuncion = toolCall.function?.name;
      const herramienta = nombreFuncion ? herramientasLocales[nombreFuncion] : null;

      if (!herramienta) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: `Herramienta no disponible: ${nombreFuncion}` }),
        });
        continue;
      }

      const resultado = herramienta();
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(resultado),
      });
    }

    const segundaRespuesta = await clienteGroq.chat.completions.create({
      model: modeloGroq,
      messages,
      temperature: 0.3,
    });

    const contenidoFinal = segundaRespuesta.choices[0]?.message?.content?.trim();
    if (!contenidoFinal) {
      throw new Error("Groq no devolvio contenido despues de usar herramientas.");
    }

    return {
      mensaje: ajustarRespuestaAsistente(contenidoFinal),
      fuente: "groq",
    };
  }

  return {
    mensaje: ajustarRespuestaAsistente(
      opcionInicial.content?.trim() ||
        "No pude generar una respuesta util en este momento. Intenta reformular tu solicitud.",
    ),
    fuente: "groq",
  };
}

function construirCamposPerfil(body) {
  const campos = [];
  const valores = [];
  const mapa = {
    nombres: "nombres",
    apellidos: "apellidos",
    correo: "correo",
    universidad: "universidad",
    carrera: "carrera",
    semestre: "semestre",
    plan: "plan",
    horasDisponibles: "horas_disponibles",
    metodoEstudio: "metodo_estudio",
    tonoAsistente: "tono_asistente",
    metas: "metas",
    horasEstudioDiarias: "horas_estudio_diarias",
    horasSueno: "horas_sueno",
  };

  Object.entries(mapa).forEach(([clave, columna]) => {
    if (body[clave] === undefined) return;
    valores.push(body[clave]);
    campos.push(`${columna} = $${valores.length}`);
  });

  if (body.notificaciones) {
    const notificaciones = {
      tareas: "notif_tareas",
      examenes: "notif_examenes",
      ia: "notif_ia",
      semanal: "notif_semanal",
      correo: "notif_correo",
    };

    Object.entries(notificaciones).forEach(([clave, columna]) => {
      if (body.notificaciones[clave] === undefined) return;
      valores.push(body.notificaciones[clave]);
      campos.push(`${columna} = $${valores.length}`);
    });
  }

  if (body.aplicacion) {
    const aplicacion = {
      modoOscuro: "app_modo_oscuro",
      googleCalendar: "app_google_calendar",
      sugerenciasAutomaticas: "app_sugerencias_automaticas",
    };

    Object.entries(aplicacion).forEach(([clave, columna]) => {
      if (body.aplicacion[clave] === undefined) return;
      valores.push(body.aplicacion[clave]);
      campos.push(`${columna} = $${valores.length}`);
    });
  }

  return { campos, valores };
}

async function obtenerContextoEstudiante(estudianteId) {
  const [usuario, cursos, tareas, examenes, bloquesPlanificador, notificaciones, mensajesChat] =
    await Promise.all([
      pool.query(
        `
        select
          id,
          nombres,
          apellidos,
          correo,
          universidad,
          carrera,
          semestre,
          plan,
          horas_disponibles as "horasDisponibles",
          metodo_estudio as "metodoEstudio",
          tono_asistente as "tonoAsistente",
          metas,
          horas_estudio_diarias as "horasEstudioDiarias",
          horas_sueno as "horasSueno",
          notif_tareas as "notificacionesTareas",
          notif_examenes as "notificacionesExamenes",
          notif_ia as "notificacionesIa",
          notif_semanal as "notificacionesSemanal",
          notif_correo as "notificacionesCorreo",
          app_modo_oscuro as "aplicacionModoOscuro",
          app_google_calendar as "aplicacionGoogleCalendar",
          app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas"
        from estudiantes
        where id = $1
        `,
        [estudianteId],
      ),
      pool.query(
        `
        select
          id,
          nombre,
          docente,
          horario_texto as horario,
          semestre,
          color,
          descripcion
        from cursos
        where estudiante_id = $1
        order by nombre asc
        `,
        [estudianteId],
      ),
      pool.query(
        `
        select
          id,
          curso_id as "cursoId",
          titulo,
          descripcion,
          fecha_entrega as "fechaEntrega",
          prioridad,
          estado,
          horas_estimadas as "horasEstimadas",
          progreso
        from tareas
        where estudiante_id = $1
        order by fecha_entrega asc
        `,
        [estudianteId],
      ),
      pool.query(
        `
        select
          id,
          curso_id as "cursoId",
          titulo,
          fecha_examen as fecha,
          hora_examen as hora,
          temas,
          preparacion
        from examenes
        where estudiante_id = $1
        order by fecha_examen asc
        `,
        [estudianteId],
      ),
      pool.query(
        `
        select
          id,
          curso_id as "cursoId",
          dia_semana as dia,
          hora_inicio as "horaInicio",
          horas_duracion as duracion,
          titulo,
          color,
          tipo_bloque as tipo
        from bloques_planificador
        where estudiante_id = $1
        order by dia_semana asc, hora_inicio asc
        `,
        [estudianteId],
      ),
      pool.query(
        `
        select
          id,
          tipo,
          titulo,
          mensaje,
          no_leida as "noLeida",
          creado_en as "creadaEn"
        from notificaciones
        where estudiante_id = $1
        order by creado_en desc
        `,
        [estudianteId],
      ),
      pool.query(
        `
        select
          id,
          rol as tipo,
          mensaje,
          to_char(creado_en, 'HH24:MI') as hora,
          creado_en as "creadaEn"
        from mensajes_chat
        where estudiante_id = $1
        order by creado_en asc
        `,
        [estudianteId],
      ),
    ]);

  return {
    usuario: mapearUsuario(usuario.rows[0] ?? null),
    cursos: cursos.rows.map(mapearCurso),
    tareas: tareas.rows.map(mapearTarea),
    examenes: examenes.rows.map(mapearExamen),
    bloquesPlanificador: bloquesPlanificador.rows.map(mapearBloque),
    notificaciones: notificaciones.rows.map(mapearNotificacion),
    mensajesChat: mensajesChat.rows.map(mapearMensajeChat),
  };
}

app.post("/api/auth/login", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { correo, contrasena } = request.body;

  try {
    const resultado = await pool.query(
      `
      select
        id,
        nombres,
        apellidos,
        correo,
        universidad,
        carrera,
        semestre,
        plan,
        horas_disponibles as "horasDisponibles",
        metodo_estudio as "metodoEstudio",
        tono_asistente as "tonoAsistente",
        metas,
        horas_estudio_diarias as "horasEstudioDiarias",
        horas_sueno as "horasSueno",
        notif_tareas as "notificacionesTareas",
        notif_examenes as "notificacionesExamenes",
        notif_ia as "notificacionesIa",
        notif_semanal as "notificacionesSemanal",
        notif_correo as "notificacionesCorreo",
        app_modo_oscuro as "aplicacionModoOscuro",
        app_google_calendar as "aplicacionGoogleCalendar",
        app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas",
        hash_contrasena
      from estudiantes
      where lower(correo) = lower($1)
      limit 1
      `,
      [correo],
    );

    const usuario = resultado.rows[0];
    if (!usuario) {
      response.json({ usuario: null });
      return;
    }

    const autenticado = esHashSeguroContrasena(usuario.hash_contrasena)
      ? verificarContrasena(contrasena, usuario.hash_contrasena)
      : usuario.hash_contrasena === contrasena;

    if (!autenticado) {
      response.json({ usuario: null });
      return;
    }

    if (!esHashSeguroContrasena(usuario.hash_contrasena)) {
      const nuevoHash = crearHashContrasena(contrasena);
      await pool.query("update estudiantes set hash_contrasena = $1 where id = $2", [nuevoHash, usuario.id]);
    }

    response.json({ usuario: mapearUsuario(usuario) });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo iniciar sesion.", error: error.message });
  }
});

app.post("/api/auth/register", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { nombres, apellidos, correo, contrasena, universidad, carrera, semestre, plan = "gratis" } = request.body;

  try {
    const existeUsuario = await pool.query(
      "select id from estudiantes where lower(correo) = lower($1) limit 1",
      [correo],
    );

    if (existeUsuario.rows[0]) {
      response.status(409).json({ mensaje: "Ya existe una cuenta registrada con ese correo." });
      return;
    }

    const hashContrasena = crearHashContrasena(contrasena);
    const resultado = await pool.query(
      `
      insert into estudiantes (
        nombres,
        apellidos,
        correo,
        hash_contrasena,
        universidad,
        carrera,
        semestre,
        plan,
        horas_disponibles,
        metodo_estudio,
        tono_asistente,
        metas,
        horas_estudio_diarias,
        horas_sueno,
        notif_tareas,
        notif_examenes,
        notif_ia,
        notif_semanal,
        notif_correo,
        app_modo_oscuro,
        app_google_calendar,
        app_sugerencias_automaticas
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, '4-6', 'pomodoro', 'responsable', '', 4, 8, true, true, true, true, false, false, false, true)
      returning
        id,
        nombres,
        apellidos,
        correo,
        universidad,
        carrera,
        semestre,
        plan,
        horas_disponibles as "horasDisponibles",
        metodo_estudio as "metodoEstudio",
        tono_asistente as "tonoAsistente",
        metas,
        horas_estudio_diarias as "horasEstudioDiarias",
        horas_sueno as "horasSueno",
        notif_tareas as "notificacionesTareas",
        notif_examenes as "notificacionesExamenes",
        notif_ia as "notificacionesIa",
        notif_semanal as "notificacionesSemanal",
        notif_correo as "notificacionesCorreo",
        app_modo_oscuro as "aplicacionModoOscuro",
        app_google_calendar as "aplicacionGoogleCalendar",
        app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas"
      `,
      [nombres, apellidos, correo, hashContrasena, universidad, carrera, semestre, plan],
    );

    response.status(201).json({ usuario: mapearUsuario(resultado.rows[0]) });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo registrar el usuario.", error: error.message });
  }
});

app.get("/api/salud", async (_request, response) => {
  if (!pool) {
    response.json({ ok: true, baseDeDatos: "no-configurada" });
    return;
  }

  try {
    await pool.query("select 1");
    response.json({ ok: true, baseDeDatos: "conectada" });
  } catch (error) {
    response.status(500).json({ ok: false, baseDeDatos: "error", mensaje: error.message });
  }
});

app.get("/api/resumen-panel/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { estudianteId } = request.params;

  try {
    const [tareas, examenes, horasEstudio] = await Promise.all([
      pool.query(
        "select count(*)::int as total from tareas where estudiante_id = $1 and estado <> 'completed'",
        [estudianteId],
      ),
      pool.query(
        "select count(*)::int as total from examenes where estudiante_id = $1 and fecha_examen >= current_date",
        [estudianteId],
      ),
      pool.query(
        "select coalesce(sum(horas_duracion), 0)::float as total from bloques_planificador where estudiante_id = $1 and tipo_bloque = 'study'",
        [estudianteId],
      ),
    ]);

    response.json({
      tareasPendientes: tareas.rows[0]?.total ?? 0,
      examenesProximos: examenes.rows[0]?.total ?? 0,
      horasEstudioSugeridas: horasEstudio.rows[0]?.total ?? 0,
    });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo obtener el resumen.", error: error.message });
  }
});

app.get("/api/contexto/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    const contexto = await obtenerContextoEstudiante(request.params.estudianteId);
    response.json(contexto);
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo cargar el contexto.", error: error.message });
  }
});

app.patch("/api/perfil/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { estudianteId } = request.params;
  const { campos, valores } = construirCamposPerfil(request.body);

  if (!campos.length) {
    response.status(400).json({ mensaje: "No se enviaron cambios validos." });
    return;
  }

  valores.push(estudianteId);

  try {
    const resultado = await pool.query(
      `
      update estudiantes
      set ${campos.join(", ")}
      where id = $${valores.length}
      returning
        id,
        nombres,
        apellidos,
        correo,
        universidad,
        carrera,
        semestre,
        plan,
        horas_disponibles as "horasDisponibles",
        metodo_estudio as "metodoEstudio",
        tono_asistente as "tonoAsistente",
        metas,
        horas_estudio_diarias as "horasEstudioDiarias",
        horas_sueno as "horasSueno",
        notif_tareas as "notificacionesTareas",
        notif_examenes as "notificacionesExamenes",
        notif_ia as "notificacionesIa",
        notif_semanal as "notificacionesSemanal",
        notif_correo as "notificacionesCorreo",
        app_modo_oscuro as "aplicacionModoOscuro",
        app_google_calendar as "aplicacionGoogleCalendar",
        app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas"
      `,
      valores,
    );

    response.json({ usuario: mapearUsuario(resultado.rows[0]) });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo actualizar el perfil.", error: error.message });
  }
});

app.post("/api/cursos", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { estudianteId, nombre, docente, horario, semestre, color, descripcion } = request.body;

  try {
    const resultado = await pool.query(
      `
      insert into cursos (
        estudiante_id,
        nombre,
        docente,
        horario_texto,
        semestre,
        color,
        descripcion
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning
        id,
        nombre,
        docente,
        horario_texto as horario,
        semestre,
        color,
        descripcion
      `,
      [estudianteId, nombre, docente, horario, semestre, color, descripcion],
    );

    response.status(201).json(mapearCurso(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo crear el curso.", error: error.message });
  }
});

app.patch("/api/cursos/:cursoId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { cursoId } = request.params;
  const campos = [];
  const valores = [];
  const mapa = {
    nombre: "nombre",
    docente: "docente",
    horario: "horario_texto",
    semestre: "semestre",
    color: "color",
    descripcion: "descripcion",
  };

  Object.entries(request.body).forEach(([clave, valor]) => {
    const columna = mapa[clave];
    if (!columna) return;
    valores.push(valor);
    campos.push(`${columna} = $${valores.length}`);
  });

  if (!campos.length) {
    response.status(400).json({ mensaje: "No se enviaron cambios validos." });
    return;
  }

  valores.push(cursoId);

  try {
    const resultado = await pool.query(
      `
      update cursos
      set ${campos.join(", ")}
      where id = $${valores.length}
      returning
        id,
        nombre,
        docente,
        horario_texto as horario,
        semestre,
        color,
        descripcion
      `,
      valores,
    );

    if (!resultado.rows[0]) {
      response.status(404).json({ mensaje: "Curso no encontrado." });
      return;
    }

    response.json(mapearCurso(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo actualizar el curso.", error: error.message });
  }
});

app.delete("/api/cursos/:cursoId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    await pool.query("delete from cursos where id = $1", [request.params.cursoId]);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo eliminar el curso.", error: error.message });
  }
});

app.get("/api/tareas/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    const resultado = await pool.query(
      `
      select
        t.id,
        t.titulo,
        t.descripcion,
        t.estado,
        t.prioridad,
        t.progreso,
        t.horas_estimadas as "horasEstimadas",
        t.fecha_entrega as "fechaEntrega",
        c.id as "cursoId",
        c.nombre as "cursoNombre"
      from tareas t
      join cursos c on c.id = t.curso_id
      where t.estudiante_id = $1
      order by t.fecha_entrega asc
      `,
      [request.params.estudianteId],
    );

    response.json(resultado.rows.map((row) => ({ ...mapearTarea(row), cursoNombre: row.cursoNombre })));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudieron listar las tareas.", error: error.message });
  }
});

app.post("/api/tareas", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const {
    estudianteId,
    cursoId,
    titulo,
    descripcion,
    fechaEntrega,
    prioridad,
    horasEstimadas,
  } = request.body;

  try {
    const resultado = await pool.query(
      `
      insert into tareas (
        estudiante_id,
        curso_id,
        titulo,
        descripcion,
        fecha_entrega,
        prioridad,
        horas_estimadas
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning
        id,
        curso_id as "cursoId",
        titulo,
        descripcion,
        fecha_entrega as "fechaEntrega",
        prioridad,
        estado,
        horas_estimadas as "horasEstimadas",
        progreso
      `,
      [estudianteId, cursoId, titulo, descripcion, fechaEntrega, prioridad, horasEstimadas],
    );

    response.status(201).json(mapearTarea(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo crear la tarea.", error: error.message });
  }
});

app.patch("/api/tareas/:tareaId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { tareaId } = request.params;
  const campos = [];
  const valores = [];
  const mapa = {
    titulo: "titulo",
    descripcion: "descripcion",
    fechaEntrega: "fecha_entrega",
    prioridad: "prioridad",
    estado: "estado",
    horasEstimadas: "horas_estimadas",
    progreso: "progreso",
  };

  Object.entries(request.body).forEach(([clave, valor]) => {
    const columna = mapa[clave];
    if (!columna) return;
    valores.push(valor);
    campos.push(`${columna} = $${valores.length}`);
  });

  if (!campos.length) {
    response.status(400).json({ mensaje: "No se enviaron cambios validos." });
    return;
  }

  valores.push(tareaId);

  try {
    const resultado = await pool.query(
      `
      update tareas
      set ${campos.join(", ")}
      where id = $${valores.length}
      returning
        id,
        curso_id as "cursoId",
        titulo,
        descripcion,
        fecha_entrega as "fechaEntrega",
        prioridad,
        estado,
        horas_estimadas as "horasEstimadas",
        progreso
      `,
      valores,
    );

    if (!resultado.rows[0]) {
      response.status(404).json({ mensaje: "Tarea no encontrada." });
      return;
    }

    response.json(mapearTarea(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo actualizar la tarea.", error: error.message });
  }
});

app.post("/api/examenes", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { estudianteId, cursoId, titulo, fecha, hora, temas, preparacion } = request.body;

  try {
    const resultado = await pool.query(
      `
      insert into examenes (
        estudiante_id,
        curso_id,
        titulo,
        fecha_examen,
        hora_examen,
        temas,
        preparacion
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning
        id,
        curso_id as "cursoId",
        titulo,
        fecha_examen as fecha,
        hora_examen as hora,
        temas,
        preparacion
      `,
      [estudianteId, cursoId, titulo, fecha, hora, temas, preparacion],
    );

    response.status(201).json(mapearExamen(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo crear el examen.", error: error.message });
  }
});

app.patch("/api/examenes/:examenId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { examenId } = request.params;
  const campos = [];
  const valores = [];
  const mapa = {
    cursoId: "curso_id",
    titulo: "titulo",
    fecha: "fecha_examen",
    hora: "hora_examen",
    temas: "temas",
    preparacion: "preparacion",
  };

  Object.entries(request.body).forEach(([clave, valor]) => {
    const columna = mapa[clave];
    if (!columna) return;
    valores.push(valor);
    campos.push(`${columna} = $${valores.length}`);
  });

  if (!campos.length) {
    response.status(400).json({ mensaje: "No se enviaron cambios validos." });
    return;
  }

  valores.push(examenId);

  try {
    const resultado = await pool.query(
      `
      update examenes
      set ${campos.join(", ")}
      where id = $${valores.length}
      returning
        id,
        curso_id as "cursoId",
        titulo,
        fecha_examen as fecha,
        hora_examen as hora,
        temas,
        preparacion
      `,
      valores,
    );

    if (!resultado.rows[0]) {
      response.status(404).json({ mensaje: "Examen no encontrado." });
      return;
    }

    response.json(mapearExamen(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo actualizar el examen.", error: error.message });
  }
});

app.delete("/api/examenes/:examenId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    await pool.query("delete from examenes where id = $1", [request.params.examenId]);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo eliminar el examen.", error: error.message });
  }
});

app.post("/api/planificador/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { estudianteId } = request.params;
  const { bloques } = request.body;

  if (!Array.isArray(bloques)) {
    response.status(400).json({ mensaje: "Los bloques enviados no son validos." });
    return;
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("begin");
    await cliente.query("delete from bloques_planificador where estudiante_id = $1", [estudianteId]);

    for (const bloque of bloques) {
      await cliente.query(
        `
        insert into bloques_planificador (
          id,
          estudiante_id,
          curso_id,
          dia_semana,
          hora_inicio,
          horas_duracion,
          titulo,
          tipo_bloque,
          color
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          bloque.id,
          estudianteId,
          bloque.cursoId ?? null,
          bloque.dia,
          bloque.horaInicio,
          bloque.duracion,
          bloque.titulo,
          bloque.tipo,
          bloque.color,
        ],
      );
    }

    await cliente.query("commit");

    const resultado = await pool.query(
      `
      select
        id,
        curso_id as "cursoId",
        dia_semana as dia,
        hora_inicio as "horaInicio",
        horas_duracion as duracion,
        titulo,
        color,
        tipo_bloque as tipo
      from bloques_planificador
      where estudiante_id = $1
      order by dia_semana asc, hora_inicio asc
      `,
      [estudianteId],
    );

    response.json({ bloques: resultado.rows.map(mapearBloque) });
  } catch (error) {
    await cliente.query("rollback");
    response.status(500).json({ mensaje: "No se pudo guardar el planificador.", error: error.message });
  } finally {
    cliente.release();
  }
});

app.post("/api/notificaciones", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { estudianteId, tipo, titulo, mensaje, noLeida = true } = request.body;

  try {
    const resultado = await pool.query(
      `
      insert into notificaciones (estudiante_id, tipo, titulo, mensaje, no_leida)
      values ($1, $2, $3, $4, $5)
      returning
        id,
        tipo,
        titulo,
        mensaje,
        no_leida as "noLeida",
        creado_en as "creadaEn"
      `,
      [estudianteId, tipo, titulo, mensaje, noLeida],
    );

    response.status(201).json(mapearNotificacion(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo crear la notificacion.", error: error.message });
  }
});

app.patch("/api/notificaciones/:notificacionId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    const resultado = await pool.query(
      `
      update notificaciones
      set no_leida = coalesce($1, no_leida)
      where id = $2
      returning
        id,
        tipo,
        titulo,
        mensaje,
        no_leida as "noLeida",
        creado_en as "creadaEn"
      `,
      [request.body.noLeida, request.params.notificacionId],
    );

    response.json(mapearNotificacion(resultado.rows[0]));
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo actualizar la notificacion.", error: error.message });
  }
});

app.patch("/api/notificaciones/leer-todas/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    await pool.query("update notificaciones set no_leida = false where estudiante_id = $1", [
      request.params.estudianteId,
    ]);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudieron actualizar las notificaciones.", error: error.message });
  }
});

app.delete("/api/notificaciones/leidas/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    await pool.query(
      "delete from notificaciones where estudiante_id = $1 and no_leida = false",
      [request.params.estudianteId],
    );
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudieron limpiar las notificaciones.", error: error.message });
  }
});

app.post("/api/chat/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const { estudianteId } = request.params;
  const { mensaje } = request.body;

  try {
    const contexto = await obtenerContextoEstudiante(estudianteId);
    if (detectarSolicitudPreguntasPracticaAmbigua(mensaje, contexto.cursos)) {
      const respuestaSistema = construirRespuestaAclaratoriaPractica(contexto);
      const cliente = await pool.connect();
      try {
        await cliente.query("begin");

        const mensajeUsuario = await cliente.query(
          `
          insert into mensajes_chat (estudiante_id, rol, mensaje)
          values ($1, 'user', $2)
          returning
            id,
            rol as tipo,
            mensaje,
            to_char(creado_en, 'HH24:MI') as hora,
            creado_en as "creadaEn"
          `,
          [estudianteId, mensaje],
        );

        const mensajeAsistente = await cliente.query(
          `
          insert into mensajes_chat (estudiante_id, rol, mensaje)
          values ($1, 'ai', $2)
          returning
            id,
            rol as tipo,
            mensaje,
            to_char(creado_en, 'HH24:MI') as hora,
            creado_en as "creadaEn"
          `,
          [estudianteId, respuestaSistema],
        );

        await cliente.query("commit");

        response.status(201).json({
          mensajes: [
            mapearMensajeChat(mensajeUsuario.rows[0]),
            mapearMensajeChat(mensajeAsistente.rows[0]),
          ],
          fuente: "sistema",
        });
        return;
      } catch (error) {
        await cliente.query("rollback");
        throw error;
      } finally {
        cliente.release();
      }
    }

    try {
      const respuestaIa = await generarRespuestaConIA({ mensaje, contexto });
      const cliente = await pool.connect();
      try {
        await cliente.query("begin");

        const mensajeUsuario = await cliente.query(
          `
          insert into mensajes_chat (estudiante_id, rol, mensaje)
          values ($1, 'user', $2)
          returning
            id,
            rol as tipo,
            mensaje,
            to_char(creado_en, 'HH24:MI') as hora,
            creado_en as "creadaEn"
          `,
          [estudianteId, mensaje],
        );

        const mensajeAsistente = await cliente.query(
          `
          insert into mensajes_chat (estudiante_id, rol, mensaje)
          values ($1, 'ai', $2)
          returning
            id,
            rol as tipo,
            mensaje,
            to_char(creado_en, 'HH24:MI') as hora,
            creado_en as "creadaEn"
          `,
          [estudianteId, respuestaIa.mensaje],
        );

        await cliente.query("commit");

        response.status(201).json({
          mensajes: [
            mapearMensajeChat(mensajeUsuario.rows[0]),
            mapearMensajeChat(mensajeAsistente.rows[0]),
          ],
          fuente: respuestaIa.fuente,
        });
        return;
      } catch (error) {
        await cliente.query("rollback");
        throw error;
      } finally {
        cliente.release();
      }
    } catch (error) {
      console.error("Error Groq StudyFlow:", error);
      response.status(502).json({
        mensaje: "No se pudo obtener respuesta de Groq.",
        error: error.message,
      });
      return;
    }
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo enviar el mensaje.", error: error.message });
  }
});

app.delete("/api/chat/:estudianteId", async (request, response) => {
  if (!pool) return responderSinBase(response);

  try {
    await pool.query("delete from mensajes_chat where estudiante_id = $1", [request.params.estudianteId]);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo limpiar el historial del chat.", error: error.message });
  }
});

app.listen(puerto, () => {
  console.log(`StudyFlow API lista en http://localhost:${puerto}`);
});
