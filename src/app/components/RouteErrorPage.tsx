import { AlertTriangle, GraduationCap, RotateCw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Button } from "./ui/button";

function obtenerMensajeError(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return "No encontramos esa pagina dentro de StudyFlow AI.";
    }

    return "Ocurrio un problema al abrir esta vista.";
  }

  const mensaje = error instanceof Error ? error.message : String(error);

  if (
    mensaje.includes("Failed to fetch dynamically imported module") ||
    mensaje.includes("Importing a module script failed") ||
    mensaje.includes("error loading dynamically imported module")
  ) {
    return "Se publico una nueva version de la app y esta vista quedo desactualizada. Recarga para continuar.";
  }

  return "No pudimos cargar esta pantalla. Puedes recargar o volver al inicio.";
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const mensaje = obtenerMensajeError(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-semibold">No se pudo abrir esta vista</h1>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">{mensaje}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Recargar pagina
          </Button>

          <Button type="button" variant="outline" asChild>
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
