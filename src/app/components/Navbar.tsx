import { Link } from "react-router";
import { GraduationCap } from "lucide-react";
import { Button } from "./ui/button";

export default function Navbar() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="truncate bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-lg font-semibold text-transparent sm:text-xl">
            StudyFlow AI
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#inicio" className="text-gray-600 transition-colors hover:text-gray-900">
            Inicio
          </a>
          <a href="#caracteristicas" className="text-gray-600 transition-colors hover:text-gray-900">
            Caracteristicas
          </a>
          <a href="#beneficios" className="text-gray-600 transition-colors hover:text-gray-900">
            Beneficios
          </a>
          <a href="#precios" className="text-gray-600 transition-colors hover:text-gray-900">
            Precios
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link to="/login">
            <Button variant="ghost" className="px-3 text-sm sm:px-4">
              <span className="hidden sm:inline">Iniciar sesion</span>
              <span className="sm:hidden">Entrar</span>
            </Button>
          </Link>
          <Link to="/register">
            <Button className="px-3 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 sm:px-4">
              <span className="hidden sm:inline">Empieza gratis</span>
              <span className="sm:hidden">Gratis</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
