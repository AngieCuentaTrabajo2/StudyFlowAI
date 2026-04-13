import { useMemo } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  obtenerAlertasInteligentes,
  obtenerTiempoRelativoNotificacion,
  useStudyFlow,
  type AlertaInteligente,
  type NotificacionItem,
} from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notificaciones,
    marcarNotificacionLeida,
    marcarTodasNotificacionesLeidas,
    limpiarNotificacionesLeidas,
    cursos,
    tareas,
    examenes,
    bloquesPlanificador,
  } = useStudyFlow();
  const alertasInteligentes = useMemo(
    () => obtenerAlertasInteligentes(cursos, tareas, examenes, bloquesPlanificador),
    [bloquesPlanificador, cursos, examenes, tareas],
  );
  const notificacionesOrdenadas = useMemo(
    () =>
      [...notificaciones].sort(
        (a, b) =>
          Number(b.noLeida) - Number(a.noLeida) ||
          new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime(),
      ),
    [notificaciones],
  );
  const notificacionesNoLeidas = notificacionesOrdenadas.filter((item) => item.noLeida);
  const recordatoriosVisibles = notificacionesNoLeidas.slice(0, 4);
  const totalCriticas = alertasInteligentes.filter((item) => item.nivel === "critica").length;
  const totalSeguimiento = alertasInteligentes.filter((item) => item.nivel !== "critica").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Notificaciones y recordatorios</h1>
          <p className="max-w-3xl text-gray-600">
            Todo lo importante del sistema se concentra aqui, ordenado por urgencia, contexto y accion recomendada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={marcarTodasNotificacionesLeidas}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Marcar todas como leidas
          </Button>
          <Button variant="outline" onClick={limpiarNotificacionesLeidas}>
            <Trash2 className="mr-2 h-4 w-4" />
            Limpiar leidas
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricaNotificacion
          icon={AlertCircle}
          titulo="Alertas criticas"
          valor={`${totalCriticas}`}
          detalle="Lo mas urgente del dia"
          tone="red"
        />
        <MetricaNotificacion
          icon={Sparkles}
          titulo="En seguimiento"
          valor={`${totalSeguimiento}`}
          detalle="Todavia conviene abrirlas"
          tone="blue"
        />
        <MetricaNotificacion
          icon={Bell}
          titulo="Sin leer"
          valor={`${notificacionesNoLeidas.length}`}
          detalle="Recordatorios del sistema"
          tone="violet"
        />
        <MetricaNotificacion
          icon={Clock3}
          titulo="Centro activo"
          valor={`${alertasInteligentes.length + notificacionesOrdenadas.length}`}
          detalle="Alertas y eventos visibles"
          tone="amber"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Alertas inteligentes de hoy
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                  StudyFlow combina tareas, examenes y progreso para mostrar primero lo que puede desordenarte la semana.
                </CardDescription>
              </div>
              <Badge className="bg-slate-100 text-slate-700">
                {alertasInteligentes.length} activa{alertasInteligentes.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {alertasInteligentes.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                No vemos urgencias fuertes por ahora. Cuando algo empiece a apretar, aparecera aqui.
              </div>
            ) : (
              <ScrollArea className="h-[380px] pr-4 lg:h-[460px]">
                <div className="space-y-3">
                  {alertasInteligentes.map((alerta) => (
                    <TarjetaAlertaPrincipal
                      key={alerta.id}
                      alerta={alerta}
                      onOpen={() => navigate(alerta.destino)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-6">
              <CardTitle className="text-lg font-semibold">Resumen rapido</CardTitle>
              <CardDescription>
                Una vista corta para saber donde conviene enfocar primero tu atencion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <FilaResumen
                icon={AlertTriangle}
                titulo="Prioridad del dia"
                descripcion={
                  totalCriticas > 0
                    ? `Tienes ${totalCriticas} alerta${totalCriticas === 1 ? "" : "s"} critica${totalCriticas === 1 ? "" : "s"} que conviene abrir primero.`
                    : "No hay alertas criticas activas en este momento."
                }
                tone="red"
              />
              <FilaResumen
                icon={Bell}
                titulo="Recordatorios pendientes"
                descripcion={
                  notificacionesNoLeidas.length > 0
                    ? `Aun tienes ${notificacionesNoLeidas.length} notificacion${notificacionesNoLeidas.length === 1 ? "" : "es"} sin leer.`
                    : "Todo el centro de recordatorios esta al dia."
                }
                tone="blue"
              />
              <FilaResumen
                icon={CheckCircle2}
                titulo="Como usar este panel"
                descripcion="Abre primero las alertas criticas y luego limpia los recordatorios del sistema para quedarte con un panel mas limpio."
                tone="emerald"
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Bell className="h-5 w-5 text-blue-600" />
                    Recordatorios recientes
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Lo mas nuevo que genero el sistema para que no se pierda entre el historial completo.
                  </CardDescription>
                </div>
                <Badge className="bg-slate-100 text-slate-700">{recordatoriosVisibles.length} visibles</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {recordatoriosVisibles.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No tienes recordatorios sin leer ahora mismo.
                </div>
              ) : (
                <div className="space-y-3">
                  {recordatoriosVisibles.map((notificacion) => (
                    <TarjetaRecordatorioCompacta key={notificacion.id} notificacion={notificacion} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <Bell className="h-5 w-5 text-slate-700" />
                Historial del sistema
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Aqui queda todo lo que StudyFlow ha ido registrando. Las no leidas aparecen arriba y puedes marcarlas una por una.
              </CardDescription>
            </div>
            <Badge className="bg-slate-100 text-slate-700">
              {notificacionesOrdenadas.length} registro{notificacionesOrdenadas.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {notificacionesOrdenadas.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No hay notificaciones por ahora. Cuando StudyFlow detecte algo importante, aparecera aqui.
            </div>
          ) : (
            <ScrollArea className="h-[360px] pr-4 lg:h-[420px]">
              <div className="divide-y divide-slate-100">
                {notificacionesOrdenadas.map((notificacion) => (
                  <FilaNotificacionHistorial
                    key={notificacion.id}
                    notificacion={notificacion}
                    onMarkAsRead={() => marcarNotificacionLeida(notificacion.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TarjetaAlertaPrincipal({
  alerta,
  onOpen,
}: {
  alerta: AlertaInteligente;
  onOpen: () => void;
}) {
  const estilo = obtenerEstiloAlerta(alerta.nivel);
  const Icon = alerta.tipo === "tarea" ? ClipboardList : CalendarClock;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-4 rounded-[28px] border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: estilo.borde, background: estilo.fondo }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
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
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium" style={{ color: estilo.color }}>
          Ir al detalle
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

function TarjetaRecordatorioCompacta({
  notificacion,
}: {
  notificacion: NotificacionItem;
}) {
  const Icon = obtenerIconoRecordatorio(notificacion.tipo);

  return (
    <div
      className={`rounded-[24px] border p-4 ${
        notificacion.noLeida ? "border-blue-100 bg-blue-50/50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            notificacion.noLeida ? "bg-white text-blue-600" : "bg-white text-slate-500"
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

function FilaNotificacionHistorial({
  notificacion,
  onMarkAsRead,
}: {
  notificacion: NotificacionItem;
  onMarkAsRead: () => void;
}) {
  const Icon = obtenerIconoRecordatorio(notificacion.tipo);

  return (
    <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            notificacion.noLeida ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{notificacion.titulo}</h3>
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

      <div className="flex shrink-0 items-center gap-2 lg:pt-1">
        {notificacion.noLeida ? (
          <Button variant="ghost" size="sm" onClick={onMarkAsRead}>
            Marcar como leida
          </Button>
        ) : (
          <span className="text-xs font-medium text-slate-400">Ya revisada</span>
        )}
      </div>
    </div>
  );
}

function MetricaNotificacion({
  icon: Icon,
  titulo,
  valor,
  detalle,
  tone,
}: {
  icon: LucideIcon;
  titulo: string;
  valor: string;
  detalle: string;
  tone: "red" | "blue" | "violet" | "amber";
}) {
  const estilos = {
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${estilos[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium text-slate-500">{titulo}</div>
        <div className="mt-2 text-3xl font-semibold text-slate-900">{valor}</div>
        <p className="mt-2 text-sm text-slate-500">{detalle}</p>
      </CardContent>
    </Card>
  );
}

function FilaResumen({
  icon: Icon,
  titulo,
  descripcion,
  tone,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  tone: "red" | "blue" | "emerald";
}) {
  const estilos = {
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${estilos[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-medium text-slate-900">{titulo}</div>
        <p className="mt-1 text-sm leading-6 text-slate-600">{descripcion}</p>
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

function obtenerEstiloAlerta(nivel: AlertaInteligente["nivel"]) {
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
