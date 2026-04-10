import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import RouteErrorPage from "./components/RouteErrorPage";

const CLAVE_RECARGA_CHUNK = "studyflow-ai-chunk-reload";

function esErrorDeChunkDinamico(error: unknown) {
  const mensaje = error instanceof Error ? error.message : String(error);

  return [
    "Failed to fetch dynamically imported module",
    "Importing a module script failed",
    "error loading dynamically imported module",
  ].some((patron) => mensaje.includes(patron));
}

async function cargarRutaDiferida(
  importarRuta: () => Promise<{ default: ComponentType }>,
) {
  try {
    const modulo = await importarRuta();

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(CLAVE_RECARGA_CHUNK);
    }

    return { Component: modulo.default };
  } catch (error) {
    if (typeof window !== "undefined" && esErrorDeChunkDinamico(error)) {
      const yaRecargo = window.sessionStorage.getItem(CLAVE_RECARGA_CHUNK) === "1";

      if (!yaRecargo) {
        window.sessionStorage.setItem(CLAVE_RECARGA_CHUNK, "1");
        window.location.reload();
        return new Promise<never>(() => {});
      }

      window.sessionStorage.removeItem(CLAVE_RECARGA_CHUNK);
    }

    throw error;
  }
}

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: () => cargarRutaDiferida(() => import("./pages/LandingPage")),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/login",
    lazy: () => cargarRutaDiferida(() => import("./pages/LoginPage")),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/register",
    lazy: () => cargarRutaDiferida(() => import("./pages/RegisterPage")),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/app",
    lazy: () => cargarRutaDiferida(() => import("./components/DashboardLayout")),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: () => cargarRutaDiferida(() => import("./pages/Dashboard")),
      },
      {
        path: "courses",
        lazy: () => cargarRutaDiferida(() => import("./pages/Courses")),
      },
      {
        path: "courses/:courseId",
        lazy: () => cargarRutaDiferida(() => import("./pages/CourseDetail")),
      },
      {
        path: "tasks",
        lazy: () => cargarRutaDiferida(() => import("./pages/Tasks")),
      },
      {
        path: "exams",
        lazy: () => cargarRutaDiferida(() => import("./pages/Exams")),
      },
      {
        path: "planner",
        lazy: () => cargarRutaDiferida(() => import("./pages/Planner")),
      },
      {
        path: "assistant",
        lazy: () => cargarRutaDiferida(() => import("./pages/AIAssistant")),
      },
      {
        path: "progress",
        lazy: () => cargarRutaDiferida(() => import("./pages/Progress")),
      },
      {
        path: "notifications",
        lazy: () => cargarRutaDiferida(() => import("./pages/Notifications")),
      },
      {
        path: "settings",
        lazy: () => cargarRutaDiferida(() => import("./pages/Settings")),
      },
    ],
  },
]);
