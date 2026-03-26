import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  formatearFechaCorta,
  obtenerDiasRestantes,
  obtenerEstadoVisualTarea,
  obtenerPorcentajeCumplimiento,
  useStudyFlow,
} from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";

const etiquetasDias = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const indiceHoy = (new Date().getDay() + 6) % 7;

export default function Dashboard() {
  const { usuarioActual, cursos, examenes, tareas, bloquesPlanificador, alternarTareaCompletada } =
    useStudyFlow();

  const tareasPendientes = tareas.filter((tarea) => obtenerEstadoVisualTarea(tarea) !== "completed");
  const examenesProximos = [...examenes].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3);
  const tareasPrioritarias = [...tareasPendientes]
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))
    .slice(0, 4);

  const horasSemana = etiquetasDias.map((dia, indice) => {
    const horas = bloquesPlanificador
      .filter((bloque) => bloque.tipo === "study" && bloque.dia === indice)
      .reduce((acumulado, bloque) => acumulado + bloque.duracion, 0);
    return { day: dia, hours: Number(horas.toFixed(1)) };
  });

  const totalHoras = horasSemana.reduce((sum, item) => sum + item.hours, 0);
  const horasHoy = horasSemana[indiceHoy]?.hours ?? 0;
  const objetivoSemanal = (usuarioActual?.horasEstudioDiarias ?? 4) * 7;
  const horasSugeridas = Math.max(1, Number(Math.max(objetivoSemanal - totalHoras, 1).toFixed(1)));
  const avanceHorario = Math.min(100, Math.round((totalHoras / objetivoSemanal) * 100));
  const progresoSemanal = obtenerPorcentajeCumplimiento(tareas);
  const tareasUrgentes = tareasPendientes.filter((tarea) => tarea.prioridad === "high").length;
  const examenesConBajaPreparacion = examenes.filter((examen) => examen.preparacion < 60).length;
  const cursoExamenPrincipal = cursos.find((curso) => curso.id === examenesProximos[0]?.cursoId);
  const siguienteBloque = bloquesPlanificador
    .filter((bloque) => bloque.tipo === "study")
    .sort((a, b) => a.dia - b.dia || a.horaInicio - b.horaInicio)[0];
  const cursoSiguienteBloque = cursos.find((curso) => curso.id === siguienteBloque?.cursoId);
  const estiloCursoPrincipal = obtenerEstiloCurso(cursoExamenPrincipal?.color ?? "blue");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold leading-tight sm:text-3xl">
          Hola, {usuarioActual?.nombres}. Este es tu plan academico de hoy.
        </h1>
        <p className="max-w-2xl text-sm text-gray-600 sm:text-base">
          Tus cursos, tareas, examenes y bloques de estudio ya alimentan el panel en tiempo real.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckSquare} value={`${tareasPendientes.length}`} label="Tareas pendientes" tone="blue" />
        <StatCard icon={ClipboardList} value={`${examenesProximos.length}`} label="Examenes proximos" tone="orange" />
        <StatCard icon={Clock} value={`${horasSugeridas}h`} label="Horas de estudio sugeridas" tone="purple" />
        <StatCard icon={TrendingUp} value={`${progresoSemanal}%`} label="Avance semanal" tone="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-lg xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tus prioridades de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tareasPrioritarias.map((tarea) => {
              const curso = cursos.find((item) => item.id === tarea.cursoId);
              const estiloCurso = obtenerEstiloCurso(curso?.color ?? "blue");

              return (
                <div
                  key={tarea.id}
                  className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center"
                  style={{ borderColor: estiloCurso.borde, background: estiloCurso.fondoClaro }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: estiloCurso.fondoSuave, color: estiloCurso.color }}
                  >
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{tarea.titulo}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span>{curso?.nombre}</span>
                      <span>·</span>
                      <span>{formatearFechaCorta(tarea.fechaEntrega)}</span>
                      <span>·</span>
                      <span>{tarea.horasEstimadas}h</span>
                    </div>
                  </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Badge className={tarea.prioridad === "high" ? "bg-red-50 text-red-600" : estiloCurso.badge}>
                      {tarea.prioridad === "high" ? "Urgente" : "Media"}
                    </Badge>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => alternarTareaCompletada(tarea.id)}>
                      Completar
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Horas de estudio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={horasSemana}>
                <defs>
                  <linearGradient id="studyHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="hours" stroke="#2563eb" fill="url(#studyHours)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold">{totalHoras}h</div>
              <div className="text-sm text-gray-600">Total planificado esta semana</div>
            </div>
            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">Cumplimiento del horario</span>
                <span className="font-semibold">{avanceHorario}%</span>
              </div>
              <Progress value={avanceHorario} className="h-2" />
              <div className="mt-2 text-xs text-gray-500">
                Hoy tienes {horasHoy}h reservadas y tu objetivo semanal es de {objetivoSemanal}h.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Proximos examenes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {examenesProximos.map((examen) => {
              const curso = cursos.find((item) => item.id === examen.cursoId);
              const estiloCurso = obtenerEstiloCurso(curso?.color ?? "blue");
              return (
                <div
                  key={examen.id}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: estiloCurso.borde, background: estiloCurso.fondoClaro }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{examen.titulo}</h3>
                      <p className="text-sm text-gray-600">{curso?.nombre}</p>
                    </div>
                    <Badge className={obtenerDiasRestantes(examen.fecha) <= 3 ? "bg-red-50 text-red-600" : estiloCurso.badge}>
                      {obtenerDiasRestantes(examen.fecha)} dias
                    </Badge>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Preparacion</span>
                    <span className="font-semibold">{examen.preparacion}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${examen.preparacion}%`,
                        background: estiloCurso.gradiente,
                        boxShadow: `0 0 18px ${estiloCurso.shadow}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card
          className="border-none shadow-lg"
          style={{ background: `linear-gradient(135deg, ${estiloCursoPrincipal.fondoClaro} 0%, #f8fafc 100%)` }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: estiloCursoPrincipal.color }} />
              Recomendaciones de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RecommendationCard color={estiloCursoPrincipal} text={`Hoy deberias repasar ${cursoExamenPrincipal?.nombre ?? "tu curso prioritario"} durante 1 hora.`} />
            <RecommendationCard
              color={estiloCursoPrincipal}
              text={
                tareasPendientes[0]
                  ? `Te conviene avanzar "${tareasPendientes[0].titulo}" antes de ${formatearFechaCorta(tareasPendientes[0].fechaEntrega)}.`
                  : "Tu lista de pendientes esta controlada. Manten el ritmo."
              }
            />
            <RecommendationCard
              color={estiloCursoPrincipal}
              text={
                siguienteBloque
                  ? `Tu siguiente bloque sugerido es ${cursoSiguienteBloque?.nombre ?? siguienteBloque.titulo} a las ${siguienteBloque.horaInicio}:00.`
                  : "Genera un horario inteligente para distribuir mejor tu estudio de la semana."
              }
            />
            <RecommendationCard
              color={estiloCursoPrincipal}
              text={
                tareasUrgentes > 0
                  ? `Tienes ${tareasUrgentes} tarea${tareasUrgentes === 1 ? "" : "s"} urgente${tareasUrgentes === 1 ? "" : "s"}: cierra primero lo mas cercano para bajar carga mental.`
                  : examenesConBajaPreparacion > 0
                    ? `Hay ${examenesConBajaPreparacion} examen${examenesConBajaPreparacion === 1 ? "" : "es"} con preparacion menor a 60%. Conviene reforzarlos con bloques cortos esta semana.`
                    : "Tu semana esta equilibrada. Mantener bloques pequenos de cierre diario te ayudara a sostener el progreso."
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecommendationCard({
  text,
  color,
}: {
  text: string;
  color: ReturnType<typeof obtenerEstiloCurso>;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/80 p-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: color.fondoSuave, color: color.color }}
      >
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="text-sm text-gray-700">{text}</p>
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

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  tone: "blue" | "orange" | "purple" | "green";
}) {
  const tones = {
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
  };

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="mb-1 text-3xl font-bold">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </CardContent>
    </Card>
  );
}
