import type { LucideIcon } from "lucide-react";
import type {
  AlcancePlanificacion,
  JornadaPlanificacion,
  ModoPlanificacionTodo,
} from "../data/studyflow-store";

export const accionesRapidas = [
  "Planifica mi horario",
  "Explícame base de datos",
  "Hazme preguntas de práctica",
  "Resume este tema",
];

export const aliasDiasPlanificacion: Array<{ indice: number; terminos: string[] }> = [
  { indice: 0, terminos: ["lunes", "lun"] },
  { indice: 1, terminos: ["martes", "mar"] },
  { indice: 2, terminos: ["miercoles", "miércoles", "mie", "mier"] },
  { indice: 3, terminos: ["jueves", "jue"] },
  { indice: 4, terminos: ["viernes", "vie"] },
  { indice: 5, terminos: ["sabado", "sábado", "sab"] },
  { indice: 6, terminos: ["domingo", "dom"] },
];

export type FlujoPlanificacionChat = {
  activo: boolean;
  paso:
    | "modo"
    | "modo-todo"
    | "objetivo-tarea"
    | "objetivo-curso"
    | "dias"
    | "jornada"
    | "confirmacion";
  alcance: AlcancePlanificacion | null;
  objetivoId?: string;
  diasBloqueados: number[];
  jornada: JornadaPlanificacion;
  modoTodo: ModoPlanificacionTodo;
};

export type TonoPlanificadorLocal = "amigable" | "responsable" | "frio";

export type OpcionVisualPlanificacion = {
  id: string;
  valor: string;
  titulo: string;
  descripcion: string;
  detalle?: string;
  badge?: string;
  Icono: LucideIcon;
  tono: "blue" | "violet" | "emerald" | "amber" | "rose" | "slate";
};

export type PanelVisualPlanificacion = {
  titulo: string;
  descripcion: string;
  pasoEtiqueta: string;
  layout: "triple" | "doble" | "cuadruple" | "lista";
  opciones: OpcionVisualPlanificacion[];
};

export type DiaPlanificableVisual = {
  dia: number;
  fecha: Date;
  etiquetaDia: string;
  etiquetaFecha: string;
  destacado?: string;
};

export type MetadatosDiasPlanificacion = {
  diasPermitidos: number[];
  detalle: string;
  ayuda: string;
  diasDisponibles: DiaPlanificableVisual[];
};

export const flujoPlanificacionInicial: FlujoPlanificacionChat = {
  activo: false,
  paso: "modo",
  alcance: null,
  objetivoId: undefined,
  diasBloqueados: [],
  jornada: "flexible",
  modoTodo: "solo-calendarizado",
};
