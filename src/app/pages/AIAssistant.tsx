import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { addDays, differenceInCalendarDays, format, parseISO, startOfToday } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Moon,
  Send,
  Sun,
  Sunset,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  esTareaActiva,
  esTareaAtrasada,
  esTareaPendienteVigente,
  type BloquePlanificador,
  formatearFechaCorta,
  obtenerEtiquetaDiaPlanificador,
  useStudyFlow,
  type AlcancePlanificacion,
  type Curso,
  type Examen,
  type JornadaPlanificacion,
  type ModoPlanificacionTodo,
  type ResultadoPlanificacionInteligente,
  type Tarea,
} from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";

const accionesRapidas = [
  "Planifica mi horario",
  "Explicame base de datos",
  "Hazme preguntas de practica",
  "Resume este tema",
];

const aliasDiasPlanificacion: Array<{ indice: number; terminos: string[] }> = [
  { indice: 0, terminos: ["lunes", "lun"] },
  { indice: 1, terminos: ["martes", "mar"] },
  { indice: 2, terminos: ["miercoles", "miércoles", "mie", "mier"] },
  { indice: 3, terminos: ["jueves", "jue"] },
  { indice: 4, terminos: ["viernes", "vie"] },
  { indice: 5, terminos: ["sabado", "sábado", "sab"] },
  { indice: 6, terminos: ["domingo", "dom"] },
];

type FlujoPlanificacionChat = {
  activo: boolean;
  paso:
    | "modo"
    | "modo-todo"
    | "objetivo-tarea"
    | "objetivo-curso"
    | "dias"
    | "jornada"
    | "confirmacion";
  alcance: AlcancePlanificacion | null;
  objetivoId?: string;
  diasBloqueados: number[];
  jornada: JornadaPlanificacion;
  modoTodo: ModoPlanificacionTodo;
};

type TonoPlanificadorLocal = "amigable" | "responsable" | "frio";

type OpcionVisualPlanificacion = {
  id: string;
  valor: string;
  titulo: string;
  descripcion: string;
  detalle?: string;
  badge?: string;
  Icono: LucideIcon;
  tono: "blue" | "violet" | "emerald" | "amber" | "rose" | "slate";
};

type PanelVisualPlanificacion = {
  titulo: string;
  descripcion: string;
  pasoEtiqueta: string;
  layout: "triple" | "doble" | "cuadruple" | "lista";
  opciones: OpcionVisualPlanificacion[];
};

type DiaPlanificableVisual = {
  dia: number;
  fecha: Date;
  etiquetaDia: string;
  etiquetaFecha: string;
  destacado?: string;
};

type MetadatosDiasPlanificacion = {
  diasPermitidos: number[];
  detalle: string;
  ayuda: string;
  diasDisponibles: DiaPlanificableVisual[];
};

const flujoPlanificacionInicial: FlujoPlanificacionChat = {
  activo: false,
  paso: "modo",
  alcance: null,
  objetivoId: undefined,
  diasBloqueados: [],
  jornada: "flexible",
  modoTodo: "solo-calendarizado",
};

function resolverTonoPlanificadorLocal(
  tono: "frio" | "amigable" | "responsable" | null | undefined,
): TonoPlanificadorLocal {
  if (tono === "amigable" || tono === "frio" || tono === "responsable") {
    return tono;
  }

  return "responsable";
}

function mensajeSegunTonoPlanificador(
  tono: TonoPlanificadorLocal,
  variantes: {
    amigable: string;
    responsable?: string;
    frio?: string;
  },
) {
  if (tono === "amigable") {
    return variantes.amigable;
  }

  if (tono === "frio") {
    return variantes.frio ?? variantes.responsable ?? variantes.amigable;
  }

  return variantes.responsable ?? variantes.amigable;
}

function adaptarMensajePlanificadorAlTono(
  mensaje: string,
  tono: TonoPlanificadorLocal,
) {
  if (tono === "responsable") {
    return mensaje;
  }

  if (tono === "frio") {
    return mensaje
      .replace(/^Buenisimo\.\s*/g, "")
      .replace(/^Claro,\s*/g, "")
      .replace(/^Claro\.\s*/g, "")
      .replace(/^Perfecto\.\s*/g, "")
      .replace(/^Listo\.\s*/g, "")
      .replace("Si te parece bien, responde `si` para aplicar o `no` para cancelar.", "Responde `si` para aplicar o `no` para cancelar.")
      .replace("Si te parece bien, responde `si` para aplicar o `no` para cancelar. Tambien puedes usar los botones de abajo.", "Responde `si` para aplicar o `no` para cancelar. Puedes usar los botones de abajo.")
      .replace("Puedes responder con el numero o con el nombre.", "Responde con numero o nombre.")
      .replace("Puedes responder con el numero o con algo como `solo calendario`, `tareas`, `repasos` o `todo`.", "Responde con `1`, `2`, `3`, `4` o una opcion equivalente.");
  }

  return mensaje
    .replace(
      "Claro. Puedo ayudarte a planificar tu horario y voy a respetar tu limite actual de ",
      "Claro, te ayudo encantado. Voy a respetar tu limite actual de ",
    )
    .replace(
      "Perfecto. Antes de mover todo, dime con que base quieres trabajar:",
      "Buenisimo. Antes de mover todo, quiero respetar como ya vienes organizandote:",
    )
    .replace(
      "Perfecto. Voy a trabajar con ",
      "Buenisimo. Voy a trabajar con ",
    )
    .replace(
      "Perfecto. Elige la tarea que quieres reorganizar:",
      "Buenisimo. Elige la tarea que quieres reorganizar:",
    )
    .replace(
      "Perfecto. Dime que curso quieres reforzar:",
      "Buenisimo. Dime que curso quieres reforzar:",
    )
    .replace(
      "Perfecto. Voy a reorganizar la tarea",
      "Buenisimo. Voy a reorganizar la tarea",
    )
    .replace(
      "Perfecto. Voy a reorganizar el repaso de",
      "Buenisimo. Voy a reorganizar el repaso de",
    )
    .replace("Perfecto. Ahora dime", "Perfecto. Ahora cuentame")
    .replace("Ahora mismo no veo tareas activas para reorganizar.", "Por ahora no veo tareas activas para reorganizar.")
    .replace("Ahora mismo no veo cursos cargados para organizar un repaso.", "Por ahora no veo cursos cargados para organizar un repaso.")
    .replace("No identifique esa tarea.", "No logre ubicar esa tarea.")
    .replace("No identifique ese curso.", "No logre ubicar ese curso.")
    .replace("No pude detectar los dias.", "No llegue a detectar los dias.")
    .replace(
      "Listo. Voy a reorganizar ",
      "Buenisimo. Quedaria asi para reorganizar ",
    )
    .replace(
      "Si te parece bien, responde `si` para aplicar o `no` para cancelar.",
      "Si te cuadra, responde `si` y la aplico. Si no, dime `no` y la dejamos ahi.",
    )
    .replace(
      "Si te parece bien, responde `si` para aplicar o `no` para cancelar. Tambien puedes usar los botones de abajo.",
      "Si te cuadra, responde `si` y la aplico. Si no, dime `no` y la dejamos ahi. Tambien puedes usar los botones de abajo.",
    )
    .replace(
      "Para seguir necesito que me respondas `si` para aplicar o `no` para cancelar.",
      "Para seguir necesito que me respondas `si` para aplicarlo o `no` para dejarlo en pausa.",
    )
    .replace(
      "Listo, cancele esta planificacion. Si quieres, luego volvemos a empezar con otra configuracion.",
      "Listo, lo dejo en pausa por ahora. Si luego quieres retomarlo, lo armamos otra vez sin problema.",
    )
    .replace(/^Listo\.\s*/, "Listo, ya te lo deje organizado. ")
    .replace(
      /^Aplique la planificacion,\s*/i,
      "Ya aplique la planificacion. ",
    );
}

function normalizarTextoPlanificacion(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function detectarSolicitudPlanificacionHorario(mensaje: string) {
  const texto = normalizarTextoPlanificacion(mensaje);
  return [
    "planifica mi horario",
    "planifica mi semana",
    "organiza mi semana",
    "organiza mi horario",
    "reorganiza mi horario",
    "acomoda mi semana",
    "ordena mi semana",
  ].some((termino) => texto.includes(termino));
}

function extraerDiasBloqueados(mensaje: string) {
  const texto = normalizarTextoPlanificacion(mensaje);
  if (!texto || texto.includes("ninguno") || texto.includes("ningun") || texto.includes("ninguna")) {
    return [];
  }

  return aliasDiasPlanificacion
    .filter(({ terminos }) => terminos.some((termino) => texto.includes(termino)))
    .map(({ indice }) => indice);
}

function detectarJornadaPlanificacion(mensaje: string): JornadaPlanificacion | null {
  const texto = normalizarTextoPlanificacion(mensaje);

  if (texto.includes("manana") || texto.includes("mañana")) return "manana";
  if (texto.includes("tarde")) return "tarde";
  if (texto.includes("noche")) return "noche";
  if (
    texto.includes("flexible") ||
    texto.includes("indiferente") ||
    texto.includes("cualquiera") ||
    texto.includes("todo el dia")
  ) {
    return "flexible";
  }

  return null;
}

function esConfirmacionPositiva(mensaje: string) {
  const texto = normalizarTextoPlanificacion(mensaje);
  return ["si", "sí", "confirmar", "confirma", "dale", "hazlo", "ok", "aplica"].some((termino) =>
    texto === termino || texto.includes(termino),
  );
}

function esConfirmacionNegativa(mensaje: string) {
  const texto = normalizarTextoPlanificacion(mensaje);
  return ["no", "cancelar", "cancela", "salir", "deten"].some((termino) =>
    texto === termino || texto.includes(termino),
  );
}

function normalizarTextoConfirmacionSeguro(mensaje: string) {
  return normalizarTextoPlanificacion(mensaje)
    .replace(/[.,;:!?¿¡()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esConfirmacionPositivaSegura(mensaje: string) {
  const texto = normalizarTextoConfirmacionSeguro(mensaje);
  return (
    ["si", "confirmar", "confirma", "dale", "hazlo", "ok", "aplica"].includes(texto) ||
    /\b(si|confirmar|confirma|dale|hazlo|ok|aplica)\b/.test(texto)
  );
}

function esConfirmacionNegativaSegura(mensaje: string) {
  const texto = normalizarTextoConfirmacionSeguro(mensaje);
  return [
    "no",
    "mejor no",
    "cancelar",
    "cancela",
    "salir",
    "deten",
    "detente",
  ].includes(texto);
}

function detectarDudaPlanificacion(mensaje: string) {
  const texto = normalizarTextoPlanificacion(mensaje);
  return [
    "creo",
    "creeria",
    "supongo",
    "tal vez",
    "quizas",
    "quiza",
    "me parece",
    "puede ser",
  ].some((termino) => texto.includes(termino));
}

function detectarModoPlanificacionTodo(mensaje: string): ModoPlanificacionTodo | null {
  const texto = normalizarTextoPlanificacion(mensaje);

  if (
    texto === "1" ||
    texto.includes("solo calendario") ||
    texto.includes("solo lo que ya") ||
    texto.includes("solo lo calendarizado") ||
    texto.includes("solo reordena") ||
    texto.includes("solo reorganiza")
  ) {
    return "solo-calendarizado";
  }

  if (
    texto === "2" ||
    (texto.includes("tareas") && !texto.includes("repasos")) ||
    texto.includes("agrega tareas")
  ) {
    return "agregar-tareas";
  }

  if (
    texto === "3" ||
    (texto.includes("repasos") && !texto.includes("tareas")) ||
    texto.includes("agrega repasos")
  ) {
    return "agregar-repasos";
  }

  if (
    texto === "4" ||
    texto.includes("ambos") ||
    texto.includes("todo") ||
    (texto.includes("tareas") && texto.includes("repasos"))
  ) {
    return "agregar-todo";
  }

  return null;
}

function obtenerResumenModoTodo(modoTodo: ModoPlanificacionTodo) {
  switch (modoTodo) {
    case "solo-calendarizado":
      return "solo lo que ya está en tu calendario";
    case "agregar-tareas":
      return "lo ya calendarizado y además tareas pendientes";
    case "agregar-repasos":
      return "lo ya calendarizado y además repasos de cursos";
    case "agregar-todo":
      return "lo ya calendarizado y además tareas y repasos nuevos";
    default:
      return "solo lo que ya está en tu calendario";
  }
}

function obtenerResumenDiasBloqueados(diasBloqueados: number[]) {
  if (!diasBloqueados.length) {
    return "sin dias bloqueados";
  }

  return diasBloqueados.map((dia) => obtenerEtiquetaDiaPlanificador(dia)).join(", ");
}

function obtenerTextoDiasBloqueadosParaMensaje(diasBloqueados: number[]) {
  if (!diasBloqueados.length) {
    return "ninguno";
  }

  return [...diasBloqueados]
    .sort((a, b) => a - b)
    .map((dia) => obtenerEtiquetaDiaPlanificador(dia).toLowerCase())
    .join(" y ");
}

function obtenerDiaPlanificadorDesdeFechaLocal(fecha: Date) {
  return (fecha.getDay() + 6) % 7;
}

function formatearFechaExactaPlanificacion(fecha: Date | string) {
  const fechaValor = typeof fecha === "string" ? parseISO(fecha) : fecha;
  const texto = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fechaValor);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatearFechaCortaPlanificacion(fecha: Date | string) {
  const fechaValor = typeof fecha === "string" ? parseISO(fecha) : fecha;
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
  }).format(fechaValor);
}

function describirListaDiasPlanificables(diasDisponibles: DiaPlanificableVisual[]) {
  const etiquetas = diasDisponibles.map((dia) => dia.etiquetaDia);

  if (etiquetas.length === 0) {
    return "ningun dia";
  }

  if (etiquetas.length === 1) {
    return etiquetas[0];
  }

  if (etiquetas.length === 2) {
    return `${etiquetas[0]} y ${etiquetas[1]}`;
  }

  return `${etiquetas.slice(0, -1).join(", ")} y ${etiquetas[etiquetas.length - 1]}`;
}

function limpiarTituloBloquePrevisualizado(titulo: string) {
  return titulo.replace(/^(tarea|repaso):\s*/i, "").trim();
}

function formatearRangoHorarioPlanificado(horaInicio: number, duracion: number) {
  const horaFin = horaInicio + duracion;
  return `${horaInicio}:00 - ${horaFin}:00`;
}

function construirLineasVistaPreviaPlanificacion(
  resultado: ResultadoPlanificacionInteligente,
) {
  const bloques = resultado.bloquesPrevistos ?? [];
  return bloques.slice(0, 4).map((bloque) => {
    const dia = obtenerEtiquetaDiaPlanificador(bloque.dia);
    return `- ${dia}, ${formatearRangoHorarioPlanificado(bloque.horaInicio, bloque.duracion)}: ${limpiarTituloBloquePrevisualizado(bloque.titulo)}`;
  });
}

function obtenerDiasCandidatosConFechas(fechaObjetivo: string) {
  const hoy = startOfToday();
  const fechaLimite = parseISO(fechaObjetivo);
  const diferencia = differenceInCalendarDays(fechaLimite, hoy);
  const cantidadDias = diferencia < 0 ? 7 : Math.min(diferencia + 1, 7);

  return Array.from({ length: cantidadDias }, (_, indice) => {
    const fecha = addDays(hoy, indice);
    const diferenciaRelativa = differenceInCalendarDays(fecha, hoy);

    return {
      dia: obtenerDiaPlanificadorDesdeFechaLocal(fecha),
      fecha,
      etiquetaDia: obtenerEtiquetaDiaPlanificador(obtenerDiaPlanificadorDesdeFechaLocal(fecha)),
      etiquetaFecha: formatearFechaCortaPlanificacion(fecha),
      destacado:
        diferenciaRelativa === 0 ? "Hoy" : diferenciaRelativa === 1 ? "Manana" : undefined,
    };
  });
}

function obtenerFechaObjetivoCursoLocal(cursoId: string, tareas: Tarea[], examenes: Examen[]) {
  const hoy = startOfToday();
  const candidatos = [
    ...tareas
      .filter((tarea) => tarea.cursoId === cursoId && esTareaActiva(tarea))
      .map((tarea) => tarea.fechaEntrega),
    ...examenes
      .filter(
        (examen) =>
          examen.cursoId === cursoId &&
          differenceInCalendarDays(parseISO(examen.fecha), hoy) >= 0,
      )
      .map((examen) => examen.fecha),
  ].sort();

  return candidatos[0] ?? format(addDays(hoy, 7), "yyyy-MM-dd");
}

function construirMetadatosDiasPlanificacion({
  alcance,
  objetivoId,
  tareas,
  cursos,
  examenes,
}: {
  alcance: AlcancePlanificacion | null;
  objetivoId?: string;
  tareas: Tarea[];
  cursos: Curso[];
  examenes: Examen[];
}): MetadatosDiasPlanificacion | null {
  const hoy = startOfToday();

  if (!alcance) {
    return null;
  }

  if (alcance === "todo") {
    const diasDisponibles = Array.from({ length: 7 }, (_, indice) => {
      const fecha = addDays(hoy, indice);
      const diferenciaRelativa = differenceInCalendarDays(fecha, hoy);
      const dia = obtenerDiaPlanificadorDesdeFechaLocal(fecha);

      return {
        dia,
        fecha,
        etiquetaDia: obtenerEtiquetaDiaPlanificador(dia),
        etiquetaFecha: formatearFechaCortaPlanificacion(fecha),
        destacado:
          diferenciaRelativa === 0 ? "Hoy" : diferenciaRelativa === 1 ? "Manana" : undefined,
      };
    });

    return {
      diasPermitidos: diasDisponibles.map((dia) => dia.dia),
      diasDisponibles,
      detalle:
        `Para reorganizar todo voy a mirar los proximos 7 dias, desde ${formatearFechaExactaPlanificacion(hoy)} ` +
        `hasta ${formatearFechaExactaPlanificacion(addDays(hoy, 6))}.`,
      ayuda:
        "Marca solo los dias que quieres reservar para ti. El resto quedara disponible para estudio.",
    };
  }

  if (alcance === "tarea") {
    const tareaObjetivo = tareas.find((tarea) => tarea.id === objetivoId);
    if (!tareaObjetivo) {
      return null;
    }

    const diasDisponibles = obtenerDiasCandidatosConFechas(tareaObjetivo.fechaEntrega);
    const diferencia = differenceInCalendarDays(parseISO(tareaObjetivo.fechaEntrega), hoy);
    const diasTexto = describirListaDiasPlanificables(diasDisponibles);

    return {
      diasPermitidos: diasDisponibles.map((dia) => dia.dia),
      diasDisponibles,
      detalle:
        diferencia === 0
          ? `Esta tarea vence hoy, ${formatearFechaExactaPlanificacion(tareaObjetivo.fechaEntrega)}, asi que solo puedo usar ${diasTexto}.`
          : diferencia > 0
            ? `Esta tarea vence el ${formatearFechaExactaPlanificacion(tareaObjetivo.fechaEntrega)}, asi que puedo moverla entre ${diasTexto}.`
            : `Esta tarea ya esta atrasada desde ${formatearFechaExactaPlanificacion(tareaObjetivo.fechaEntrega)}. La voy a reacomodar usando los proximos 7 dias desde hoy.`,
      ayuda:
        diasDisponibles.length === 1
          ? `Si reservas ${diasTexto}, me quedo sin margen para programarla antes de la entrega.`
          : "Marca solo los dias que quieres reservar para ti dentro de este rango.",
    };
  }

  const cursoObjetivo = cursos.find((curso) => curso.id === objetivoId);
  if (!cursoObjetivo) {
    return null;
  }

  const fechaObjetivo = obtenerFechaObjetivoCursoLocal(cursoObjetivo.id, tareas, examenes);
  const diasDisponibles = obtenerDiasCandidatosConFechas(fechaObjetivo);
  const diferencia = differenceInCalendarDays(parseISO(fechaObjetivo), hoy);
  const diasTexto = describirListaDiasPlanificables(diasDisponibles);

  return {
    diasPermitidos: diasDisponibles.map((dia) => dia.dia),
    diasDisponibles,
    detalle:
      diferencia === 0
        ? `Tu siguiente hito de ${cursoObjetivo.nombre} cae hoy, ${formatearFechaExactaPlanificacion(fechaObjetivo)}, asi que solo puedo usar ${diasTexto}.`
        : diferencia > 0
          ? `Voy a tomar como referencia ${formatearFechaExactaPlanificacion(fechaObjetivo)} para ${cursoObjetivo.nombre}. Con eso puedo usar ${diasTexto}.`
          : `No veo un hito futuro para ${cursoObjetivo.nombre}, asi que usare los proximos 7 dias desde hoy para ordenar el repaso.`,
    ayuda:
      diasDisponibles.length === 1
        ? `Si reservas ${diasTexto}, me quedo sin huecos utiles para ese repaso.`
        : "Marca solo los dias que quieres reservar para ti dentro de este rango.",
  };
}

function obtenerClasesOpcionPlanificacion(
  tono: OpcionVisualPlanificacion["tono"],
) {
  switch (tono) {
    case "blue":
      return {
        tarjeta: "border-blue-200 bg-blue-50/80 hover:border-blue-300 hover:bg-blue-100/70",
        icono: "bg-blue-600/10 text-blue-700",
        badge: "bg-blue-100 text-blue-700",
        flecha: "text-blue-700",
      };
    case "violet":
      return {
        tarjeta: "border-violet-200 bg-violet-50/80 hover:border-violet-300 hover:bg-violet-100/70",
        icono: "bg-violet-600/10 text-violet-700",
        badge: "bg-violet-100 text-violet-700",
        flecha: "text-violet-700",
      };
    case "emerald":
      return {
        tarjeta: "border-emerald-200 bg-emerald-50/80 hover:border-emerald-300 hover:bg-emerald-100/70",
        icono: "bg-emerald-600/10 text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700",
        flecha: "text-emerald-700",
      };
    case "amber":
      return {
        tarjeta: "border-amber-200 bg-amber-50/80 hover:border-amber-300 hover:bg-amber-100/70",
        icono: "bg-amber-600/10 text-amber-700",
        badge: "bg-amber-100 text-amber-700",
        flecha: "text-amber-700",
      };
    case "rose":
      return {
        tarjeta: "border-rose-200 bg-rose-50/80 hover:border-rose-300 hover:bg-rose-100/70",
        icono: "bg-rose-600/10 text-rose-700",
        badge: "bg-rose-100 text-rose-700",
        flecha: "text-rose-700",
      };
    default:
      return {
        tarjeta: "border-slate-200 bg-slate-50/90 hover:border-slate-300 hover:bg-slate-100",
        icono: "bg-slate-600/10 text-slate-700",
        badge: "bg-slate-200 text-slate-700",
        flecha: "text-slate-700",
      };
  }
}

function seleccionarTareaDesdeTexto(mensaje: string, tareas: Tarea[]) {
  const texto = normalizarTextoPlanificacion(mensaje);
  const numero = Number.parseInt(texto, 10);

  if (Number.isFinite(numero) && numero >= 1 && numero <= tareas.length) {
    return tareas[numero - 1];
  }

  return (
    tareas.find((tarea) => normalizarTextoPlanificacion(tarea.titulo).includes(texto)) ??
    tareas.find((tarea) => texto.includes(normalizarTextoPlanificacion(tarea.titulo))) ??
    null
  );
}

function seleccionarCursoDesdeTexto(mensaje: string, cursos: Curso[]) {
  const texto = normalizarTextoPlanificacion(mensaje);
  const numero = Number.parseInt(texto, 10);

  if (Number.isFinite(numero) && numero >= 1 && numero <= cursos.length) {
    return cursos[numero - 1];
  }

  return (
    cursos.find((curso) => normalizarTextoPlanificacion(curso.nombre).includes(texto)) ??
    cursos.find((curso) => texto.includes(normalizarTextoPlanificacion(curso.nombre))) ??
    null
  );
}

export default function AIAssistant() {
  const {
    usuarioActual,
    mensajesChat,
    enviarMensajeAsistente,
    anexarMensajesAsistenteLocales,
    limpiarMensajesAsistente,
    previsualizarReplanificacionHorario,
    replanificarHorarioInteligente,
    tareas,
    cursos,
    examenes,
    bloquesPlanificador,
    fuenteAsistente,
  } = useStudyFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mensaje, setMensaje] = useState("");
  const [mensajesExpandidos, setMensajesExpandidos] = useState<Record<string, boolean>>({});
  const [flujoPlanificacion, setFlujoPlanificacion] = useState<FlujoPlanificacionChat>(flujoPlanificacionInicial);
  const [diasSeleccionadosPlanificacion, setDiasSeleccionadosPlanificacion] = useState<number[]>([]);
  const [previsualizacionPlanificacion, setPrevisualizacionPlanificacion] = useState<ResultadoPlanificacionInteligente | null>(null);
  const finConversacionRef = useRef<HTMLDivElement | null>(null);

  const examenesProximos = [...examenes].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3);
  const tareasPlanificables = useMemo(
    () =>
      tareas
        .filter((tarea) => esTareaActiva(tarea))
        .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))
        .slice(0, 6),
    [tareas],
  );
  const cursosPlanificables = useMemo(() => cursos.slice(0, 6), [cursos]);
  const tareasActivas = tareas.filter(esTareaActiva);
  const tareasPendientesVigentes = tareas.filter(esTareaPendienteVigente);
  const tareasAtrasadas = tareas.filter(esTareaAtrasada);
  const bloquesEstudio = bloquesPlanificador.filter((bloque) => bloque.tipo === "study");
  const asistentePensando = mensajesChat.some(
    (item) => item.tipo === "ai" && item.mensaje === "Pensando tu respuesta con Groq...",
  );
  const fuenteVisible = flujoPlanificacion.activo ? "sistema" : fuenteAsistente;
  const tonoPlanificador = resolverTonoPlanificadorLocal(usuarioActual?.tonoAsistente);
  const anexarMensajesPlanificacion = (
    mensajes: Array<{ tipo: "user" | "ai"; mensaje: string }>,
  ) => {
    anexarMensajesAsistenteLocales(
      mensajes.map((item) =>
        item.tipo === "ai"
          ? {
              ...item,
              mensaje: adaptarMensajePlanificadorAlTono(item.mensaje, tonoPlanificador),
            }
          : item,
      ),
    );
  };

  const sugerenciasContextuales = useMemo(
    () => [
      {
        titulo: "Planificacion guiada",
        descripcion: `${tareasActivas.length} tareas activas y ${examenesProximos.length} examenes para reorganizar.`,
        icono: CalendarClock,
        accion: "Planifica mi horario",
      },
      {
        titulo: "Practica guiada",
        descripcion: "Convierte tus temas pendientes en preguntas de repaso.",
        icono: BrainCircuit,
        accion: "Hazme preguntas de practica",
      },
      {
        titulo: "Resumen rapido",
        descripcion: "Pide un resumen breve para estudiar antes de tu siguiente bloque.",
        icono: BookOpen,
        accion: "Resume este tema",
      },
    ],
    [examenesProximos.length, tareasActivas.length],
  );

  const panelOpcionesPlanificacion = useMemo<PanelVisualPlanificacion | null>(() => {
    if (!flujoPlanificacion.activo) {
      return null;
    }

    if (flujoPlanificacion.paso === "modo") {
      return {
        titulo:
          tonoPlanificador === "amigable"
            ? "Elige como quieres que organicemos esto"
            : "Selecciona el tipo de planificacion",
        descripcion:
          tonoPlanificador === "frio"
            ? "Puedes tocar una opcion para continuar."
            : "No hace falta escribir si no quieres. Toca una opcion y seguimos.",
        pasoEtiqueta: "Paso 1",
        layout: "triple",
        opciones: [
          {
            id: "modo-todo",
            valor: "todo",
            titulo: "Todo mi horario",
            descripcion: "Reorganizo tareas y repasos de forma global segun tus reglas.",
            badge: "Semana completa",
            Icono: CalendarClock,
            tono: "blue",
          },
          {
            id: "modo-tarea",
            valor: "una tarea",
            titulo: "Solo una tarea",
            descripcion: "Trabajamos una entrega puntual sin tocar lo demas.",
            badge: "Puntual",
            Icono: ClipboardList,
            tono: "violet",
          },
          {
            id: "modo-curso",
            valor: "un curso",
            titulo: "Repaso de un curso",
            descripcion: "Organizo bloques de repaso general para un curso especifico.",
            badge: "Curso",
            Icono: BookOpen,
            tono: "emerald",
          },
        ],
      };
    }

    if (flujoPlanificacion.paso === "modo-todo") {
      return {
        titulo:
          tonoPlanificador === "amigable"
            ? "Dime con que base quieres que trabaje"
            : "Selecciona la base de planificacion",
        descripcion: "Asi respetamos lo que ya calendarizaste y solo agregamos lo que tu decidas.",
        pasoEtiqueta: "Paso 2",
        layout: "doble",
        opciones: [
          {
            id: "todo-solo",
            valor: "solo calendario",
            titulo: "Solo lo ya calendarizado",
            descripcion: "Reacomodo unicamente los bloques que ya tienes en el planner.",
            badge: "Recomendado",
            Icono: CalendarClock,
            tono: "blue",
          },
          {
            id: "todo-tareas",
            valor: "tareas",
            titulo: "Agregar tareas pendientes",
            descripcion: "Mantengo lo que ya esta y sumo tareas activas todavia no agendadas.",
            badge: `${tareasPendientesVigentes.length} tareas`,
            Icono: ClipboardList,
            tono: "violet",
          },
          {
            id: "todo-repasos",
            valor: "repasos",
            titulo: "Agregar repasos de cursos",
            descripcion: "Mantengo tu calendario y sumo repasos generales de cursos.",
            badge: `${cursosPlanificables.length} cursos`,
            Icono: BookOpen,
            tono: "emerald",
          },
          {
            id: "todo-completo",
            valor: "todo",
            titulo: "Agregar todo lo nuevo",
            descripcion: "Incluyo tareas pendientes y repasos ademas de lo ya calendarizado.",
            badge: "Mas completo",
            Icono: Sparkles,
            tono: "amber",
          },
        ],
      };
    }

    if (flujoPlanificacion.paso === "objetivo-tarea") {
      return {
        titulo:
          tonoPlanificador === "amigable"
            ? "Escoge la tarea que quieres acomodar primero"
            : "Selecciona una tarea",
        descripcion: "Te muestro las mas urgentes y activas para avanzar rapido.",
        pasoEtiqueta: "Paso 2",
        layout: "lista",
        opciones: tareasPlanificables.map((tarea) => {
          const curso = cursos.find((item) => item.id === tarea.cursoId);
          return {
            id: tarea.id,
            valor: tarea.titulo,
            titulo: tarea.titulo,
            descripcion: `${curso?.nombre ?? "Sin curso"}, entrega ${formatearFechaCorta(tarea.fechaEntrega)}`,
            detalle: `${tarea.horasEstimadas}h estimadas, ${tarea.progreso}% de avance`,
            badge: tarea.prioridad === "high" ? "Alta" : tarea.prioridad === "medium" ? "Media" : "Baja",
            Icono: ClipboardList,
            tono:
              tarea.prioridad === "high"
                ? "rose"
                : tarea.prioridad === "medium"
                  ? "amber"
                  : "blue",
          };
        }),
      };
    }

    if (flujoPlanificacion.paso === "objetivo-curso") {
      return {
        titulo:
          tonoPlanificador === "amigable"
            ? "Escoge el curso que quieres reforzar"
            : "Selecciona un curso",
        descripcion: "Voy a usarlo como base para mover o crear bloques de repaso.",
        pasoEtiqueta: "Paso 2",
        layout: "lista",
        opciones: cursosPlanificables.map((curso) => ({
          id: curso.id,
          valor: curso.nombre,
          titulo: curso.nombre,
          descripcion: curso.docente || "Curso registrado",
          detalle: curso.horario || "Sin horario detallado",
          badge: "Repaso",
          Icono: BookOpen,
          tono: "emerald",
        })),
      };
    }

    if (flujoPlanificacion.paso === "jornada") {
      return {
        titulo:
          tonoPlanificador === "amigable"
            ? "Ahora elige la franja que mejor te acomoda"
            : "Selecciona tu franja preferida",
        descripcion: "Solo la usare como preferencia. Si no encuentro espacio suficiente, luego podemos ajustarla.",
        pasoEtiqueta: "Paso 4",
        layout: "cuadruple",
        opciones: [
          {
            id: "jornada-manana",
            valor: "manana",
            titulo: "Manana",
            descripcion: "Prioriza primeras horas libres del dia.",
            badge: "AM",
            Icono: Sun,
            tono: "amber",
          },
          {
            id: "jornada-tarde",
            valor: "tarde",
            titulo: "Tarde",
            descripcion: "Busca espacios despues del mediodia.",
            badge: "PM",
            Icono: Sunset,
            tono: "violet",
          },
          {
            id: "jornada-noche",
            valor: "noche",
            titulo: "Noche",
            descripcion: "Reserva horas al final del dia cuando esten libres.",
            badge: "Tarde-noche",
            Icono: Moon,
            tono: "blue",
          },
          {
            id: "jornada-flexible",
            valor: "flexible",
            titulo: "Flexible",
            descripcion: "Aprovecha los mejores huecos sin casarse con una sola franja.",
            badge: "Mas huecos",
            Icono: Sparkles,
            tono: "emerald",
          },
        ],
      };
    }

    if (flujoPlanificacion.paso === "confirmacion") {
      return {
        titulo:
          tonoPlanificador === "amigable"
            ? "Si te gusta el plan, lo aplicamos"
            : "Confirma el cambio",
        descripcion: "Revisa la vista previa visual de abajo y decide si quieres guardarla ahora o dejarla en pausa.",
        pasoEtiqueta: "Confirmacion",
        layout: "doble",
        opciones: [
          {
            id: "confirmar-si",
            valor: "si",
            titulo: "Aplicar ahora",
            descripcion: "Guardo la replanificacion en tu calendario.",
            badge: "Guardar",
            Icono: CheckCircle2,
            tono: "emerald",
          },
          {
            id: "confirmar-no",
            valor: "no",
            titulo: "Cancelar por ahora",
            descripcion: "No hago cambios y dejamos el flujo en pausa.",
            badge: "Sin cambios",
            Icono: Trash2,
            tono: "slate",
          },
        ],
      };
    }

    return null;
  }, [
    cursos,
    cursosPlanificables,
    flujoPlanificacion,
    tareasPendientesVigentes.length,
    tareasPlanificables,
    tonoPlanificador,
  ]);

  const metadatosDiasPlanificacion = useMemo(
    () =>
      construirMetadatosDiasPlanificacion({
        alcance: flujoPlanificacion.alcance,
        objetivoId: flujoPlanificacion.objetivoId,
        tareas,
        cursos,
        examenes,
      }),
    [
      cursos,
      examenes,
      flujoPlanificacion.alcance,
      flujoPlanificacion.objetivoId,
      tareas,
    ],
  );

  useEffect(() => {
    if (flujoPlanificacion.paso === "dias") {
      setDiasSeleccionadosPlanificacion(
        flujoPlanificacion.diasBloqueados.filter((dia) =>
          metadatosDiasPlanificacion?.diasPermitidos.includes(dia) ?? true,
        ),
      );
      return;
    }

    setDiasSeleccionadosPlanificacion([]);
  }, [
    flujoPlanificacion.diasBloqueados,
    flujoPlanificacion.paso,
    metadatosDiasPlanificacion?.diasPermitidos,
  ]);

  useEffect(() => {
    if (flujoPlanificacion.paso !== "confirmacion") {
      setPrevisualizacionPlanificacion(null);
    }
  }, [flujoPlanificacion.paso]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      finConversacionRef.current?.scrollIntoView({
        block: "end",
        behavior: mensajesChat.length > 1 ? "smooth" : "auto",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [finConversacionRef, flujoPlanificacion.paso, mensajesChat.length, panelOpcionesPlanificacion]);

  useEffect(() => {
    if (searchParams.get("accion") !== "planificar") {
      return;
    }

    if (!flujoPlanificacion.activo) {
      const limite = usuarioActual?.horasEstudioDiarias ?? 2;
      anexarMensajesPlanificacion([
        {
          tipo: "ai",
          mensaje:
            mensajeSegunTonoPlanificador(tonoPlanificador, {
              amigable:
                `Buenisimo. Vamos a ordenar tu horario contigo. Tu limite actual es de ${limite}h de estudio por dia.\n\n` +
                "Puedo reorganizar `todo`, `una tarea` o `un curso`. Si quieres, te dejo opciones visuales abajo para elegir mas rapido.",
              responsable:
                `Vamos a planificar tu horario con IA. Tu limite actual es de ${limite}h de estudio por dia.\n\n` +
                "Puedo reorganizar `todo`, `una tarea` o `un curso`. Puedes escribirlo o elegir una opcion visual abajo.",
              frio:
                `Planificacion activa. Limite actual: ${limite}h de estudio por dia.\n\n` +
                "Elige `todo`, `una tarea` o `un curso`, o usa una opcion visual abajo.",
            }),
        },
      ]);
      setFlujoPlanificacion({
        ...flujoPlanificacionInicial,
        activo: true,
      });
    }

    const siguiente = new URLSearchParams(searchParams);
    siguiente.delete("accion");
    setSearchParams(siguiente, { replace: true });
  }, [
    anexarMensajesAsistenteLocales,
    flujoPlanificacion.activo,
    searchParams,
    setSearchParams,
    tonoPlanificador,
    usuarioActual?.horasEstudioDiarias,
  ]);

  const limpiarConversacion = () => {
    setFlujoPlanificacion(flujoPlanificacionInicial);
    setPrevisualizacionPlanificacion(null);
    limpiarMensajesAsistente();
  };

  const iniciarFlujoPlanificacion = (mensajeUsuario?: string) => {
    const limite = usuarioActual?.horasEstudioDiarias ?? 2;
    setPrevisualizacionPlanificacion(null);
    anexarMensajesPlanificacion([
      ...(mensajeUsuario ? [{ tipo: "user" as const, mensaje: mensajeUsuario }] : []),
      {
        tipo: "ai" as const,
        mensaje:
          mensajeSegunTonoPlanificador(tonoPlanificador, {
            amigable:
              `Claro, te ayudo encantado. Voy a respetar tu limite actual de ${limite}h por dia para que el horario te quede manejable.\n\n` +
              "Dime si quieres reorganizar `todo`, `una tarea` o `un curso`. Si prefieres, puedes tocar una de las tarjetas de abajo.",
            responsable:
              `Claro. Puedo ayudarte a planificar tu horario y voy a respetar tu limite actual de ${limite}h por dia.\n\n` +
              "Dime si quieres reorganizar `todo`, `una tarea` o `un curso`, o elige una opcion visual abajo.",
            frio:
              `Puedo reorganizar tu horario con un limite de ${limite}h por dia.\n\n` +
              "Indica `todo`, `una tarea` o `un curso`, o toca una opcion abajo.",
          }),
      },
    ]);
    setFlujoPlanificacion({
      ...flujoPlanificacionInicial,
      activo: true,
    });
  };

  const procesarMensajePlanificacion = (textoOriginal: string) => {
    const anexarMensajesAsistenteLocales = anexarMensajesPlanificacion;
    const texto = textoOriginal.trim();
    const textoNormalizado = normalizarTextoPlanificacion(texto);

    if (esConfirmacionNegativaSegura(texto) && flujoPlanificacion.activo) {
      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje: "Listo, cancelé esta planificacion. Si quieres, luego volvemos a empezar con otra configuracion.",
        },
      ]);
      setPrevisualizacionPlanificacion(null);
      setFlujoPlanificacion(flujoPlanificacionInicial);
      return;
    }

    if (!flujoPlanificacion.activo) {
      iniciarFlujoPlanificacion(texto);
      return;
    }

    if (flujoPlanificacion.paso === "modo") {
      if (textoNormalizado.includes("todo")) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              "Perfecto. Antes de mover todo, dime con que base quieres trabajar:\n\n" +
              "1. Solo lo que ya esta en tu calendario\n" +
              "2. Lo que ya esta y ademas agregar tareas pendientes\n" +
              "3. Lo que ya esta y ademas agregar repasos de cursos\n" +
              "4. Agregar tareas y repasos nuevos tambien\n\n" +
              "Puedes responder con el numero o con algo como `solo calendario`, `tareas`, `repasos` o `todo`. Si quieres, toca una tarjeta abajo.",
          },
        ]);
        setFlujoPlanificacion((actual) => ({
          ...actual,
          alcance: "todo",
          paso: "modo-todo",
        }));
        return;
      }

      if (textoNormalizado.includes("tarea")) {
        if (!tareasPlanificables.length) {
          anexarMensajesAsistenteLocales([
            { tipo: "user", mensaje: texto },
            {
              tipo: "ai",
              mensaje: "Ahora mismo no veo tareas activas para reorganizar. Si quieres, puedo planificar todo o ayudarte con un curso.",
            },
          ]);
          return;
        }

        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              `Perfecto. Elige la tarea que quieres reorganizar:\n\n${tareasPlanificables
                .map((tarea, indice) => `${indice + 1}. ${tarea.titulo} (${formatearFechaCorta(tarea.fechaEntrega)})`)
                .join("\n")}\n\nPuedes responder con el numero o con el nombre. Tambien te deje opciones abajo.`,
          },
        ]);
        setFlujoPlanificacion((actual) => ({
          ...actual,
          alcance: "tarea",
          paso: "objetivo-tarea",
        }));
        return;
      }

      if (textoNormalizado.includes("curso") || textoNormalizado.includes("repaso")) {
        if (!cursosPlanificables.length) {
          anexarMensajesAsistenteLocales([
            { tipo: "user", mensaje: texto },
            {
              tipo: "ai",
              mensaje: "Ahora mismo no veo cursos cargados para organizar un repaso.",
            },
          ]);
          return;
        }

        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              `Perfecto. Dime que curso quieres reforzar:\n\n${cursosPlanificables
                .map((curso, indice) => `${indice + 1}. ${curso.nombre}`)
                .join("\n")}\n\nPuedes responder con el numero o con el nombre. Tambien te deje opciones abajo.`,
          },
        ]);
        setFlujoPlanificacion((actual) => ({
          ...actual,
          alcance: "curso",
          paso: "objetivo-curso",
        }));
        return;
      }

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje: "Todavia necesito una de estas tres opciones: `todo`, `una tarea` o `un curso`.",
        },
      ]);
      return;
    }

    if (flujoPlanificacion.paso === "modo-todo") {
      const modoTodo = detectarModoPlanificacionTodo(texto);

      if (!modoTodo) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              "Todavia necesito una de estas opciones: `1`, `2`, `3` o `4`. Si prefieres, tambien puedes responder `solo calendario`, `tareas`, `repasos` o `todo`.",
          },
        ]);
        return;
      }

      const metadatosDias = construirMetadatosDiasPlanificacion({
        alcance: "todo",
        tareas,
        cursos,
        examenes,
      });

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `Perfecto. Voy a trabajar con ${obtenerResumenModoTodo(modoTodo)}.\n\n` +
            `${metadatosDias?.detalle ?? "Voy a revisar primero tu ventana disponible."}\n\n` +
            `${metadatosDias?.ayuda ?? "Marca solo los dias que quieres reservar para ti."}\n\n` +
            "Si prefieres, puedes escribir algo como `martes y domingo`, elegirlo abajo o tocar `Todos disponibles`.",
        },
      ]);
      setFlujoPlanificacion((actual) => ({
        ...actual,
        modoTodo,
        paso: "dias",
      }));
      return;
    }

    if (flujoPlanificacion.paso === "objetivo-tarea") {
      const tareaSeleccionada = seleccionarTareaDesdeTexto(texto, tareasPlanificables);

      if (!tareaSeleccionada) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje: "No identifiqué esa tarea. Responde con el numero de la lista o con el nombre exacto.",
          },
        ]);
        return;
      }

      const metadatosDias = construirMetadatosDiasPlanificacion({
        alcance: "tarea",
        objetivoId: tareaSeleccionada.id,
        tareas,
        cursos,
        examenes,
      });

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `Perfecto. Voy a reorganizar la tarea **${tareaSeleccionada.titulo}**.\n\n` +
            `${metadatosDias?.detalle ?? "Voy a revisar primero en que dias todavia la puedo mover."}\n\n` +
            `${metadatosDias?.ayuda ?? "Marca solo los dias que quieres reservar para ti dentro de esta tarea."}\n\n` +
            "Abajo te dejo solo los dias que de verdad puedo tocar en este caso.",
        },
      ]);
      setFlujoPlanificacion((actual) => ({
        ...actual,
        objetivoId: tareaSeleccionada.id,
        paso: "dias",
      }));
      return;
    }

    if (flujoPlanificacion.paso === "objetivo-curso") {
      const cursoSeleccionado = seleccionarCursoDesdeTexto(texto, cursosPlanificables);

      if (!cursoSeleccionado) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje: "No identifiqué ese curso. Responde con el numero de la lista o con el nombre del curso.",
          },
        ]);
        return;
      }

      const metadatosDias = construirMetadatosDiasPlanificacion({
        alcance: "curso",
        objetivoId: cursoSeleccionado.id,
        tareas,
        cursos,
        examenes,
      });

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `Perfecto. Voy a reorganizar el repaso de **${cursoSeleccionado.nombre}**.\n\n` +
            `${metadatosDias?.detalle ?? "Voy a revisar primero el rango util para este repaso."}\n\n` +
            `${metadatosDias?.ayuda ?? "Marca solo los dias que quieres reservar para ti dentro de este rango."}\n\n` +
            "Abajo te dejo solo los dias que de verdad puedo usar para este repaso.",
        },
      ]);
      setFlujoPlanificacion((actual) => ({
        ...actual,
        objetivoId: cursoSeleccionado.id,
        paso: "dias",
      }));
      return;
    }

    if (flujoPlanificacion.paso === "dias") {
      const metadatosDias = construirMetadatosDiasPlanificacion({
        alcance: flujoPlanificacion.alcance,
        objetivoId: flujoPlanificacion.objetivoId,
        tareas,
        cursos,
        examenes,
      });
      const diasPermitidos = metadatosDias?.diasPermitidos ?? [];
      const diasDetectados = extraerDiasBloqueados(texto);
      const diasBloqueados = diasDetectados.filter((dia) => diasPermitidos.includes(dia));
      const diasFueraDeRango = diasDetectados.filter((dia) => !diasPermitidos.includes(dia));
      const respuestaVacia =
        !diasDetectados.length &&
        !textoNormalizado.includes("ninguno") &&
        !textoNormalizado.includes("ningun") &&
        !textoNormalizado.includes("ninguna");

      if (respuestaVacia) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              "No logre leer bien los dias. Si quieres, usa los botones de abajo o escribe algo como `martes y domingo`. Si todos te sirven, responde `ninguno`.",
          },
        ]);
        return;
      }

      if (diasPermitidos.length > 0 && diasBloqueados.length >= diasPermitidos.length) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              `${metadatosDias?.detalle ?? "En este caso tengo un rango util bastante corto."}\n\n` +
              "Con esa seleccion me quedo sin ningun dia util para programar el bloque. " +
              `Deja al menos ${obtenerResumenDiasBloqueados(diasPermitidos)} disponible o toca \`Todos disponibles\` y seguimos.`,
          },
        ]);
        return;
      }

      const resumenDias =
        diasBloqueados.length > 0
          ? `Perfecto. Voy a reservar ${obtenerResumenDiasBloqueados(diasBloqueados)} dentro de esta planificacion.`
          : "Perfecto. Dentro de este rango no vas a bloquear ningun dia util.";
      const notaFueraDeRango = diasFueraDeRango.length
        ? `\n\nOjo: ${obtenerResumenDiasBloqueados(diasFueraDeRango)} no afecta este caso porque queda fuera del rango real que puedo usar aqui.`
        : "";

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje: `${resumenDias}${notaFueraDeRango}`,
        },
      ]);

      anexarMensajesAsistenteLocales([
        {
          tipo: "ai",
          mensaje:
            "Perfecto. Ahora dime en que franja prefieres estudiar: `mañana`, `tarde`, `noche` o `flexible`. Si quieres, elige una opcion abajo.",
        },
      ]);
      setFlujoPlanificacion((actual) => ({
        ...actual,
        diasBloqueados,
        paso: "jornada",
      }));
      return;
    }

    if (flujoPlanificacion.paso === "jornada") {
      const jornada = detectarJornadaPlanificacion(texto);
      const expresaDuda = detectarDudaPlanificacion(texto);

      if (!jornada) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje: "Todavia necesito una franja valida: `mañana`, `tarde`, `noche` o `flexible`.",
          },
        ]);
        return;
      }

      const tareaObjetivo = flujoPlanificacion.alcance === "tarea"
        ? tareas.find((tarea) => tarea.id === flujoPlanificacion.objetivoId)
        : null;
      const cursoObjetivo = flujoPlanificacion.alcance === "curso"
        ? cursos.find((curso) => curso.id === flujoPlanificacion.objetivoId)
        : null;
      const resumenObjetivo =
        flujoPlanificacion.alcance === "todo"
          ? "todo tu horario de estudio"
          : flujoPlanificacion.alcance === "tarea"
            ? `la tarea ${tareaObjetivo?.titulo ?? "seleccionada"}`
            : `el repaso de ${cursoObjetivo?.nombre ?? "ese curso"}`;
      const detalleModoTodo =
        flujoPlanificacion.alcance === "todo"
          ? `- Base de planificacion: ${obtenerResumenModoTodo(flujoPlanificacion.modoTodo)}\n`
          : "";
      const detalleDuda = expresaDuda
        ? `- Nota: te lei inclinandote por ${jornada}. Si no te convence, todavia la cambiamos antes de aplicarla.\n`
        : "";
      const preview = previsualizarReplanificacionHorario({
        alcance: flujoPlanificacion.alcance ?? "todo",
        objetivoId: flujoPlanificacion.objetivoId,
        diasBloqueados: flujoPlanificacion.diasBloqueados,
        jornada,
        modoTodo: flujoPlanificacion.modoTodo,
      });

      if (!preview.ok) {
        setPrevisualizacionPlanificacion(null);
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              `${preview.mensaje}\n\n` +
              `${preview.resumen.length ? preview.resumen.join("\n") : "Si quieres, prueba liberando algun dia o usando una franja mas flexible para volver a intentarlo."}`,
          },
        ]);
        return;
      }

      const lineasPreview = construirLineasVistaPreviaPlanificacion(preview);

      setPrevisualizacionPlanificacion(preview);
      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `Listo. Esta seria la vista previa para reorganizar ${resumenObjetivo} con estas reglas:\n\n` +
            detalleModoTodo +
            detalleDuda +
            `- Dias libres: ${obtenerResumenDiasBloqueados(flujoPlanificacion.diasBloqueados)}\n` +
            `- Franja preferida: ${jornada}\n` +
            `- Limite diario actual: ${usuarioActual?.horasEstudioDiarias ?? 2}h\n` +
            `- Horas ubicadas en la vista previa: ${preview.horasProgramadas}h de ${preview.totalHorasSolicitadas ?? preview.horasProgramadas}h\n\n` +
            `${lineasPreview.length ? `${lineasPreview.join("\n")}\n\n` : ""}` +
            "Abajo te dejo la vista previa visual. Si te convence, responde `si` para aplicarla; si no, dime `no` y la dejamos en pausa.",
        },
      ]);
      setFlujoPlanificacion((actual) => ({
        ...actual,
        jornada,
        paso: "confirmacion",
      }));
      return;
    }

    if (flujoPlanificacion.paso === "confirmacion") {
      if (!esConfirmacionPositivaSegura(texto)) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje: "Para seguir necesito que me respondas `si` para aplicar o `no` para cancelar.",
          },
        ]);
        return;
      }

      const resultado = replanificarHorarioInteligente({
        alcance: flujoPlanificacion.alcance ?? "todo",
        objetivoId: flujoPlanificacion.objetivoId,
        diasBloqueados: flujoPlanificacion.diasBloqueados,
        jornada: flujoPlanificacion.jornada,
        modoTodo: flujoPlanificacion.modoTodo,
      });

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `${resultado.mensaje}\n\n${resultado.resumen.length ? resultado.resumen.join("\n") : "No hubo cambios adicionales para mostrar."}`,
        },
      ]);
      setPrevisualizacionPlanificacion(null);
      setFlujoPlanificacion(flujoPlanificacionInicial);
    }
  };

  const manejarEnvio = (event: React.FormEvent) => {
    event.preventDefault();
    if (asistentePensando) return;
    if (!mensaje.trim()) return;
    if (flujoPlanificacion.activo || detectarSolicitudPlanificacionHorario(mensaje.trim())) {
      procesarMensajePlanificacion(mensaje.trim());
      setMensaje("");
      return;
    }
    enviarMensajeAsistente(mensaje.trim());
    setMensaje("");
  };

  const ejecutarAccionRapida = (texto: string) => {
    if (asistentePensando) return;
    if (flujoPlanificacion.activo || detectarSolicitudPlanificacionHorario(texto)) {
      procesarMensajePlanificacion(texto);
      setMensaje("");
      return;
    }
    enviarMensajeAsistente(texto);
    setMensaje("");
  };

  const responderOpcionPlanificacion = (valor: string) => {
    if (asistentePensando) return;
    procesarMensajePlanificacion(valor);
    setMensaje("");
  };

  const alternarDiaPlanificacion = (dia: number) => {
    if (metadatosDiasPlanificacion && !metadatosDiasPlanificacion.diasPermitidos.includes(dia)) {
      return;
    }

    setDiasSeleccionadosPlanificacion((actual) =>
      actual.includes(dia)
        ? actual.filter((item) => item !== dia)
        : [...actual, dia].sort((a, b) => a - b),
    );
  };

  const usarPresetDiasPlanificacion = (dias: number[]) => {
    const diasPermitidos = metadatosDiasPlanificacion?.diasPermitidos ?? [];
    setDiasSeleccionadosPlanificacion(
      dias.filter((dia, indice) => diasPermitidos.includes(dia) && dias.indexOf(dia) === indice),
    );
  };

  const confirmarDiasPlanificacion = () => {
    if (asistentePensando) return;
    procesarMensajePlanificacion(obtenerTextoDiasBloqueadosParaMensaje(diasSeleccionadosPlanificacion));
    setMensaje("");
  };

  const alternarExpansionMensaje = (mensajeId: string) => {
    setMensajesExpandidos((actual) => ({
      ...actual,
      [mensajeId]: !actual[mensajeId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Asistente IA</h1>
          <p className="max-w-2xl text-sm text-gray-600 sm:text-base">
            Usa tu contexto academico real para responder, priorizar y sugerir el siguiente paso.
          </p>
        </div>
        <Badge
          className={`w-fit px-3 py-2 ${
            fuenteVisible === "groq"
              ? "bg-emerald-50 text-emerald-700"
              : fuenteVisible === "sistema"
                ? "bg-blue-50 text-blue-700"
              : fuenteVisible === "error"
                ? "bg-rose-50 text-rose-700"
                : "bg-blue-50 text-blue-700"
          }`}
        >
          {flujoPlanificacion.activo
            ? "Planificador conversacional activo"
            : fuenteVisible === "groq"
            ? "Respuestas reales con Groq"
            : fuenteVisible === "sistema"
              ? "Respuesta directa del sistema"
            : fuenteVisible === "error"
              ? "Groq no respondio"
              : "Esperando respuesta del asistente"}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="flex min-h-[70vh] min-h-0 flex-col overflow-hidden border-none shadow-lg xl:col-span-3 xl:h-[840px] 2xl:h-[900px]">
          <CardHeader className="shrink-0 border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 sm:h-12 sm:w-12">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl">Asistente academico inteligente</CardTitle>
                  <p className="text-xs text-gray-600 sm:text-sm">
                    Usa tu contexto academico real, consulta Groq y ahora tambien puede replanificar tu horario.
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 xl:flex">
                <Badge className="bg-emerald-50 text-emerald-700">{bloquesEstudio.length} bloques de estudio</Badge>
                <Badge className="bg-purple-50 text-purple-700">{mensajesChat.length} mensajes</Badge>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white"
                  onClick={limpiarConversacion}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar chat
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:hidden">
              <Badge className="bg-emerald-50 text-emerald-700">{bloquesEstudio.length} bloques</Badge>
              <Badge className="bg-purple-50 text-purple-700">{mensajesChat.length} mensajes</Badge>
              <Button type="button" variant="outline" size="sm" className="rounded-full bg-white" onClick={limpiarConversacion}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </CardHeader>

          <div className="shrink-0 border-b bg-gray-50/80 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
              {accionesRapidas.map((accion) => (
                <Button
                  key={accion}
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white text-xs sm:text-sm"
                  disabled={asistentePensando}
                  onClick={() => ejecutarAccionRapida(accion)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {accion}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-5 px-4 py-4 pb-14 sm:px-6 sm:py-6 sm:pb-20">
              {mensajesChat.length === 0 ? (
                <EstadoVacio onAction={ejecutarAccionRapida} />
              ) : (
                mensajesChat.map((item, indice) => (
                  item.tipo === "ai" ? (
                    <div key={item.id} className="flex w-full justify-start pr-4 sm:pr-10">
                      <div className="flex min-w-0 max-w-[min(94%,40rem)] items-start gap-2 sm:max-w-[min(86%,40rem)] sm:gap-3">
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-md sm:h-10 sm:w-10">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>

                        <div className="min-w-0 flex-1 overflow-hidden rounded-[24px] border border-gray-100 bg-white/95 px-4 py-4 text-gray-900 shadow-md shadow-slate-200/60 sm:rounded-[28px] sm:px-5">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="rounded-full bg-blue-50 text-blue-700">Sugerencia academica</Badge>
                              {indice === mensajesChat.length - 1 ? (
                                <span className="text-xs text-gray-500">Contexto actualizado</span>
                              ) : null}
                            </div>
                            <MensajeAsistente
                              contenido={item.mensaje}
                              expandido={Boolean(mensajesExpandidos[item.id])}
                              onToggle={() => alternarExpansionMensaje(item.id)}
                            />
                          </div>

                          <span className="mt-3 block text-xs text-gray-500">{item.hora}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="flex w-full justify-end pl-10 sm:pl-16">
                      <div className="min-w-0 w-fit max-w-[min(82%,28rem)] overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-4 text-white shadow-lg shadow-blue-500/20 sm:max-w-[min(72%,28rem)] sm:rounded-[28px] sm:px-5">
                        <MensajeFormateado contenido={item.mensaje} tipo="user" />
                        <span className="mt-3 block text-xs text-blue-100">{item.hora}</span>
                      </div>
                    </div>
                  )
                ))
              )}

              {flujoPlanificacion.activo && flujoPlanificacion.paso === "dias" ? (
                <SelectorDiasPlanificacion
                  metadatos={metadatosDiasPlanificacion}
                  diasSeleccionados={diasSeleccionadosPlanificacion}
                  disabled={asistentePensando}
                  onToggleDia={alternarDiaPlanificacion}
                  onPreset={usarPresetDiasPlanificacion}
                  onConfirm={confirmarDiasPlanificacion}
                />
              ) : (
                <>
                  {flujoPlanificacion.activo &&
                  flujoPlanificacion.paso === "confirmacion" &&
                  previsualizacionPlanificacion ? (
                    <VistaPreviaPlanificacionCard
                      resultado={previsualizacionPlanificacion}
                      objetivoTexto={
                        flujoPlanificacion.alcance === "todo"
                          ? "todo tu horario"
                          : flujoPlanificacion.alcance === "tarea"
                            ? tareas.find((tarea) => tarea.id === flujoPlanificacion.objetivoId)?.titulo ??
                              "la tarea seleccionada"
                            : cursos.find((curso) => curso.id === flujoPlanificacion.objetivoId)?.nombre ??
                              "el curso seleccionado"
                      }
                    />
                  ) : null}

                  {panelOpcionesPlanificacion ? (
                    <SelectorPlanificacionRapida
                      panel={panelOpcionesPlanificacion}
                      disabled={asistentePensando}
                      onSelect={responderOpcionPlanificacion}
                    />
                  ) : null}
                </>
              )}
              <div ref={finConversacionRef} className="h-px w-full shrink-0" />
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t p-4">
            <form onSubmit={manejarEnvio} className="flex gap-2">
              <Input
                value={mensaje}
                onChange={(event) => setMensaje(event.target.value)}
                disabled={asistentePensando}
                placeholder="Preguntame sobre tus tareas, horarios o temas de estudio"
              />
              <Button
                type="submit"
                disabled={asistentePensando || !mensaje.trim()}
                className="shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
            {flujoPlanificacion.activo ? (
              <p className="mt-2 text-xs text-blue-600">
                Flujo activo: responde lo que te pide el planificador para reorganizar tus tareas y repasos.
              </p>
            ) : null}
            {asistentePensando ? (
              <p className="mt-2 text-xs text-gray-500">
                StudyFlow AI esta pensando tu respuesta. Espera un momento antes de enviar otro mensaje.
              </p>
            ) : null}
          </div>
        </Card>

        <div className="hidden space-y-6 xl:block">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Panel rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DatoLateral
                icon={ClipboardList}
                titulo="Tareas activas"
                valor={`${tareasActivas.length}`}
                detalle={
                  tareasAtrasadas.length
                    ? `${tareasPendientesVigentes.length} vigentes y ${tareasAtrasadas.length} atrasadas`
                    : "Pendientes o en progreso"
                }
              />
              <DatoLateral
                icon={CalendarClock}
                titulo="Examenes proximos"
                valor={`${examenesProximos.length}`}
                detalle="Para priorizar respuestas"
              />
              <DatoLateral
                icon={CheckCircle2}
                titulo="Bloques de estudio"
                valor={`${bloquesEstudio.length}`}
                detalle="Disponibles para planificar"
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Atajos utiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sugerenciasContextuales.map((sugerencia) => (
                <button
                  key={sugerencia.titulo}
                  type="button"
                  onClick={() => ejecutarAccionRapida(sugerencia.accion)}
                  className="w-full rounded-2xl bg-gray-50 p-4 text-left transition hover:bg-gray-100"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <sugerencia.icono className="h-5 w-5" />
                  </div>
                  <div className="font-medium">{sugerencia.titulo}</div>
                  <div className="mt-1 text-sm text-gray-500">{sugerencia.descripcion}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Contexto academico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              {examenesProximos.length > 0 ? (
                <p>
                  Tu proximo examen visible es <strong>{examenesProximos[0].titulo}</strong> el{" "}
                  {formatearFechaCorta(examenesProximos[0].fecha)}.
                </p>
              ) : (
                <p>No hay examenes proximos cargados por ahora.</p>
              )}
              <p>El asistente toma como referencia tareas, examenes, cursos y bloques de estudio ya guardados.</p>
              <p>Si Groq falla o la clave no es valida, veras un error explicito en lugar de una respuesta simulada.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MensajeAsistente({
  contenido,
  expandido,
  onToggle,
}: {
  contenido: string;
  expandido: boolean;
  onToggle: () => void;
}) {
  const esLargo = contenido.length > 520 || contenido.split("\n").length > 9;
  const clasesScrollMensaje = esLargo
    ? `${
        expandido ? "max-h-[min(62vh,38rem)]" : "max-h-[min(48vh,26rem)]"
      } overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400`
    : "";

  return (
    <div className="space-y-3">
      <div className={clasesScrollMensaje}>
        <MensajeFormateado contenido={contenido} tipo="ai" />
      </div>

      {esLargo ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
          >
            {expandido ? "Caja mas compacta" : "Hacer caja mas grande"}
          </button>
          <span className="text-xs text-gray-400">Puedes desplazarte dentro del mensaje para leer todo.</span>
        </div>
      ) : null}
    </div>
  );
}

function SelectorPlanificacionRapida({
  panel,
  onSelect,
  disabled,
}: {
  panel: PanelVisualPlanificacion;
  onSelect: (valor: string) => void;
  disabled: boolean;
}) {
  const clasesGrid =
    panel.layout === "triple"
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      : panel.layout === "cuadruple"
        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        : panel.layout === "lista"
          ? "grid-cols-1 lg:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className="flex w-full justify-start pr-4 sm:pr-10">
      <div className="flex min-w-0 max-w-[min(96%,48rem)] items-start gap-2 sm:max-w-[min(88%,52rem)] sm:gap-3">
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-md sm:h-10 sm:w-10">
          <Sparkles className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-[26px] border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-200/70 sm:rounded-[30px]">
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 px-4 py-4 text-white sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-white/10 bg-white/10 text-white">Guia interactiva</Badge>
              <Badge className="rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">{panel.pasoEtiqueta}</Badge>
            </div>
            <div className="mt-3 text-base font-semibold sm:text-lg">{panel.titulo}</div>
            <p className="mt-1 text-sm leading-6 text-white/75">{panel.descripcion}</p>
          </div>

          <div className="bg-slate-50 p-4 sm:p-5">
            <div className={`grid gap-3 ${clasesGrid}`}>
              {panel.opciones.map((opcion) => {
                const clases = obtenerClasesOpcionPlanificacion(opcion.tono);

                return (
                  <button
                    key={opcion.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(opcion.valor)}
                    className={`group h-full rounded-[22px] border p-4 text-left transition ${clases.tarjeta} ${
                      disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${clases.icono}`}>
                          <opcion.Icono className="h-5 w-5" />
                        </div>
                        {opcion.badge ? <Badge className={clases.badge}>{opcion.badge}</Badge> : null}
                      </div>

                      <div className="mt-4 flex-1">
                        <div className="font-semibold text-slate-900">{opcion.titulo}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{opcion.descripcion}</p>
                        {opcion.detalle ? (
                          <p className="mt-2 text-xs text-slate-500">{opcion.detalle}</p>
                        ) : null}
                      </div>

                      <div className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${clases.flecha}`}>
                        Elegir esta opcion
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Puedes tocar una opcion para seguir mas rapido o escribir tu respuesta si prefieres.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectorDiasPlanificacion({
  metadatos,
  diasSeleccionados,
  onToggleDia,
  onPreset,
  onConfirm,
  disabled,
}: {
  metadatos: MetadatosDiasPlanificacion | null;
  diasSeleccionados: number[];
  onToggleDia: (dia: number) => void;
  onPreset: (dias: number[]) => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  const diasDisponibles = metadatos?.diasDisponibles ?? [];
  const diasPermitidos = metadatos?.diasPermitidos ?? [];
  const diasFinDeSemana = diasPermitidos.filter((dia) => dia === 5 || dia === 6);
  const diasLaborables = diasPermitidos.filter((dia) => dia >= 0 && dia <= 4);
  const resumen =
    diasSeleccionados.length === 0
      ? diasDisponibles.length
        ? `No vas a bloquear ningun dia util. Voy a poder usar ${describirListaDiasPlanificables(diasDisponibles)} si encuentro huecos libres.`
        : "No hay dias disponibles para esta planificacion en este momento."
      : `Voy a reservar ${obtenerResumenDiasBloqueados(diasSeleccionados)} y no los usare para estudio.`;

  return (
    <div className="flex w-full justify-start pr-4 sm:pr-10">
      <div className="flex min-w-0 max-w-[min(96%,48rem)] items-start gap-2 sm:max-w-[min(88%,52rem)] sm:gap-3">
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-md sm:h-10 sm:w-10">
          <CalendarClock className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-[26px] border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-200/70 sm:rounded-[30px]">
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 px-4 py-4 text-white sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-white/10 bg-white/10 text-white">Paso 3</Badge>
              <Badge className="rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">Dias reservados</Badge>
            </div>
            <div className="mt-3 text-base font-semibold sm:text-lg">Marca solo los dias que realmente quieres dejar para ti</div>
            <p className="mt-1 text-sm leading-6 text-white/75">
              Solo te muestro los dias que de verdad puedo tocar en este caso. Si un dia no aparece aqui, es porque ya paso o queda fuera del rango de esta planificacion.
            </p>
          </div>

          <div className="bg-slate-50 p-4 sm:p-5">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Lo que tengo en cuenta</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {metadatos?.detalle ?? "Voy a usar el rango disponible que tenga este caso."}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {metadatos?.ayuda ?? "Marca solo los dias que quieres reservar para ti."}
              </p>
            </div>

            <div className="mt-4">
              <div className="mb-3 text-sm font-semibold text-slate-900">Dias que si puedo usar ahora</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {diasDisponibles.map((diaDisponible) => {
                  const activo = diasSeleccionados.includes(diaDisponible.dia);

                  return (
                    <button
                      key={`${diaDisponible.dia}-${diaDisponible.etiquetaFecha}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleDia(diaDisponible.dia)}
                      className={`rounded-[22px] border px-4 py-4 text-left transition ${
                        activo
                          ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{diaDisponible.etiquetaDia}</div>
                          <div className="mt-1 text-xs text-slate-500">{diaDisponible.etiquetaFecha}</div>
                        </div>
                        {diaDisponible.destacado ? (
                          <Badge className="bg-white/80 text-slate-700">{diaDisponible.destacado}</Badge>
                        ) : null}
                      </div>
                      <div className="mt-3 text-xs font-medium">
                        {activo ? "Reservado para ti" : "Disponible para estudio"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className="rounded-full bg-white"
                onClick={() => onPreset([])}
              >
                Todos disponibles
              </Button>
              {diasFinDeSemana.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  className="rounded-full bg-white"
                  onClick={() => onPreset(diasFinDeSemana)}
                >
                  Reservar fin de semana
                </Button>
              ) : null}
              {diasLaborables.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  className="rounded-full bg-white"
                  onClick={() => onPreset(diasLaborables)}
                >
                  Reservar dias laborables
                </Button>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Resumen rapido</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{resumen}</p>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={disabled || diasDisponibles.length === 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={onConfirm}
              >
                Continuar con esta seleccion
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className="bg-white"
                onClick={() => onPreset([])}
              >
                Limpiar seleccion
              </Button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Si prefieres, todavia puedes escribir los dias manualmente en el chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VistaPreviaPlanificacionCard({
  resultado,
  objetivoTexto,
}: {
  resultado: ResultadoPlanificacionInteligente;
  objetivoTexto: string;
}) {
  const bloques = resultado.bloquesPrevistos ?? [];
  const bloquesVisibles = bloques.slice(0, 6);
  const horasSolicitadas = resultado.totalHorasSolicitadas ?? resultado.horasProgramadas;
  const esParcial = resultado.horasProgramadas < horasSolicitadas;

  return (
    <div className="flex w-full justify-start pr-4 sm:pr-10">
      <div className="flex min-w-0 max-w-[min(96%,48rem)] items-start gap-2 sm:max-w-[min(88%,52rem)] sm:gap-3">
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md sm:h-10 sm:w-10">
          <CheckCircle2 className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-[26px] border border-emerald-200 bg-white text-slate-900 shadow-lg shadow-emerald-100/80 sm:rounded-[30px]">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-4 text-white sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-white/15 bg-white/10 text-white">Vista previa</Badge>
              <Badge className="rounded-full border border-emerald-100/20 bg-emerald-100/15 text-emerald-50">
                {bloques.length} bloque{bloques.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="mt-3 text-base font-semibold sm:text-lg">Asi quedaria {objetivoTexto}</div>
            <p className="mt-1 text-sm leading-6 text-white/80">
              Todavia no guardo nada. Esto es solo una vista previa para que decidas con calma.
            </p>
          </div>

          <div className="bg-emerald-50/60 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <ResumenVistaPrevia
                etiqueta="Horas ubicadas"
                valor={`${resultado.horasProgramadas}h`}
                detalle={esParcial ? `de ${horasSolicitadas}h posibles` : "cubiertas en la propuesta"}
              />
              <ResumenVistaPrevia
                etiqueta="Bloques"
                valor={`${bloques.length}`}
                detalle="tramos de estudio en el planner"
              />
              <ResumenVistaPrevia
                etiqueta="Estado"
                valor={esParcial ? "Parcial" : "Completo"}
                detalle={esParcial ? "faltaria liberar mas huecos" : "todo entra con estas reglas"}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-sm font-semibold text-slate-900">Bloques que se crearian</div>
              {bloquesVisibles.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {bloquesVisibles.map((bloque) => (
                    <FilaBloquePrevisualizado key={bloque.id} bloque={bloque} />
                  ))}
                  {bloques.length > bloquesVisibles.length ? (
                    <p className="pt-1 text-xs text-slate-500">
                      Y {bloques.length - bloquesVisibles.length} bloque{bloques.length - bloquesVisibles.length === 1 ? "" : "s"} mas en la misma propuesta.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No hay bloques visibles en esta propuesta todavia.
                </p>
              )}
            </div>

            {resultado.resumen.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div className="font-semibold text-emerald-900">Lectura rapida</div>
                <div className="mt-2 space-y-1">
                  {resultado.resumen.slice(0, 3).map((linea) => (
                    <div key={linea}>{linea}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumenVistaPrevia({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{etiqueta}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{valor}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{detalle}</div>
    </div>
  );
}

function FilaBloquePrevisualizado({ bloque }: { bloque: BloquePlanificador }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">
          {limpiarTituloBloquePrevisualizado(bloque.titulo)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {obtenerEtiquetaDiaPlanificador(bloque.dia)} · {formatearRangoHorarioPlanificado(bloque.horaInicio, bloque.duracion)}
        </div>
      </div>
      <Badge className="bg-white text-slate-700">{bloque.duracion}h</Badge>
    </div>
  );
}

function MensajeFormateado({
  contenido,
  tipo,
}: {
  contenido: string;
  tipo: "ai" | "user";
}) {
  const lineas = contenido.split("\n");

  return (
    <div
      className={`space-y-2 text-sm leading-7 ${
        tipo === "user" ? "text-white" : "text-gray-800"
      }`}
      style={{ overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap" }}
    >
      {lineas.map((linea, indice) => {
        const texto = linea.trim();

        if (!texto) {
          return <div key={`space-${indice}`} className="h-2" />;
        }

        const textoLimpio = texto.replace(/\*\*/g, "");

        if (textoLimpio.endsWith(":")) {
          return (
            <p key={`title-${indice}`} className="pt-1 text-sm font-semibold">
              {textoLimpio}
            </p>
          );
        }

        if (textoLimpio.startsWith("*") || textoLimpio.startsWith("-") || textoLimpio.startsWith("+")) {
          return (
            <div key={`bullet-${indice}`} className="flex min-w-0 items-start gap-2">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tipo === "user" ? "bg-white/80" : "bg-blue-500"}`} />
              <p className="flex-1 leading-7">{textoLimpio.slice(1).trim()}</p>
            </div>
          );
        }

        return (
          <Fragment key={`text-${indice}`}>
            <p className="leading-7">{textoLimpio}</p>
          </Fragment>
        );
      })}
    </div>
  );
}

function EstadoVacio({ onAction }: { onAction: (texto: string) => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold">Empieza una conversacion academica</h3>
      <p className="mt-2 max-w-md text-sm text-gray-600">
        Puedes pedirme que organice tu semana, resuma un tema o convierta tu contexto actual en un plan
        de accion.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {accionesRapidas.map((accion) => (
          <Button key={accion} variant="outline" onClick={() => onAction(accion)}>
            {accion}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DatoLateral({
  icon: Icon,
  titulo,
  valor,
  detalle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm text-gray-500">{titulo}</div>
      <div className="text-2xl font-semibold">{valor}</div>
      <div className="text-xs text-gray-500">{detalle}</div>
    </div>
  );
}
