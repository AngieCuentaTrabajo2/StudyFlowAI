import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { GraduationCap } from "lucide-react";
import { router } from "./routes";
import { useStudyFlow } from "./data/studyflow-store";

export default function App() {
  const { usuarioActual } = useStudyFlow();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const modoOscuro = Boolean(usuarioActual?.aplicacion.modoOscuro);
    document.documentElement.classList.toggle("dark", modoOscuro);
    document.documentElement.style.colorScheme = modoOscuro ? "dark" : "light";
  }, [usuarioActual?.aplicacion.modoOscuro]);

  return <RouterProvider router={router} fallbackElement={<PantallaCarga />} />;
}

function PantallaCarga() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">StudyFlow AI</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Cargando tu espacio académico y preparando el siguiente módulo.
        </p>
      </div>
    </div>
  );
}
