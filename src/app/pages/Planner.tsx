import { useMemo, useState } from "react";
import { Calendar, Clock, GripVertical, Move, Pencil, Settings, Sparkles, Trash2 } from "lucide-react";
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

const horas = Array.from({ length: 14 }, (_, index) => index + 8);
const ALTO_CELDA = 72;

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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Planificador inteligente</h1>
          <p className="text-gray-600">
            Organiza tu semana con bloques utiles, visuales y priorizados por contexto academico.
          </p>
        </div>
        <Button
          disabled
          className="cursor-not-allowed bg-gradient-to-r from-slate-300 to-slate-400 text-slate-50 opacity-80 hover:from-slate-300 hover:to-slate-400"
          onClick={generarHorarioInteligente}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Proximamente
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="border-none shadow-lg xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">Horas libres para estudiar</Label>
              <p className="mb-2 text-2xl font-bold text-blue-600">{usuarioActual?.horasEstudioDiarias ?? 4}h</p>
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
              <p className="mb-2 text-2xl font-bold text-purple-600">{usuarioActual?.horasSueno ?? 8}h</p>
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
                Arrastra un bloque a otra celda para reorganizar tu semana. La IA propone y tu decides el ajuste final.
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

        <Card className="border-none shadow-lg xl:col-span-3">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendario semanal visual
              </CardTitle>
              <Badge className="bg-blue-50 text-blue-600">{bloquesPlanificador.length} bloques activos</Badge>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[960px]">
              <div className="grid grid-cols-8 gap-2">
                <div />
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="rounded-xl bg-gray-100 p-2 text-center text-sm font-semibold">
                    {obtenerEtiquetaDiaPlanificador(index)}
                  </div>
                ))}
              </div>

              <div className="mt-2 space-y-2">
                {horas.map((hora) => (
                  <div key={hora} className="grid grid-cols-8 gap-2">
                    <div className="flex items-center text-sm text-gray-500">{`${hora}:00`}</div>
                    {Array.from({ length: 7 }, (_, diaIndex) => {
                      const celdaId = `${diaIndex}-${hora}`;
                      const bloque = bloquesPlanificador.find(
                        (item) => item.dia === diaIndex && item.horaInicio === hora,
                      );
                      const activa = celdaActiva === celdaId;

                      return (
                        <div
                          key={diaIndex}
                          className={`relative min-h-[72px] overflow-visible rounded-xl border p-2 transition-all ${
                            activa ? "border-blue-300 bg-blue-50 shadow-inner" : "border-gray-100 bg-gray-50"
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setCeldaActiva(celdaId);
                          }}
                          onDragLeave={() => setCeldaActiva((actual) => (actual === celdaId ? null : actual))}
                          onDrop={(event) => {
                            event.preventDefault();
                            const bloqueId = event.dataTransfer.getData("text/plain");
                            if (!bloqueId) return;
                            const bloqueArrastrado = bloquesPlanificador.find((item) => item.id === bloqueId);
                            if (!bloqueArrastrado) return;
                            if (
                              bloqueSeSolapa(
                                bloquesPlanificador,
                                bloqueId,
                                diaIndex,
                                hora,
                                bloqueArrastrado.duracion,
                              )
                            ) {
                              setMensajeEdicion("Ese espacio ya se cruza con otro bloque. Prueba otra hora o ajusta la duracion.");
                              setCeldaActiva(null);
                              setBloqueArrastradoId(null);
                              return;
                            }
                            moverBloquePlanificador(bloqueId, diaIndex, hora);
                            setBloqueRecienteId(bloqueId);
                            setMensajeEdicion("");
                            window.setTimeout(() => setBloqueRecienteId((actual) => (actual === bloqueId ? null : actual)), 900);
                            setBloqueArrastradoId(null);
                            setCeldaActiva(null);
                          }}
                        >
                          {bloque ? (
                            <div
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", bloque.id);
                                setBloqueArrastradoId(bloque.id);
                              }}
                              onDragEnd={() => {
                                setBloqueArrastradoId(null);
                                setCeldaActiva(null);
                              }}
                              onClick={() => setBloqueEnEdicion(bloque)}
                              className={`absolute left-1 right-1 top-1 cursor-grab rounded-xl p-3 text-white shadow-md transition-all active:cursor-grabbing ${
                                bloqueArrastradoId === bloque.id ? "scale-95 opacity-70" : "hover:-translate-y-0.5"
                              } ${
                                bloqueRecienteId === bloque.id ? "ring-4 ring-blue-200/80 animate-pulse" : ""
                              }`}
                              style={{
                                backgroundColor: obtenerColorValor(bloque.color),
                                height: `${Math.max(60, bloque.duracion * ALTO_CELDA - 8)}px`,
                                zIndex: 10,
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold leading-tight">{bloque.titulo}</div>
                                <div className="flex items-center gap-1">
                                  <Pencil className="h-3.5 w-3.5 shrink-0 text-white/80" />
                                  <GripVertical className="h-4 w-4 shrink-0 text-white/80" />
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-1 text-xs text-white/85">
                                <Clock className="h-3 w-3" />
                                {bloque.duracion}h
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[56px] items-center justify-center rounded-xl border border-dashed border-transparent text-xs text-gray-400">
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
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex gap-4">
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
        <DialogContent>
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
      <div className="grid grid-cols-2 gap-4">
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
      <div className="grid grid-cols-2 gap-4">
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
      <div className="flex gap-3">
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
        <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={onEliminar}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}
