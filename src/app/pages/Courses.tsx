import { useMemo, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Calendar, Plus, Search, User } from "lucide-react";
import CourseScheduleEditor from "../components/CourseScheduleEditor";
import { useStudyFlow } from "../data/studyflow-store";
import {
  crearFilaHorarioCurso,
  formatearHorarioCurso,
  validarHorarioCurso,
} from "../data/course-schedule";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function Courses() {
  const { cursos, tareas, examenes, usuarioActual, agregarCurso } = useStudyFlow();
  const [busqueda, setBusqueda] = useState("");
  const [filtroSemestre, setFiltroSemestre] = useState("all");
  const [dialogoCursoAbierto, setDialogoCursoAbierto] = useState(false);
  const [errorNuevoCurso, setErrorNuevoCurso] = useState("");
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: "",
    docente: "",
    semestre: usuarioActual?.semestre ?? "5",
    color: "blue",
    descripcion: "",
  });
  const [horariosNuevoCurso, setHorariosNuevoCurso] = useState([crearFilaHorarioCurso()]);

  const reiniciarFormularioCurso = () => {
    setNuevoCurso({
      nombre: "",
      docente: "",
      semestre: usuarioActual?.semestre ?? "5",
      color: "blue",
      descripcion: "",
    });
    setHorariosNuevoCurso([crearFilaHorarioCurso()]);
    setErrorNuevoCurso("");
  };

  const guardarCurso = () => {
    if (!nuevoCurso.nombre.trim() || !nuevoCurso.docente.trim()) {
      setErrorNuevoCurso("Completa al menos el nombre del curso y el docente.");
      return;
    }

    const errorHorario = validarHorarioCurso(horariosNuevoCurso);
    if (errorHorario) {
      setErrorNuevoCurso(errorHorario);
      return;
    }

    agregarCurso({
      ...nuevoCurso,
      nombre: nuevoCurso.nombre.trim(),
      docente: nuevoCurso.docente.trim(),
      horario: formatearHorarioCurso(horariosNuevoCurso),
      descripcion: nuevoCurso.descripcion.trim(),
    });
    reiniciarFormularioCurso();
    setDialogoCursoAbierto(false);
  };

  const cursosFiltrados = useMemo(
    () =>
      cursos.filter((curso) => {
        const coincideBusqueda = `${curso.nombre} ${curso.docente}`
          .toLowerCase()
          .includes(busqueda.toLowerCase());
        const coincideSemestre = filtroSemestre === "all" || curso.semestre === filtroSemestre;
        return coincideBusqueda && coincideSemestre;
      }),
    [busqueda, cursos, filtroSemestre],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Mis cursos</h1>
          <p className="max-w-2xl text-sm text-gray-600 sm:text-base">
            Gestiona materias, actividades y ritmo de avance por curso.
          </p>
        </div>

        <Dialog
          open={dialogoCursoAbierto}
          onOpenChange={(abierto) => {
            setDialogoCursoAbierto(abierto);
            if (!abierto) {
              reiniciarFormularioCurso();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Agregar curso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar curso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre-curso">Nombre</Label>
                <Input
                  id="nombre-curso"
                  value={nuevoCurso.nombre}
                  onChange={(event) => {
                    setNuevoCurso({ ...nuevoCurso, nombre: event.target.value });
                    setErrorNuevoCurso("");
                  }}
                />
              </div>
              <div>
                <Label htmlFor="docente-curso">Docente</Label>
                <Input
                  id="docente-curso"
                  value={nuevoCurso.docente}
                  onChange={(event) => {
                    setNuevoCurso({ ...nuevoCurso, docente: event.target.value });
                    setErrorNuevoCurso("");
                  }}
                />
              </div>
              <CourseScheduleEditor
                filas={horariosNuevoCurso}
                onChange={(filas) => {
                  setHorariosNuevoCurso(filas);
                  setErrorNuevoCurso("");
                }}
                error={errorNuevoCurso}
              />
              <div>
                <Label htmlFor="descripcion-curso">Resumen</Label>
                <Input
                  id="descripcion-curso"
                  value={nuevoCurso.descripcion}
                  onChange={(event) => {
                    setNuevoCurso({ ...nuevoCurso, descripcion: event.target.value });
                    setErrorNuevoCurso("");
                  }}
                />
              </div>
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                onClick={guardarCurso}
              >
                Guardar curso
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar cursos..."
            className="pl-10"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>
        <Select value={filtroSemestre} onValueChange={setFiltroSemestre}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Filtrar por ciclo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los ciclos</SelectItem>
            {Array.from(new Set(cursos.map((curso) => curso.semestre))).map((semestre) => (
              <SelectItem key={semestre} value={semestre}>
                {semestre} ciclo
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cursosFiltrados.map((curso) => {
          const tareasCurso = tareas.filter((tarea) => tarea.cursoId === curso.id);
          const tareasCompletadas = tareasCurso.filter((tarea) => tarea.estado === "completed").length;
          const progresoCurso = tareasCurso.length ? Math.round((tareasCompletadas / tareasCurso.length) * 100) : 0;
          const proximoExamen = examenes
            .filter((examen) => examen.cursoId === curso.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
          const estiloCurso = obtenerEstiloCurso(curso.color);

          return (
            <Link key={curso.id} to={`/app/courses/${curso.id}`}>
              <Card className="h-full overflow-hidden border-none shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="h-1.5 w-full" style={{ background: estiloCurso.gradiente }} />
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: estiloCurso.fondoSuave, color: estiloCurso.color }}
                    >
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <Badge className={estiloCurso.badge}>{progresoCurso}%</Badge>
                  </div>

                  <h3 className="mb-2 text-lg font-bold sm:text-xl">{curso.nombre}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {curso.docente}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {curso.horario}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Avance</span>
                        <span className="font-semibold">{progresoCurso}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progresoCurso}%`,
                            background: estiloCurso.gradiente,
                            boxShadow: `0 0 18px ${estiloCurso.shadow}`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Proxima actividad: {proximoExamen ? proximoExamen.titulo : "Sin evaluacion proxima"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function obtenerEstiloCurso(color: string) {
  const estilos: Record<
    string,
    { gradiente: string; fondoSuave: string; badge: string; color: string; shadow: string }
  > = {
    blue: {
      gradiente: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
      fondoSuave: "rgba(37, 99, 235, 0.12)",
      badge: "bg-blue-100 text-blue-700",
      color: "#2563eb",
      shadow: "rgba(37, 99, 235, 0.35)",
    },
    purple: {
      gradiente: "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)",
      fondoSuave: "rgba(124, 58, 237, 0.12)",
      badge: "bg-purple-100 text-purple-700",
      color: "#7c3aed",
      shadow: "rgba(124, 58, 237, 0.35)",
    },
    green: {
      gradiente: "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)",
      fondoSuave: "rgba(22, 163, 74, 0.12)",
      badge: "bg-emerald-100 text-emerald-700",
      color: "#16a34a",
      shadow: "rgba(22, 163, 74, 0.35)",
    },
    orange: {
      gradiente: "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)",
      fondoSuave: "rgba(234, 88, 12, 0.12)",
      badge: "bg-orange-100 text-orange-700",
      color: "#ea580c",
      shadow: "rgba(234, 88, 12, 0.35)",
    },
    red: {
      gradiente: "linear-gradient(90deg, #dc2626 0%, #f87171 100%)",
      fondoSuave: "rgba(220, 38, 38, 0.12)",
      badge: "bg-red-100 text-red-700",
      color: "#dc2626",
      shadow: "rgba(220, 38, 38, 0.35)",
    },
    teal: {
      gradiente: "linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)",
      fondoSuave: "rgba(15, 118, 110, 0.12)",
      badge: "bg-teal-100 text-teal-700",
      color: "#0f766e",
      shadow: "rgba(15, 118, 110, 0.35)",
    },
  };

  return estilos[color] ?? estilos.blue;
}
