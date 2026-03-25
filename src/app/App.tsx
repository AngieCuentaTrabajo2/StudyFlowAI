import { RouterProvider } from "react-router";
import { GraduationCap } from "lucide-react";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} fallbackElement={<PantallaCarga />} />;
}

function PantallaCarga() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">StudyFlow AI</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cargando tu espacio academico y preparando el siguiente modulo.
        </p>
      </div>
    </div>
  );
}
