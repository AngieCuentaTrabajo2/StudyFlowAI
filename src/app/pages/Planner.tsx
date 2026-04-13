import { useMemo, useState } from "react";
import { BookOpen, Calendar, Clock, Coffee, GripVertical, Move, Pencil, Settings, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import {
  obtenerColorValor,
  obtenerEtiquetaDiaPlanificador,
  useStudyFlow,
  type BloquePlanificador,
} from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";

const horas = Array.from({ length: 16 }, (_, index) => index + 7);
const ALTO_CELDA = 72;
const ALTO_CELDA_MOVIL = 52;

function bloqueSeSolapa(
  bloques: BloquePlanificador[],
  bloqueId: string,
  dia: number,
  horaInicio: number,
  duracion: number,
) {
  const inicio = horaInicio;
  const fin = horaInicio + duracion;

  return bloques.some((bloque) => {
    if (bloque.id === bloqueId || bloque.dia !== dia) return false;
    const inicioExistente = bloque.horaInicio;
    const finExistente = bloque.horaInicio + bloque.duracion;
    return inicio < finExistente && fin > inicioExistente;
  });
}

type TipoVisualBloque = "class" | "task" | "review" | "exam" | "break" | "study";

type MetaBloqueVisual = {
  tipoVisual: TipoVisualBloque;
  etiqueta: string;
  descripcion: string;
  detalle: string;
  titulo: string;
  Icono: LucideIcon;
};

function convertirHexARGB(hex: string) {
  const valor = hex.replace("#", "");
  const normalizado =
    valor.length === 3
      ? valor
          .split("")
          .map((segmento) => `${segmento}${segmento}`)
          .join("")
      : valor;

  const numero = Number.parseInt(normalizado, 16);

  return {
    r: (numero >> 16) & 255,
    g: (numero >> 8) & 255,
    b: numero & 255,
  };
}

function mezclarColor(hex: string, destino: "white" | "black", intensidad: number) {
  const rgb = convertirHexARGB(hex);
  const objetivo = destino === "white" ? 255 : 0;
  const peso = Math.max(0, Math.min(1, intensidad));

  const canal = (valor: number) => Math.round(valor + (objetivo - valor) * peso);

  return `rgb(${canal(rgb.r)} ${canal(rgb.g)} ${canal(rgb.b)})`;
}

function obtenerMetaBloqueVisual(bloque: BloquePlanificador): MetaBloqueVisual {
  const titulo = bloque.titulo.trim();

  if (bloque.tipo === "class") {
    return {
      tipoVisual: "class",
      etiqueta: "Clase",
      descripcion: "Horario fijo",
      detalle: "Bloque reservado",
      titulo,
      Icono: Calendar,
    };
  }

  if (bloque.tipo === "exam") {
    return {
      tipoVisual: "exam",
      etiqueta: "Examen",
      descripcion: "Evaluacion",
      detalle: "No lo muevas sin revisar",
      titulo,
      Icono: Clock,
    };
  }

  if (bloque.tipo === "break") {
    return {
      tipoVisual: "break",
      etiqueta: "Descanso",
      descripcion: "Pausa activa",
      detalle: "Recuperacion",
      titulo,
      Icono: Coffee,
    };
  }

  if (titulo.toLowerCase().startsWith("tarea:")) {
    return {
      tipoVisual: "task",
      etiqueta: "Tarea",
      descripcion: "Trabajo puntual",
      detalle: "Bloque editable",
      titulo: titulo.replace(/^tarea:\s*/i, ""),
      Icono: Pencil,
    };
  }

  if (titulo.toLowerCase().startsWith("repaso:")) {
    return {
      tipoVisual: "review",
      etiqueta: "Repaso",
      descripcion: "Estudio del curso",
      detalle: "Bloque editable",
      titulo: titulo.replace(/^repaso:\s*/i, ""),
      Icono: BookOpen,
    };
  }

  return {
    tipoVisual: "study",
    etiqueta: "Estudio",
    descripcion: "Bloque libre",
    detalle: "Bloque editable",
    titulo,
    Icono: BookOpen,
  };
}

function obtenerSuperficieBloque(colorBase: string, tipoVisual: TipoVisualBloque) {
  if (tipoVisual === "break") {
    return {
      background: "linear-gradient(135deg, #64748b 0%, #334155 100%)",
      borderColor: "rgba(255,255,255,0.2)",
      boxShadow: "0 18px 35px rgba(15, 23, 42, 0.18)",
    };
  }

  switch (tipoVisual) {
    case "class":
      return {
        background: `linear-gradient(145deg, ${mezclarColor(colorBase, "white", 0.06)} 0%, ${mezclarColor(colorBase, "black", 0.18)} 100%)`,
        borderColor: "rgba(255,255,255,0.2)",
        boxShadow: `0 18px 32px ${mezclarColor(colorBase, "black", 0.55)}`,
      };
    case "task":
      return {
        background: `linear-gradient(145deg, ${mezclarColor(colorBase, "white", 0.02)} 0%, ${mezclarColor(colorBase, "black", 0.24)} 100%)`,
        borderColor: "rgba(255,255,255,0.22)",
        boxShadow: `0 16px 28px ${mezclarColor(colorBase, "black", 0.6)}`,
      };
    case "review":
      return {
        background: `linear-gradient(145deg, ${mezclarColor(colorBase, "white", 0.22)} 0%, ${mezclarColor(colorBase, "black", 0.08)} 100%)`,
        borderColor: "rgba(255,255,255,0.28)",
        boxShadow: `0 14px 26px ${mezclarColor(colorBase, "black", 0.48)}`,
      };
    case "exam":
      return {
        background: `linear-gradient(145deg, ${mezclarColor(colorBase, "black", 0.08)} 0%, ${mezclarColor(colorBase, "black", 0.3)} 100%)`,
        borderColor: "rgba(255,255,255,0.16)",
        boxShadow: `0 18px 30px ${mezclarColor(colorBase, "black", 0.62)}`,
      };
    default:
      return {
        background: `linear-gradient(145deg, ${mezclarColor(colorBase, "white", 0.12)} 0%, ${mezclarColor(colorBase, "black", 0.14)} 100%)`,
        borderColor: "rgba(255,255,255,0.18)",
        boxShadow: `0 14px 28px ${mezclarColor(colorBase, "black", 0.5)}`,
      };
  }
}

const leyendaBloques: Array<{
  clave: string;
  etiqueta: string;
  descripcion: string;
  Icono: LucideIcon;
  clase: string;
}> = [
  {
    clave: "class",
    etiqueta: "Clase",
    descripcion: "Horario fijo del curso",
    Icono: Calendar,
    clase: "border-blue-100 bg-blue-50 text-blue-700",
  },
  {
    clave: "task",
    etiqueta: "Tarea",
    descripcion: "Trabajo concreto agendado",
    Icono: Pencil,
    clase: "border-violet-100 bg-violet-50 text-violet-700",
  },
  {
    clave: "review",
    etiqueta: "Repaso",
    descripcion: "Estudio general del curso",
    Icono: BookOpen,
    clase: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  {
    clave: "exam",
    etiqueta: "Examen",
    descripcion: "Evaluacion o prueba",
    Icono: Clock,
    clase: "border-rose-100 bg-rose-50 text-rose-700",
  },
  {
    clave: "break",
    etiqueta: "Descanso",
    descripcion: "Pausa o respiro",
    Icono: Coffee,
    clase: "border-slate-200 bg-slate-100 text-slate-700",
  },
];

export default function Planner() {
  const {
    usuarioActual,
    bloquesPlanificador,
    actualizarPerfil,
    generarHorarioInteligente,
    moverBloquePlanificador,
    actualizarBloquePlanificador,
    eliminarBloquePlanificador,
    cursos,
    examenes,
  } = useStudyFlow();
  const [bloqueArrastradoId, setBloqueArrastradoId] = useState<string | null>(null);
  const [celdaActiva, setCeldaActiva] = useState<string | null>(null);
  const [bloqueEnEdicion, setBloqueEnEdicion] = useState<BloquePlanificador | null>(null);
  const [bloqueRecienteId, setBloqueRecienteId] = useState<string | null>(null);
  const [mensajeEdicion, setMensajeEdicion] = useState("");

  const examenProximo = examenes.slice().sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const cursoProximo = cursos.find((curso) => curso.id === examenProximo?.cursoId);
  const cursosConMayorCarga = useMemo(() => cursos.slice(0, 3), [cursos]);

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Planificador inteligente</h1>
          <p className="max-w-2xl text-sm text-gray-600 sm:text-base">
            Organiza tu semana con bloques utiles, visuales y priorizados por contexto academico.
          </p>
        </div>
        <Button
          disabled
          className="w-full cursor-not-allowed bg-gradient-to-r from-slate-300 to-slate-400 text-slate-50 opacity-80 hover:from-slate-300 hover:to-slate-400 sm:w-auto"
          onClick={generarHorarioInteligente}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Proximamente
        </Button>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-4">
        <Card className="min-w-0 overflow-hidden border-none shadow-lg xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 sm:space-y-6">
            <div>
              <Label className="mb-3 block">Horas libres para estudiar</Label>
              <p className="mb-2 text-xl font-bold text-blue-600 sm:text-2xl">{usuarioActual?.horasEstudioDiarias ?? 4}h</p>
              <Slider
                value={[usuarioActual?.horasEstudioDiarias ?? 4]}
                max={10}
                min={1}
                step={1}
                onValueChange={([valor]) => actualizarPerfil({ horasEstudioDiarias: valor })}
              />
            </div>

            <div>
              <Label className="mb-3 block">Horas de sueno</Label>
              <p className="mb-2 text-xl font-bold text-purple-600 sm:text-2xl">{usuarioActual?.horasSueno ?? 8}h</p>
              <Slider
                value={[usuarioActual?.horasSueno ?? 8]}
                max={10}
                min={5}
                step={1}
                onValueChange={([valor]) => actualizarPerfil({ horasSueno: valor })}
              />
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-800">Cursos con mayor carga</p>
              <div className="space-y-2">
                {cursosConMayorCarga.map((curso) => (
                  <div key={curso.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: obtenerColorValor(curso.color) }}
                      />
                      <span>{curso.nombre}</span>
                    </div>
                    <Badge
                      className="border-0"
                      style={{
                        backgroundColor: `${obtenerColorValor(curso.color)}1A`,
                        color: obtenerColorValor(curso.color),
                      }}
                    >
                      Media
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Move className="h-4 w-4" />
                Edicion manual activa
              </div>
              <p>
                Arrastra tus bloques de estudio a otra celda para reorganizar tu semana. Los bloques de clase vienen desde cada curso y quedan reservados.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                <Sparkles className="h-4 w-4" />
                Generacion automatica en preparacion
              </div>
              <p>
                Por ahora el planificador funciona en modo manual para evitar duplicaciones. La generacion inteligente se reactivara cuando el flujo quede estable.
              </p>
            </div>

            {mensajeEdicion && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                {mensajeEdicion}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border-none shadow-lg xl:col-span-3">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendario semanal visual
              </CardTitle>
              <Badge className="bg-blue-50 text-blue-600">{bloquesPlanificador.length} bloques activos</Badge>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                El color principal identifica el curso y la pastilla te dice el tipo de bloque.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {leyendaBloques.map(({ clave, etiqueta, descripcion, Icono, clase }) => (
                  <div key={clave} className={`rounded-2xl border px-3 py-2 ${clase}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icono className="h-4 w-4" />
                      {etiqueta}
                    </div>
                    <p className="mt-1 text-xs opacity-80">{descripcion}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-blue-50 px-3 py-2 text-xs text-blue-700 sm:hidden">
              Desliza horizontalmente para ver toda la semana. Compactamos el tablero para que se lea mejor en movil.
            </div>

            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2 touch-pan-x [-webkit-overflow-scrolling:touch] sm:hidden">
              <CalendarioPlanificador
                compacto
                bloquesPlanificador={bloquesPlanificador}
                celdaActiva={celdaActiva}
                bloqueArrastradoId={bloqueArrastradoId}
                bloqueRecienteId={bloqueRecienteId}
                onSetCeldaActiva={setCeldaActiva}
                onSetBloqueArrastradoId={setBloqueArrastradoId}
                onMoverBloque={moverBloquePlanificador}
                onSetBloqueRecienteId={setBloqueRecienteId}
                onSetMensajeEdicion={setMensajeEdicion}
                onEditarBloque={setBloqueEnEdicion}
              />
            </div>

            <div className="hidden w-full max-w-full overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch] sm:block">
              <CalendarioPlanificador
                bloquesPlanificador={bloquesPlanificador}
                celdaActiva={celdaActiva}
                bloqueArrastradoId={bloqueArrastradoId}
                bloqueRecienteId={bloqueRecienteId}
                onSetCeldaActiva={setCeldaActiva}
                onSetBloqueArrastradoId={setBloqueArrastradoId}
                onMoverBloque={moverBloquePlanificador}
                onSetBloqueRecienteId={setBloqueRecienteId}
                onSetMensajeEdicion={setMensajeEdicion}
                onEditarBloque={setBloqueEnEdicion}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: cursoProximo
                  ? `linear-gradient(135deg, ${obtenerColorValor(cursoProximo.color)} 0%, #a855f7 100%)`
                  : "linear-gradient(135deg, #2563eb 0%, #a855f7 100%)",
              }}
            >
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Resumen de IA</h2>
              <p className="text-gray-700">
                Se asigno mas tiempo a {cursoProximo?.nombre ?? "tus cursos criticos"} por cercania de evaluacion y por el volumen de tareas activas. Ahora tambien puedes mover cada bloque manualmente para adaptar el plan a tu ritmo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(bloqueEnEdicion)} onOpenChange={(abierto) => !abierto && setBloqueEnEdicion(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar bloque</DialogTitle>
          </DialogHeader>
          {bloqueEnEdicion && (
            <EditorBloque
              bloque={bloqueEnEdicion}
              onGuardar={(cambios) => {
                const siguienteDia = cambios.dia ?? bloqueEnEdicion.dia;
                const siguienteHora = cambios.horaInicio ?? bloqueEnEdicion.horaInicio;
                const siguienteDuracion = cambios.duracion ?? bloqueEnEdicion.duracion;
                if (
                  bloqueSeSolapa(
                    bloquesPlanificador,
                    bloqueEnEdicion.id,
                    siguienteDia,
                    siguienteHora,
                    siguienteDuracion,
                  )
                ) {
                  setMensajeEdicion("No se pudo guardar porque el bloque se superpone con otro horario.");
                  return;
                }
                actualizarBloquePlanificador(bloqueEnEdicion.id, cambios);
                setBloqueRecienteId(bloqueEnEdicion.id);
                setMensajeEdicion("");
                window.setTimeout(
                  () => setBloqueRecienteId((actual) => (actual === bloqueEnEdicion.id ? null : actual)),
                  900,
                );
                setBloqueEnEdicion(null);
              }}
              onEliminar={() => {
                eliminarBloquePlanificador(bloqueEnEdicion.id);
                setBloqueEnEdicion(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditorBloque({
  bloque,
  onGuardar,
  onEliminar,
}: {
  bloque: BloquePlanificador;
  onGuardar: (cambios: Partial<BloquePlanificador>) => void;
  onEliminar: () => void;
}) {
  const [formulario, setFormulario] = useState({
    titulo: bloque.titulo,
    dia: String(bloque.dia),
    horaInicio: String(bloque.horaInicio),
    duracion: String(bloque.duracion),
    tipo: bloque.tipo,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Titulo</Label>
        <Input value={formulario.titulo} onChange={(event) => setFormulario({ ...formulario, titulo: event.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Dia</Label>
          <Select value={formulario.dia} onValueChange={(dia) => setFormulario({ ...formulario, dia })}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 7 }, (_, index) => (
                <SelectItem key={index} value={String(index)}>
                  {obtenerEtiquetaDiaPlanificador(index)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Hora</Label>
          <Select value={formulario.horaInicio} onValueChange={(horaInicio) => setFormulario({ ...formulario, horaInicio })}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {horas.map((hora) => (
                <SelectItem key={hora} value={String(hora)}>
                  {hora}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Duracion</Label>
          <Select value={formulario.duracion} onValueChange={(duracion) => setFormulario({ ...formulario, duracion })}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1", "1.5", "2", "2.5", "3"].map((duracion) => (
                <SelectItem key={duracion} value={duracion}>
                  {duracion}h
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={formulario.tipo} onValueChange={(tipo: BloquePlanificador["tipo"]) => setFormulario({ ...formulario, tipo })}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">Clase</SelectItem>
              <SelectItem value="study">Estudio</SelectItem>
              <SelectItem value="exam">Examen</SelectItem>
              <SelectItem value="break">Descanso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
          onClick={() =>
            onGuardar({
              titulo: formulario.titulo,
              dia: Number(formulario.dia),
              horaInicio: Number(formulario.horaInicio),
              duracion: Number(formulario.duracion),
              tipo: formulario.tipo,
            })
          }
        >
          Guardar cambios
        </Button>
        <Button variant="outline" className="text-red-600 hover:text-red-700 sm:w-auto" onClick={onEliminar}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

function CalendarioPlanificador({
  bloquesPlanificador,
  celdaActiva,
  bloqueArrastradoId,
  bloqueRecienteId,
  onSetCeldaActiva,
  onSetBloqueArrastradoId,
  onMoverBloque,
  onSetBloqueRecienteId,
  onSetMensajeEdicion,
  onEditarBloque,
  compacto = false,
}: {
  bloquesPlanificador: BloquePlanificador[];
  celdaActiva: string | null;
  bloqueArrastradoId: string | null;
  bloqueRecienteId: string | null;
  onSetCeldaActiva: (valor: string | null) => void;
  onSetBloqueArrastradoId: (valor: string | null) => void;
  onMoverBloque: (bloqueId: string, dia: number, horaInicio: number) => void;
  onSetBloqueRecienteId: (valor: string | null) => void;
  onSetMensajeEdicion: (valor: string) => void;
  onEditarBloque: (bloque: BloquePlanificador | null) => void;
  compacto?: boolean;
}) {
  const altoCelda = compacto ? ALTO_CELDA_MOVIL : ALTO_CELDA;
  const minWidth = compacto ? "min-w-[720px]" : "min-w-[1280px]";

  return (
    <div className={`w-max ${minWidth}`}>
      <div className={`grid grid-cols-8 ${compacto ? "gap-1.5" : "gap-2"}`}>
        <div />
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className={`rounded-xl bg-gray-100 text-center font-semibold ${compacto ? "p-1.5 text-[11px]" : "p-2 text-sm"}`}
          >
            {obtenerEtiquetaDiaPlanificador(index)}
          </div>
        ))}
      </div>

      <div className={`mt-2 ${compacto ? "space-y-1.5" : "space-y-2"}`}>
        {horas.map((hora) => (
          <div key={hora} className={`grid grid-cols-8 ${compacto ? "gap-1.5" : "gap-2"}`}>
            <div className={`flex items-center text-gray-500 ${compacto ? "text-[11px]" : "text-sm"}`}>{`${hora}:00`}</div>
            {Array.from({ length: 7 }, (_, diaIndex) => {
              const celdaId = `${diaIndex}-${hora}`;
              const bloque = bloquesPlanificador.find((item) => item.dia === diaIndex && item.horaInicio === hora);
              const activa = celdaActiva === celdaId;
              const metaVisual = bloque ? obtenerMetaBloqueVisual(bloque) : null;
              const colorBase = bloque ? obtenerColorValor(bloque.color) : null;
              const superficieBloque =
                bloque && colorBase && metaVisual
                  ? obtenerSuperficieBloque(colorBase, metaVisual.tipoVisual)
                  : null;

              return (
                <div
                  key={diaIndex}
                  className={`relative overflow-visible rounded-xl border transition-all ${
                    activa ? "border-blue-300 bg-blue-50 shadow-inner" : "border-gray-100 bg-gray-50"
                  } ${compacto ? "min-h-[52px] p-1.5" : "min-h-[72px] p-2"}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    onSetCeldaActiva(celdaId);
                  }}
                  onDragLeave={() => onSetCeldaActiva(celdaActiva === celdaId ? null : celdaActiva)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const bloqueId = event.dataTransfer.getData("text/plain");
                    if (!bloqueId) return;
                    const bloqueArrastrado = bloquesPlanificador.find((item) => item.id === bloqueId);
                    if (!bloqueArrastrado) return;
                    if (bloqueSeSolapa(bloquesPlanificador, bloqueId, diaIndex, hora, bloqueArrastrado.duracion)) {
                      onSetMensajeEdicion("Ese espacio ya se cruza con otro bloque. Prueba otra hora o ajusta la duracion.");
                      onSetCeldaActiva(null);
                      onSetBloqueArrastradoId(null);
                      return;
                    }
                    onMoverBloque(bloqueId, diaIndex, hora);
                    onSetBloqueRecienteId(bloqueId);
                    onSetMensajeEdicion("");
                    window.setTimeout(() => onSetBloqueRecienteId(null), 900);
                    onSetBloqueArrastradoId(null);
                    onSetCeldaActiva(null);
                  }}
                >
                  {bloque ? (
                    <div
                      draggable={bloque.tipo !== "class"}
                      onDragStart={(event) => {
                        if (bloque.tipo === "class") {
                          event.preventDefault();
                          onSetMensajeEdicion("Ese bloque corresponde al horario del curso. Editalo desde Mis cursos.");
                          return;
                        }
                        event.dataTransfer.setData("text/plain", bloque.id);
                        onSetBloqueArrastradoId(bloque.id);
                      }}
                      onDragEnd={() => {
                        onSetBloqueArrastradoId(null);
                        onSetCeldaActiva(null);
                      }}
                      onClick={() => {
                        if (bloque.tipo === "class") {
                          onSetMensajeEdicion("Ese bloque corresponde al horario del curso. Editalo desde Mis cursos.");
                          return;
                        }
                        onEditarBloque(bloque);
                      }}
                      className={`absolute left-1 right-1 top-1 rounded-xl text-white shadow-md transition-all ${
                        bloque.tipo === "class" ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                      } ${
                        bloqueArrastradoId === bloque.id ? "scale-95 opacity-70" : "hover:-translate-y-0.5"
                      } ${bloqueRecienteId === bloque.id ? "ring-4 ring-blue-200/80 animate-pulse" : ""} ${
                        compacto ? "p-2" : "p-3"
                      }`}
                      style={{
                        background: superficieBloque?.background,
                        border: `1px solid ${superficieBloque?.borderColor ?? "rgba(255,255,255,0.18)"}`,
                        boxShadow: superficieBloque?.boxShadow,
                        height: `${Math.max(compacto ? 42 : 60, bloque.duracion * altoCelda - 8)}px`,
                        zIndex: 10,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`inline-flex items-center gap-1 rounded-full bg-white/15 font-semibold uppercase tracking-[0.14em] text-white/90 ${
                            compacto ? "px-1.5 py-1 text-[8px]" : "px-2 py-1 text-[9px]"
                          }`}
                        >
                          {metaVisual ? <metaVisual.Icono className={`${compacto ? "h-2.5 w-2.5" : "h-3 w-3"}`} /> : null}
                          {metaVisual?.etiqueta ?? bloque.tipo}
                        </div>
                        <div className="flex items-center gap-1">
                          {bloque.tipo === "class" ? (
                            <span
                              className={`rounded-full bg-white/15 px-1.5 py-0.5 font-medium text-white/85 ${
                                compacto ? "text-[8px]" : "text-[9px]"
                              }`}
                            >
                              Fijo
                            </span>
                          ) : (
                            <GripVertical className={`${compacto ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 text-white/80`} />
                          )}
                        </div>
                      </div>
                      <div className={`mt-2 break-words font-semibold leading-tight ${compacto ? "text-[10px]" : "text-sm"}`}>
                        {metaVisual?.titulo ?? bloque.titulo}
                      </div>
                      <div className={`mt-1.5 flex items-center justify-between gap-2 text-white/85 ${compacto ? "text-[9px]" : "text-xs"}`}>
                        <Clock className={`${compacto ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
                        <span className="mr-auto">{bloque.duracion}h</span>
                        {!compacto ? <span className="truncate text-white/75">{metaVisual?.detalle}</span> : null}
                      </div>
                      {!compacto ? (
                        <div className="mt-1 text-[10px] font-medium text-white/70">
                          {metaVisual?.descripcion}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      className={`flex h-full items-center justify-center rounded-xl border border-dashed border-transparent text-gray-400 ${
                        compacto ? "min-h-[40px] text-[10px]" : "min-h-[56px] text-xs"
                      }`}
                    >
                      {activa ? "Suelta aqui" : "Disponible"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
