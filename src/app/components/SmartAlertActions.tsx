import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, CalendarPlus2, Clock3, type LucideIcon } from "lucide-react";
import { type AlertaInteligente, useStudyFlow } from "../data/studyflow-store";
import { Button } from "./ui/button";

type SmartAlertActionsProps = {
  alerta: AlertaInteligente;
  compact?: boolean;
  onAfterNavigate?: () => void;
};

type AccionRapida = {
  id: string;
  label: string;
  Icono: LucideIcon;
  onClick: () => void;
};

export default function SmartAlertActions({
  alerta,
  compact = false,
  onAfterNavigate,
}: SmartAlertActionsProps) {
  const navigate = useNavigate();
  const { agendarRepasoCurso, agendarTareaEnCalendario, posponerTarea } = useStudyFlow();
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const acciones: AccionRapida[] = [];

  if (alerta.tipo === "tarea" && alerta.tareaId) {
    acciones.push({
      id: "calendarizar-tarea",
      label: compact ? "Calendario" : "Agregar al calendario",
      Icono: CalendarPlus2,
      onClick: () => {
        const resultado = agendarTareaEnCalendario(alerta.tareaId!, alerta.nivel === "critica" ? 2 : 1);
        setFeedback({ tipo: resultado.ok ? "ok" : "error", texto: resultado.mensaje });
      },
    });
    acciones.push({
      id: "posponer-tarea",
      label: compact ? "Posponer" : "Posponer 1 dia",
      Icono: Clock3,
      onClick: () => {
        const resultado = posponerTarea(alerta.tareaId!, 1);
        setFeedback({ tipo: resultado.ok ? "ok" : "error", texto: resultado.mensaje });
      },
    });
  }

  if (alerta.tipo === "examen" && alerta.cursoId) {
    acciones.push({
      id: "repaso-examen",
      label: compact ? "Repaso" : "Agregar repaso",
      Icono: CalendarPlus2,
      onClick: () => {
        const resultado = agendarRepasoCurso(alerta.cursoId!, alerta.nivel === "critica" ? 2 : 1);
        setFeedback({ tipo: resultado.ok ? "ok" : "error", texto: resultado.mensaje });
      },
    });
  }

  acciones.push({
    id: "abrir-detalle",
    label: compact ? "Abrir" : "Abrir detalle",
    Icono: ArrowRight,
    onClick: () => {
      onAfterNavigate?.();
      navigate(alerta.destino);
    },
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {acciones.map((accion) => (
          <Button
            key={accion.id}
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full bg-white"
            onClick={accion.onClick}
          >
            <accion.Icono className="mr-2 h-4 w-4" />
            {accion.label}
          </Button>
        ))}
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-3 py-2 text-xs leading-5 ${
            feedback.tipo === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {feedback.texto}
        </div>
      ) : null}
    </div>
  );
}
