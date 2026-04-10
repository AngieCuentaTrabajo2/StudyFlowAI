import { Link } from "react-router";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BrainCircuit,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { ImageWithFallback } from "../components/shared/ImageWithFallback";

const planes = [
  {
    nombre: "Gratis",
    subtitulo: "Para empezar con orden y sin complicarte",
    precio: "S/ 0",
    caracteristicas: [
      "Hasta 5 cursos",
      "Tareas y examenes en un solo lugar",
      "Tokens del agente limitados",
      "Recordatorios esenciales",
    ],
    destino: "/register?plan=gratis",
    cta: "Empezar gratis",
    destacado: false,
  },
  {
    nombre: "Premium",
    subtitulo: "Para estudiantes que quieren apoyo real de IA",
    precio: "S/ 9.99",
    caracteristicas: [
      "Todo en Gratis",
      "Tokens del agente ilimitados",
      "Planificador inteligente",
      "Asistente IA para organizar y resolver dudas",
      "Resumenes y prioridades automaticas",
    ],
    destino: "/register?plan=premium",
    cta: "Elegir premium",
    destacado: true,
  },
];

const agendaHero = [
  {
    hora: "08:00",
    titulo: "Repaso de parcial",
    curso: "Base de Datos",
    tono: "bg-cyan-400",
  },
  {
    hora: "16:30",
    titulo: "Resolver entrega",
    curso: "Algoritmos",
    tono: "bg-violet-400",
  },
  {
    hora: "20:00",
    titulo: "Bloque con IA",
    curso: "Resumen de lectura",
    tono: "bg-emerald-400",
  },
];

const metricasHero = [
  {
    icono: BookOpen,
    titulo: "Cursos",
    valor: "5",
    detalle: "sincronizados",
  },
  {
    icono: CheckCircle2,
    titulo: "Tareas",
    valor: "12",
    detalle: "priorizadas",
  },
  {
    icono: Clock3,
    titulo: "Horas",
    valor: "14h",
    detalle: "esta semana",
  },
];

const progresoHero = [
  {
    etiqueta: "Tareas completadas",
    porcentaje: 82,
    gradiente: "from-cyan-400 to-blue-500",
  },
  {
    etiqueta: "Preparacion de examenes",
    porcentaje: 68,
    gradiente: "from-violet-400 to-fuchsia-500",
  },
  {
    etiqueta: "Rutina semanal",
    porcentaje: 74,
    gradiente: "from-emerald-400 to-teal-500",
  },
];

const accesosHero = [
  { icono: BookOpen, etiqueta: "Cursos", activo: true },
  { icono: Calendar, etiqueta: "Agenda", activo: false },
  { icono: Bell, etiqueta: "Alertas", activo: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section id="inicio" className="overflow-hidden px-4 pb-14 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-blue-50 px-4 py-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="truncate text-sm font-medium text-blue-600">Asistente academico con IA</span>
            </div>
            <h1 className="mb-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Organiza tus estudios con{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                inteligencia artificial
              </span>
            </h1>
            <p className="mb-8 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-xl">
              StudyFlow AI ayuda a estudiantes universitarios a gestionar cursos, tareas,
              examenes, horarios y habitos de estudio de manera inteligente y personalizada.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link to="/register?plan=gratis">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 text-base hover:from-blue-700 hover:to-purple-700 sm:w-auto sm:px-8 sm:text-lg"
                >
                  Empieza gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full px-6 text-base sm:w-auto sm:px-8 sm:text-lg">
                  Ver demo
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative order-first lg:order-none">
            <div className="absolute inset-0 rounded-[2.25rem] bg-gradient-to-br from-blue-200 via-cyan-100 to-purple-200 opacity-50 blur-3xl" />
            <div className="absolute -left-6 top-12 h-24 w-24 rounded-full bg-cyan-300/50 blur-3xl sm:h-32 sm:w-32" />
            <div className="absolute -bottom-8 right-6 h-28 w-28 rounded-full bg-violet-300/50 blur-3xl sm:h-36 sm:w-36" />

            <div className="relative mx-auto max-w-[760px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-950 p-3 shadow-[0_25px_80px_-35px_rgba(30,41,59,0.7)] sm:p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.2),_transparent_34%)]" />
              <div className="relative">
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="hidden flex-1 items-center justify-center md:flex">
                    <div className="max-w-xs truncate rounded-full border border-white/10 bg-slate-900/70 px-4 py-1 text-xs text-slate-300">
                      studyflow.ai/dashboard
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                    IA activa
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[180px,1fr]">
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="mb-6 flex items-center gap-3">
                      <img
                        src="/branding/favicon.png"
                        alt="StudyFlow AI"
                        className="h-11 w-11 rounded-2xl ring-1 ring-white/10"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">StudyFlow AI</p>
                        <p className="text-xs text-slate-400">Panel web academico</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {accesosHero.map((item) => (
                        <div
                          key={item.etiqueta}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${
                            item.activo
                              ? "bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white"
                              : "text-slate-300"
                          }`}
                        >
                          <item.icono className="h-4 w-4" />
                          <span>{item.etiqueta}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estado</p>
                      <p className="mt-2 text-sm font-semibold text-white">Semana en control</p>
                      <p className="mt-1 text-xs text-slate-400">5 cursos sincronizados y tareas priorizadas.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {metricasHero.map((item) => (
                        <div
                          key={item.titulo}
                          className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur"
                        >
                          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                            <item.icono className="h-5 w-5" />
                          </div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.titulo}</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{item.valor}</p>
                          <p className="text-xs text-slate-300">{item.detalle}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1.1fr,0.9fr]">
                      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Plan del dia</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">Tu semana ya tiene foco</h3>
                          </div>
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white">
                            <BrainCircuit className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          {agendaHero.map((item) => (
                            <div
                              key={item.titulo}
                              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3"
                            >
                              <div className={`h-10 w-2 rounded-full ${item.tono}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white">{item.titulo}</p>
                                <p className="text-xs text-slate-400">{item.curso}</p>
                              </div>
                              <span className="text-xs font-medium text-slate-300">{item.hora}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-[1.75rem] bg-white p-4 shadow-xl shadow-slate-950/20 sm:p-5">
                          <div className="mb-3 flex items-center gap-2 text-slate-900">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                            <h4 className="font-semibold">Asistente IA</h4>
                          </div>
                          <p className="text-sm leading-relaxed text-slate-600">
                            Cierra Algoritmos antes de las 6:00 pm y deja un bloque corto para repasar tu parcial.
                          </p>
                          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recomendacion clave</p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              Reprograma 1 bloque y recupera 2 horas libres el viernes.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5">
                          <div className="mb-4 flex items-center gap-2 text-white">
                            <TrendingUp className="h-5 w-5 text-emerald-300" />
                            <h4 className="font-semibold">Progreso semanal</h4>
                          </div>
                          <div className="space-y-4">
                            {progresoHero.map((item) => (
                              <div key={item.etiqueta}>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                  <span className="text-slate-200">{item.etiqueta}</span>
                                  <span className="font-medium text-white">{item.porcentaje}%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${item.gradiente}`}
                                    style={{ width: `${item.porcentaje}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 left-4 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg lg:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Vista web pensada para escritorio</p>
                <p className="text-xs text-slate-500">Cursos, agenda, IA y progreso en un mismo panel</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-gray-50 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Todo lo que necesitas para triunfar academicamente</h2>
            <p className="text-base text-gray-600 sm:text-xl">
              Herramientas inteligentes disenadas para estudiantes universitarios
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icono: CheckCircle,
                color: "bg-blue-100 text-blue-600",
                titulo: "Organiza tareas automaticamente",
                texto: "La IA prioriza tus pendientes segun urgencia y complejidad",
              },
              {
                icono: Calendar,
                color: "bg-purple-100 text-purple-600",
                titulo: "Crea horarios inteligentes",
                texto: "Genera planes de estudio personalizados segun tu disponibilidad",
              },
              {
                icono: Bell,
                color: "bg-green-100 text-green-600",
                titulo: "Recibe recordatorios personalizados",
                texto: "Notificaciones inteligentes para que nunca olvides una entrega",
              },
              {
                icono: Sparkles,
                color: "bg-orange-100 text-orange-600",
                titulo: "Obten apoyo academico con IA",
                texto: "Asistente disponible para resolver dudas y organizar tu estudio",
              },
            ].map((item) => (
              <Card key={item.titulo} className="border-none shadow-lg transition-shadow hover:shadow-xl">
                <CardContent className="p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icono className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{item.titulo}</h3>
                  <p className="text-gray-600">{item.texto}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Como funciona</h2>
            <p className="text-base text-gray-600 sm:text-xl">Tres pasos simples para transformar tu vida academica</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              ["1", "Registra tus cursos", "Agrega tus materias, horarios y actividades academicas en minutos"],
              ["2", "La IA organiza todo", "El asistente crea automaticamente horarios, prioridades y recordatorios"],
              ["3", "Alcanza tus metas", "Sigue tu plan personalizado y mejora tu rendimiento academico"],
            ].map(([numero, titulo, texto]) => (
              <div key={numero} className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600">
                  <span className="text-2xl font-bold text-white">{numero}</span>
                </div>
                <h3 className="mb-3 text-xl font-semibold">{titulo}</h3>
                <p className="text-gray-600">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Lo que dicen nuestros usuarios</h2>
            <p className="text-base text-gray-600 sm:text-xl">
              Miles de estudiantes ya mejoraron su rendimiento academico
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                nombre: "Maria Garcia",
                carrera: "Ingenieria Industrial",
                texto:
                  "StudyFlow AI cambio mi forma de estudiar. Ahora puedo organizar todas mis tareas sin estres y mi rendimiento mejoro notablemente.",
                imagen:
                  "https://images.unsplash.com/photo-1608453162650-cba45689c284?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudCUyMHdvbWFuJTIwaGFwcHl8ZW58MXx8fHwxNzc0NDQ5NTMwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
              },
              {
                nombre: "Carlos Mendoza",
                carrera: "Medicina",
                texto:
                  "El planificador inteligente es increible. Me ayuda a distribuir mi tiempo de estudio de manera eficiente.",
                imagen:
                  "https://images.unsplash.com/photo-1772971919691-598c37fe4b81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudCUyMG1hbiUyMGZvY3VzZWR8ZW58MXx8fHwxNzc0NDQ5NTMwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
              },
              {
                nombre: "Ana Lopez",
                carrera: "Derecho",
                texto:
                  "Nunca habia sido tan organizada. El asistente IA me recuerda todo y me ayuda a priorizar.",
                imagen:
                  "https://images.unsplash.com/photo-1763890869725-83a0af1d0b8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbGFwdG9wJTIwc3R1ZHlpbmclMjBtb2Rlcm58ZW58MXx8fHwxNzc0NDQ5NTMwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
              },
            ].map((testimonio) => (
              <Card key={testimonio.nombre} className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="mb-6 text-gray-700">"{testimonio.texto}"</p>
                  <div className="flex items-center gap-3">
                    <ImageWithFallback
                      src={testimonio.imagen}
                      alt={testimonio.nombre}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{testimonio.nombre}</p>
                      <p className="text-sm text-gray-600">{testimonio.carrera}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Planes simples para estudiantes</h2>
            <p className="text-base text-gray-600 sm:text-xl">
              Dos opciones claras para empezar y crecer sin pagar de mas
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 md:gap-8">
            {planes.map((plan) => (
              <Card
                key={plan.nombre}
                className={`border-2 transition-shadow hover:shadow-xl ${
                  plan.destacado ? "relative border-blue-600 shadow-xl" : ""
                }`}
              >
                {plan.destacado && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-sm font-semibold text-white">
                      Mas popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6 sm:p-8">
                  <h3 className="mb-2 text-2xl font-bold">{plan.nombre}</h3>
                  <p className="mb-6 text-gray-600">{plan.subtitulo}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.precio}</span>
                    <span className="text-gray-600">/mes</span>
                  </div>
                  <ul className="mb-8 space-y-3">
                    {plan.caracteristicas.map((caracteristica) => (
                      <li key={caracteristica} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span>{caracteristica}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.destino}>
                    <Button
                      variant={plan.destacado ? "default" : "outline"}
                      className={`w-full ${
                        plan.destacado
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          : ""
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-blue-600 to-purple-600 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl text-center text-white">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">Listo para transformar tu vida academica?</h2>
          <p className="mb-8 text-base opacity-90 sm:text-xl">
            Unete a miles de estudiantes que ya estan alcanzando sus metas con StudyFlow AI
          </p>
          <Link to="/register?plan=gratis">
            <Button size="lg" className="w-full bg-white px-6 text-base text-blue-600 hover:bg-gray-100 sm:w-auto sm:px-8 sm:text-lg">
              Empieza gratis ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 px-4 py-12 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            {[
              ["Producto", ["Caracteristicas", "Precios", "Casos de uso"]],
              ["Compania", ["Sobre nosotros", "Blog", "Carreras"]],
              ["Recursos", ["Centro de ayuda", "Guias", "Comunidad"]],
              ["Legal", ["Privacidad", "Terminos", "Seguridad"]],
            ].map(([titulo, items]) => (
              <div key={titulo}>
                <h3 className="mb-4 font-semibold">{titulo}</h3>
                <ul className="space-y-2 text-gray-400">
                  {(items as string[]).map((item) => (
                    <li key={item}>
                      <a href="#" className="transition-colors hover:text-white">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2026 StudyFlow AI. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
