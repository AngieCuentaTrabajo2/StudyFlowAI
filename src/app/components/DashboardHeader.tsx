import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Menu,
  Search,
} from "lucide-react";
import {
  formatearFechaCorta,
  obtenerAlertasInteligentes,
  useStudyFlow,
  type AlertaInteligente,
} from "../data/studyflow-store";
import Sidebar from "./Sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

type ResultadoBusqueda = {
  id: string;
  titulo: string;
  subtitulo: string;
  tipo: "curso" | "tarea" | "examen";
  destino: string;
};

export default function DashboardHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuarioActual, notificaciones, cursos, tareas, examenes, bloquesPlanificador } = useStudyFlow();
  const [busqueda, setBusqueda] = useState("");
  const [dialogoNotificacionesAbierto, setDialogoNotificacionesAbierto] = useState(false);
  const cantidadNoLeidas = notificaciones.filter((item) => item.noLeida).length;
  const notificacionesRecientes = notificaciones.filter((item) => item.noLeida).slice(0, 3);
  const initials = `${usuarioActual?.nombres?.[0] ?? "S"}${usuarioActual?.apellidos?.[0] ?? "F"}`;
  const alertasInteligentes = useMemo(
    () => obtenerAlertasInteligentes(cursos, tareas, examenes, bloquesPlanificador),
    [bloquesPlanificador, cursos, examenes, tareas],
  );
  const totalIndicadorNotificaciones = Math.max(cantidadNoLeidas, alertasInteligentes.length);

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

  const irAAlerta = (alerta: AlertaInteligente) => {
    setDialogoNotificacionesAbierto(false);
    navigate(alerta.destino);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!usuarioActual?.id || location.pathname !== "/app" || alertasInteligentes.length === 0) {
      return;
    }

    const claveSesion = `studyflow-smart-alerts-opened:${usuarioActual.id}`;
    if (window.sessionStorage.getItem(claveSesion) === "1") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDialogoNotificacionesAbierto(true);
      window.sessionStorage.setItem(claveSesion, "1");
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [alertasInteligentes.length, location.pathname, usuarioActual?.id]);

  return (
    <>
      <Dialog open={dialogoNotificacionesAbierto} onOpenChange={setDialogoNotificacionesAbierto}>
        <DialogContent className="w-[min(100%-1.5rem,42rem)] rounded-3xl border-none p-0 shadow-2xl">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-purple-900 p-6 text-white">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl text-white">Alertas importantes al entrar</DialogTitle>
                  <DialogDescription className="text-sm text-white/75">
                    StudyFlow reviso tus fechas y detecto lo mas importante para hoy.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="bg-white/12 text-white">{alertasInteligentes.length} alertas clave</Badge>
              <Badge className="bg-red-500/20 text-red-100">
                {alertasInteligentes.filter((item) => item.nivel === "critica").length} criticas
              </Badge>
              <Badge className="bg-white/12 text-white">{cantidadNoLeidas} recordatorios del sistema</Badge>
            </div>
          </div>

          <div className="p-6 pt-5">
            {alertasInteligentes.length > 0 ? (
              <ScrollArea className="max-h-[300px] pr-4">
                <div className="space-y-3">
                  {alertasInteligentes.map((alerta) => {
                    const estilo = obtenerEstiloAlertaInteligente(alerta.nivel);
                    const Icon = alerta.tipo === "tarea" ? ClipboardList : CalendarClock;

                    return (
                      <button
                        key={alerta.id}
                        type="button"
                        onClick={() => irAAlerta(alerta)}
                        className="flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                        style={{ borderColor: estilo.borde, background: estilo.fondo }}
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                          style={{ background: estilo.fondoIcono, color: estilo.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{alerta.titulo}</span>
                            <Badge className={estilo.badge}>{estilo.etiqueta}</Badge>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{alerta.descripcion}</p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : null}

            {notificacionesRecientes.length > 0 ? (
              <div className={alertasInteligentes.length > 0 ? "mt-6" : ""}>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Recordatorios recientes
                </div>
                <div className="space-y-3">
                  {notificacionesRecientes.map((notificacion) => (
                    <div
                      key={notificacion.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{notificacion.titulo}</span>
                        <Badge className="bg-slate-200 text-slate-700">Sistema</Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{notificacion.mensaje}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {alertasInteligentes.length === 0 && notificacionesRecientes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No hay alertas urgentes ahora mismo. Tu panel se ve bastante controlado.
              </div>
            ) : null}

            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={() => setDialogoNotificacionesAbierto(false)}>
                Cerrar
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => {
                  setDialogoNotificacionesAbierto(false);
                  navigate("/app/notifications");
                }}
              >
                Ver centro de notificaciones
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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

        <div className="max-w-xl min-w-0 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar..."
              className="border-gray-200 bg-gray-50 pl-10 sm:placeholder:text-sm md:placeholder:text-base"
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

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setDialogoNotificacionesAbierto(true)}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {totalIndicadorNotificaciones > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-red-500 p-0 text-xs text-white">
                  {totalIndicadorNotificaciones}
                </Badge>
              )}
            </Button>
          

            <Link to="/app/settings">
              <Avatar className="h-9 w-9 cursor-pointer sm:h-10 sm:w-10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

function obtenerEstiloAlertaInteligente(nivel: AlertaInteligente["nivel"]) {
  if (nivel === "critica") {
    return {
      fondo: "rgba(254, 242, 242, 0.9)",
      fondoIcono: "rgba(239, 68, 68, 0.12)",
      borde: "rgba(239, 68, 68, 0.18)",
      color: "#dc2626",
      badge: "bg-red-100 text-red-700",
      etiqueta: "Critica",
    };
  }

  if (nivel === "alta") {
    return {
      fondo: "rgba(255, 247, 237, 0.95)",
      fondoIcono: "rgba(249, 115, 22, 0.12)",
      borde: "rgba(249, 115, 22, 0.18)",
      color: "#ea580c",
      badge: "bg-orange-100 text-orange-700",
      etiqueta: "Alta",
    };
  }

  return {
    fondo: "rgba(239, 246, 255, 0.95)",
    fondoIcono: "rgba(37, 99, 235, 0.12)",
    borde: "rgba(37, 99, 235, 0.18)",
    color: "#2563eb",
    badge: "bg-blue-100 text-blue-700",
    etiqueta: "Media",
  };
}
