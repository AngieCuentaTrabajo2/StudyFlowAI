import "dotenv/config";
import cors from "cors";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import OpenAI from "openai";
import pkg from "pg";
import {
  crearHashContrasena,
  crearHashTemporalGoogle,
  crearHashToken,
  crearTokenSeguro,
  esHashSeguroContrasena,
  obtenerNombreYApellidosGoogle,
  requiereCompletarPerfilAcademico,
  verificarContrasena,
} from "./auth-utils.js";
import {
  construirCorreoNotificacion,
  construirCorreoVerificacion,
  enviarCorreo,
} from "./email-service.js";
import {
  mapearBloque,
  mapearCurso,
  mapearExamen,
  mapearMensajeChat,
  mapearNotificacion,
  mapearTarea,
  mapearUsuario,
} from "./mappers.js";

const { Pool } = pkg;

const app = express();
const puerto = Number(process.env.PORT || 4000);
const urlBaseDeDatos = process.env.DATABASE_URL;
const groqApiKey = process.env.GROQ_API_KEY;
const modeloGroq = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

app.use(cors());
app.use(express.json());

const pool = urlBaseDeDatos ? new Pool({ connectionString: urlBaseDeDatos }) : null;
const clienteGroq = groqApiKey
  ? new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;
const clienteGoogle = googleClientId ? new OAuth2Client(googleClientId) : null;

async function enviarVerificacionCorreo({ estudianteId, nombres, correo }) {
  if (!pool) return { ok: false, omitido: true };

  const token = crearTokenSeguro();
  const tokenHash = crearHashToken(token);
  const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    `
    update estudiantes
    set email_verificacion_token = $1,
        email_verificacion_expira = $2
    where id = $3
    `,
    [tokenHash, expira, estudianteId],
  );

  const correoVerificacion = construirCorreoVerificacion({ nombres, token });
  return enviarCorreo({
    para: correo,
    asunto: correoVerificacion.asunto,
    html: correoVerificacion.html,
    texto: correoVerificacion.texto,
  });
}

async function enviarNotificacionCorreoSiCorresponde(estudianteId, notificacion) {
  if (!pool) return;

  try {
    const resultado = await pool.query(
      `
      select
        nombres,
        correo,
        notif_correo as "notificacionesCorreo",
        email_verificado as "emailVerificado"
      from estudiantes
      where id = $1
      limit 1
      `,
      [estudianteId],
    );

    const usuario = resultado.rows[0];
    if (!usuario?.notificacionesCorreo || !usuario?.emailVerificado) {
      return;
    }

    const correoNotificacion = construirCorreoNotificacion(notificacion);
    await enviarCorreo({
      para: usuario.correo,
      asunto: correoNotificacion.asunto,
      html: correoNotificacion.html,
      texto: correoNotificacion.texto,
    });
  } catch (error) {
    console.warn("[email] No se pudo enviar notificacion por correo:", error.message);
  }
}

function responderSinBase(response) {
  response.status(500).json({ mensaje: "DATABASE_URL no configurada." });
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

function detectarSolicitudPreguntasPractica(mensaje) {
  const texto = normalizarTexto(mensaje || "");
  return (
    texto.includes("preguntas de práctica") ||
    texto.includes("pregunta de practica") ||
    texto.includes("practiquemos") ||
    (texto.includes("hazme preguntas") && texto.includes("practica"))
  );
}

function encontrarCursoMencionado(mensaje, cursos) {
  const texto = normalizarTexto(mensaje || "");
  return cursos.find((curso) => texto.includes(normalizarTexto(curso.nombre))) ?? null;
}

function detectarSolicitudPreguntasPracticaAmbigua(mensaje, cursos) {
  const pidePractica = detectarSolicitudPreguntasPractica(mensaje);

  if (!pidePractica) {
    return false;
  }

  return !encontrarCursoMencionado(mensaje, cursos);
}

function construirRespuestaAclaratoriaPractica(contexto) {
  const cursos = deduplicarPorClave(contexto.cursos, (curso) => `${curso.nombre}-${curso.docente}-${curso.horario}`).slice(0, 4);

  if (!cursos.length) {
    return "Claro. Puedo hacerte preguntas de práctica, pero primero dime de que curso o tema quieres que sean.";
  }

  return `Claro. Te hago preguntas de práctica, pero primero dime de que curso quieres que sean.\n\nPuedes elegir uno de estos: ${cursos.map((curso) => curso.nombre).join(", ")}.`;
}

function textoIncluyeAlguno(texto, terminos) {
  return terminos.some((termino) => texto.includes(termino));
}

function detectarConsultaDirectaCursos(mensaje) {
  const texto = normalizarTexto(mensaje || "");
  return textoIncluyeAlguno(texto, [
    "cuantos cursos",
    "cuantos curso",
    "que cursos tengo",
    "cuales son mis cursos",
    "que materias tengo",
    "cuales son mis materias",
  ]);
}

function detectarConsultaDirectaTareas(mensaje) {
  const texto = normalizarTexto(mensaje || "");
  return textoIncluyeAlguno(texto, [
    "cuantas tareas",
    "cuantas tarea",
    "cuantos pendientes tengo",
    "que tareas tengo",
    "cuales son mis tareas",
    "que pendientes tengo",
    "cuantas tareas tengo",
    "cuantos pendientes",
  ]);
}

function detectarConsultaDirectaExamenes(mensaje) {
  const texto = normalizarTexto(mensaje || "");
  return textoIncluyeAlguno(texto, [
    "cuantos examenes",
    "cuantos examenes tengo",
    "que examenes tengo",
    "cuales son mis examenes",
    "que evaluaciones tengo",
  ]);
}

function unirListaNatural(elementos) {
  const lista = elementos.filter(Boolean);
  if (!lista.length) return "";
  if (lista.length === 1) return lista[0];
  if (lista.length === 2) return `${lista[0]} y ${lista[1]}`;
  return `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
}

function obtenerCursosUnicos(contexto) {
  return deduplicarPorClave(contexto.cursos, (curso) => `${curso.nombre}-${curso.docente}-${curso.horario}`);
}

function obtenerCursoPrioritario(contexto) {
  const { tareasAtrasadas, tareasPendientes, examenesProximos } = construirDatosHerramientas(contexto);
  const cursoIdPrioritario =
    tareasAtrasadas[0]?.cursoId ??
    tareasPendientes[0]?.cursoId ??
    examenesProximos[0]?.cursoId ??
    contexto.cursos[0]?.id;

  return contexto.cursos.find((curso) => curso.id === cursoIdPrioritario) ?? null;
}

function obtenerCursoRelevante(mensaje, contexto) {
  return encontrarCursoMencionado(mensaje, contexto.cursos) ?? obtenerCursoPrioritario(contexto);
}

function obtenerTemasCurso(contexto, curso) {
  if (!curso) return [];

  return deduplicarPorClave(
    [
      ...contexto.examenes
        .filter((examen) => examen.cursoId === curso.id)
        .flatMap((examen) => examen.temas ?? []),
      ...contexto.tareas
        .filter((tarea) => tarea.cursoId === curso.id)
        .map((tarea) => tarea.titulo),
    ].filter(Boolean),
    (tema) => normalizarTexto(tema),
  ).slice(0, 4);
}

function construirPrioridadesSistema(contexto, limite = 3) {
  const { cursosPorId, tareasPendientes, tareasAtrasadas, examenesProximos } = construirDatosHerramientas(contexto);

  return [
    ...tareasAtrasadas.map(
      (tarea) =>
        `${tarea.titulo} en ${cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado"} (atrasada)`,
    ),
    ...tareasPendientes.map(
      (tarea) =>
        `${tarea.titulo} en ${cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado"} para ${formatearFechaRespuesta(tarea.fechaEntrega)}`,
    ),
    ...examenesProximos.map(
      (examen) =>
        `${examen.titulo} de ${cursosPorId.get(examen.cursoId)?.nombre ?? "Curso no identificado"} el ${formatearFechaRespuesta(examen.fecha)}`,
    ),
  ].slice(0, limite);
}

function construirPlanEstudioSistema(contexto) {
  const prioridades = construirPrioridadesSistema(contexto, 3);
  const bloquesEstudio = contexto.bloquesPlanificador.filter((bloque) => bloque.tipo === "study");

  if (!prioridades.length) {
    return "Tu panel no muestra urgencias inmediatas. Puedes dedicar hoy un bloque corto a repasar apuntes, ordenar pendientes y dejar lista la siguiente sesión de estudio.";
  }

  const recomendaciones = [
    `1. Empieza por ${prioridades[0]}.`,
    prioridades[1] ? `2. Luego avanza con ${prioridades[1]}.` : "2. Usa el segundo bloque para repaso activo o ejercicios cortos.",
    bloquesEstudio.length
      ? `3. Ya tienes ${bloquesEstudio.length} bloque${bloquesEstudio.length === 1 ? "" : "s"} de estudio guardado${bloquesEstudio.length === 1 ? "" : "s"}; aprovecha esos bloques para cerrar el día con repaso breve.`
      : "3. Si puedes, reserva hoy un bloque de 45 a 60 minutos para consolidar lo más urgente.",
  ];

  return recomendaciones.join("\n");
}

function construirResumenSistema({ mensaje, contexto }) {
  const curso = obtenerCursoRelevante(mensaje, contexto);
  const temas = obtenerTemasCurso(contexto, curso);

  if (!curso) {
    const prioridades = construirPrioridadesSistema(contexto, 3);
    return (
      "Puedo darte un resumen rápido aunque Groq se esté demorando. Ahora mismo tu mejor enfoque es este: " +
      `${prioridades.length ? unirListaNatural(prioridades) : "ordenar tus temas y pendientes principales"}.`
    );
  }

  if (!temas.length) {
    return (
      `Resumen rápido para ${curso.nombre}: enfócate en conceptos base, aplicaciones prácticas y repaso activo. ` +
      "Haz una pasada corta de teoría, luego un ejemplo resuelto y cierra explicando el tema con tus propias palabras."
    );
  }

  return (
    `Resumen rápido para ${curso.nombre}: ahora mismo conviene enfocarte en ${unirListaNatural(temas)}. ` +
    "Para estudiarlo bien, define cada tema en una frase, compáralo con los otros, resuelve un ejemplo por tema y termina con una autoexplicación sin mirar tus apuntes."
  );
}

function construirExplicacionSistema({ mensaje, contexto }) {
  const curso = obtenerCursoRelevante(mensaje, contexto);
  const temas = obtenerTemasCurso(contexto, curso);
  const temaPrincipal = temas[0];

  if (curso && temaPrincipal) {
    return (
      `Te doy una explicación corta y segura mientras Groq vuelve: en ${curso.nombre}, un buen modo de entender ${temaPrincipal} es dividirlo en cuatro partes: qué es, para qué sirve, cuál es el procedimiento o lógica principal y qué error suele cometerse al aplicarlo. ` +
      `Si estudias ${temaPrincipal} con ese esquema y luego lo conectas con ${temas[1] ?? "un ejemplo práctico"}, ya tendrás una base bastante sólida.`
    );
  }

  return (
    "Te doy una explicación útil mientras Groq se demora: para entender cualquier tema rápido, sepáralo en definición, objetivo, pasos clave, ejemplo y errores comunes. " +
    "Si me dices el curso o el tema exacto, te lo bajo a un formato mucho más concreto."
  );
}

function construirRespuestaGeneralSistema({ contexto, detalleError }) {
  const prioridades = construirPrioridadesSistema(contexto, 3);
  const cursos = obtenerCursosUnicos(contexto).slice(0, 3).map((curso) => curso.nombre);

  return (
    `Groq se está demorando más de lo normal${detalleError ? ` (${detalleError})` : ""}, pero no te dejo sin respuesta. ` +
    `${prioridades.length ? `Ahora mismo tus focos más claros son ${unirListaNatural(prioridades)}. ` : ""}` +
    `${cursos.length ? `También puedo ayudarte con ${unirListaNatural(cursos)}. ` : ""}` +
    "Si quieres, te organizo la semana, te resumo un tema, te doy prioridades o te hago preguntas de práctica."
  );
}

function construirRespuestaDirectaPanel({ mensaje, contexto }) {
  const cursos = obtenerCursosUnicos(contexto);
  const { cursosPorId, tareasActivas, tareasPendientes, tareasAtrasadas, examenesProximos } =
    construirDatosHerramientas(contexto);

  if (detectarConsultaDirectaCursos(mensaje)) {
    if (!cursos.length) {
      return "Ahora mismo no veo cursos registrados en tu panel.";
    }

    return `Ahora mismo tienes ${cursos.length} curso${cursos.length === 1 ? "" : "s"}: ${unirListaNatural(
      cursos.slice(0, 6).map((curso) => curso.nombre),
    )}.`;
  }

  if (detectarConsultaDirectaTareas(mensaje)) {
    if (!tareasActivas.length) {
      return "Ahora mismo no tienes tareas activas registradas.";
    }

    const muestra = tareasActivas
      .slice(0, 3)
      .map(
        (tarea) =>
          `${tarea.titulo} en ${cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado"}, para ${formatearFechaRespuesta(tarea.fechaEntrega)}`,
      )
      .join("; ");

    return `Ahora mismo tienes ${tareasActivas.length} tareas activas: ${tareasPendientes.length} pendientes vigentes y ${tareasAtrasadas.length} atrasadas. Las más cercanas son: ${muestra}.`;
  }

  if (detectarConsultaDirectaExamenes(mensaje)) {
    if (!examenesProximos.length) {
      return "Ahora mismo no veo exámenes próximos registrados.";
    }

    return `Tienes ${examenesProximos.length} examen${examenesProximos.length === 1 ? "" : "es"} próximo${examenesProximos.length === 1 ? "" : "s"}: ${unirListaNatural(
      examenesProximos.map(
        (examen) =>
          `${examen.titulo} de ${cursosPorId.get(examen.cursoId)?.nombre ?? "Curso no identificado"} el ${formatearFechaRespuesta(examen.fecha)}`,
      ),
    )}.`;
  }

  return null;
}

function construirRespuestaSistemaRapida({ mensaje, contexto, detalleError }) {
  const texto = normalizarTexto(mensaje || "");
  const cursoRelevante = obtenerCursoRelevante(mensaje, contexto);
  const { cursosPorId, tareasActivas, tareasPendientes, tareasAtrasadas, examenesProximos } =
    construirDatosHerramientas(contexto);

  if (textoIncluyeAlguno(texto, ["hola", "buenas", "buen dia", "buenas tardes", "buenas noches", "que tal"])) {
    return (
      `Hola. Mientras Groq se demora, sigo viendo tu panel real: ${tareasActivas.length} tareas activas y ${examenesProximos.length} exámenes próximos. ` +
      `${cursoRelevante ? `Tu curso más prioritario ahora parece ser ${cursoRelevante.nombre}. ` : ""}` +
      "Si quieres, te organizo el día o te preparo práctica."
    );
  }

  if (textoIncluyeAlguno(texto, ["gracias", "muchas gracias", "thanks"])) {
    return "De nada. Aunque Groq se demore, igual puedo seguir apoyándote con tareas, prioridades, planes de estudio y preguntas de práctica.";
  }

  if (textoIncluyeAlguno(texto, ["quien eres", "que puedes hacer", "en que me puedes ayudar", "ayudame"])) {
    const cursos = obtenerCursosUnicos(contexto).slice(0, 4).map((curso) => curso.nombre);
    return (
      "Soy StudyFlow AI. Incluso sin Groq en este momento puedo ayudarte a revisar tareas, exámenes, prioridades, organizar tu semana, proponerte preguntas de práctica y darte resúmenes rápidos de enfoque. " +
      `${cursos.length ? `Ahora mismo tengo contexto de ${unirListaNatural(cursos)}.` : ""}`
    );
  }

  if (detectarSolicitudPreguntasPractica(mensaje)) {
    const curso =
      cursoRelevante ??
      obtenerCursosUnicos(contexto)[0];

    if (!curso) {
      return "Groq se está demorando un poco. Mientras tanto, dime de qué curso o tema quieres las preguntas de práctica y te las preparo al toque.";
    }

    const temas = deduplicarPorClave(
      [
        ...contexto.examenes
          .filter((examen) => examen.cursoId === curso.id)
          .flatMap((examen) => examen.temas ?? []),
        ...contexto.tareas
          .filter((tarea) => tarea.cursoId === curso.id)
          .map((tarea) => tarea.titulo),
      ].filter(Boolean),
      (tema) => normalizarTexto(tema),
    ).slice(0, 3);

    const preguntas =
      temas.length > 0
        ? temas.map(
            (tema, indice) =>
              `${indice + 1}. Explícame ${tema} con tus palabras y dame un ejemplo aplicado a ${curso.nombre}.`,
          )
        : [
            `1. ¿Cuál dirías que es el concepto más importante de ${curso.nombre} y por qué?`,
            `2. ¿Cómo aplicarías un tema clave de ${curso.nombre} en un caso práctico o ejercicio real?`,
            `3. ¿Qué parte de ${curso.nombre} te cuesta más y cómo la explicarías paso a paso?`,
          ];

    return (
      `Groq se está demorando más de lo normal, pero avancemos igual. Aquí van preguntas de práctica de ${curso.nombre}:\n\n` +
      `${preguntas.join("\n")}\n\n` +
      "Si quieres, en el siguiente mensaje te corrijo tus respuestas o te subo la dificultad."
    );
  }

  if (textoIncluyeAlguno(texto, ["organiza", "organizar", "plan", "planifica", "planificar", "semana", "hoy", "horario"])) {
    return (
      "Groq se está demorando un poco, así que te dejo un plan rápido basado en tu contexto real:\n\n" +
      construirPlanEstudioSistema(contexto)
    );
  }

  if (texto.includes("tarea") || texto.includes("pendiente") || texto.includes("prioridad")) {
    if (!tareasActivas.length) {
      return "Ahora mismo no veo tareas activas registradas. Si quieres, puedo ayudarte a planificar la semana o revisar tus exámenes próximos.";
    }

    const resumen = tareasActivas
      .slice(0, 3)
      .map(
        (tarea) =>
          `${tarea.titulo} en ${cursosPorId.get(tarea.cursoId)?.nombre ?? "Curso no identificado"} (${describirEstadoTarea(tarea.estadoVisual)})`,
      )
      .join("; ");

    return `Groq se está demorando un poco. Mientras tanto, tu panel muestra ${tareasActivas.length} tareas activas: ${tareasPendientes.length} pendientes vigentes y ${tareasAtrasadas.length} atrasadas. Lo más cercano ahora es: ${resumen}.`;
  }

  if (texto.includes("examen")) {
    if (!examenesProximos.length) {
      return "No veo exámenes próximos registrados por ahora. Si quieres, revisamos tus tareas activas o armamos un mini plan de estudio.";
    }

    const resumen = examenesProximos
      .slice(0, 2)
      .map(
        (examen) =>
          `${examen.titulo} de ${cursosPorId.get(examen.cursoId)?.nombre ?? "Curso no identificado"} el ${formatearFechaRespuesta(examen.fecha)}`,
      )
      .join("; ");

    return `Groq se está demorando un poco. Mientras tanto, tus exámenes más cercanos son: ${resumen}.`;
  }

  if (textoIncluyeAlguno(texto, ["curso", "cursos", "materia", "materias"])) {
    const cursos = obtenerCursosUnicos(contexto);
    if (!cursos.length) {
      return "Todavía no veo cursos registrados en tu panel. Si quieres, primero podemos crear uno y luego conectarlo con tareas y exámenes.";
    }

    return `Tus cursos actuales son ${unirListaNatural(cursos.slice(0, 5).map((curso) => curso.nombre))}. Si quieres, te digo cuál conviene priorizar y por qué.`;
  }

  if (textoIncluyeAlguno(texto, ["resume", "resumen", "resumeme", "resumir"])) {
    return construirResumenSistema({ mensaje, contexto });
  }

  if (
    textoIncluyeAlguno(texto, [
      "explicame",
      "explica",
      "que es",
      "como funciona",
      "como se hace",
      "entiendo",
      "ayudame a entender",
    ])
  ) {
    return construirExplicacionSistema({ mensaje, contexto });
  }

  return construirRespuestaGeneralSistema({ contexto, detalleError });
}

function crearPromesaTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Groq tardo demasiado en responder.")), ms);
  });
}

async function registrarIntercambioChat(estudianteId, mensajeUsuarioTexto, respuestaAsistenteTexto) {
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
      [estudianteId, mensajeUsuarioTexto],
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
      [estudianteId, respuestaAsistenteTexto],
    );

    await cliente.query("commit");

    return [
      mapearMensajeChat(mensajeUsuario.rows[0]),
      mapearMensajeChat(mensajeAsistente.rows[0]),
    ];
  } catch (error) {
    await cliente.query("rollback");
    throw error;
  } finally {
    cliente.release();
  }
}

async function generarRespuestaAsistente({ mensaje, contexto, timeoutMs = 18000 }) {
  try {
    return await Promise.race([
      generarRespuestaConIA({ mensaje, contexto }),
      crearPromesaTimeout(timeoutMs),
    ]);
  } catch (error) {
    console.error("Fallback StudyFlow por demora o error de Groq:", error);
    return {
      mensaje: construirRespuestaSistemaRapida({
        mensaje,
        contexto,
        detalleError: error instanceof Error ? error.message : null,
      }),
      fuente: "sistema",
    };
  }
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
      `Exámenes próximos reales: ${contextoCompacto.resumenContextual.examenesProximos
        .map(
          (examen) =>
            `${examen.titulo} de ${examen.curso} el ${convertirFechaAOrdenable(examen.fecha)} a las ${examen.hora}, preparacion ${examen.preparacion}%`,
        )
        .join("; ")}.`,
    );
  } else {
    secciones.push("No hay exámenes próximos registrados.");
  }

  return secciones.join("\n");
}

function ajustarRespuestaAsistente(mensaje) {
  const texto = limpiarMarcadoresHerramientas(mensaje);
  if (!texto) {
    return "No pude darte una respuesta clara esta vez. Intenta preguntarme de nuevo con otras palabras o dime si quieres que te ayude con tareas, cursos, exámenes o estudio.";
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
    return "No lo capté del todo. Puedes preguntármelo de nuevo con otras palabras o decirme si quieres ayuda con tus tareas, cursos, exámenes o con una explicación académica.";
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
        description: "Obtiene los exámenes próximos reales del estudiante.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "obtener_prioridades_hoy",
        description: "Obtiene las prioridades académicas actuales del estudiante usando tareas y exámenes cercanos.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "obtener_contexto_general",
        description: "Obtiene un resumen general del estado académico del estudiante.",
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
    fechaEntrega: formatearFechaRespuesta(tarea.fechaEntrega),
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
      fechaEntrega: formatearFechaRespuesta(tarea.fechaEntrega),
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
      fecha: formatearFechaRespuesta(examen.fecha),
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
        fecha: formatearFechaRespuesta(examen.fecha),
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
        `Eres StudyFlow AI, un asistente académico universitario en español. Responde con tono claro, útil, conversacional, humano y profesional. ${instruccionTono} Debes basarte en los datos reales del sistema y en las herramientas disponibles. No inventes datos del estudiante. Si el usuario pregunta por tareas, cursos, exámenes, prioridades, seguimiento de lo hablado o referencias como 'eso', 'esas tareas', 'lo anterior', debes apoyarte en el historial reciente y en los resultados reales de herramientas antes de responder. Cuando hables de cantidades, usa siempre los totales explícitos del contexto y de las herramientas; no infieras cantidades por el largo de listas de muestra o preview porque pueden venir truncadas. Si aplica, distingue entre tareas activas, pendientes vigentes y atrasadas. Nunca digas que falta información si ya existe en el contexto o en las herramientas base cargadas. Evita sonar como bot automático o menú fijo; responde como un asesor académico que recuerda la conversación.`,
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
          email_verificado as "emailVerificado",
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

async function asegurarColumnasCompatibilidad() {
  if (!pool) return;

  await pool.query("alter table estudiantes add column if not exists google_sub text");
  await pool.query("alter table estudiantes add column if not exists email_verificado boolean not null default false");
  await pool.query("alter table estudiantes add column if not exists email_verificacion_token text");
  await pool.query("alter table estudiantes add column if not exists email_verificacion_expira timestamptz");
  await pool.query(
    "create unique index if not exists estudiantes_google_sub_unique on estudiantes (google_sub) where google_sub is not null",
  );
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
        email_verificado as "emailVerificado",
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

    response.json({
      usuario: mapearUsuario(usuario),
      requiereCompletarPerfilAcademico: requiereCompletarPerfilAcademico(usuario),
    });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo iniciar sesión.", error: error.message });
  }
});

app.post("/api/auth/google", async (request, response) => {
  if (!pool) return responderSinBase(response);

  if (!clienteGoogle || !googleClientId) {
    response.status(500).json({ mensaje: "GOOGLE_CLIENT_ID no configurado en el backend." });
    return;
  }

  const { credential } = request.body;
  if (!credential) {
    response.status(400).json({ mensaje: "No se recibió el token de Google." });
    return;
  }

  try {
    const ticket = await clienteGoogle.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      response.status(400).json({ mensaje: "No se pudo validar la cuenta de Google." });
      return;
    }

    if (payload.email_verified === false) {
      response.status(403).json({ mensaje: "La cuenta de Google no tiene el correo verificado." });
      return;
    }

    const { nombres, apellidos } = obtenerNombreYApellidosGoogle(payload);
    const correo = String(payload.email).trim();
    const googleSub = String(payload.sub).trim();

    const existente = await pool.query(
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
        email_verificado as "emailVerificado",
        app_modo_oscuro as "aplicacionModoOscuro",
        app_google_calendar as "aplicacionGoogleCalendar",
        app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas",
        google_sub as "googleSub"
      from estudiantes
      where google_sub = $1 or lower(correo) = lower($2)
      order by case when google_sub = $1 then 0 else 1 end
      limit 1
      `,
      [googleSub, correo],
    );

    const usuarioExistente = existente.rows[0];

    if (usuarioExistente) {
      if (usuarioExistente.googleSub && usuarioExistente.googleSub !== googleSub) {
        response.status(409).json({ mensaje: "Ese correo ya está vinculado a otra cuenta de Google." });
        return;
      }

      if (!usuarioExistente.googleSub) {
        await pool.query(
          "update estudiantes set google_sub = $1, email_verificado = true, email_verificacion_token = null, email_verificacion_expira = null where id = $2",
          [googleSub, usuarioExistente.id],
        );
        usuarioExistente.googleSub = googleSub;
      }
      usuarioExistente.emailVerificado = true;

      response.json({
        usuario: mapearUsuario(usuarioExistente),
        requiereCompletarPerfilAcademico: requiereCompletarPerfilAcademico(usuarioExistente),
      });
      return;
    }

    const resultado = await pool.query(
      `
      insert into estudiantes (
        nombres,
        apellidos,
        correo,
        google_sub,
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
        email_verificado,
        app_modo_oscuro,
        app_google_calendar,
        app_sugerencias_automaticas
      )
      values ($1, $2, $3, $4, $5, '', '', '', 'gratis', '4-6', 'pomodoro', 'responsable', '', 4, 8, true, true, true, true, false, true, false, false, true)
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
        email_verificado as "emailVerificado",
        app_modo_oscuro as "aplicacionModoOscuro",
        app_google_calendar as "aplicacionGoogleCalendar",
        app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas"
      `,
      [nombres, apellidos, correo, googleSub, crearHashTemporalGoogle()],
    );

    response.status(201).json({
      usuario: mapearUsuario(resultado.rows[0]),
      requiereCompletarPerfilAcademico: true,
    });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo iniciar sesión con Google.", error: error.message });
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
        email_verificado as "emailVerificado",
        app_modo_oscuro as "aplicacionModoOscuro",
        app_google_calendar as "aplicacionGoogleCalendar",
        app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas"
      `,
      [nombres, apellidos, correo, hashContrasena, universidad, carrera, semestre, plan],
    );

    let verificacionCorreoEnviada = false;
    try {
      const envio = await enviarVerificacionCorreo({
        estudianteId: resultado.rows[0].id,
        nombres,
        correo,
      });
      verificacionCorreoEnviada = Boolean(envio.ok);
    } catch (error) {
      console.warn("[email] No se pudo enviar verificacion de correo:", error.message);
    }

    response.status(201).json({
      usuario: mapearUsuario(resultado.rows[0]),
      verificacionCorreoEnviada,
    });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo registrar el usuario.", error: error.message });
  }
});

app.post("/api/auth/verify-email", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const token = String(request.body?.token || "").trim();
  if (!token) {
    response.status(400).json({ mensaje: "Token de verificacion requerido." });
    return;
  }

  try {
    const tokenHash = crearHashToken(token);
    const resultado = await pool.query(
      `
      update estudiantes
      set email_verificado = true,
          email_verificacion_token = null,
          email_verificacion_expira = null,
          notif_correo = true
      where email_verificacion_token = $1
        and email_verificacion_expira > now()
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
        email_verificado as "emailVerificado",
        app_modo_oscuro as "aplicacionModoOscuro",
        app_google_calendar as "aplicacionGoogleCalendar",
        app_sugerencias_automaticas as "aplicacionSugerenciasAutomaticas"
      `,
      [tokenHash],
    );

    if (!resultado.rows[0]) {
      response.status(400).json({ mensaje: "El enlace de verificacion no es valido o ya expiro." });
      return;
    }

    const usuarioActualizado = resultado.rows[0];
    if (request.body?.notificaciones?.correo === true && !usuarioActualizado.emailVerificado) {
      try {
        await enviarVerificacionCorreo({
          estudianteId: usuarioActualizado.id,
          nombres: usuarioActualizado.nombres,
          correo: usuarioActualizado.correo,
        });
      } catch (error) {
        console.warn("[email] No se pudo enviar verificacion al activar correo:", error.message);
      }
    }

    response.json({ usuario: mapearUsuario(usuarioActualizado) });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo verificar el correo.", error: error.message });
  }
});

app.post("/api/auth/resend-verification", async (request, response) => {
  if (!pool) return responderSinBase(response);

  const estudianteId = String(request.body?.estudianteId || "").trim();
  if (!estudianteId) {
    response.status(400).json({ mensaje: "estudianteId requerido." });
    return;
  }

  try {
    const resultado = await pool.query(
      "select id, nombres, correo, email_verificado as \"emailVerificado\" from estudiantes where id = $1 limit 1",
      [estudianteId],
    );
    const usuario = resultado.rows[0];

    if (!usuario) {
      response.status(404).json({ mensaje: "Usuario no encontrado." });
      return;
    }

    if (usuario.emailVerificado) {
      response.json({ ok: true, yaVerificado: true });
      return;
    }

    const envio = await enviarVerificacionCorreo({
      estudianteId: usuario.id,
      nombres: usuario.nombres,
      correo: usuario.correo,
    });

    response.json({ ok: Boolean(envio.ok), omitido: Boolean(envio.omitido) });
  } catch (error) {
    response.status(500).json({ mensaje: "No se pudo reenviar la verificacion.", error: error.message });
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
        email_verificado as "emailVerificado",
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

    const notificacion = mapearNotificacion(resultado.rows[0]);
    await enviarNotificacionCorreoSiCorresponde(estudianteId, notificacion);

    response.status(201).json(notificacion);
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
    const respuestaDirecta = construirRespuestaDirectaPanel({ mensaje, contexto });

    if (respuestaDirecta) {
      const mensajes = await registrarIntercambioChat(estudianteId, mensaje, respuestaDirecta);
      response.status(201).json({
        mensajes,
        fuente: "sistema",
      });
      return;
    }

    if (detectarSolicitudPreguntasPracticaAmbigua(mensaje, contexto.cursos)) {
      const respuestaSistema = construirRespuestaAclaratoriaPractica(contexto);
      const mensajes = await registrarIntercambioChat(estudianteId, mensaje, respuestaSistema);
      response.status(201).json({
        mensajes,
        fuente: "sistema",
      });
      return;
    }

    try {
      const respuestaIa = await generarRespuestaAsistente({ mensaje, contexto });
      const mensajes = await registrarIntercambioChat(estudianteId, mensaje, respuestaIa.mensaje);
      response.status(201).json({
        mensajes,
        fuente: respuestaIa.fuente,
      });
      return;
    } catch (error) {
      response.status(500).json({ mensaje: "No se pudo preparar la respuesta del asistente.", error: error.message });
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

asegurarColumnasCompatibilidad()
  .catch((error) => {
    console.error("No se pudo preparar el esquema de compatibilidad:", error);
  })
  .finally(() => {
    app.listen(puerto, () => {
      console.log(`StudyFlow API lista en http://localhost:${puerto}`);
    });
  });

