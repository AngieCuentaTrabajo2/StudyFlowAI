import { Link } from "react-router";
import Navbar from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const planes = [
  {
    nombre: "Gratis",
    subtitulo: "Para empezar a organizarte",
    precio: "S/ 0",
    caracteristicas: ["Hasta 3 cursos", "Tareas ilimitadas", "Recordatorios basicos"],
    destino: "/register?plan=gratis",
    cta: "Empezar gratis",
    destacado: false,
  },
  {
    nombre: "Estudiante",
    subtitulo: "Para estudiantes activos",
    precio: "S/ 29",
    caracteristicas: [
      "Cursos ilimitados",
      "Planificador inteligente",
      "Asistente IA completo",
      "Analiticas avanzadas",
    ],
    destino: "/register?plan=estudiante",
    cta: "Crear cuenta ahora",
    destacado: true,
  },
  {
    nombre: "Premium",
    subtitulo: "Para maximo rendimiento",
    precio: "S/ 49",
    caracteristicas: [
      "Todo en Estudiante",
      "Sesiones de estudio guiadas",
      "Generacion de resumenes",
      "Soporte prioritario",
    ],
    destino: "/login?plan=premium",
    cta: "Ya tengo cuenta",
    destacado: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section id="inicio" className="px-6 pb-20 pt-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Asistente academico con IA</span>
            </div>
            <h1 className="mb-6 text-5xl font-bold leading-tight lg:text-6xl">
              Organiza tus estudios con{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                inteligencia artificial
              </span>
            </h1>
            <p className="mb-8 text-xl leading-relaxed text-gray-600">
              StudyFlow AI ayuda a estudiantes universitarios a gestionar cursos, tareas,
              examenes, horarios y habitos de estudio de manera inteligente y personalizada.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register?plan=gratis">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 text-lg hover:from-blue-700 hover:to-purple-700"
                >
                  Empieza gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="px-8 text-lg">
                  Ver demo
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-200 to-purple-200 opacity-20 blur-3xl" />
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1758411898021-ef0dadaaa295?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwZGFzaGJvYXJkJTIwaW50ZXJmYWNlJTIwbW9kZXJufGVufDF8fHx8MTc3NDQ0OTUzMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Dashboard StudyFlow AI"
              className="relative rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section id="beneficios" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Todo lo que necesitas para triunfar academicamente</h2>
            <p className="text-xl text-gray-600">
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

      <section id="caracteristicas" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Como funciona</h2>
            <p className="text-xl text-gray-600">Tres pasos simples para transformar tu vida academica</p>
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

      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Lo que dicen nuestros usuarios</h2>
            <p className="text-xl text-gray-600">
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

      <section id="precios" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Planes para cada estudiante</h2>
            <p className="text-xl text-gray-600">Elige el plan que mejor se adapte a ti</p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
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
                <CardContent className="p-8">
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

      <section className="bg-gradient-to-br from-blue-600 to-purple-600 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center text-white">
          <h2 className="mb-6 text-4xl font-bold">Listo para transformar tu vida academica?</h2>
          <p className="mb-8 text-xl opacity-90">
            Unete a miles de estudiantes que ya estan alcanzando sus metas con StudyFlow AI
          </p>
          <Link to="/register?plan=gratis">
            <Button size="lg" className="bg-white px-8 text-lg text-blue-600 hover:bg-gray-100">
              Empieza gratis ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 px-6 py-12 text-white">
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
