import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Menu,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  formatearFechaCorta,
  obtenerAlertasInteligentes,
  obtenerTiempoRelativoNotificacion,
  useStudyFlow,
  type AlertaInteligente,
  type NotificacionItem,
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
  const { usuarioActual, notificaciones, cursos, tareas, examenes, bloquesPlanificador } =
    useStudyFlow();
  const [busqueda, setBusqueda] = useState("");
  const [dialogoNotificacionesAbierto, setDialogoNotificacionesAbierto] = useState(false);
  const cantidadNoLeidas = notificaciones.filter((item) => item.noLeida).length;
  const initials = `${usuarioActual?.nombres?.[0] ?? "S"}${usuarioActual?.apellidos?.[0] ?? "F"}`;

  const alertasInteligentes = useMemo(
    () => obtenerAlertasInteligentes(cursos, tareas, examenes, bloquesPlanificador),
    [bloquesPlanificador, cursos, examenes, tareas],
  );
  const notificacionesRecientes = useMemo(
    () =>
      [...notificaciones]
        .sort(
          (a, b) =>
            Number(b.noLeida) - Number(a.noLeida) ||
            new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime(),
        )
        .slice(0, 4),
    [notificaciones],
  );
  const totalIndicadorNotificaciones = Math.max(cantidadNoLeidas, alertasInteligentes.length);
  const totalCriticas = alertasInteligentes.filter((item) => item.nivel === "critica").length;
  const totalAltas = alertasInteligentes.filter((item) => item.nivel === "alta").length;
  const alertaPrincipal = alertasInteligentes[0] ?? null;

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
        subtitulo: `${curso.docente} - ${curso.horario}`,
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
          subtitulo: `${curso?.nombre ?? "Sin curso"} - Entrega ${formatearFechaCorta(tarea.fechaEntrega)}`,
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
          subtitulo: `${curso?.nombre ?? "Sin curso"} - ${formatearFechaCorta(examen.fecha)}`,
          tipo: "examen",
          destino: `/app/exams?focus=${examen.id}`,
        };
      });

    return [...resultadosCursos, ...resultadosTareas, ...resultadosExamenes].slice(0, 7);
  }, [busqueda, cursos, tareas, examenes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!usuarioActual?.id || location.pathname !== "/app" || totalIndicadorNotificaciones === 0) {
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
  }, [location.pathname, totalIndicadorNotificaciones, usuarioActual?.id]);

  const irAResultado = (destino: string) => {
    setBusqueda("");
    navigate(destino);
  };

  const irAAlerta = (alerta: AlertaInteligente) => {
    setDialogoNotificacionesAbierto(false);
    navigate(alerta.destino);
  };

  return (
    <>
      <Dialog open={dialogoNotificacionesAbierto} onOpenChange={setDialogoNotificacionesAbierto}>
        <DialogContent className="w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[calc(100vw-2rem)] lg:max-w-[74rem] xl:max-w-[80rem]">
          <div className="grid max-h-[84vh] overflow-hidden bg-white lg:grid-cols-[1fr_1.16fr] xl:grid-cols-[0.98fr_1.22fr]">
            <div className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-900 p-6 text-white md:p-7 lg:border-b-0 lg:border-r lg:border-r-white/10 lg:p-8">
              <DialogHeader className="space-y-3 text-left">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-white">Centro rapido de alertas</DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-6 text-white/75">
                      StudyFlow reviso tu panel y dejo a la vista lo mas importante para hoy.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <ResumenDialogo
                  etiqueta="Alertas clave"
                  valor={`${alertasInteligentes.length}`}
                  detalle="Pendientes de revisar"
                />
                <ResumenDialogo
                  etiqueta="Criticas"
                  valor={`${totalCriticas}`}
                  detalle="Exigen atencion ya"
                />
                <ResumenDialogo
                  etiqueta="Recordatorios"
                  valor={`${cantidadNoLeidas}`}
                  detalle="Sin leer en el sistema"
                />
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur lg:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                  Entra con foco
                </div>

                <div className="mt-4 space-y-3">
                  {alertaPrincipal ? (
                    <DialogoInsightItem
                      icon={alertaPrincipal.tipo === "tarea" ? ClipboardList : CalendarClock}
                      titulo="Primero abre esta alerta"
                      descripcion={alertaPrincipal.titulo}
                      detalle={alertaPrincipal.descripcion}
                    />
                  ) : (
                    <DialogoInsightItem
                      icon={CheckCircle2}
                      titulo="Sin urgencias nuevas"
                      descripcion="Tu tablero esta estable"
                      detalle="Solo te quedan recordatorios informativos en este momento."
                    />
                  )}

                  <DialogoInsightItem
                    icon={AlertTriangle}
                    titulo="Nivel alto de atencion"
                    descripcion={`${totalCriticas + totalAltas} alerta${totalCriticas + totalAltas === 1 ? "" : "s"} entre critica y alta`}
                    detalle="Conviene resolver primero lo que tenga fecha mas cercana o ya este atrasado."
                  />

                  <DialogoInsightItem
                    icon={Bell}
                    titulo="Recordatorios del sistema"
                    descripcion={
                      cantidadNoLeidas > 0
                        ? `${cantidadNoLeidas} pendiente${cantidadNoLeidas === 1 ? "" : "s"} por leer`
                        : "No tienes pendientes sin leer"
                    }
                    detalle="Abre el centro completo si quieres revisar el historial o limpiar notificaciones."
                  />
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col bg-slate-50">
              <div className="border-b border-slate-200 px-6 py-5 md:px-7 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Acciones recomendadas</div>
                    <p className="mt-1 text-sm text-slate-500">
                      Abre una alerta para ir directo al curso, tarea o examen que lo necesita.
                    </p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700">
                    {totalIndicadorNotificaciones} elemento{totalIndicadorNotificaciones === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-6 pt-5 md:px-7 lg:px-8">
                <ScrollArea className="h-[min(56vh,34rem)] pr-2 lg:pr-4">
                  {alertasInteligentes.length > 0 ? (
                    <section>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Alertas que necesitan accion
                        </div>
                        <Badge className="bg-amber-100 text-amber-700">
                          {totalCriticas + totalAltas} prioridad alta
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {alertasInteligentes.map((alerta) => (
                          <TarjetaAlertaDialogo key={alerta.id} alerta={alerta} onOpen={irAAlerta} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {notificacionesRecientes.length > 0 ? (
                    <section className={alertasInteligentes.length > 0 ? "mt-6" : ""}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <Bell className="h-4 w-4 text-blue-600" />
                          Recordatorios recientes
                        </div>
                        <Badge className="bg-slate-100 text-slate-700">
                          {notificacionesRecientes.length} visibles
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {notificacionesRecientes.map((notificacion) => (
                          <TarjetaRecordatorioDialogo key={notificacion.id} notificacion={notificacion} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {alertasInteligentes.length === 0 && notificacionesRecientes.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                      No hay alertas urgentes ahora mismo. Tu panel se ve bastante controlado.
                    </div>
                  ) : null}
                </ScrollArea>

                <DialogFooter className="mt-6 gap-2 sm:justify-end">
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
                    Ver centro completo
                  </Button>
                </DialogFooter>
              </div>
            </div>
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
              {totalIndicadorNotificaciones > 0 ? (
                <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-red-500 p-0 text-xs text-white">
                  {totalIndicadorNotificaciones}
                </Badge>
              ) : null}
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

function TarjetaAlertaDialogo({
  alerta,
  onOpen,
}: {
  alerta: AlertaInteligente;
  onOpen: (alerta: AlertaInteligente) => void;
}) {
  const estilo = obtenerEstiloAlertaInteligente(alerta.nivel);
  const Icon = alerta.tipo === "tarea" ? ClipboardList : CalendarClock;

  return (
    <button
      type="button"
      onClick={() => onOpen(alerta)}
      className="group flex w-full items-start gap-4 rounded-[28px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
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
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            {alerta.tipo}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{alerta.descripcion}</p>
        <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium" style={{ color: estilo.color }}>
          Abrir detalle
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

function TarjetaRecordatorioDialogo({
  notificacion,
}: {
  notificacion: NotificacionItem;
}) {
  const Icon = obtenerIconoRecordatorio(notificacion.tipo);

  return (
    <div
      className={`rounded-[24px] border p-4 ${
        notificacion.noLeida ? "border-blue-100 bg-white" : "border-slate-200 bg-slate-100/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            notificacion.noLeida ? "bg-blue-50 text-blue-600" : "bg-white text-slate-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{notificacion.titulo}</span>
            <Badge className={notificacion.noLeida ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-700"}>
              {notificacion.noLeida ? "Nuevo" : "Leida"}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{notificacion.mensaje}</p>
          <p className="mt-3 text-xs text-slate-400">
            {obtenerTiempoRelativoNotificacion(notificacion.creadaEn)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResumenDialogo({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/55">{etiqueta}</div>
      <div className="mt-2 text-3xl font-semibold">{valor}</div>
      <div className="mt-1 text-sm text-white/65">{detalle}</div>
    </div>
  );
}

function DialogoInsightItem({
  icon: Icon,
  titulo,
  descripcion,
  detalle,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">{titulo}</div>
          <div className="mt-1 text-sm font-semibold text-white">{descripcion}</div>
          <p className="mt-1 text-sm leading-6 text-white/70">{detalle}</p>
        </div>
      </div>
    </div>
  );
}

function obtenerIconoRecordatorio(tipo: NotificacionItem["tipo"]) {
  if (tipo === "success") return CheckCircle2;
  if (tipo === "warning") return AlertTriangle;
  if (tipo === "urgent") return AlertCircle;
  return Bell;
}

function obtenerEstiloAlertaInteligente(nivel: AlertaInteligente["nivel"]) {
  if (nivel === "critica") {
    return {
      fondo: "rgba(254, 242, 242, 0.92)",
      fondoIcono: "rgba(239, 68, 68, 0.12)",
      borde: "rgba(239, 68, 68, 0.18)",
      color: "#dc2626",
      badge: "bg-red-100 text-red-700",
      etiqueta: "Critica",
    };
  }

  if (nivel === "alta") {
    return {
      fondo: "rgba(255, 247, 237, 0.96)",
      fondoIcono: "rgba(249, 115, 22, 0.12)",
      borde: "rgba(249, 115, 22, 0.18)",
      color: "#ea580c",
      badge: "bg-orange-100 text-orange-700",
      etiqueta: "Alta",
    };
  }

  return {
    fondo: "rgba(239, 246, 255, 0.96)",
    fondoIcono: "rgba(37, 99, 235, 0.12)",
    borde: "rgba(37, 99, 235, 0.18)",
    color: "#2563eb",
    badge: "bg-blue-100 text-blue-700",
    etiqueta: "Media",
  };
}
