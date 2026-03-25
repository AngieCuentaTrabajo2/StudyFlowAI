import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { StudyFlowProvider } from "./app/data/studyflow-store";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StudyFlowProvider>
    <App />
  </StudyFlowProvider>,
);
