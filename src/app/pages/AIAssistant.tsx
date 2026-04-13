import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  BookOpen,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  esTareaActiva,
  esTareaAtrasada,
  esTareaPendienteVigente,
  formatearFechaCorta,
  obtenerEtiquetaDiaPlanificador,
  useStudyFlow,
  type AlcancePlanificacion,
  type Curso,
  type JornadaPlanificacion,
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
  paso: "modo" | "objetivo-tarea" | "objetivo-curso" | "dias" | "jornada" | "confirmacion";
  alcance: AlcancePlanificacion | null;
  objetivoId?: string;
  diasBloqueados: number[];
  jornada: JornadaPlanificacion;
};

const flujoPlanificacionInicial: FlujoPlanificacionChat = {
  activo: false,
  paso: "modo",
  alcance: null,
  objetivoId: undefined,
  diasBloqueados: [],
  jornada: "flexible",
};

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

function obtenerResumenDiasBloqueados(diasBloqueados: number[]) {
  if (!diasBloqueados.length) {
    return "sin dias bloqueados";
  }

  return diasBloqueados.map((dia) => obtenerEtiquetaDiaPlanificador(dia)).join(", ");
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

  useEffect(() => {
    if (searchParams.get("accion") !== "planificar") {
      return;
    }

    if (!flujoPlanificacion.activo) {
      const limite = usuarioActual?.horasEstudioDiarias ?? 2;
      anexarMensajesAsistenteLocales([
        {
          tipo: "ai",
          mensaje:
            `Vamos a planificar tu horario con IA. Tu limite actual es de ${limite}h de estudio por dia.\n\n` +
            "Puedo reorganizar `todo`, `una tarea` o `un curso`. Escribe una de esas opciones para empezar.",
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
    usuarioActual?.horasEstudioDiarias,
  ]);

  const limpiarConversacion = () => {
    setFlujoPlanificacion(flujoPlanificacionInicial);
    limpiarMensajesAsistente();
  };

  const iniciarFlujoPlanificacion = (mensajeUsuario?: string) => {
    const limite = usuarioActual?.horasEstudioDiarias ?? 2;
    anexarMensajesAsistenteLocales([
      ...(mensajeUsuario ? [{ tipo: "user" as const, mensaje: mensajeUsuario }] : []),
      {
        tipo: "ai" as const,
        mensaje:
          `Claro. Puedo ayudarte a planificar tu horario y voy a respetar tu limite actual de ${limite}h por dia.\n\n` +
          "Dime si quieres reorganizar `todo`, `una tarea` o `un curso`.",
      },
    ]);
    setFlujoPlanificacion({
      ...flujoPlanificacionInicial,
      activo: true,
    });
  };

  const procesarMensajePlanificacion = (textoOriginal: string) => {
    const texto = textoOriginal.trim();
    const textoNormalizado = normalizarTextoPlanificacion(texto);

    if (esConfirmacionNegativa(texto) && flujoPlanificacion.activo) {
      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje: "Listo, cancelé esta planificacion. Si quieres, luego volvemos a empezar con otra configuracion.",
        },
      ]);
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
              "Perfecto. Voy a reorganizar tareas y repasos generales.\n\nAhora dime que dias quieres dejar libres. Puedes responder, por ejemplo: `martes y domingo` o `ninguno`.",
          },
        ]);
        setFlujoPlanificacion((actual) => ({
          ...actual,
          alcance: "todo",
          paso: "dias",
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
                .join("\n")}\n\nPuedes responder con el numero o con el nombre.`,
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
                .join("\n")}\n\nPuedes responder con el numero o con el nombre.`,
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

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `Perfecto. Voy a reorganizar la tarea **${tareaSeleccionada.titulo}**.\n\n` +
            "Ahora dime que dias quieres dejar libres. Puedes responder `martes y domingo` o `ninguno`.",
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

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `Perfecto. Voy a reorganizar el repaso de **${cursoSeleccionado.nombre}**.\n\n` +
            "Ahora dime que dias quieres dejar libres. Puedes responder `martes y domingo` o `ninguno`.",
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
      const diasBloqueados = extraerDiasBloqueados(texto);
      const respuestaVacia =
        !diasBloqueados.length &&
        !textoNormalizado.includes("ninguno") &&
        !textoNormalizado.includes("ningun") &&
        !textoNormalizado.includes("ninguna");

      if (respuestaVacia) {
        anexarMensajesAsistenteLocales([
          { tipo: "user", mensaje: texto },
          {
            tipo: "ai",
            mensaje:
              "No pude detectar los dias. Prueba algo como `martes y domingo` o simplemente escribe `ninguno`.",
          },
        ]);
        return;
      }

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            "Perfecto. Ahora dime en que franja prefieres estudiar: `mañana`, `tarde`, `noche` o `flexible`.",
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

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `Listo. Voy a reorganizar ${resumenObjetivo} con estas reglas:\n\n` +
            `- Dias libres: ${obtenerResumenDiasBloqueados(flujoPlanificacion.diasBloqueados)}\n` +
            `- Franja preferida: ${jornada}\n` +
            `- Limite diario actual: ${usuarioActual?.horasEstudioDiarias ?? 2}h\n\n` +
            "Si te parece bien, responde `si` para aplicar o `no` para cancelar.",
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
      if (!esConfirmacionPositiva(texto)) {
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
      });

      anexarMensajesAsistenteLocales([
        { tipo: "user", mensaje: texto },
        {
          tipo: "ai",
          mensaje:
            `${resultado.mensaje}\n\n${resultado.resumen.length ? resultado.resumen.join("\n") : "No hubo cambios adicionales para mostrar."}`,
        },
      ]);
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
        <Card className="flex min-h-[70vh] flex-col border-none shadow-lg xl:col-span-3 xl:h-[760px]">
          <CardHeader className="border-b">
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

          <div className="border-b bg-gray-50/80 px-4 py-4 sm:px-6">
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

          <ScrollArea className="flex-1 p-4 sm:p-6">
            <div className="mx-auto max-w-5xl space-y-5">
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
            </div>
          </ScrollArea>

          <div className="border-t p-4">
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
        expandido ? "max-h-[420px]" : "max-h-[260px]"
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
