import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { AlertCircle, BookOpen, Calendar, CheckCircle2, Circle, Clock, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import {
  formatearFechaCorta,
  obtenerEstadoVisualTarea,
  useStudyFlow,
  type EstadoTarea,
  type Prioridad,
  type Subtarea,
  type Tarea,
} from "../data/studyflow-store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

type FormularioTarea = {
  titulo: string;
  descripcion: string;
  cursoId: string;
  fechaEntrega: string;
  prioridad: Prioridad;
  horasEstimadas: number;
  estado?: EstadoTarea;
  progreso?: number;
};

function crearFormularioVacio(cursoId: string): FormularioTarea {
  return {
    titulo: "",
    descripcion: "",
    cursoId,
    fechaEntrega: "",
    prioridad: "medium",
    horasEstimadas: 2,
    estado: "pending",
    progreso: 0,
  };
}

export default function Tasks() {
  const {
    tareas,
    cursos,
    agregarTarea,
    alternarTareaCompletada,
    actualizarTarea,
    agendarTareaEnCalendario,
    agregarSubtarea,
    alternarSubtarea,
    eliminarSubtarea,
  } = useStudyFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const tareaDestacadaId = searchParams.get("focus");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("all");
  const [filtroPrioridad, setFiltroPrioridad] = useState("all");
  const [filtroEstado, setFiltroEstado] = useState("all");
  const [dialogoCrearAbierto, setDialogoCrearAbierto] = useState(false);
  const [tareaEnEdicion, setTareaEnEdicion] = useState<Tarea | null>(null);
  const [tareaParaCalendario, setTareaParaCalendario] = useState<Tarea | null>(null);
  const [borradorTarea, setBorradorTarea] = useState<FormularioTarea>(crearFormularioVacio(cursos[0]?.id ?? ""));
  const [horasCalendarioDeseadas, setHorasCalendarioDeseadas] = useState("2");
  const [mensajeCalendario, setMensajeCalendario] = useState("");
  const [tareaProgramada, setTareaProgramada] = useState(false);

  useEffect(() => {
    if (!tareaDestacadaId) return;

    const temporizador = window.setTimeout(() => {
      const nuevo = new URLSearchParams(searchParams);
      nuevo.delete("focus");
      setSearchParams(nuevo, { replace: true });
    }, 3500);

    return () => window.clearTimeout(temporizador);
  }, [searchParams, setSearchParams, tareaDestacadaId]);

  const tareasFiltradas = useMemo(
    () =>
      tareas.filter((tarea) => {
        const estadoVisual = obtenerEstadoVisualTarea(tarea);
        const curso = cursos.find((item) => item.id === tarea.cursoId);
        const coincideBusqueda = `${tarea.titulo} ${curso?.nombre ?? ""}`
          .toLowerCase()
          .includes(busqueda.toLowerCase());
        const coincideCurso = filtroCurso === "all" || tarea.cursoId === filtroCurso;
        const coincidePrioridad = filtroPrioridad === "all" || tarea.prioridad === filtroPrioridad;
        const coincideEstado = filtroEstado === "all" || estadoVisual === filtroEstado;
        return coincideBusqueda && coincideCurso && coincidePrioridad && coincideEstado;
      }),
    [busqueda, cursos, filtroCurso, filtroEstado, filtroPrioridad, tareas],
  );

  const tareasPrioritarias = tareasFiltradas
    .filter((tarea) => obtenerEstadoVisualTarea(tarea) !== "completed" && tarea.prioridad === "high")
    .slice(0, 3);

  const tareasActivasVisibles = useMemo(
    () => tareasFiltradas.filter((tarea) => obtenerEstadoVisualTarea(tarea) !== "completed"),
    [tareasFiltradas],
  );

  const tareasCompletadasVisibles = useMemo(
    () => tareasFiltradas.filter((tarea) => obtenerEstadoVisualTarea(tarea) === "completed"),
    [tareasFiltradas],
  );

  const tareasOrdenadas = useMemo(() => {
    if (filtroEstado !== "all") {
      return tareasFiltradas;
    }

    const activas = tareasFiltradas.filter((tarea) => obtenerEstadoVisualTarea(tarea) !== "completed");
    const completadas = tareasFiltradas.filter((tarea) => obtenerEstadoVisualTarea(tarea) === "completed");

    return [...activas, ...completadas];
  }, [filtroEstado, tareasFiltradas]);

  const indicePrimeraCompletada =
    filtroEstado === "all"
      ? tareasOrdenadas.findIndex((tarea) => obtenerEstadoVisualTarea(tarea) === "completed")
      : -1;

  const etiquetaEstado = (estado: EstadoTarea) => {
    const mapa: Record<EstadoTarea, string> = {
      pending: "Pendiente",
      "in-progress": "En progreso",
      completed: "Completada",
      overdue: "Atrasada",
    };
    return mapa[estado];
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Tareas</h1>
          <p className="max-w-2xl text-sm text-gray-600 sm:text-base">
            Organiza pendientes, prioriza entregas y registra progreso real.
          </p>
        </div>

        <Dialog open={dialogoCrearAbierto} onOpenChange={setDialogoCrearAbierto}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Crear tarea
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear tarea</DialogTitle>
            </DialogHeader>
            <FormularioTareaCard
              cursos={cursos.map((curso) => ({ id: curso.id, nombre: curso.nombre }))}
              valor={borradorTarea}
              onChange={setBorradorTarea}
              mostrarEstado={false}
              textoBoton="Guardar tarea"
              onGuardar={() => {
                agregarTarea(borradorTarea);
                setBorradorTarea(crearFormularioVacio(cursos[0]?.id ?? ""));
                setDialogoCrearAbierto(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_repeat(3,200px)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Buscar tareas..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>
        <Select value={filtroCurso} onValueChange={setFiltroCurso}>
          <SelectTrigger>
            <SelectValue placeholder="Curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {cursos.map((curso) => (
              <SelectItem key={curso.id} value={curso.id}>
                {curso.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
          <SelectTrigger>
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in-progress">En progreso</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
            <SelectItem value="overdue">Atrasada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none bg-gradient-to-br from-red-50 to-orange-50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Tareas prioritarias de hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tareasPrioritarias.map((tarea) => {
            const curso = cursos.find((item) => item.id === tarea.cursoId);
            return (
              <div key={tarea.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm lg:flex-row lg:items-center">
                <div className="flex-1">
                  <h3 className="font-semibold">{tarea.titulo}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {curso?.nombre} · {formatearFechaCorta(tarea.fechaEntrega)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => actualizarTarea(tarea.id, { estado: "in-progress" })}
                >
                  Marcar en progreso
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tareasActivasVisibles.map((tarea) => {
          const curso = cursos.find((item) => item.id === tarea.cursoId);
          const estadoVisual = obtenerEstadoVisualTarea(tarea);
          const estaDestacada = tareaDestacadaId === tarea.id;

          return (
            <Card
              key={tarea.id}
              className={`border-none shadow-lg transition-all duration-300 ease-out will-change-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/80 ${
                estadoVisual === "completed" ? "opacity-70" : ""
              } ${estaDestacada ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
            >
              <CardContent className="p-6">
                {estaDestacada ? (
                  <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    Resultado encontrado desde el buscador global.
                  </div>
                ) : null}

                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3
                          className={`text-lg font-semibold ${
                            estadoVisual === "completed" ? "line-through text-gray-500" : ""
                          }`}
                        >
                          {tarea.titulo}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {curso?.nombre}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatearFechaCorta(tarea.fechaEntrega)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {tarea.horasEstimadas}h
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={
                            tarea.prioridad === "high"
                              ? "bg-red-50 text-red-600"
                              : tarea.prioridad === "medium"
                                ? "bg-yellow-50 text-yellow-600"
                                : "bg-gray-100 text-gray-600"
                          }
                        >
                          {tarea.prioridad === "high" ? "Alta" : tarea.prioridad === "medium" ? "Media" : "Baja"}
                        </Badge>
                        <Badge
                          className={
                            estadoVisual === "completed"
                              ? "bg-green-50 text-green-600"
                              : estadoVisual === "in-progress"
                                ? "bg-blue-50 text-blue-600"
                                : estadoVisual === "overdue"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-gray-100 text-gray-600"
                          }
                        >
                          {etiquetaEstado(estadoVisual)}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-600">Avance</span>
                        <span className="font-semibold">{tarea.progreso}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
                          style={{ width: `${tarea.progreso}%` }}
                        />
                      </div>
                    </div>
                    <ChecklistTarea
                      tarea={tarea}
                      onAgregar={(titulo) => agregarSubtarea(tarea.id, titulo)}
                      onAlternar={(subtareaId) => alternarSubtarea(tarea.id, subtareaId)}
                      onEliminar={(subtareaId) => eliminarSubtarea(tarea.id, subtareaId)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Dialog
                      open={tareaEnEdicion?.id === tarea.id}
                      onOpenChange={(abierto) => !abierto && setTareaEnEdicion(null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setTareaEnEdicion(tarea)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Editar tarea</DialogTitle>
                        </DialogHeader>
                        {tareaEnEdicion && (
                          <FormularioTareaCard
                            cursos={cursos.map((curso) => ({ id: curso.id, nombre: curso.nombre }))}
                            valor={{
                              titulo: tareaEnEdicion.titulo,
                              descripcion: tareaEnEdicion.descripcion,
                              cursoId: tareaEnEdicion.cursoId,
                              fechaEntrega: tareaEnEdicion.fechaEntrega,
                              prioridad: tareaEnEdicion.prioridad,
                              horasEstimadas: tareaEnEdicion.horasEstimadas,
                              estado: tareaEnEdicion.estado,
                              progreso: tareaEnEdicion.progreso,
                            }}
                            onChange={(valor) =>
                              setTareaEnEdicion((actual) =>
                                actual
                                  ? {
                                      ...actual,
                                      titulo: valor.titulo,
                                      descripcion: valor.descripcion,
                                      cursoId: valor.cursoId,
                                      fechaEntrega: valor.fechaEntrega,
                                      prioridad: valor.prioridad,
                                      horasEstimadas: valor.horasEstimadas,
                                      estado: valor.estado ?? actual.estado,
                                      progreso: valor.progreso ?? actual.progreso,
                                    }
                                  : actual,
                              )
                            }
                            textoBoton="Guardar cambios"
                            onGuardar={() => {
                              if (!tareaEnEdicion) return;
                              actualizarTarea(tareaEnEdicion.id, {
                                titulo: tareaEnEdicion.titulo,
                                descripcion: tareaEnEdicion.descripcion,
                                cursoId: tareaEnEdicion.cursoId,
                                fechaEntrega: tareaEnEdicion.fechaEntrega,
                                prioridad: tareaEnEdicion.prioridad,
                                horasEstimadas: tareaEnEdicion.horasEstimadas,
                                estado: tareaEnEdicion.estado,
                                progreso: tareaEnEdicion.progreso,
                              });
                              setTareaEnEdicion(null);
                            }}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={tareaParaCalendario?.id === tarea.id}
                      onOpenChange={(abierto) => {
                        if (!abierto) {
                          setTareaParaCalendario(null);
                          setHorasCalendarioDeseadas("2");
                          setMensajeCalendario("");
                          setTareaProgramada(false);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setTareaParaCalendario(tarea);
                            setHorasCalendarioDeseadas(String(Math.min(Math.max(tarea.horasEstimadas, 1), 4)));
                            setMensajeCalendario("");
                            setTareaProgramada(false);
                          }}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Agregar al calendario
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Programar tarea en el calendario</DialogTitle>
                        </DialogHeader>
                        {tareaParaCalendario ? (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="font-semibold text-slate-900">{tareaParaCalendario.titulo}</p>
                              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                                <span>{curso?.nombre ?? "Sin curso"}</span>
                                <span>{formatearFechaCorta(tareaParaCalendario.fechaEntrega)}</span>
                                <span>{tareaParaCalendario.progreso}% avanzado</span>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor={`horas-calendario-${tarea.id}`}>Horas para trabajar esta tarea</Label>
                              <Input
                                id={`horas-calendario-${tarea.id}`}
                                type="number"
                                min="1"
                                max="8"
                                value={horasCalendarioDeseadas}
                                onChange={(event) => {
                                  setHorasCalendarioDeseadas(event.target.value);
                                  setMensajeCalendario("");
                                  setTareaProgramada(false);
                                }}
                              />
                              <p className="mt-2 text-sm text-slate-500">
                                La app buscara espacios libres antes de la entrega y agregara bloques para avanzar esa tarea.
                              </p>
                            </div>

                            {mensajeCalendario ? (
                              <div
                                className={`rounded-2xl border p-3 text-sm ${
                                  tareaProgramada
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                {mensajeCalendario}
                              </div>
                            ) : null}

                            <Button
                              className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                              onClick={() => {
                                const resultado = agendarTareaEnCalendario(
                                  tareaParaCalendario.id,
                                  Number(horasCalendarioDeseadas),
                                );
                                setMensajeCalendario(resultado.mensaje);
                                setTareaProgramada(resultado.ok);
                              }}
                            >
                              Reservar horas para esta tarea
                            </Button>
                          </div>
                        ) : null}
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
                      onClick={() => alternarTareaCompletada(tarea.id)}
                    >
                      {estadoVisual === "completed" ? "Reabrir" : "Completar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtroEstado === "all" && tareasCompletadasVisibles.length > 0 ? (
          <div className="pt-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Tareas completadas</h2>
                <p className="text-sm text-slate-500">
                  Las dejamos abajo para que primero se vean las que todavía requieren acción.
                </p>
              </div>
              <Badge className="bg-green-50 text-green-700">
                {tareasCompletadasVisibles.length} completadas
              </Badge>
            </div>
            <div className="space-y-4">
              {tareasCompletadasVisibles.map((tarea) => {
                const curso = cursos.find((item) => item.id === tarea.cursoId);
                const estadoVisual = obtenerEstadoVisualTarea(tarea);
                const estaDestacada = tareaDestacadaId === tarea.id;

                return (
                  <Card
                    key={tarea.id}
                    className={`border-none shadow-lg transition-all duration-300 ease-out will-change-transform opacity-70 hover:-translate-y-0.5 hover:opacity-85 hover:shadow-xl hover:shadow-slate-200/60 ${
                      estaDestacada ? "ring-2 ring-blue-500 ring-offset-2" : ""
                    }`}
                  >
                    <CardContent className="p-6">
                      {estaDestacada ? (
                        <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                          Resultado encontrado desde el buscador global.
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                        <div className="flex-1">
                          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold line-through text-gray-500">
                                {tarea.titulo}
                              </h3>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  {curso?.nombre}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatearFechaCorta(tarea.fechaEntrega)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {tarea.horasEstimadas}h
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                className={
                                  tarea.prioridad === "high"
                                    ? "bg-red-50 text-red-600"
                                    : tarea.prioridad === "medium"
                                      ? "bg-yellow-50 text-yellow-600"
                                      : "bg-gray-100 text-gray-600"
                                }
                              >
                                {tarea.prioridad === "high" ? "Alta" : tarea.prioridad === "medium" ? "Media" : "Baja"}
                              </Badge>
                              <Badge className="bg-green-50 text-green-600">
                                {etiquetaEstado(estadoVisual)}
                              </Badge>
                            </div>
                          </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-gray-600">Avance</span>
                            <span className="font-semibold">{tarea.progreso}%</span>
                          </div>
                            <div className="h-2 rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
                                style={{ width: `${tarea.progreso}%` }}
                              />
                            </div>
                          </div>
                          <ChecklistTarea
                            tarea={tarea}
                            onAgregar={(titulo) => agregarSubtarea(tarea.id, titulo)}
                            onAlternar={(subtareaId) => alternarSubtarea(tarea.id, subtareaId)}
                            onEliminar={(subtareaId) => eliminarSubtarea(tarea.id, subtareaId)}
                          />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Dialog
                            open={tareaEnEdicion?.id === tarea.id}
                            onOpenChange={(abierto) => !abierto && setTareaEnEdicion(null)}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setTareaEnEdicion(tarea)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Editar tarea</DialogTitle>
                              </DialogHeader>
                              {tareaEnEdicion && (
                                <FormularioTareaCard
                                  cursos={cursos.map((curso) => ({ id: curso.id, nombre: curso.nombre }))}
                                  valor={{
                                    titulo: tareaEnEdicion.titulo,
                                    descripcion: tareaEnEdicion.descripcion,
                                    cursoId: tareaEnEdicion.cursoId,
                                    fechaEntrega: tareaEnEdicion.fechaEntrega,
                                    prioridad: tareaEnEdicion.prioridad,
                                    horasEstimadas: tareaEnEdicion.horasEstimadas,
                                    estado: tareaEnEdicion.estado,
                                    progreso: tareaEnEdicion.progreso,
                                  }}
                                  onChange={(valor) =>
                                    setTareaEnEdicion((actual) =>
                                      actual
                                        ? {
                                            ...actual,
                                            titulo: valor.titulo,
                                            descripcion: valor.descripcion,
                                            cursoId: valor.cursoId,
                                            fechaEntrega: valor.fechaEntrega,
                                            prioridad: valor.prioridad,
                                            horasEstimadas: valor.horasEstimadas,
                                            estado: valor.estado ?? actual.estado,
                                            progreso: valor.progreso ?? actual.progreso,
                                          }
                                        : actual,
                                    )
                                  }
                                  textoBoton="Guardar cambios"
                                  onGuardar={() => {
                                    if (!tareaEnEdicion) return;
                                    actualizarTarea(tareaEnEdicion.id, {
                                      titulo: tareaEnEdicion.titulo,
                                      descripcion: tareaEnEdicion.descripcion,
                                      cursoId: tareaEnEdicion.cursoId,
                                      fechaEntrega: tareaEnEdicion.fechaEntrega,
                                      prioridad: tareaEnEdicion.prioridad,
                                      horasEstimadas: tareaEnEdicion.horasEstimadas,
                                      estado: tareaEnEdicion.estado,
                                      progreso: tareaEnEdicion.progreso,
                                    });
                                    setTareaEnEdicion(null);
                                  }}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Dialog
                            open={tareaParaCalendario?.id === tarea.id}
                            onOpenChange={(abierto) => {
                              if (!abierto) {
                                setTareaParaCalendario(null);
                                setHorasCalendarioDeseadas("2");
                                setMensajeCalendario("");
                                setTareaProgramada(false);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                  setTareaParaCalendario(tarea);
                                  setHorasCalendarioDeseadas(String(Math.min(Math.max(tarea.horasEstimadas, 1), 4)));
                                  setMensajeCalendario("");
                                  setTareaProgramada(false);
                                }}
                              >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Agregar al calendario
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Programar tarea en el calendario</DialogTitle>
                              </DialogHeader>
                              {tareaParaCalendario ? (
                                <div className="space-y-4">
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="font-semibold text-slate-900">{tareaParaCalendario.titulo}</p>
                                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                                      <span>{curso?.nombre ?? "Sin curso"}</span>
                                      <span>{formatearFechaCorta(tareaParaCalendario.fechaEntrega)}</span>
                                      <span>{tareaParaCalendario.progreso}% avanzado</span>
                                    </div>
                                  </div>

                                  <div>
                                    <Label htmlFor={`horas-calendario-${tarea.id}`}>Horas para trabajar esta tarea</Label>
                                    <Input
                                      id={`horas-calendario-${tarea.id}`}
                                      type="number"
                                      min="1"
                                      max="8"
                                      value={horasCalendarioDeseadas}
                                      onChange={(event) => {
                                        setHorasCalendarioDeseadas(event.target.value);
                                        setMensajeCalendario("");
                                        setTareaProgramada(false);
                                      }}
                                    />
                                    <p className="mt-2 text-sm text-slate-500">
                                      La app buscara espacios libres antes de la entrega y agregara bloques para avanzar esa tarea.
                                    </p>
                                  </div>

                                  {mensajeCalendario ? (
                                    <div
                                      className={`rounded-2xl border p-3 text-sm ${
                                        tareaProgramada
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-amber-200 bg-amber-50 text-amber-700"
                                      }`}
                                    >
                                      {mensajeCalendario}
                                    </div>
                                  ) : null}

                                  <Button
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                                    onClick={() => {
                                      const resultado = agendarTareaEnCalendario(
                                        tareaParaCalendario.id,
                                        Number(horasCalendarioDeseadas),
                                      );
                                      setMensajeCalendario(resultado.mensaje);
                                      setTareaProgramada(resultado.ok);
                                    }}
                                  >
                                    Reservar horas para esta tarea
                                  </Button>
                                </div>
                              ) : null}
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
                            onClick={() => alternarTareaCompletada(tarea.id)}
                          >
                            Reabrir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChecklistTarea({
  tarea,
  onAgregar,
  onAlternar,
  onEliminar,
}: {
  tarea: Tarea;
  onAgregar: (titulo: string) => { ok: boolean; mensaje: string };
  onAlternar: (subtareaId: string) => void;
  onEliminar: (subtareaId: string) => void;
}) {
  const [nuevaSubtarea, setNuevaSubtarea] = useState("");
  const [mensaje, setMensaje] = useState("");
  const totalCompletadas = tarea.subtareas.filter((subtarea) => subtarea.completada).length;

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Checklist de avance</div>
          <p className="text-xs text-slate-500">
            {tarea.subtareas.length > 0
              ? `${totalCompletadas} de ${tarea.subtareas.length} subtareas completas`
              : "Todavía no agregaste subtareas para esta entrega."}
          </p>
        </div>
        {tarea.subtareas.length > 0 ? (
          <Badge className="w-fit bg-white text-slate-700">
            {Math.round((totalCompletadas / tarea.subtareas.length) * 100)}% checklist
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {tarea.subtareas.map((subtarea) => (
          <div
            key={subtarea.id}
            className="flex items-center gap-3 rounded-2xl border border-white bg-white px-3 py-3 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onAlternar(subtarea.id)}
              className={`rounded-full transition ${
                subtarea.completada ? "text-emerald-600" : "text-slate-300 hover:text-blue-600"
              }`}
            >
              {subtarea.completada ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
            </button>
            <div
              className={`flex-1 text-sm ${
                subtarea.completada ? "text-slate-400 line-through" : "text-slate-700"
              }`}
            >
              {subtarea.titulo}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
              onClick={() => onEliminar(subtarea.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={nuevaSubtarea}
          onChange={(event) => {
            setNuevaSubtarea(event.target.value);
            setMensaje("");
          }}
          placeholder="Agregar paso pequeno, por ejemplo: probar endpoint login"
        />
        <Button
          type="button"
          variant="outline"
          className="bg-white sm:w-auto"
          onClick={() => {
            const resultado = onAgregar(nuevaSubtarea);
            setMensaje(resultado.mensaje);
            if (resultado.ok) {
              setNuevaSubtarea("");
            }
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar
        </Button>
      </div>

      {mensaje ? <p className="mt-2 text-xs text-slate-500">{mensaje}</p> : null}
    </div>
  );
}

function FormularioTareaCard({
  cursos,
  valor,
  onChange,
  onGuardar,
  textoBoton,
  mostrarEstado = true,
}: {
  cursos: Array<{ id: string; nombre: string }>;
  valor: FormularioTarea;
  onChange: (valor: FormularioTarea) => void;
  onGuardar: () => void;
  textoBoton: string;
  mostrarEstado?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="titulo-tarea">Nombre</Label>
        <Input
          id="titulo-tarea"
          value={valor.titulo}
          onChange={(event) => onChange({ ...valor, titulo: event.target.value })}
        />
      </div>
      <div>
        <Label>Curso</Label>
        <Select value={valor.cursoId} onValueChange={(cursoId) => onChange({ ...valor, cursoId })}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecciona un curso" />
          </SelectTrigger>
          <SelectContent>
            {cursos.map((curso) => (
              <SelectItem key={curso.id} value={curso.id}>
                {curso.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="descripcion-tarea">Descripcion</Label>
        <Textarea
          id="descripcion-tarea"
          value={valor.descripcion}
          onChange={(event) => onChange({ ...valor, descripcion: event.target.value })}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="fecha-tarea">Fecha</Label>
          <Input
            id="fecha-tarea"
            type="date"
            value={valor.fechaEntrega}
            onChange={(event) => onChange({ ...valor, fechaEntrega: event.target.value })}
          />
        </div>
        <div>
          <Label>Prioridad</Label>
          <Select value={valor.prioridad} onValueChange={(prioridad: Prioridad) => onChange({ ...valor, prioridad })}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="horas-tarea">Tiempo estimado</Label>
          <Input
            id="horas-tarea"
            type="number"
            min="1"
            value={valor.horasEstimadas}
            onChange={(event) => onChange({ ...valor, horasEstimadas: Number(event.target.value) })}
          />
        </div>
      </div>

      {mostrarEstado && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Estado</Label>
            <Select value={valor.estado ?? "pending"} onValueChange={(estado: EstadoTarea) => onChange({ ...valor, estado })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in-progress">En progreso</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="overdue">Atrasada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="progreso-tarea">Progreso (%)</Label>
            <Input
              id="progreso-tarea"
              type="number"
              min="0"
              max="100"
              value={valor.progreso ?? 0}
              onChange={(event) => onChange({ ...valor, progreso: Number(event.target.value) })}
            />
          </div>
        </div>
      )}

      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600" onClick={onGuardar}>
        {textoBoton}
      </Button>
    </div>
  );
}
