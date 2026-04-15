import { Plus, Trash2 } from "lucide-react";
import {
  crearFilaHorarioCurso,
  etiquetasDiaCortas,
  formatearHorarioCurso,
  opcionesHoraCurso,
  type FilaHorarioCurso,
} from "../data/course-schedule";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Props = {
  filas: FilaHorarioCurso[];
  onChange: (filas: FilaHorarioCurso[]) => void;
  error?: string;
};

export default function CourseScheduleEditor({ filas, onChange, error }: Props) {
  const actualizarFila = (
    filaId: string,
    campo: keyof Pick<FilaHorarioCurso, "dia" | "horaInicio" | "horaFin">,
    valor: number | string,
  ) => {
    onChange(
      filas.map((fila) =>
        fila.id === filaId
          ? {
              ...fila,
              [campo]: valor,
            }
          : fila,
      ),
    );
  };

  const eliminarFila = (filaId: string) => {
    if (filas.length === 1) {
      onChange([crearFilaHorarioCurso()]);
      return;
    }

    onChange(filas.filter((fila) => fila.id !== filaId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Horario de clase</Label>
          <p className="mt-1 text-sm text-slate-500">
            Estos bloques se reservaran tambien en el planificador para que no se crucen con estudio o tareas.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...filas, crearFilaHorarioCurso()])}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="space-y-3">
        {filas.map((fila, index) => (
          <div
            key={fila.id}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-500">
                Dia {index + 1}
              </Label>
              <Select value={String(fila.dia)} onValueChange={(valor) => actualizarFila(fila.id, "dia", Number(valor))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un día" />
                </SelectTrigger>
                <SelectContent>
                  {etiquetasDiaCortas.map((etiqueta, dia) => (
                    <SelectItem key={etiqueta} value={String(dia)}>
                      {etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-500">
                Desde
              </Label>
              <Select value={fila.horaInicio} onValueChange={(valor) => actualizarFila(fila.id, "horaInicio", valor)}>
                <SelectTrigger>
                  <SelectValue placeholder="Hora inicio" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesHoraCurso.slice(0, -1).map((hora) => (
                    <SelectItem key={hora} value={hora}>
                      {hora}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-500">
                Hasta
              </Label>
              <Select value={fila.horaFin} onValueChange={(valor) => actualizarFila(fila.id, "horaFin", valor)}>
                <SelectTrigger>
                  <SelectValue placeholder="Hora fin" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesHoraCurso.slice(1).map((hora) => (
                    <SelectItem key={hora} value={hora}>
                      {hora}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="button" variant="ghost" size="icon" onClick={() => eliminarFila(fila.id)}>
                <Trash2 className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Vista previa</div>
        <div className="mt-2 text-sm font-medium text-slate-700">
          {formatearHorarioCurso(filas) || "Todavía no hay un horario configurado."}
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
    </div>
  );
}
