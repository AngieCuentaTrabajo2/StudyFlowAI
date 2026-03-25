import { AlertCircle, Bell, CheckCircle, Clock, Sparkles, Trash2 } from "lucide-react";
import { obtenerTiempoRelativoNotificacion, useStudyFlow } from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function Notifications() {
  const {
    notificaciones,
    marcarNotificacionLeida,
    marcarTodasNotificacionesLeidas,
    limpiarNotificacionesLeidas,
  } = useStudyFlow();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Notificaciones y recordatorios</h1>
          <p className="text-gray-600">Todo lo importante del sistema se concentra aqui, con prioridad y contexto.</p>
        </div>
        <div className="flex gap-2">
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

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recordatorios importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificaciones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              No hay notificaciones por ahora. Cuando StudyFlow detecte algo importante, aparecera aqui.
            </div>
          ) : (
            notificaciones.map((notificacion) => (
              <div
                key={notificacion.id}
                className={`rounded-2xl border p-4 ${
                  notificacion.noLeida ? "border-blue-200 bg-blue-50/40" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{notificacion.titulo}</h3>
                    <p className="mt-1 text-sm text-gray-700">{notificacion.mensaje}</p>
                  </div>
                  {notificacion.noLeida && <Badge className="bg-blue-600 text-white">Nuevo</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {obtenerTiempoRelativoNotificacion(notificacion.creadaEn)}
                  </span>
                  {notificacion.noLeida && (
                    <Button variant="ghost" size="sm" onClick={() => marcarNotificacionLeida(notificacion.id)}>
                      Marcar como leida
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <HighlightCard
          icon={AlertCircle}
          title="Urgencias"
          text="Examenes y tareas con fecha muy cercana aparecen primero."
          tone="red"
        />
        <HighlightCard
          icon={Clock}
          title="Pendientes"
          text="El sistema te avisa cuando el avance no coincide con la fecha limite."
          tone="yellow"
        />
        <HighlightCard
          icon={Sparkles}
          title="Sugerencias IA"
          text="Los recordatorios inteligentes ya estan listos para integrarse con OpenAI."
          tone="blue"
        />
      </div>
    </div>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  tone: "red" | "yellow" | "blue";
}) {
  const estilos = {
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-6">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${estilos[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mb-2 font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">{text}</p>
      </CardContent>
    </Card>
  );
}
