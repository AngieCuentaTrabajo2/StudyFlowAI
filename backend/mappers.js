export function mapearUsuario(row) {
  if (!row) return null;

  return {
    id: row.id,
    nombres: row.nombres,
    apellidos: row.apellidos,
    correo: row.correo,
    universidad: row.universidad,
    carrera: row.carrera,
    semestre: row.semestre,
    plan: row.plan ?? "gratis",
    horasDisponibles: row.horasDisponibles ?? null,
    metodoEstudio: row.metodoEstudio ?? null,
    tonoAsistente: row.tonoAsistente ?? "responsable",
    metas: row.metas ?? null,
    horasEstudioDiarias: row.horasEstudioDiarias ?? null,
    horasSueno: row.horasSueno ?? null,
    notificaciones: {
      tareas: row.notificacionesTareas ?? true,
      examenes: row.notificacionesExamenes ?? true,
      ia: row.notificacionesIa ?? true,
      semanal: row.notificacionesSemanal ?? true,
      correo: row.notificacionesCorreo ?? false,
    },
    aplicacion: {
      modoOscuro: row.aplicacionModoOscuro ?? false,
      googleCalendar: row.aplicacionGoogleCalendar ?? false,
      sugerenciasAutomaticas: row.aplicacionSugerenciasAutomaticas ?? true,
    },
  };
}

export function mapearCurso(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    docente: row.docente,
    horario: row.horario,
    semestre: row.semestre,
    color: row.color,
    descripcion: row.descripcion,
  };
}

export function mapearTarea(row) {
  return {
    id: row.id,
    cursoId: row.cursoId,
    titulo: row.titulo,
    descripcion: row.descripcion,
    fechaEntrega: row.fechaEntrega,
    prioridad: row.prioridad,
    estado: row.estado,
    horasEstimadas: Number(row.horasEstimadas),
    progreso: row.progreso,
  };
}

export function mapearExamen(row) {
  return {
    id: row.id,
    cursoId: row.cursoId,
    titulo: row.titulo,
    fecha: row.fecha,
    hora: typeof row.hora === "string" ? row.hora.slice(0, 5) : row.hora,
    temas: row.temas ?? [],
    preparacion: row.preparacion,
  };
}

export function mapearBloque(row) {
  return {
    id: row.id,
    dia: row.dia,
    horaInicio: Number(row.horaInicio),
    duracion: Number(row.duracion),
    titulo: row.titulo,
    cursoId: row.cursoId ?? undefined,
    color: row.color,
    tipo: row.tipo,
  };
}

export function mapearNotificacion(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensaje: row.mensaje,
    creadaEn: row.creadaEn,
    noLeida: row.noLeida,
  };
}

export function mapearMensajeChat(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    mensaje: row.mensaje,
    hora: row.hora,
    creadaEn: row.creadaEn,
  };
}
