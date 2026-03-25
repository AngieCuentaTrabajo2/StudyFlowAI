import { Fragment, useMemo, useState } from "react";
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
import { formatearFechaCorta, useStudyFlow } from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";

const accionesRapidas = [
  "Organiza mi semana",
  "Explicame base de datos",
  "Hazme preguntas de practica",
  "Resume este tema",
];

export default function AIAssistant() {
  const {
    mensajesChat,
    enviarMensajeAsistente,
    limpiarMensajesAsistente,
    tareas,
    examenes,
    bloquesPlanificador,
    fuenteAsistente,
  } = useStudyFlow();
  const [mensaje, setMensaje] = useState("");
  const [mensajesExpandidos, setMensajesExpandidos] = useState<Record<string, boolean>>({});

  const examenesProximos = [...examenes].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3);
  const tareasPendientes = tareas.filter((tarea) => tarea.estado !== "completed");
  const bloquesEstudio = bloquesPlanificador.filter((bloque) => bloque.tipo === "study");
  const asistentePensando = mensajesChat.some(
    (item) => item.tipo === "ai" && item.mensaje === "Pensando tu respuesta con Groq...",
  );

  const sugerenciasContextuales = useMemo(
    () => [
      {
        titulo: "Semana academica",
        descripcion: `${tareasPendientes.length} tareas activas y ${examenesProximos.length} examenes proximos.`,
        icono: CalendarClock,
        accion: "Organiza mi semana",
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
    [examenesProximos.length, tareasPendientes.length],
  );

  const manejarEnvio = (event: React.FormEvent) => {
    event.preventDefault();
    if (asistentePensando) return;
    if (!mensaje.trim()) return;
    enviarMensajeAsistente(mensaje.trim());
    setMensaje("");
  };

  const ejecutarAccionRapida = (texto: string) => {
    if (asistentePensando) return;
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
          <h1 className="mb-2 text-3xl font-bold">Asistente IA</h1>
          <p className="text-gray-600">
            Usa tu contexto academico real para responder, priorizar y sugerir el siguiente paso.
          </p>
        </div>
        <Badge
          className={`w-fit px-3 py-2 ${
            fuenteAsistente === "groq"
              ? "bg-emerald-50 text-emerald-700"
              : fuenteAsistente === "sistema"
                ? "bg-blue-50 text-blue-700"
              : fuenteAsistente === "error"
                ? "bg-rose-50 text-rose-700"
                : "bg-blue-50 text-blue-700"
          }`}
        >
          {fuenteAsistente === "groq"
            ? "Respuestas reales con Groq"
            : fuenteAsistente === "sistema"
              ? "Respuesta directa del sistema"
            : fuenteAsistente === "error"
              ? "Groq no respondio"
              : "Esperando respuesta del asistente"}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="flex h-[760px] flex-col border-none shadow-lg xl:col-span-3">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle>Asistente academico inteligente</CardTitle>
                  <p className="text-sm text-gray-600">
                    Usa tu contexto academico real y consulta Groq desde el backend.
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <Badge className="bg-emerald-50 text-emerald-700">{bloquesEstudio.length} bloques de estudio</Badge>
                <Badge className="bg-purple-50 text-purple-700">{mensajesChat.length} mensajes</Badge>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white"
                  onClick={limpiarMensajesAsistente}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar chat
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="border-b bg-gray-50/80 px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {accionesRapidas.map((accion) => (
                <Button
                  key={accion}
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white"
                  disabled={asistentePensando}
                  onClick={() => ejecutarAccionRapida(accion)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {accion}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="mx-auto max-w-5xl space-y-5">
              {mensajesChat.length === 0 ? (
                <EstadoVacio onAction={ejecutarAccionRapida} />
              ) : (
                mensajesChat.map((item, indice) => (
                  item.tipo === "ai" ? (
                    <div key={item.id} className="flex w-full justify-start pr-4 sm:pr-10">
                      <div className="flex min-w-0 max-w-[min(86%,40rem)] items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-md">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>

                        <div className="min-w-0 flex-1 overflow-hidden rounded-[28px] border border-gray-100 bg-white/95 px-4 py-4 text-gray-900 shadow-md shadow-slate-200/60 sm:px-5">
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
                      <div className="min-w-0 w-fit max-w-[min(72%,28rem)] overflow-hidden rounded-[28px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-4 text-white shadow-lg shadow-blue-500/20 sm:px-5">
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
            {asistentePensando ? (
              <p className="mt-2 text-xs text-gray-500">
                StudyFlow AI esta pensando tu respuesta. Espera un momento antes de enviar otro mensaje.
              </p>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Panel rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DatoLateral
                icon={ClipboardList}
                titulo="Tareas activas"
                valor={`${tareasPendientes.length}`}
                detalle="Pendientes o en progreso"
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

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className={expandido || !esLargo ? "" : "max-h-[280px] overflow-hidden"}>
          <ScrollArea className={`${expandido ? "max-h-[460px]" : "max-h-[280px]"} overflow-hidden pr-3`}>
            <MensajeFormateado contenido={contenido} tipo="ai" />
          </ScrollArea>
        </div>

        {esLargo && !expandido ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent" />
        ) : null}
      </div>

      {esLargo ? (
        <button
          type="button"
          onClick={onToggle}
          className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          {expandido ? "Ver menos" : "Ver mas"}
        </button>
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
