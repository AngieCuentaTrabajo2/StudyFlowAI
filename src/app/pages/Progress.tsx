import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, CheckCircle, Clock, Target, TrendingUp } from "lucide-react";
import { esTareaActiva, obtenerPorcentajeCumplimiento, useStudyFlow } from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const etiquetasDias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function ProgressPage() {
  const { tareas, cursos, examenes, usuarioActual, bloquesPlanificador } = useStudyFlow();

  const tareasCompletadas = tareas.filter((tarea) => tarea.estado === "completed").length;
  const tareasActivas = tareas.filter(esTareaActiva).length;
  const porcentajeCumplimiento = obtenerPorcentajeCumplimiento(tareas);
  const totalHoras = bloquesPlanificador
    .filter((bloque) => bloque.tipo === "study")
    .reduce((acumulado, bloque) => acumulado + bloque.duracion, 0);
  const examenesPreparados = examenes.filter((examen) => examen.preparacion >= 70).length;

  const diasConActividad = new Set<number>();
  bloquesPlanificador
    .filter((bloque) => bloque.tipo === "study")
    .forEach((bloque) => diasConActividad.add(bloque.dia));
  tareas
    .filter((tarea) => tarea.estado === "completed")
    .forEach((tarea) => {
      const indice = (new Date(tarea.fechaEntrega).getDay() + 6) % 7;
      diasConActividad.add(indice);
    });

  const rachaEstimada = calcularRachaSemanal(diasConActividad);

  const progresoCursos = cursos.map((curso) => {
    const tareasCurso = tareas.filter((tarea) => tarea.cursoId === curso.id);
    const completadasCurso = tareasCurso.filter((tarea) => tarea.estado === "completed").length;
    const horasCurso = bloquesPlanificador
      .filter((bloque) => bloque.tipo === "study" && bloque.cursoId === curso.id)
      .reduce((acumulado, bloque) => acumulado + bloque.duracion, 0);
    const examenesCurso = examenes.filter((examen) => examen.cursoId === curso.id);
    const promedioExamenes = examenesCurso.length
      ? Math.round(
          examenesCurso.reduce((acumulado, examen) => acumulado + examen.preparacion, 0) /
            examenesCurso.length,
        )
      : 0;

    return {
      curso: curso.nombre,
      progreso: tareasCurso.length ? Math.round((completadasCurso / tareasCurso.length) * 100) : 0,
      activas: tareasCurso.filter(esTareaActiva).length,
      horas: Number(horasCurso.toFixed(1)),
      examenes: promedioExamenes,
      color: curso.color,
    };
  });

  const horasSemana = etiquetasDias.map((dia, indice) => ({
    week: dia,
    hours: Number(
      bloquesPlanificador
        .filter((bloque) => bloque.tipo === "study" && bloque.dia === indice)
        .reduce((acumulado, bloque) => acumulado + bloque.duracion, 0)
        .toFixed(1),
    ),
  }));

  const datosTareas = [
    { name: "Completadas", value: tareasCompletadas, color: "#16a34a" },
    { name: "Activas", value: tareasActivas, color: "#f59e0b" },
  ];

  const cursoMasDificil = [...progresoCursos].sort((a, b) => a.progreso - b.progreso)[0];
  const cursoMasFuerte = [...progresoCursos].sort((a, b) => b.progreso - a.progreso)[0];
  const cumplimientoHorario = usuarioActual?.horasEstudioDiarias
    ? Math.min(100, Math.round((totalHoras / (usuarioActual.horasEstudioDiarias * 7)) * 100))
    : porcentajeCumplimiento;
  const horasPromedioDiarias = Number((totalHoras / 7).toFixed(1));
  const cursosConMayorCarga = [...progresoCursos]
    .sort((a, b) => b.horas - a.horas || a.progreso - b.progreso)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Progreso y analíticas</h1>
        <p className="text-gray-600">
          Lee tu rendimiento con datos reales de tus tareas, exámenes y bloques de estudio.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={CheckCircle} value={`${porcentajeCumplimiento}%`} label="Porcentaje de cumplimiento" tone="green" />
        <MetricCard icon={Clock} value={`${totalHoras.toFixed(1)}h`} label="Total de horas planificadas" tone="blue" />
        <MetricCard icon={Target} value={`${rachaEstimada} días`} label="Racha estimada de estudio" tone="purple" />
        <MetricCard icon={Award} value={`${examenesPreparados}/${examenes.length}`} label="Exámenes preparados" tone="orange" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Horas estudiadas por semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={horasSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="hours" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Tareas completadas vs pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={datosTareas} dataKey="value" innerRadius={60} outerRadius={90}>
                  {datosTareas.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Avance académico por curso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {progresoCursos.map((curso) => (
            <div key={curso.curso}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: obtenerColorCurso(curso.color).color }}
                  />
                  <span className="font-medium">{curso.curso}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={obtenerColorCurso(curso.color).badge}
                  >
                    {curso.progreso}%
                  </Badge>
                  <span className="text-xs text-gray-500">{curso.activas} activas</span>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${curso.progreso}%`,
                    background: obtenerColorCurso(curso.color).bar,
                    boxShadow: `0 0 18px ${obtenerColorCurso(curso.color).shadow}`,
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>{curso.horas}h de estudio en la semana</span>
                <span>Preparación media de exámenes: {curso.examenes}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-none bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Resumen de productividad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>Tu cumplimiento actual del horario va en {cumplimientoHorario}% según los bloques de estudio creados.</p>
            <p>Estás sosteniendo un promedio de {horasPromedioDiarias}h diarias de estudio planificado.</p>
            <p>El curso con mayor avance es {cursoMasFuerte?.curso ?? "tu curso principal"}.</p>
            <p>El curso que más apoyo necesita ahora es {cursoMasDificil?.curso ?? "tu curso con menor progreso"}.</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-green-50 to-blue-50 shadow-lg">
          <CardHeader>
            <CardTitle>Recomendaciones de mejora hechas por IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>
              Refuerza {cursoMasDificil?.curso ?? "el curso con menor avance"} con un bloque adicional de 90 minutos esta semana.
            </p>
            <p>
              Tus cursos con mayor carga ahora son {cursosConMayorCarga.map((curso) => curso.curso).join(", ") || "los cursos activos"}.
            </p>
            <p>Mantén tu racha actual y procura no dejar tareas largas para el último día.</p>
            <p>Si quieres subir tu cumplimiento, agrega un bloque corto de cierre diario para revisar pendientes y próximos exámenes.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function calcularRachaSemanal(diasConActividad: Set<number>) {
  const hoy = (new Date().getDay() + 6) % 7;
  let racha = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const dia = (hoy - offset + 7) % 7;
    if (!diasConActividad.has(dia)) {
      break;
    }
    racha += 1;
  }

  return Math.max(1, racha);
}

function obtenerColorCurso(color: string) {
  const colores: Record<string, { bar: string; shadow: string; badge: string; color: string }> = {
    blue: {
      bar: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
      shadow: "rgba(37, 99, 235, 0.35)",
      badge: "bg-blue-100 text-blue-700",
      color: "#2563eb",
    },
    purple: {
      bar: "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)",
      shadow: "rgba(124, 58, 237, 0.35)",
      badge: "bg-purple-100 text-purple-700",
      color: "#7c3aed",
    },
    green: {
      bar: "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)",
      shadow: "rgba(22, 163, 74, 0.35)",
      badge: "bg-emerald-100 text-emerald-700",
      color: "#16a34a",
    },
    orange: {
      bar: "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)",
      shadow: "rgba(234, 88, 12, 0.35)",
      badge: "bg-orange-100 text-orange-700",
      color: "#ea580c",
    },
    red: {
      bar: "linear-gradient(90deg, #dc2626 0%, #f87171 100%)",
      shadow: "rgba(220, 38, 38, 0.35)",
      badge: "bg-red-100 text-red-700",
      color: "#dc2626",
    },
    teal: {
      bar: "linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)",
      shadow: "rgba(15, 118, 110, 0.35)",
      badge: "bg-teal-100 text-teal-700",
      color: "#0f766e",
    },
  };

  return colores[color] ?? colores.blue;
}

function MetricCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  tone: "green" | "blue" | "purple" | "orange";
}) {
  const tonos = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="p-6">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tonos[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </CardContent>
    </Card>
  );
}
