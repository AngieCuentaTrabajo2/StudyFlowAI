import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { GraduationCap, Lock, Mail, School, User } from "lucide-react";
import { useStudyFlow } from "../data/studyflow-store";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { registrarUsuario } = useStudyFlow();
  const planInicial = (() => {
    const plan = searchParams.get("plan");
    return plan === "estudiante" || plan === "premium" ? plan : "gratis";
  })();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    university: "",
    career: "",
    semester: "",
    plan: planInicial as "gratis" | "estudiante" | "premium",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setCargando(true);

    const success = await registrarUsuario(formData);
    setCargando(false);

    if (!success) {
      setError("No pudimos crear la cuenta. Revisa si ese correo ya esta registrado o intenta de nuevo.");
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

          <h1 className="mb-2 text-3xl font-bold">Crea tu cuenta</h1>
          <p className="mb-8 text-gray-600">Empieza a organizar tu semestre desde hoy.</p>

          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">Plan seleccionado</p>
            <p className="mt-1 text-lg font-semibold capitalize text-blue-900">{formData.plan}</p>
            <p className="mt-1 text-sm text-blue-700">
              No te cobraremos nada ahora. Primero crea tu cuenta y entra al sistema.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <Label htmlFor="name">Nombres</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="name"
                  className="pl-10"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  placeholder="Jhan Perez"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Correo electronico</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  placeholder="tu@universidad.edu"
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
                  className="pl-10"
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  placeholder="Minimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="university">Universidad</Label>
              <div className="relative mt-2">
                <School className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="university"
                  className="pl-10"
                  value={formData.university}
                  onChange={(event) => setFormData({ ...formData, university: event.target.value })}
                  placeholder="Universidad Nacional"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="career">Carrera</Label>
              <Input
                id="career"
                value={formData.career}
                onChange={(event) => setFormData({ ...formData, career: event.target.value })}
                placeholder="Ingenieria de Sistemas"
                required
              />
            </div>

            <div>
              <Label>Ciclo o semestre</Label>
              <Select
                value={formData.semester}
                onValueChange={(semester) => setFormData({ ...formData, semester })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona tu ciclo" />
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

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {cargando ? "Creando cuenta..." : "Crear cuenta y continuar"}
            </Button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            Ya tienes una cuenta?{" "}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white lg:flex lg:items-center lg:justify-center">
        <div className="max-w-lg">
          <h2 className="mb-6 text-4xl font-bold">Convierte el caos del semestre en un plan claro</h2>
          <div className="grid gap-4">
            {[
              "Dashboard con prioridades del dia",
              "Cursos conectados con tareas y examenes",
              "Planificador automatico listo para IA",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white/15 p-5 backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
