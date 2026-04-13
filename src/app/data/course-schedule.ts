export type FilaHorarioCurso = {
  id: string;
  dia: number;
  horaInicio: string;
  horaFin: string;
};

export type CursoConHorario = {
  id: string;
  nombre: string;
  color: string;
  horario: string;
};

export type BloqueClaseDerivado = {
  id: string;
  dia: number;
  horaInicio: number;
  duracion: number;
  titulo: string;
  cursoId: string;
  color: string;
  tipo: "class";
};

export const etiquetasDiaCortas = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
export const opcionesHoraCurso = Array.from({ length: 17 }, (_, index) => {
  const hora = index + 7;
  return `${String(hora).padStart(2, "0")}:00`;
});

const mapaDias: Record<string, number> = {
  lun: 0,
  lunes: 0,
  mar: 1,
  martes: 1,
  mie: 2,
  miercoles: 2,
  miércoles: 2,
  jue: 3,
  jueves: 3,
  vie: 4,
  viernes: 4,
  sab: 5,
  sabado: 5,
  sábado: 5,
  dom: 6,
  domingo: 6,
};

function crearIdHorario() {
  return `schedule-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizarTexto(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarHora(hora: string) {
  const [horas = "0", minutos = "00"] = hora.split(":");
  return `${horas.padStart(2, "0")}:${minutos.padStart(2, "0")}`;
}

function horaTextoANumero(hora: string) {
  const [horas, minutos] = normalizarHora(hora).split(":").map(Number);
  return horas + minutos / 60;
}

function ordenarFilas(filas: FilaHorarioCurso[]) {
  return [...filas].sort(
    (a, b) =>
      a.dia - b.dia ||
      horaTextoANumero(a.horaInicio) - horaTextoANumero(b.horaInicio) ||
      horaTextoANumero(a.horaFin) - horaTextoANumero(b.horaFin),
  );
}

export function crearFilaHorarioCurso(): FilaHorarioCurso {
  return {
    id: crearIdHorario(),
    dia: 0,
    horaInicio: "08:00",
    horaFin: "10:00",
  };
}

export function parsearHorarioCurso(horario: string): FilaHorarioCurso[] {
  if (!horario.trim()) return [];

  const filas: FilaHorarioCurso[] = [];
  const segmentos = horario
    .split("|")
    .map((segmento) => segmento.trim())
    .filter(Boolean);

  segmentos.forEach((segmento, indiceSegmento) => {
    const coincidencia = segmento.match(/^(.+?)\s+(\d{1,2}:\d{2})\s*(?:-|a)\s*(\d{1,2}:\d{2})$/i);
    if (!coincidencia) return;

    const [, textoDias, horaInicio, horaFin] = coincidencia;
    const dias = textoDias
      .replace(/\sy\s/gi, ",")
      .split(",")
      .map((dia) => dia.trim())
      .filter(Boolean);

    dias.forEach((diaTexto, indiceDia) => {
      const dia = mapaDias[normalizarTexto(diaTexto)];
      if (dia === undefined) return;

      filas.push({
        id: `parsed-${indiceSegmento}-${indiceDia}-${dia}`,
        dia,
        horaInicio: normalizarHora(horaInicio),
        horaFin: normalizarHora(horaFin),
      });
    });
  });

  return ordenarFilas(filas);
}

export function formatearHorarioCurso(filas: FilaHorarioCurso[]) {
  const grupos = new Map<string, number[]>();

  ordenarFilas(filas).forEach((fila) => {
    const clave = `${fila.horaInicio}-${fila.horaFin}`;
    const dias = grupos.get(clave) ?? [];
    if (!dias.includes(fila.dia)) {
      dias.push(fila.dia);
    }
    grupos.set(clave, dias);
  });

  return Array.from(grupos.entries())
    .map(([clave, dias]) => {
      const [horaInicio, horaFin] = clave.split("-");
      const diasTexto = dias
        .sort((a, b) => a - b)
        .map((dia) => etiquetasDiaCortas[dia] ?? "")
        .join(", ");

      return `${diasTexto} ${horaInicio} - ${horaFin}`;
    })
    .join(" | ");
}

export function validarHorarioCurso(filas: FilaHorarioCurso[]) {
  if (!filas.length) {
    return "Agrega al menos un horario para tu curso.";
  }

  const horarios = new Set<string>();

  for (const fila of filas) {
    const inicio = horaTextoANumero(fila.horaInicio);
    const fin = horaTextoANumero(fila.horaFin);

    if (inicio >= fin) {
      return "La hora final debe ser mayor que la hora de inicio.";
    }

    if (!Number.isInteger(inicio) || !Number.isInteger(fin)) {
      return "Por ahora usa horas exactas para que el planificador pueda reservarlas bien.";
    }

    const clave = `${fila.dia}-${fila.horaInicio}-${fila.horaFin}`;
    if (horarios.has(clave)) {
      return "No repitas el mismo dia y rango horario en un mismo curso.";
    }

    horarios.add(clave);
  }

  return null;
}

export function construirBloquesClaseDesdeCurso(curso: CursoConHorario): BloqueClaseDerivado[] {
  return parsearHorarioCurso(curso.horario).map((fila) => ({
    id: `class-${curso.id}-${fila.dia}-${fila.horaInicio.replace(":", "")}-${fila.horaFin.replace(":", "")}`,
    dia: fila.dia,
    horaInicio: horaTextoANumero(fila.horaInicio),
    duracion: horaTextoANumero(fila.horaFin) - horaTextoANumero(fila.horaInicio),
    titulo: curso.nombre,
    cursoId: curso.id,
    color: curso.color,
    tipo: "class",
  }));
}
