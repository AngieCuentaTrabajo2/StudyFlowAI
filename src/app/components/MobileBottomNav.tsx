import { useMemo } from "react";
import { Link, useLocation } from "react-router";
import {
  Bell,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import { obtenerAlertasInteligentes, useStudyFlow } from "../data/studyflow-store";

const items = [
  { path: "/app", label: "Inicio", icon: LayoutDashboard },
  { path: "/app/tasks", label: "Tareas", icon: CheckSquare },
  { path: "/app/planner", label: "Plan", icon: Calendar },
  { path: "/app/assistant", label: "IA", icon: Sparkles },
  { path: "/app/settings", label: "Perfil", icon: Settings },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { notificaciones, cursos, tareas, examenes, bloquesPlanificador } = useStudyFlow();
  const cantidadNoLeidas = notificaciones.filter((item) => item.noLeida).length;
  const alertasInteligentes = useMemo(
    () => obtenerAlertasInteligentes(cursos, tareas, examenes, bloquesPlanificador),
    [bloquesPlanificador, cursos, examenes, tareas],
  );
  const totalNotificacionesVisibles = Math.max(cantidadNoLeidas, alertasInteligentes.length);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[max(env(safe-area-inset-bottom),0px)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/app" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-3 text-[11px] transition sm:px-2 sm:text-xs ${
                isActive ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                {item.path === "/app/settings" && totalNotificacionesVisibles > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {totalNotificacionesVisibles}
                  </span>
                ) : null}
              </div>
              <span className={isActive ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {totalNotificacionesVisibles > 0 ? (
        <Link
          to="/app/notifications"
          className="flex items-center justify-center gap-2 border-t border-gray-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700"
        >
          <Bell className="h-4 w-4" />
          {totalNotificacionesVisibles} notificacion
          {totalNotificacionesVisibles === 1 ? "" : "es"} importante
          {totalNotificacionesVisibles === 1 ? "" : "s"}
        </Link>
      ) : null}
    </nav>
  );
}
