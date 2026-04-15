import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { AlertCircle, BookOpen, Clock, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { formatearFechaCorta, obtenerDiasRestantes, useStudyFlow } from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function Exams() {
  const { examenes, cursos, generarHorarioInteligente, agregarExamen, actualizarExamen, eliminarExamen } =
    useStudyFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const examenDestacadoId = searchParams.get("focus");
  const examenesUrgentes = examenes.filter((examen) => obtenerDiasRestantes(examen.fecha) <= 7);
  const [nuevoExamen, setNuevoExamen] = useState({
    cursoId: cursos[0]?.id ?? "",
    titulo: "",
    fecha: "",
    hora: "08:00",
    temas: "",
    preparacion: 0,
  });

  useEffect(() => {
    if (!examenDestacadoId) return;

    const temporizador = window.setTimeout(() => {
      const nuevo = new URLSearchParams(searchParams);
      nuevo.delete("focus");
      setSearchParams(nuevo, { replace: true });
    }, 3500);

    return () => window.clearTimeout(temporizador);
  }, [examenDestacadoId, searchParams, setSearchParams]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Exámenes</h1>
          <p className="text-gray-600">
            Prepárate con anticipación y enfoca tus bloques de estudio donde más importa.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Agregar examen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo examen</DialogTitle>
            </DialogHeader>
            <FormularioExamen
              cursos={cursos.map((curso) => ({ id: curso.id, nombre: curso.nombre }))}
              valor={nuevoExamen}
              onChange={setNuevoExamen}
              onGuardar={() => {
                agregarExamen({
                  cursoId: nuevoExamen.cursoId,
                  titulo: nuevoExamen.titulo,
                  fecha: nuevoExamen.fecha,
                  hora: nuevoExamen.hora,
                  temas: nuevoExamen.temas.split(",").map((tema) => tema.trim()).filter(Boolean),
                  preparacion: nuevoExamen.preparacion,
                });
                setNuevoExamen({
                  cursoId: cursos[0]?.id ?? "",
                  titulo: "",
                  fecha: "",
                  hora: "08:00",
                  temas: "",
                  preparacion: 0,
                });
              }}
              textoBoton="Guardar examen"
            />
          </DialogContent>
        </Dialog>
      </div>

      {examenesUrgentes.length > 0 && (
        <Card className="border-none border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
          <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold">Tienes {examenesUrgentes.length} exámenes esta semana</h2>
              <p className="text-sm text-gray-600">
                Conviene reforzar preparación y generar tu siguiente horario inteligente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {examenes
          .slice()
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .map((examen) => {
            const curso = cursos.find((item) => item.id === examen.cursoId);
            const diasRestantes = obtenerDiasRestantes(examen.fecha);
            const estaDestacado = examenDestacadoId === examen.id;
            const estiloCurso = obtenerEstiloCurso(curso?.color ?? "blue");

            return (
              <Card
                key={examen.id}
                className={`overflow-hidden border-none shadow-lg transition-all ${
                  estaDestacado ? "ring-2 ring-blue-500 ring-offset-2" : ""
                }`}
              >
                <div className="h-1.5 w-full" style={{ background: estiloCurso.gradiente }} />
                <CardContent className="flex flex-col gap-6 p-5 sm:p-6 xl:flex-row xl:items-start">
                  <div
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border shadow-sm"
                    style={{
                      borderColor: estiloCurso.borde,
                      background: estiloCurso.fondoClaro,
                    }}
                  >
                    <span className="text-xs uppercase" style={{ color: estiloCurso.color }}>
                      {formatearFechaCorta(examen.fecha).split(" ")[1]}
                    </span>
                    <span className="text-2xl font-bold">{formatearFechaCorta(examen.fecha).split(" ")[0]}</span>
                  </div>

                  <div className="flex-1">
                    {estaDestacado ? (
                      <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                        Resultado encontrado desde el buscador global.
                      </div>
                    ) : null}

                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{examen.titulo}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" style={{ color: estiloCurso.color }} />
                            {curso?.nombre}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {examen.hora}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={
                          diasRestantes <= 3
                            ? "bg-red-100 text-red-700"
                            : diasRestantes <= 7
                              ? "bg-amber-100 text-amber-700"
                              : estiloCurso.badge
                        }
                      >
                        {diasRestantes} días restantes
                      </Badge>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {examen.temas.map((tema) => (
                        <Badge
                          key={tema}
                          variant="secondary"
                          className="border-0"
                          style={{
                            background: estiloCurso.fondoSuave,
                            color: estiloCurso.color,
                          }}
                        >
                          {tema}
                        </Badge>
                      ))}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progreso de preparación</span>
                        <span className="font-semibold">{examen.preparacion}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${examen.preparacion}%`,
                            background: estiloCurso.gradiente,
                            boxShadow: `0 0 18px ${estiloCurso.shadow}`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full text-white"
                      style={{ background: estiloCurso.gradienteSolid }}
                      onClick={generarHorarioInteligente}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generar plan de estudio
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Editar examen</DialogTitle>
                        </DialogHeader>
                        <EditorExamen
                          examen={examen}
                          cursos={cursos.map((item) => ({ id: item.id, nombre: item.nombre }))}
                          onGuardar={(cambios) => actualizarExamen(examen.id, cambios)}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700"
                      onClick={() => eliminarExamen(examen.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

function FormularioExamen({
  cursos,
  valor,
  onChange,
  onGuardar,
  textoBoton,
}: {
  cursos: Array<{ id: string; nombre: string }>;
  valor: {
    cursoId: string;
    titulo: string;
    fecha: string;
    hora: string;
    temas: string;
    preparacion: number;
  };
  onChange: (valor: {
    cursoId: string;
    titulo: string;
    fecha: string;
    hora: string;
    temas: string;
    preparacion: number;
  }) => void;
  onGuardar: () => void;
  textoBoton: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Curso</Label>
        <Select value={valor.cursoId} onValueChange={(cursoId) => onChange({ ...valor, cursoId })}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecciona un curso" />
          </SelectTrigger>
          <SelectContent>
            {cursos.map((curso) => (
              <SelectItem key={curso.id} value={curso.id}>
                {curso.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Titulo</Label>
        <Input value={valor.titulo} onChange={(event) => onChange({ ...valor, titulo: event.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={valor.fecha} onChange={(event) => onChange({ ...valor, fecha: event.target.value })} />
        </div>
        <div>
          <Label>Hora</Label>
          <Input type="time" value={valor.hora} onChange={(event) => onChange({ ...valor, hora: event.target.value })} />
        </div>
      </div>
      <div>
        <Label>Temas</Label>
        <Input
          value={valor.temas}
          onChange={(event) => onChange({ ...valor, temas: event.target.value })}
          placeholder="Tema 1, Tema 2, Tema 3"
        />
      </div>
      <div>
        <Label>Preparacion (%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={valor.preparacion}
          onChange={(event) => onChange({ ...valor, preparacion: Number(event.target.value) })}
        />
      </div>
      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600" onClick={onGuardar}>
        {textoBoton}
      </Button>
    </div>
  );
}

function EditorExamen({
  examen,
  cursos,
  onGuardar,
}: {
  examen: {
    cursoId: string;
    titulo: string;
    fecha: string;
    hora: string;
    temas: string[];
    preparacion: number;
  };
  cursos: Array<{ id: string; nombre: string }>;
  onGuardar: (cambios: {
    cursoId: string;
    titulo: string;
    fecha: string;
    hora: string;
    temas: string[];
    preparacion: number;
  }) => void;
}) {
  const [formulario, setFormulario] = useState({
    cursoId: examen.cursoId,
    titulo: examen.titulo,
    fecha: examen.fecha,
    hora: examen.hora,
    temas: examen.temas.join(", "),
    preparacion: examen.preparacion,
  });

  return (
    <FormularioExamen
      cursos={cursos}
      valor={formulario}
      onChange={setFormulario}
      onGuardar={() =>
        onGuardar({
          cursoId: formulario.cursoId,
          titulo: formulario.titulo,
          fecha: formulario.fecha,
          hora: formulario.hora,
          temas: formulario.temas.split(",").map((tema) => tema.trim()).filter(Boolean),
          preparacion: formulario.preparacion,
        })
      }
      textoBoton="Guardar cambios"
    />
  );
}

function obtenerEstiloCurso(color: string) {
  const estilos: Record<
    string,
    {
      gradiente: string;
      gradienteSolid: string;
      fondoClaro: string;
      fondoSuave: string;
      badge: string;
      color: string;
      borde: string;
      shadow: string;
    }
  > = {
    blue: {
      gradiente: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
      gradienteSolid: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
      fondoClaro: "rgba(37, 99, 235, 0.06)",
      fondoSuave: "rgba(37, 99, 235, 0.12)",
      badge: "bg-blue-100 text-blue-700",
      color: "#2563eb",
      borde: "rgba(37, 99, 235, 0.16)",
      shadow: "rgba(37, 99, 235, 0.35)",
    },
    purple: {
      gradiente: "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)",
      gradienteSolid: "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)",
      fondoClaro: "rgba(124, 58, 237, 0.06)",
      fondoSuave: "rgba(124, 58, 237, 0.12)",
      badge: "bg-purple-100 text-purple-700",
      color: "#7c3aed",
      borde: "rgba(124, 58, 237, 0.16)",
      shadow: "rgba(124, 58, 237, 0.35)",
    },
    green: {
      gradiente: "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)",
      gradienteSolid: "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)",
      fondoClaro: "rgba(22, 163, 74, 0.06)",
      fondoSuave: "rgba(22, 163, 74, 0.12)",
      badge: "bg-emerald-100 text-emerald-700",
      color: "#16a34a",
      borde: "rgba(22, 163, 74, 0.16)",
      shadow: "rgba(22, 163, 74, 0.35)",
    },
    orange: {
      gradiente: "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)",
      gradienteSolid: "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)",
      fondoClaro: "rgba(234, 88, 12, 0.06)",
      fondoSuave: "rgba(234, 88, 12, 0.12)",
      badge: "bg-orange-100 text-orange-700",
      color: "#ea580c",
      borde: "rgba(234, 88, 12, 0.16)",
      shadow: "rgba(234, 88, 12, 0.35)",
    },
    red: {
      gradiente: "linear-gradient(90deg, #dc2626 0%, #f87171 100%)",
      gradienteSolid: "linear-gradient(90deg, #dc2626 0%, #f87171 100%)",
      fondoClaro: "rgba(220, 38, 38, 0.06)",
      fondoSuave: "rgba(220, 38, 38, 0.12)",
      badge: "bg-red-100 text-red-700",
      color: "#dc2626",
      borde: "rgba(220, 38, 38, 0.16)",
      shadow: "rgba(220, 38, 38, 0.35)",
    },
    teal: {
      gradiente: "linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)",
      gradienteSolid: "linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)",
      fondoClaro: "rgba(15, 118, 110, 0.06)",
      fondoSuave: "rgba(15, 118, 110, 0.12)",
      badge: "bg-teal-100 text-teal-700",
      color: "#0f766e",
      borde: "rgba(15, 118, 110, 0.16)",
      shadow: "rgba(15, 118, 110, 0.35)",
    },
  };

  return estilos[color] ?? estilos.blue;
}
