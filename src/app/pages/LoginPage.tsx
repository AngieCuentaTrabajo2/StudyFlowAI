import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { GraduationCap, Lock, Mail } from "lucide-react";
import { useStudyFlow } from "../data/studyflow-store";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { iniciarSesion } = useStudyFlow();
  const [email, setEmail] = useState("jhan.perez@universidad.edu");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const planSeleccionado = searchParams.get("plan");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setCargando(true);
    let success = false;

    try {
      success = await iniciarSesion(email, password);
    } finally {
      setCargando(false);
    }

    if (!success) {
      setError("No pudimos iniciar sesion. Verifica tus datos o crea una cuenta.");
      return;
    }

    navigate("/app");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-semibold text-transparent">
              StudyFlow AI
            </span>
          </Link>

          <h1 className="mb-2 text-3xl font-bold">Bienvenido de nuevo</h1>
          <p className="mb-8 text-gray-600">Inicia sesion para continuar con tus estudios.</p>

          {planSeleccionado === "premium" && (
            <div className="mb-6 rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              Tu plan seleccionado fue <strong>Premium</strong>. Inicia sesion para continuar sin pasarela de pago en esta demo.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="email">Correo electronico</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@universidad.edu"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Contrasena</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              Cuenta demo lista: <strong>jhan.perez@universidad.edu</strong> / <strong>123456</strong>
            </div>

            <Button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {cargando ? "Ingresando..." : "Iniciar sesion"}
            </Button>

            <Button type="button" variant="outline" className="w-full">
              Continuar con Google
            </Button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            No tienes una cuenta?{" "}
            <Link to="/register" className="font-semibold text-blue-600 hover:underline">
              Registrate gratis
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-900 p-12 lg:flex lg:items-center lg:justify-center">
        <div className="max-w-lg text-white">
          <h2 className="mb-6 text-4xl font-bold">Tu centro de control academico</h2>
          <p className="mb-8 text-xl text-white/80">
            Organiza cursos, tareas, examenes y estudio en una experiencia clara, moderna y lista para crecer con IA.
          </p>

          <div className="grid gap-4">
            {[
              "Planificacion diaria con prioridades automaticas",
              "Calendario inteligente con bloques de estudio",
              "Seguimiento de avance y recordatorios relevantes",
            ].map((item) => (
              <Card key={item} className="border-white/10 bg-white/10 text-white backdrop-blur">
                <CardContent className="p-5">{item}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
