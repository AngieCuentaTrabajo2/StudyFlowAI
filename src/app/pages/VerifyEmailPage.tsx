import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { useStudyFlow } from "../data/studyflow-store";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

type EstadoVerificacion = "verificando" | "ok" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verificarCorreo } = useStudyFlow();
  const [estado, setEstado] = useState<EstadoVerificacion>("verificando");
  const yaIntentoVerificar = useRef(false);

  useEffect(() => {
    if (yaIntentoVerificar.current) return;
    yaIntentoVerificar.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setEstado("error");
      return;
    }

    let activo = true;
    verificarCorreo(token).then((ok) => {
      if (!activo) return;
      setEstado(ok ? "ok" : "error");
    });

    return () => {
      activo = false;
    };
  }, [searchParams, verificarCorreo]);

  const verificado = estado === "ok";
  const Icono = estado === "verificando" ? MailCheck : verificado ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Icono className={`h-8 w-8 ${verificado ? "text-emerald-600" : "text-blue-600"}`} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {estado === "verificando"
              ? "Verificando tu correo"
              : verificado
                ? "Correo verificado"
                : "No pudimos verificarlo"}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {estado === "verificando"
              ? "Estamos confirmando tu enlace de verificación."
              : verificado
                ? "Tu correo ya puede recibir notificaciones importantes de StudyFlow AI."
                : "El enlace no es válido o ya expiró. Puedes pedir uno nuevo desde configuración."}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {verificado ? (
              <Button onClick={() => navigate("/app/settings")}>Ir a configuración</Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/login">Volver al inicio de sesión</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
