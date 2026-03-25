import { Link } from "react-router";
import { GraduationCap } from "lucide-react";
import { useStudyFlow } from "../data/studyflow-store";
import { Button } from "./ui/button";

export default function Navbar() {
  const { usuarioActual } = useStudyFlow();
  const destinoPrincipal = usuarioActual ? "/app" : "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to={destinoPrincipal} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-semibold text-transparent">
            StudyFlow AI
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#inicio" className="text-gray-600 transition-colors hover:text-gray-900">
            Inicio
          </a>
          <a href="#caracteristicas" className="text-gray-600 transition-colors hover:text-gray-900">
            Características
          </a>
          <a href="#beneficios" className="text-gray-600 transition-colors hover:text-gray-900">
            Beneficios
          </a>
          <a href="#precios" className="text-gray-600 transition-colors hover:text-gray-900">
            Precios
          </a>
        </div>

        <div className="flex items-center gap-3">
          {usuarioActual ? (
            <Link to="/app" replace>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Ir al panel
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Iniciar sesión</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Empieza gratis
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
