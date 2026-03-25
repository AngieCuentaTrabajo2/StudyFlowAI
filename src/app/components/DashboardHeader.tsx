import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, BookOpen, ClipboardList, Menu, Search } from "lucide-react";
import { formatearFechaCorta, useStudyFlow } from "../data/studyflow-store";
import Sidebar from "./Sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

type ResultadoBusqueda = {
  id: string;
  titulo: string;
  subtitulo: string;
  tipo: "curso" | "tarea" | "examen";
  destino: string;
};

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { usuarioActual, notificaciones, cursos, tareas, examenes } = useStudyFlow();
  const [busqueda, setBusqueda] = useState("");
  const cantidadNoLeidas = notificaciones.filter((item) => item.noLeida).length;
  const initials = `${usuarioActual?.nombres?.[0] ?? "S"}${usuarioActual?.apellidos?.[0] ?? "F"}`;

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return [];

    const resultadosCursos: ResultadoBusqueda[] = cursos
      .filter(
        (curso) =>
          curso.nombre.toLowerCase().includes(termino) ||
          curso.docente.toLowerCase().includes(termino) ||
          curso.descripcion.toLowerCase().includes(termino),
      )
      .map((curso) => ({
        id: `curso-${curso.id}`,
        titulo: curso.nombre,
        subtitulo: `${curso.docente} · ${curso.horario}`,
        tipo: "curso",
        destino: `/app/courses/${curso.id}`,
      }));

    const resultadosTareas: ResultadoBusqueda[] = tareas
      .filter(
        (tarea) =>
          tarea.titulo.toLowerCase().includes(termino) ||
          tarea.descripcion.toLowerCase().includes(termino),
      )
      .map((tarea) => {
        const curso = cursos.find((item) => item.id === tarea.cursoId);
        return {
          id: `tarea-${tarea.id}`,
          titulo: tarea.titulo,
          subtitulo: `${curso?.nombre ?? "Sin curso"} · Entrega ${formatearFechaCorta(tarea.fechaEntrega)}`,
          tipo: "tarea",
          destino: `/app/tasks?focus=${tarea.id}`,
        };
      });

    const resultadosExamenes: ResultadoBusqueda[] = examenes
      .filter(
        (examen) =>
          examen.titulo.toLowerCase().includes(termino) ||
          examen.temas.join(" ").toLowerCase().includes(termino),
      )
      .map((examen) => {
        const curso = cursos.find((item) => item.id === examen.cursoId);
        return {
          id: `examen-${examen.id}`,
          titulo: examen.titulo,
          subtitulo: `${curso?.nombre ?? "Sin curso"} · ${formatearFechaCorta(examen.fecha)}`,
          tipo: "examen",
          destino: `/app/exams?focus=${examen.id}`,
        };
      });

    return [...resultadosCursos, ...resultadosTareas, ...resultadosExamenes].slice(0, 7);
  }, [busqueda, cursos, tareas, examenes]);

  const irAResultado = (destino: string) => {
    setBusqueda("");
    navigate(destino);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-gray-200 bg-white/95 backdrop-blur lg:left-64">
      <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-8">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5 text-gray-700" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu principal</SheetTitle>
              </SheetHeader>
              <Sidebar mobile />
            </SheetContent>
          </Sheet>
        </div>

        <div className="max-w-xl flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar cursos, tareas, examenes..."
              className="border-gray-200 bg-gray-50 pl-10"
            />

            {busqueda.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                {resultados.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto p-2">
                    {resultados.map((resultado) => (
                      <button
                        key={resultado.id}
                        type="button"
                        onClick={() => irAResultado(resultado.destino)}
                        className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-gray-50"
                      >
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          {resultado.tipo === "curso" ? (
                            <BookOpen className="h-4 w-4" />
                          ) : resultado.tipo === "tarea" ? (
                            <ClipboardList className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{resultado.titulo}</span>
                            <Badge className="bg-gray-100 text-gray-600">
                              {resultado.tipo === "curso"
                                ? "Curso"
                                : resultado.tipo === "tarea"
                                  ? "Tarea"
                                  : "Examen"}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-sm text-gray-500">{resultado.subtitulo}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-500">
                    No encontramos resultados para <strong>{busqueda}</strong>.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/app/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              {cantidadNoLeidas > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-red-500 p-0 text-xs text-white">
                  {cantidadNoLeidas}
                </Badge>
              )}
            </Button>
          </Link>

          <Link to="/app/settings">
            <Avatar className="cursor-pointer">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
