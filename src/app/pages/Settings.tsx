import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Lock,
  Mail,
  Moon,
  Save,
  School,
  Sparkles,
  User,
} from "lucide-react";
import { useStudyFlow, type PerfilUsuario } from "../data/studyflow-store";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import WeeklyAvailabilityEditor from "../components/WeeklyAvailabilityEditor";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";

export default function Settings() {
  const {
    usuarioActual,
    actualizarPerfil,
    permisoNotificacionesNavegador,
    solicitarPermisoNotificacionesNavegador,
  } = useStudyFlow();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(usuarioActual);
  const [estadoGuardado, setEstadoGuardado] = useState<"idle" | "saved">("idle");
  const [mensajePermisoNavegador, setMensajePermisoNavegador] = useState("");

  useEffect(() => {
    setPerfil(usuarioActual);
  }, [usuarioActual]);

  const resumenPlan = useMemo(() => {
    if (!perfil) return null;

    const contenido = {
      gratis: {
        etiqueta: "Plan Gratis",
        descripcion: "Ideal para organizar cursos y tareas con uso limitado del agente.",
        estilo: "bg-slate-100 text-slate-700",
      },
      estudiante: {
        etiqueta: "Plan Premium",
        descripcion: "Incluye planificador inteligente y uso ilimitado del agente para estudiar.",
        estilo: "bg-blue-100 text-blue-700",
      },
      premium: {
        etiqueta: "Plan Premium",
        descripcion: "Incluye planificador inteligente y uso ilimitado del agente para estudiar.",
        estilo: "bg-purple-100 text-purple-700",
      },
    };

    return contenido[perfil.plan];
  }, [perfil]);

  if (!perfil) return null;

  const guardarCambios = () => {
    actualizarPerfil(perfil);
    setEstadoGuardado("saved");
    window.setTimeout(() => setEstadoGuardado("idle"), 2500);
  };

  const resumenPermisoNavegador = {
    granted: {
      etiqueta: "Activadas",
      descripcion: "StudyFlow puede mostrar avisos del navegador mientras tengas la app abierta.",
      estilo: "bg-emerald-50 text-emerald-700",
    },
    denied: {
      etiqueta: "Bloqueadas",
      descripcion: "El navegador las bloqueó. Puedes habilitarlas otra vez desde el candado o ajustes del sitio.",
      estilo: "bg-rose-50 text-rose-700",
    },
    default: {
      etiqueta: "Pendientes",
      descripcion: "Todavía no nos diste permiso. Puedes activarlas para ver alertas reales de tareas y exámenes.",
      estilo: "bg-amber-50 text-amber-700",
    },
    unsupported: {
      etiqueta: "No disponible",
      descripcion: "Este navegador no permite notificaciones del sistema para la app.",
      estilo: "bg-slate-100 text-slate-700",
    },
  }[permisoNotificacionesNavegador];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Configuración y perfil</h1>
          <p className="text-gray-600">
            Ajusta tus datos, preferencias de estudio y el comportamiento del sistema desde un solo lugar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {estadoGuardado === "saved" ? (
            <Badge className="bg-green-50 px-3 py-2 text-green-700">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Cambios guardados
            </Badge>
          ) : null}
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={guardarCambios}
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="h-28 w-28">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-3xl text-white">
                {perfil.nombres[0]}
                {perfil.apellidos[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold">
                {perfil.nombres} {perfil.apellidos}
              </p>
              <p className="text-sm text-gray-600">{perfil.carrera}</p>
              <p className="mt-1 text-xs text-gray-500">{perfil.universidad}</p>
            </div>
            <div className="w-full rounded-2xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Plan activo</span>
                <Badge className={resumenPlan?.estilo}>{resumenPlan?.etiqueta}</Badge>
              </div>
              <p className="text-sm text-gray-600">{resumenPlan?.descripcion}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información personal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nombres</Label>
              <Input
                value={perfil.nombres}
                onChange={(event) => setPerfil({ ...perfil, nombres: event.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Apellidos</Label>
              <Input
                value={perfil.apellidos}
                onChange={(event) => setPerfil({ ...perfil, apellidos: event.target.value })}
                className="mt-2"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Correo</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  value={perfil.correo}
                  onChange={(event) => setPerfil({ ...perfil, correo: event.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Información académica
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Universidad</Label>
            <Input
              value={perfil.universidad}
              onChange={(event) => setPerfil({ ...perfil, universidad: event.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Carrera</Label>
            <Input
              value={perfil.carrera}
              onChange={(event) => setPerfil({ ...perfil, carrera: event.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Ciclo</Label>
            <Select value={perfil.semestre} onValueChange={(semestre) => setPerfil({ ...perfil, semestre })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, index) => (
                  <SelectItem key={index + 1} value={`${index + 1}`}>
                    {index + 1} ciclo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Horas disponibles</Label>
            <Select
              value={perfil.horasDisponibles}
              onValueChange={(horasDisponibles) => setPerfil({ ...perfil, horasDisponibles })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2-4">2-4 horas</SelectItem>
                <SelectItem value="4-6">4-6 horas</SelectItem>
                <SelectItem value="6-8">6-8 horas</SelectItem>
                <SelectItem value="8+">8+ horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Método de estudio</Label>
            <Select
              value={perfil.metodoEstudio}
              onValueChange={(metodoEstudio) => setPerfil({ ...perfil, metodoEstudio })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pomodoro">Pomodoro</SelectItem>
                <SelectItem value="bloques-profundos">Bloques profundos</SelectItem>
                <SelectItem value="repaso-espaciado">Repaso espaciado</SelectItem>
                <SelectItem value="mixto">Mixto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tono del asistente</Label>
            <Select
              value={perfil.tonoAsistente}
              onValueChange={(tonoAsistente: PerfilUsuario["tonoAsistente"]) =>
                setPerfil({ ...perfil, tonoAsistente })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amigable">Amigable</SelectItem>
                <SelectItem value="responsable">Responsable</SelectItem>
                <SelectItem value="frio">Frío</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Metas académicas</Label>
            <Textarea
              value={perfil.metas}
              onChange={(event) => setPerfil({ ...perfil, metas: event.target.value })}
              className="mt-2 min-h-28"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Rutina de estudio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label>Horas de estudio sugeridas por día</Label>
                <span className="text-sm font-semibold text-blue-600">{perfil.horasEstudioDiarias}h</span>
              </div>
              <Slider
                value={[perfil.horasEstudioDiarias]}
                min={1}
                max={10}
                step={1}
                onValueChange={([horasEstudioDiarias]) =>
                  setPerfil({ ...perfil, horasEstudioDiarias: horasEstudioDiarias ?? perfil.horasEstudioDiarias })
                }
              />
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label>Horas de sueño</Label>
                <span className="text-sm font-semibold text-purple-600">{perfil.horasSueno}h</span>
              </div>
              <Slider
                value={[perfil.horasSueno]}
                min={4}
                max={10}
                step={1}
                onValueChange={([horasSueno]) =>
                  setPerfil({ ...perfil, horasSueno: horasSueno ?? perfil.horasSueno })
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <MiniDato
                icon={CalendarClock}
                titulo="Carga semanal"
                valor={`${perfil.horasEstudioDiarias * 7}h`}
                descripcion="Según tu objetivo diario"
              />
              <MiniDato
                icon={Sparkles}
                titulo="Enfoque preferido"
                valor={formatearMetodo(perfil.metodoEstudio)}
                descripcion="Guía tus recomendaciones de estudio"
              />
              <MiniDato
                icon={User}
                titulo="Estilo del asistente"
                valor={formatearTonoAsistente(perfil.tonoAsistente)}
                descripcion="Define el tono de tus respuestas"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones activadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilaToggle
              label="Recordatorios de tareas"
              descripcion="Avisos sobre entregas y pendientes cercanos."
              checked={perfil.notificaciones.tareas}
              onCheckedChange={(value) =>
                setPerfil({ ...perfil, notificaciones: { ...perfil.notificaciones, tareas: value } })
              }
            />
            <FilaToggle
              label="Alertas de exámenes"
              descripcion="Notificaciones de evaluaciones próximas."
              checked={perfil.notificaciones.examenes}
              onCheckedChange={(value) =>
                setPerfil({ ...perfil, notificaciones: { ...perfil.notificaciones, examenes: value } })
              }
            />
            <FilaToggle
              label="Recomendaciones IA"
              descripcion="Consejos adaptados a tu carga académica."
              checked={perfil.notificaciones.ia}
              onCheckedChange={(value) =>
                setPerfil({ ...perfil, notificaciones: { ...perfil.notificaciones, ia: value } })
              }
            />
            <FilaToggle
              label="Resumen semanal"
              descripcion="Balance de cumplimiento y prioridades."
              checked={perfil.notificaciones.semanal}
              onCheckedChange={(value) =>
                setPerfil({ ...perfil, notificaciones: { ...perfil.notificaciones, semanal: value } })
              }
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Notificaciones del navegador</span>
                    <Badge className={resumenPermisoNavegador.estilo}>{resumenPermisoNavegador.etiqueta}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{resumenPermisoNavegador.descripcion}</p>
                </div>

                <Button
                  variant="outline"
                  className="sm:shrink-0"
                  disabled={
                    permisoNotificacionesNavegador === "granted" ||
                    permisoNotificacionesNavegador === "unsupported"
                  }
                  onClick={async () => {
                    const permiso = await solicitarPermisoNotificacionesNavegador();
                    setMensajePermisoNavegador(
                      permiso === "granted"
                        ? "Listo, ya puedes recibir avisos reales del navegador."
                        : permiso === "denied"
                          ? "El navegador bloqueó el permiso. Si quieres activarlo, revisa los ajustes del sitio."
                          : permiso === "unsupported"
                            ? "Este navegador no soporta notificaciones del sistema para la app."
                            : "Permiso pendiente. Cuando quieras, podemos volver a intentarlo.",
                    );
                  }}
                >
                  {permisoNotificacionesNavegador === "granted"
                    ? "Ya activadas"
                    : permisoNotificacionesNavegador === "denied"
                      ? "Revisar navegador"
                      : "Activar avisos"}
                </Button>
              </div>

              {mensajePermisoNavegador ? (
                <p className="mt-3 text-sm text-slate-600">{mensajePermisoNavegador}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Disponibilidad semanal para planificar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyAvailabilityEditor
            disponibilidad={perfil.disponibilidadSemanal}
            onChange={(disponibilidadSemanal) => setPerfil({ ...perfil, disponibilidadSemanal })}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Aplicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilaToggle
              label="Modo claro / oscuro"
              descripcion="Preferencia visual de la interfaz."
              checked={perfil.aplicacion.modoOscuro}
              onCheckedChange={(value) =>
                setPerfil({ ...perfil, aplicacion: { ...perfil.aplicacion, modoOscuro: value } })
              }
            />
            <FilaToggle
              label="Integración con calendario"
              descripcion="Sincroniza tus horarios y recordatorios en un solo lugar."
              checked={perfil.aplicacion.googleCalendar}
              onCheckedChange={(value) =>
                setPerfil({ ...perfil, aplicacion: { ...perfil.aplicacion, googleCalendar: value } })
              }
            />
            <FilaToggle
              label="Sugerencias automáticas"
              descripcion="Recibe recomendaciones y ajustes según tu ritmo académico."
              checked={perfil.aplicacion.sugerenciasAutomaticas}
              onCheckedChange={(value) =>
                setPerfil({
                  ...perfil,
                  aplicacion: { ...perfil.aplicacion, sugerenciasAutomaticas: value },
                })
              }
            />
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              Aquí puedes actualizar tus datos de acceso y mantener tu cuenta al día.
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input type="password" placeholder="Contraseña actual" />
              <Input type="password" placeholder="Nueva contraseña" />
              <Input type="password" placeholder="Confirmar contraseña" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatearMetodo(metodo: string) {
  const etiquetas: Record<string, string> = {
    pomodoro: "Pomodoro",
    "bloques-profundos": "Bloques profundos",
    "repaso-espaciado": "Repaso espaciado",
    mixto: "Mixto",
  };

  return etiquetas[metodo] ?? metodo;
}

function formatearTonoAsistente(tono: PerfilUsuario["tonoAsistente"]) {
  const etiquetas: Record<PerfilUsuario["tonoAsistente"], string> = {
    amigable: "Amigable",
    responsable: "Responsable",
    frio: "Frío",
  };

  return etiquetas[tono] ?? tono;
}

function MiniDato({
  icon: Icon,
  titulo,
  valor,
  descripcion,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  valor: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm text-gray-500">{titulo}</div>
      <div className="text-lg font-semibold">{valor}</div>
      <div className="text-xs text-gray-500">{descripcion}</div>
    </div>
  );
}

function FilaToggle({
  label,
  descripcion,
  checked,
  onCheckedChange,
}: {
  label: string;
  descripcion: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 p-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-gray-500">{descripcion}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
