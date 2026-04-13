import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { GraduationCap, School } from "lucide-react";
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

function limpiarCampoInicial(valor: string) {
  return valor.trim().toLowerCase() === "por definir" ? "" : valor;
}

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const {
    usuarioActual,
    requiereCompletarPerfilAcademico,
    completarPerfilAcademico,
    cerrarSesion,
  } = useStudyFlow();
  const [formData, setFormData] = useState({
    university: limpiarCampoInicial(usuarioActual?.universidad ?? ""),
    career: limpiarCampoInicial(usuarioActual?.carrera ?? ""),
    semester: limpiarCampoInicial(usuarioActual?.semestre ?? ""),
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData({
      university: limpiarCampoInicial(usuarioActual?.universidad ?? ""),
      career: limpiarCampoInicial(usuarioActual?.carrera ?? ""),
      semester: limpiarCampoInicial(usuarioActual?.semestre ?? ""),
    });
  }, [usuarioActual]);

  if (!usuarioActual) {
    return <Navigate to="/login" replace />;
  }

  if (!requiereCompletarPerfilAcademico) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setCargando(true);

    let success = false;
    try {
      success = await completarPerfilAcademico(formData);
    } finally {
      setCargando(false);
    }

    if (!success) {
      setError("No pudimos guardar tus datos academicos. Intenta otra vez en un momento.");
      return;
    }

    navigate("/app");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-semibold text-transparent">
              StudyFlow AI
            </span>
          </div>

          <h1 className="mb-2 text-3xl font-bold">Completa tu perfil academico</h1>
          <p className="mb-3 text-gray-600">
            Tu cuenta de Google ya quedo conectada. Solo nos faltan estos datos para personalizar tu panel.
          </p>
          <p className="mb-8 text-sm text-gray-500">{usuarioActual.correo}</p>
          <p className="mb-6 text-xs text-gray-400">
            Si el backend esta despertando en Render, este paso puede tardar cerca de 1 minuto.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {cargando ? "Guardando tu perfil..." : "Guardar y continuar"}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full text-gray-600"
            onClick={() => {
              cerrarSesion();
              navigate("/login");
            }}
          >
            Usar otra cuenta
          </Button>
        </div>
      </div>

      <div className="hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-900 p-12 text-white lg:flex lg:items-center lg:justify-center">
        <div className="max-w-lg">
          <h2 className="mb-6 text-4xl font-bold">Un panel mejor empieza con un perfil completo</h2>
          <div className="grid gap-4">
            {[
              "Cursos y recomendaciones adaptadas a tu ciclo",
              "Sugerencias mas utiles segun tu contexto academico",
              "Un espacio listo para organizar tu semestre desde el primer dia",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white/12 p-5 backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
