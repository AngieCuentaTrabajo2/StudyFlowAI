import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { GraduationCap, Lock, Mail } from "lucide-react";
import { useStudyFlow } from "../data/studyflow-store";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
    }) => void;
    renderButton: (
      element: HTMLElement,
      options: {
        theme?: "outline" | "filled_blue" | "filled_black";
        size?: "large" | "medium" | "small";
        shape?: "pill" | "rectangular" | "square" | "circle";
        text?: "signin_with" | "signup_with" | "continue_with" | "signin";
        width?: number;
      },
    ) => void;
  };
};

type GoogleWindow = Window & {
  google?: {
    accounts: GoogleAccounts;
  };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { iniciarSesion, iniciarSesionConGoogle } = useStudyFlow();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const planSeleccionado = searchParams.get("plan");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_GOOGLE_CLIENT_ID;

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
      setError("No pudimos iniciar sesión. Verifica tus datos o crea una cuenta.");
      return;
    }

    navigate("/app");
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let activo = true;

    const renderizarBoton = () => {
      if (!activo || !googleButtonRef.current) return;
      const google = (window as GoogleWindow).google;
      if (!google?.accounts?.id) return;

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (!credential) {
            setError("Google no devolvió credenciales válidas.");
            return;
          }

          setError("");
          setCargandoGoogle(true);
          let resultado: Awaited<ReturnType<typeof iniciarSesionConGoogle>> = "error";

          try {
            resultado = await iniciarSesionConGoogle(credential);
          } finally {
            setCargandoGoogle(false);
          }

          if (resultado === "error") {
            setError("No pudimos iniciar sesión con Google. Intenta otra vez en un momento.");
            return;
          }

          navigate(resultado === "completar-perfil" ? "/complete-profile" : "/app");
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleButtonRef.current.innerHTML = "";
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 360,
      });
    };

    const scriptId = "google-identity-services";
    const scriptExistente = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (scriptExistente) {
      if ((window as GoogleWindow).google) {
        renderizarBoton();
      } else {
        scriptExistente.addEventListener("load", renderizarBoton, { once: true });
      }
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderizarBoton, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      activo = false;
    };
  }, [googleClientId, iniciarSesionConGoogle, navigate]);

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
          <p className="mb-8 text-gray-600">Inicia sesión para continuar con tus estudios.</p>

          {planSeleccionado === "premium" && (
            <div className="mb-6 rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              Tu plan seleccionado fue <strong>Premium</strong>. Inicia sesión para continuar sin pasarela de pago en esta demo.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
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
              <Label htmlFor="password">Contraseña</Label>
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

            <Button
              type="submit"
              disabled={cargando || cargandoGoogle}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {cargando ? "Ingresando..." : "Iniciar sesión"}
            </Button>

            {googleClientId ? (
              <div className="space-y-2">
                <div ref={googleButtonRef} className="flex justify-center" />
                {cargandoGoogle ? (
                  <p className="text-center text-sm text-gray-500">Validando cuenta de Google...</p>
                ) : null}
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" disabled>
                Configura VITE_GOOGLE_CLIENT_ID para usar Google
              </Button>
            )}
          </form>

          <p className="mt-8 text-center text-gray-600">
            No tienes una cuenta?{" "}
            <Link to="/register" className="font-semibold text-blue-600 hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-900 p-12 lg:flex lg:items-center lg:justify-center">
        <div className="max-w-lg text-white">
          <h2 className="mb-6 text-4xl font-bold">Tu centro de control académico</h2>
          <p className="mb-8 text-xl text-white/80">
            Organiza cursos, tareas, exámenes y estudio en una experiencia clara, moderna y lista para crecer con IA.
          </p>

          <div className="grid gap-4">
            {[
              "Planificación diaria con prioridades automáticas",
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
