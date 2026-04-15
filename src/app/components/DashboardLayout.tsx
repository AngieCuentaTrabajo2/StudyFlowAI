import { Navigate, Outlet } from "react-router";
import { useStudyFlow } from "../data/studyflow-store";
import DashboardHeader from "./DashboardHeader";
import MobileBottomNav from "./MobileBottomNav";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { usuarioActual, requiereCompletarPerfilAcademico } = useStudyFlow();

  if (!usuarioActual) {
    return <Navigate to="/login" replace />;
  }

  if (requiereCompletarPerfilAcademico) {
    return <Navigate to="/complete-profile" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="lg:ml-64">
        <DashboardHeader />
        <main className="p-4 pb-28 pt-24 lg:p-8 lg:pb-8 lg:pt-24">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
