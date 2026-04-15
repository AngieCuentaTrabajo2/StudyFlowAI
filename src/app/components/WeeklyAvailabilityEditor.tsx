import { CalendarRange, Moon, Sun, Sunset } from "lucide-react";
import { type DisponibilidadDia, obtenerEtiquetaDiaPlanificador } from "../data/studyflow-store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const franjas = [
  {
    clave: "manana" as const,
    etiqueta: "Mañana",
    detalle: "7:00 - 11:59",
    Icono: Sun,
    tonos: {
      activa: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
      inactiva: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    },
  },
  {
    clave: "tarde" as const,
    etiqueta: "Tarde",
    detalle: "12:00 - 17:59",
    Icono: Sunset,
    tonos: {
      activa: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
      inactiva: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    },
  },
  {
    clave: "noche" as const,
    etiqueta: "Noche",
    detalle: "18:00 - 21:59",
    Icono: Moon,
    tonos: {
      activa: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
      inactiva: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
    },
  },
];

type WeeklyAvailabilityEditorProps = {
  disponibilidad: DisponibilidadDia[];
  onChange: (siguiente: DisponibilidadDia[]) => void;
  compact?: boolean;
};

export default function WeeklyAvailabilityEditor({
  disponibilidad,
  onChange,
  compact = false,
}: WeeklyAvailabilityEditorProps) {
  const alternar = (dia: number, franja: "manana" | "tarde" | "noche") => {
    onChange(
      disponibilidad.map((item) =>
        item.dia === dia ? { ...item, [franja]: !item[franja] } : item,
      ),
    );
  };

  const aplicarPreset = (preset: "todo" | "laborables" | "solo-noches" | "descanso-fin-semana") => {
    const siguiente = disponibilidad.map((item) => {
      if (preset === "todo") {
        return { ...item, manana: true, tarde: true, noche: true };
      }

      if (preset === "laborables") {
        return item.dia <= 4
          ? { ...item, manana: true, tarde: true, noche: true }
          : { ...item, manana: false, tarde: false, noche: false };
      }

      if (preset === "solo-noches") {
        return { ...item, manana: false, tarde: false, noche: true };
      }

      return item.dia >= 5
        ? { ...item, manana: false, tarde: false, noche: false }
        : { ...item, manana: true, tarde: true, noche: true };
    });

    onChange(siguiente);
  };

  const franjasActivas = disponibilidad.reduce(
    (acc, dia) => acc + Number(dia.manana) + Number(dia.tarde) + Number(dia.noche),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarRange className="h-4 w-4 text-blue-600" />
            Disponibilidad semanal real
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Marca en qué franjas sí te dejas estudiar. El planner y el chat las van a respetar.
          </p>
        </div>
        <Badge className="bg-slate-100 text-slate-700">
          {franjasActivas} franjas activas
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => aplicarPreset("todo")}>
          Todo disponible
        </Button>
        <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => aplicarPreset("laborables")}>
          Solo laborables
        </Button>
        <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => aplicarPreset("solo-noches")}>
          Solo noches
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-white"
          onClick={() => aplicarPreset("descanso-fin-semana")}
        >
          Descanso fin de semana
        </Button>
      </div>

      <div className="space-y-3">
        {disponibilidad.map((dia) => (
          <div
            key={dia.dia}
            className={`rounded-2xl border border-slate-200 bg-white p-4 ${compact ? "" : "shadow-sm"}`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-[112px]">
                <div className="font-semibold text-slate-900">
                  {obtenerEtiquetaDiaPlanificador(dia.dia)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {dia.manana || dia.tarde || dia.noche ? "Se puede planificar" : "Día reservado para ti"}
                </div>
              </div>

              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                {franjas.map((franja) => {
                  const activa = dia[franja.clave];

                  return (
                    <button
                      key={`${dia.dia}-${franja.clave}`}
                      type="button"
                      onClick={() => alternar(dia.dia, franja.clave)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        activa ? franja.tonos.activa : franja.tonos.inactiva
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <franja.Icono className="h-4 w-4" />
                        <span className="text-sm font-semibold">{franja.etiqueta}</span>
                      </div>
                      <div className="mt-1 text-xs opacity-80">{franja.detalle}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
