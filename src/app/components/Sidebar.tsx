import { Link, useLocation } from "react-router";
import {
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useStudyFlow } from "../data/studyflow-store";

const menuItems = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard },
  { path: "/app/courses", label: "Mis cursos", icon: BookOpen },
  { path: "/app/tasks", label: "Tareas", icon: CheckSquare },
  { path: "/app/exams", label: "Examenes", icon: ClipboardList },
  { path: "/app/planner", label: "Planificador", icon: Calendar },
  { path: "/app/assistant", label: "Asistente IA", icon: Sparkles },
  { path: "/app/progress", label: "Progreso", icon: TrendingUp },
  { path: "/app/notifications", label: "Notificaciones", icon: Bell },
  { path: "/app/settings", label: "Configuracion", icon: Settings },
];

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const location = useLocation();
  const { usuarioActual, notificaciones } = useStudyFlow();
  const cantidadNoLeidas = notificaciones.filter((item) => item.noLeida).length;

  return (
    <aside
      className={
        mobile ? "w-full bg-white" : "fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white"
      }
    >
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-lg font-semibold text-transparent">
            StudyFlow AI
          </span>
        </Link>
      </div>

      <nav className="space-y-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
              {item.path === "/app/notifications" && cantidadNoLeidas > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {cantidadNoLeidas}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 px-6 pb-6">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4 text-white">
          <p className="text-sm text-white/70">Sesion activa</p>
          <p className="mt-1 font-semibold">
            {usuarioActual ? `${usuarioActual.nombres} ${usuarioActual.apellidos}` : "Invitado"}
          </p>
          <p className="text-sm text-white/70">{usuarioActual?.carrera ?? "Completa tu perfil"}</p>
        </div>
      </div>
    </aside>
  );
}
