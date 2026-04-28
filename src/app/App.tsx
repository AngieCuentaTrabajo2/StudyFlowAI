import { useEffect } from "react";
import { RouterProvider } from "react-router";
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

  return <RouterProvider router={router} />;
}
