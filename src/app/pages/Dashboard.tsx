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
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  esTareaActiva,
  esTareaPendienteVigente,
  esTareaAtrasada,
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

const etiquetasDias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const indiceHoy = (new Date().getDay() + 6) % 7;

export default function Dashboard() {
  const { usuarioActual, cursos, examenes, tareas, bloquesPlanificador, alternarTareaCompletada } =
    useStudyFlow();

  const tareasActivas = tareas.filter(esTareaActiva);
  const tareasPendientesVigentes = tareas.filter(esTareaPendienteVigente);
  const tareasAtrasadas = tareas.filter(esTareaAtrasada);
  const examenesProximos = [...examenes].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 3);
  const tareasPrioritarias = [...tareasActivas]
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))
    .slice(0, 4);
  const tareaRecomendada = [...tareasPendientesVigentes, ...tareasAtrasadas]
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))[0];

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
  const tareasUrgentes = tareasActivas.filter((tarea) => tarea.prioridad === "high").length;
  const examenesConBajaPreparacion = examenes.filter((examen) => examen.preparacion < 60).length;
  const cursoExamenPrincipal = cursos.find((curso) => curso.id === examenesProximos[0]?.cursoId);
  const siguienteBloque = bloquesPlanificador
    .filter((bloque) => bloque.tipo === "study")
    .sort((a, b) => a.dia - b.dia || a.horaInicio - b.horaInicio)[0];
  const cursoSiguienteBloque = cursos.find((curso) => curso.id === siguienteBloque?.cursoId);
  const estiloCursoPrincipal = obtenerEstiloCurso(cursoExamenPrincipal?.color ?? "blue");
  const radarRiesgoCursos = cursos
    .map((curso) => construirRadarRiesgoCurso(curso, tareas, examenes, bloquesPlanificador))
    .sort((a, b) => b.puntaje - a.puntaje || a.curso.nombre.localeCompare(b.curso.nombre));
  const cursosEnRiesgo = radarRiesgoCursos.filter((curso) => curso.puntaje >= 45);
  const cursoMasComprometido = radarRiesgoCursos[0];
  const resumenRiesgo =
    cursosEnRiesgo.length > 0
      ? `${cursosEnRiesgo.length} curso${cursosEnRiesgo.length === 1 ? "" : "s"} necesitan atencion prioritaria.`
      : "Tu carga académica se ve estable por ahora.";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold leading-tight sm:text-3xl">
          Hola, {usuarioActual?.nombres}. Este es tu plan académico de hoy.
        </h1>
        <p className="max-w-2xl text-sm text-gray-600 sm:text-base">
          Tus cursos, tareas, exámenes y bloques de estudio ya alimentan el panel en tiempo real.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckSquare} value={`${tareasActivas.length}`} label="Tareas activas" tone="blue" />
        <StatCard icon={ClipboardList} value={`${examenesProximos.length}`} label="Exámenes próximos" tone="orange" />
        <StatCard icon={Clock} value={`${horasSugeridas}h`} label="Horas de estudio sugeridas" tone="purple" />
        <StatCard icon={TrendingUp} value={`${progresoSemanal}%`} label="Avance semanal" tone="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Radar de riesgo académico
                </CardTitle>
                <p className="mt-2 text-sm text-gray-600">
                  El semáforo combina tareas vencidas, exámenes cercanos, preparación y bloques reales del planner.
                </p>
              </div>
              <Badge className={cursosEnRiesgo.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}>
                {resumenRiesgo}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {radarRiesgoCursos.map((item) => {
              const estiloCurso = obtenerEstiloCurso(item.curso.color);
              return (
                <div
                  key={item.curso.id}
                  className="rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ borderColor: estiloCurso.borde, background: estiloCurso.fondoClaro }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: estiloCurso.color }}>
                        {item.nivelLabel}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.curso.nombre}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.resumen}</p>
                    </div>
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg"
                      style={{ background: item.indicador }}
                    >
                      {item.puntaje}
                    </div>
                  </div>

                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.puntaje}%`, background: item.indicador }}
                    />
                  </div>

                  <div className="space-y-2">
                    {item.claves.map((clave) => (
                      <div key={clave} className="rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-700">
                        {clave}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Siguiente paso:</span> {item.accion}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Foco recomendado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Curso más comprometido</p>
              <h3 className="mt-3 text-2xl font-semibold">{cursoMasComprometido?.curso.nombre ?? "Todo bajo control"}</h3>
              <p className="mt-2 text-sm text-white/75">
                {cursoMasComprometido?.resumen ?? "No hay alertas fuertes ahora mismo. Buen momento para sostener el ritmo."}
              </p>
              <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                {cursoMasComprometido ? `${cursoMasComprometido.puntaje}/100 de riesgo` : "Sin riesgo alto"}
              </div>
            </div>

            <div className="space-y-3">
              {radarRiesgoCursos.slice(0, 3).map((item, indice) => (
                <div key={item.curso.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prioridad {indice + 1}</p>
                      <h4 className="font-semibold text-slate-900">{item.curso.nombre}</h4>
                    </div>
                    <Badge className={item.badgeClass}>{item.nivelLabel}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.accion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              Próximos exámenes
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
                      {obtenerDiasRestantes(examen.fecha)} días
                    </Badge>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Preparación</span>
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
            <RecommendationCard color={estiloCursoPrincipal} text={`Hoy deberías repasar ${cursoExamenPrincipal?.nombre ?? "tu curso prioritario"} durante 1 hora.`} />
            <RecommendationCard
              color={estiloCursoPrincipal}
              text={
                tareaRecomendada
                  ? obtenerEstadoVisualTarea(tareaRecomendada) === "overdue"
                    ? `Tienes atrasada "${tareaRecomendada.titulo}". Conviene retomarla hoy mismo.`
                    : `Te conviene avanzar "${tareaRecomendada.titulo}" antes de ${formatearFechaCorta(tareaRecomendada.fechaEntrega)}.`
                  : "Tu lista de pendientes está controlada. Mantén el ritmo."
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
                  ? `Tienes ${tareasUrgentes} tarea${tareasUrgentes === 1 ? "" : "s"} urgente${tareasUrgentes === 1 ? "" : "s"}: cierra primero lo más cercano para bajar carga mental.`
                  : examenesConBajaPreparacion > 0
                    ? `Hay ${examenesConBajaPreparacion} examen${examenesConBajaPreparacion === 1 ? "" : "es"} con preparación menor a 60%. Conviene reforzarlos con bloques cortos esta semana.`
                    : "Tu semana está equilibrada. Mantener bloques pequeños de cierre diario te ayudará a sostener el progreso."
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

function construirRadarRiesgoCurso(
  curso: { id: string; nombre: string; color: string },
  tareas: ReturnType<typeof useStudyFlow>["tareas"],
  examenes: ReturnType<typeof useStudyFlow>["examenes"],
  bloquesPlanificador: ReturnType<typeof useStudyFlow>["bloquesPlanificador"],
) {
  const tareasCurso = tareas.filter((tarea) => tarea.cursoId === curso.id);
  const tareasActivasCurso = tareasCurso.filter(esTareaActiva);
  const tareasAtrasadasCurso = tareasCurso.filter(esTareaAtrasada);
  const tareasVigentesCurso = tareasCurso.filter(esTareaPendienteVigente);
  const examenesCurso = examenes.filter((examen) => examen.cursoId === curso.id);
  const examenMasCercano = [...examenesCurso].sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const diasExamen = examenMasCercano ? obtenerDiasRestantes(examenMasCercano.fecha) : null;
  const bloquesEstudioCurso = bloquesPlanificador.filter(
    (bloque) => bloque.tipo === "study" && bloque.cursoId === curso.id,
  );
  const horasEstudioCurso = bloquesEstudioCurso.reduce((acumulado, bloque) => acumulado + bloque.duracion, 0);
  const tareasUrgentesCurso = tareasActivasCurso.filter((tarea) => tarea.prioridad === "high").length;
  const promedioPreparacion = examenesCurso.length
    ? Math.round(examenesCurso.reduce((acumulado, examen) => acumulado + examen.preparacion, 0) / examenesCurso.length)
    : 100;

  let puntaje = 0;
  const claves: string[] = [];

  if (tareasAtrasadasCurso.length > 0) {
    puntaje += 40;
    claves.push(`${tareasAtrasadasCurso.length} tarea${tareasAtrasadasCurso.length === 1 ? "" : "s"} atrasada${tareasAtrasadasCurso.length === 1 ? "" : "s"}`);
  }

  if (tareasUrgentesCurso > 0) {
    puntaje += 18;
    claves.push(`${tareasUrgentesCurso} tarea${tareasUrgentesCurso === 1 ? "" : "s"} urgente${tareasUrgentesCurso === 1 ? "" : "s"}`);
  }

  if (diasExamen !== null && diasExamen <= 3 && promedioPreparacion < 65) {
    puntaje += 34;
    claves.push(`Examen cerca con ${promedioPreparacion}% de preparación`);
  } else if (diasExamen !== null && diasExamen <= 7 && promedioPreparacion < 75) {
    puntaje += 18;
    claves.push(`Preparación todavía baja para el próximo examen`);
  }

  if (tareasVigentesCurso.length > 0 && horasEstudioCurso === 0) {
    puntaje += 14;
    claves.push("Sin bloques de estudio reservados");
  }

  if (horasEstudioCurso > 0 && horasEstudioCurso < 2 && tareasActivasCurso.length >= 2) {
    puntaje += 10;
    claves.push("Pocas horas de estudio para la carga actual");
  }

  if (claves.length === 0) {
    claves.push("Carga estable y bien distribuida");
  }

  puntaje = Math.min(100, puntaje);

  const nivel = puntaje >= 70 ? "critico" : puntaje >= 45 ? "alto" : puntaje >= 20 ? "medio" : "bajo";
  const nivelLabel =
    nivel === "critico" ? "Critico" : nivel === "alto" ? "Alerta alta" : nivel === "medio" ? "En seguimiento" : "Estable";
  const badgeClass =
    nivel === "critico"
      ? "bg-red-50 text-red-600"
      : nivel === "alto"
        ? "bg-orange-50 text-orange-700"
        : nivel === "medio"
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700";
  const indicador =
    nivel === "critico"
      ? "linear-gradient(135deg, #dc2626 0%, #fb7185 100%)"
      : nivel === "alto"
        ? "linear-gradient(135deg, #ea580c 0%, #fb923c 100%)"
        : nivel === "medio"
          ? "linear-gradient(135deg, #d97706 0%, #facc15 100%)"
          : "linear-gradient(135deg, #16a34a 0%, #4ade80 100%)";

  const resumen =
    nivel === "critico"
      ? "Necesita intervención inmediata para bajar carga y evitar atrasos."
      : nivel === "alto"
        ? "Conviene actuar esta semana antes de que suba la presión."
        : nivel === "medio"
          ? "Va bien, pero pide seguimiento para no enfriarse."
          : "Se ve estable y con margen para sostener el ritmo.";

  const accion =
    tareasAtrasadasCurso.length > 0
      ? "Cierra primero la tarea más atrasada y luego reserva un bloque corto de repaso."
      : diasExamen !== null && diasExamen <= 7 && promedioPreparacion < 75
        ? "Prioriza repaso para el examen más cercano y sube la preparación esta semana."
        : horasEstudioCurso === 0
          ? "Agrega al menos un bloque de estudio en el planner para no dejar este curso sin espacio."
          : "Mantén un bloque de continuidad para que el avance no se enfríe.";

  return {
    curso,
    puntaje,
    nivel,
    nivelLabel,
    badgeClass,
    indicador,
    resumen,
    accion,
    claves: claves.slice(0, 2),
  };
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
