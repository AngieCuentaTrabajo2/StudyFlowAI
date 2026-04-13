import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, BookOpen, Calendar, FileText, Pencil, Sparkles, Trash2, User } from "lucide-react";
import CourseScheduleEditor from "../components/CourseScheduleEditor";
import {
  crearFilaHorarioCurso,
  formatearHorarioCurso,
  parsearHorarioCurso,
  validarHorarioCurso,
} from "../data/course-schedule";
import { formatearFechaCorta, useStudyFlow } from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function CourseDetail() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { obtenerCursoPorId, tareas, examenes, actualizarCurso, eliminarCurso } = useStudyFlow();
  const curso = obtenerCursoPorId(courseId);
  const [dialogoEdicionAbierto, setDialogoEdicionAbierto] = useState(false);
  const [errorHorario, setErrorHorario] = useState("");
  const [formulario, setFormulario] = useState(() =>
    curso
      ? {
          nombre: curso.nombre,
          docente: curso.docente,
          semestre: curso.semestre,
          color: curso.color,
          descripcion: curso.descripcion,
        }
      : {
          nombre: "",
          docente: "",
          semestre: "1",
          color: "blue",
          descripcion: "",
        },
  );
  const [horariosFormulario, setHorariosFormulario] = useState(() =>
    curso
      ? (() => {
          const filas = parsearHorarioCurso(curso.horario);
          return filas.length ? filas : [crearFilaHorarioCurso()];
        })()
      : [crearFilaHorarioCurso()],
  );

  if (!curso) {
    return <div className="rounded-2xl bg-white p-8 shadow">Curso no encontrado.</div>;
  }

  const reiniciarFormularioCurso = () => {
    setFormulario({
      nombre: curso.nombre,
      docente: curso.docente,
      semestre: curso.semestre,
      color: curso.color,
      descripcion: curso.descripcion,
    });
    const filas = parsearHorarioCurso(curso.horario);
    setHorariosFormulario(filas.length ? filas : [crearFilaHorarioCurso()]);
    setErrorHorario("");
  };

  const guardarCambiosCurso = () => {
    if (!formulario.nombre.trim() || !formulario.docente.trim()) {
      setErrorHorario("Completa al menos el nombre del curso y el docente.");
      return;
    }

    const error = validarHorarioCurso(horariosFormulario);
    if (error) {
      setErrorHorario(error);
      return;
    }

    actualizarCurso(curso.id, {
      ...formulario,
      nombre: formulario.nombre.trim(),
      docente: formulario.docente.trim(),
      horario: formatearHorarioCurso(horariosFormulario),
      descripcion: formulario.descripcion.trim(),
    });
    setErrorHorario("");
    setDialogoEdicionAbierto(false);
  };

  const estiloCurso = obtenerEstiloCurso(curso.color);
  const tareasCurso = tareas.filter((tarea) => tarea.cursoId === curso.id);
  const tareasCompletadas = tareasCurso.filter((tarea) => tarea.estado === "completed").length;
  const progreso = tareasCurso.length ? Math.round((tareasCompletadas / tareasCurso.length) * 100) : 0;
  const examenesCurso = examenes.filter((examen) => examen.cursoId === curso.id);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/app/courses">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a cursos
          </Button>
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: estiloCurso.fondoSuave, color: estiloCurso.color }}
            >
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold">{curso.nombre}</h1>
                <Badge className={estiloCurso.badge}>{progreso}% completado</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {curso.docente}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {curso.horario}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog
              open={dialogoEdicionAbierto}
              onOpenChange={(abierto) => {
                setDialogoEdicionAbierto(abierto);
                if (!abierto) {
                  reiniciarFormularioCurso();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar curso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar curso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={formulario.nombre}
                      onChange={(event) => {
                        setFormulario({ ...formulario, nombre: event.target.value });
                        setErrorHorario("");
                      }}
                    />
                  </div>
                  <div>
                    <Label>Docente</Label>
                    <Input
                      value={formulario.docente}
                      onChange={(event) => {
                        setFormulario({ ...formulario, docente: event.target.value });
                        setErrorHorario("");
                      }}
                    />
                  </div>
                  <CourseScheduleEditor
                    filas={horariosFormulario}
                    onChange={(filas) => {
                      setHorariosFormulario(filas);
                      setErrorHorario("");
                    }}
                    error={errorHorario}
                  />
                  <div>
                    <Label>Descripcion</Label>
                    <Input
                      value={formulario.descripcion}
                      onChange={(event) => {
                        setFormulario({ ...formulario, descripcion: event.target.value });
                        setErrorHorario("");
                      }}
                    />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600" onClick={guardarCambiosCurso}>
                    Guardar cambios
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                eliminarCurso(curso.id);
                navigate("/app/courses");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-lg">
        <div className="h-1.5 w-full" style={{ background: estiloCurso.gradiente }} />
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Resumen general</h2>
            <span className="text-2xl font-bold" style={{ color: estiloCurso.color }}>
              {progreso}%
            </span>
          </div>
          <p className="mb-4 text-gray-600">{curso.descripcion}</p>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progreso}%`,
                background: estiloCurso.gradiente,
                boxShadow: `0 0 18px ${estiloCurso.shadow}`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Tareas relacionadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tareasCurso.map((tarea) => (
              <div
                key={tarea.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: estiloCurso.borde, background: estiloCurso.fondoClaro }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{tarea.titulo}</h3>
                  <Badge className={tarea.prioridad === "high" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"}>
                    {tarea.prioridad === "high" ? "Alta" : tarea.prioridad === "medium" ? "Media" : "Baja"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">Entrega: {formatearFechaCorta(tarea.fechaEntrega)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Examenes programados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {examenesCurso.map((examen) => (
              <div
                key={examen.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: estiloCurso.borde, background: estiloCurso.fondoClaro }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{examen.titulo}</h3>
                  <span className="text-sm text-gray-600">{formatearFechaCorta(examen.fecha)}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Preparacion</span>
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
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Materiales y apuntes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {curso.materiales.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between rounded-2xl border p-4"
                style={{ borderColor: estiloCurso.borde, background: estiloCurso.fondoClaro }}
              >
                <div>
                  <p className="font-medium">{material.nombre}</p>
                  <p className="text-sm text-gray-600">{material.tipo}</p>
                </div>
                <Button variant="outline" size="sm">
                  Ver detalle
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card
          className="border-none shadow-lg"
          style={{ background: `linear-gradient(135deg, ${estiloCurso.fondoClaro} 0%, #f8fafc 100%)` }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: estiloCurso.color }} />
              Recomendacion de estudio hecha por IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-white/80 p-4">
              En este curso te conviene reforzar practica aplicada y cerrar primero los temas del examen mas cercano.
            </div>
            <div className="rounded-2xl bg-white/80 p-4">
              Sugerencia: 3 sesiones de 50 minutos esta semana, priorizando {examenesCurso[0]?.temas[0] ?? "los temas con menor avance"}.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function obtenerEstiloCurso(color: string) {
  const estilos: Record<string, { gradiente: string; fondoSuave: string; fondoClaro: string; badge: string; color: string; borde: string; shadow: string }> = {
    blue: {
      gradiente: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
      fondoSuave: "rgba(37, 99, 235, 0.12)",
      fondoClaro: "rgba(37, 99, 235, 0.06)",
      badge: "bg-blue-100 text-blue-700",
      color: "#2563eb",
      borde: "rgba(37, 99, 235, 0.16)",
      shadow: "rgba(37, 99, 235, 0.35)",
    },
    purple: {
      gradiente: "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)",
      fondoSuave: "rgba(124, 58, 237, 0.12)",
      fondoClaro: "rgba(124, 58, 237, 0.06)",
      badge: "bg-purple-100 text-purple-700",
      color: "#7c3aed",
      borde: "rgba(124, 58, 237, 0.16)",
      shadow: "rgba(124, 58, 237, 0.35)",
    },
    green: {
      gradiente: "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)",
      fondoSuave: "rgba(22, 163, 74, 0.12)",
      fondoClaro: "rgba(22, 163, 74, 0.06)",
      badge: "bg-emerald-100 text-emerald-700",
      color: "#16a34a",
      borde: "rgba(22, 163, 74, 0.16)",
      shadow: "rgba(22, 163, 74, 0.35)",
    },
    orange: {
      gradiente: "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)",
      fondoSuave: "rgba(234, 88, 12, 0.12)",
      fondoClaro: "rgba(234, 88, 12, 0.06)",
      badge: "bg-orange-100 text-orange-700",
      color: "#ea580c",
      borde: "rgba(234, 88, 12, 0.16)",
      shadow: "rgba(234, 88, 12, 0.35)",
    },
    red: {
      gradiente: "linear-gradient(90deg, #dc2626 0%, #f87171 100%)",
      fondoSuave: "rgba(220, 38, 38, 0.12)",
      fondoClaro: "rgba(220, 38, 38, 0.06)",
      badge: "bg-red-100 text-red-700",
      color: "#dc2626",
      borde: "rgba(220, 38, 38, 0.16)",
      shadow: "rgba(220, 38, 38, 0.35)",
    },
    teal: {
      gradiente: "linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)",
      fondoSuave: "rgba(15, 118, 110, 0.12)",
      fondoClaro: "rgba(15, 118, 110, 0.06)",
      badge: "bg-teal-100 text-teal-700",
      color: "#0f766e",
      borde: "rgba(15, 118, 110, 0.16)",
      shadow: "rgba(15, 118, 110, 0.35)",
    },
  };

  return estilos[color] ?? estilos.blue;
}
