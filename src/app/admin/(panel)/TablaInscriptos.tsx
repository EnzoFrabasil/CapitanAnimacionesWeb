"use client";

import { useEffect, useState, useTransition } from "react";
import type { FilaInscripto as Fila, ResumenFamilia } from "@/lib/admin/consultas";
import type { ContextoMensajes } from "@/lib/dominio/mensajes";
import type { Opcion } from "@/lib/dominio/opciones";
import type { ResultadoAccion } from "@/lib/admin/resultado";
import { eliminarInscriptos, guardarEdicionesMasivas } from "./acciones";
import { FilaInscripto, aEdicionRapida, valoresEdicion, type ValoresEdicion } from "./FilaInscripto";

const claseBotonBarra =
  "rounded-lg border-2 border-marino/20 bg-white px-3 py-1.5 text-sm font-semibold text-marino hover:border-marino disabled:opacity-50";

/**
 * Tabla del listado: selección múltiple para eliminar, "Abrir todas las fichas"
 * y "Editar todos" (los campos de todas las filas abiertos y un solo Guardar).
 */
export function TablaInscriptos({
  filas,
  opciones,
  familias,
  contactos,
  temporadaId,
  mensajes,
  puedeEditar,
  puedeBorrar,
  grupos,
}: {
  filas: Fila[];
  /** Todas las opciones de la temporada (también las desactivadas). */
  opciones: Opcion[];
  /** Hermanos y total de cada familia en la temporada. */
  familias: Record<number, ResumenFamilia>;
  /** Familias marcadas como contactadas en la temporada. */
  contactos: Record<number, { fecha: string; por: string | null }>;
  temporadaId: number;
  mensajes: ContextoMensajes | null;
  /** Según el rol: sin permiso no se muestran el lápiz ni la selección para eliminar. */
  puedeEditar: boolean;
  puedeBorrar: boolean;
  grupos: { id: number; nombre: string }[];
}) {
  const [seleccion, setSeleccion] = useState<ReadonlySet<number>>(new Set());
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [fichasAbiertas, setFichasAbiertas] = useState(false);
  // "Editar todos": valores de las filas que se tocaron y errores por fila al guardar.
  const [editandoTodos, setEditandoTodos] = useState(false);
  const [ediciones, setEdiciones] = useState<Record<number, ValoresEdicion>>({});
  const [erroresFila, setErroresFila] = useState<Record<number, string>>({});
  const [resultadoMasivo, setResultadoMasivo] = useState<{ ok: boolean; texto: string } | null>(null);

  const iniciales = (f: Fila) => valoresEdicion(f);
  const modificada = (f: Fila) => !!ediciones[f.id] && JSON.stringify(ediciones[f.id]) !== JSON.stringify(iniciales(f));
  const modificadas = filas.filter(modificada);

  // Avisa antes de salir de la página con cambios sin guardar.
  useEffect(() => {
    if (!editandoTodos || modificadas.length === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [editandoTodos, modificadas.length]);

  const cambiarMasivo = (f: Fila) => (campo: keyof ValoresEdicion, valor: string) => {
    setEdiciones((e) => ({ ...e, [f.id]: { ...(e[f.id] ?? iniciales(f)), [campo]: valor } }));
    setErroresFila((er) => {
      if (!(f.id in er)) return er;
      const resto = { ...er };
      delete resto[f.id];
      return resto;
    });
  };

  const salirDeEdicion = () => {
    setEditandoTodos(false);
    setEdiciones({});
    setErroresFila({});
  };

  const cancelarTodos = () => {
    if (modificadas.length > 0 && !window.confirm(`¿Descartar los cambios de ${modificadas.length === 1 ? "1 fila" : `${modificadas.length} filas`}?`)) return;
    salirDeEdicion();
    setResultadoMasivo(null);
  };

  const guardarTodos = () =>
    iniciar(async () => {
      const r = await guardarEdicionesMasivas(modificadas.map((f) => ({ id: f.id, datos: aEdicionRapida(f, ediciones[f.id]) })));
      if (r.ok) {
        salirDeEdicion();
        setResultadoMasivo({ ok: true, texto: r.mensaje });
      } else {
        setErroresFila(r.porFila);
        setResultadoMasivo({ ok: false, texto: r.error });
      }
    });

  // Solo cuentan las filas que siguen en pantalla (pueden cambiar con los filtros o al borrar).
  const elegidas = filas.filter((f) => seleccion.has(f.id));
  const todas = filas.length > 0 && elegidas.length === filas.length;

  const alternar = (id: number, marcada: boolean) =>
    setSeleccion((s) => {
      const nueva = new Set(s);
      if (marcada) nueva.add(id);
      else nueva.delete(id);
      return nueva;
    });

  const eliminar = () => {
    const cantidad = elegidas.length;
    if (
      !window.confirm(
        `¿Eliminar ${cantidad === 1 ? "1 inscripto" : `${cantidad} inscriptos`}? Se borran sus datos y no se puede deshacer.`,
      )
    ) {
      return;
    }
    iniciar(async () => {
      const r = await eliminarInscriptos(elegidas.map((f) => f.id));
      setResultado(r);
      if (r.ok) setSeleccion(new Set());
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFichasAbiertas((a) => !a)} className={claseBotonBarra}>
          {fichasAbiertas ? "Cerrar todas las fichas" : "Abrir todas las fichas"}
        </button>
        {puedeEditar && !editandoTodos && (
          <button
            type="button"
            onClick={() => {
              setEditandoTodos(true);
              setResultadoMasivo(null);
            }}
            className={claseBotonBarra}
          >
            Editar todos
          </button>
        )}
      </div>

      {editandoTodos && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-amarillo bg-white px-4 py-3 shadow-sm">
          <p className="mr-auto text-sm text-marino">
            <strong>Editando todos.</strong>{" "}
            {modificadas.length === 0
              ? "Cambiá lo que necesites en cualquier fila y guardá todo junto al final."
              : `${modificadas.length === 1 ? "1 fila modificada" : `${modificadas.length} filas modificadas`} (en amarillo).`}
          </p>
          <button type="button" onClick={cancelarTodos} disabled={pendiente} className={claseBotonBarra}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarTodos}
            disabled={pendiente || modificadas.length === 0}
            className="rounded-lg bg-marino px-4 py-1.5 text-sm font-semibold text-white hover:bg-marino/90 disabled:opacity-50"
          >
            {pendiente ? "Guardando…" : `Guardar cambios${modificadas.length ? ` (${modificadas.length})` : ""}`}
          </button>
        </div>
      )}
      {resultadoMasivo && (
        <p role={resultadoMasivo.ok ? "status" : "alert"} className={`text-sm font-medium ${resultadoMasivo.ok ? "text-marino" : "text-rojo"}`}>
          {resultadoMasivo.texto}
        </p>
      )}
      {elegidas.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-rojo/40 bg-white px-4 py-3 shadow-sm">
          <p className="mr-auto text-sm font-semibold text-marino">
            {elegidas.length === 1 ? "1 inscripto seleccionado" : `${elegidas.length} inscriptos seleccionados`}
          </p>
          <button
            type="button"
            onClick={() => setSeleccion(new Set())}
            disabled={pendiente}
            className="rounded-lg border-2 border-marino/20 px-3 py-1.5 text-sm font-semibold text-marino hover:border-marino disabled:opacity-50"
          >
            Quitar selección
          </button>
          <button
            type="button"
            onClick={eliminar}
            disabled={pendiente}
            className="rounded-lg bg-rojo px-3 py-1.5 text-sm font-semibold text-white hover:bg-rojo/90 disabled:opacity-50"
          >
            {pendiente ? "Eliminando…" : "Eliminar seleccionados"}
          </button>
        </div>
      )}
      {resultado && (
        <p role={resultado.ok ? "status" : "alert"} className={`text-sm font-medium ${resultado.ok ? "text-marino" : "text-rojo"}`}>
          {resultado.ok ? resultado.mensaje : resultado.errores.join(" ")}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-marino/10">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-marino/5 text-xs tracking-wide text-marino uppercase">
            <tr>
              <th scope="col" className="py-3 pl-3">
                {puedeBorrar && (
                <input
                  type="checkbox"
                  checked={todas}
                  ref={(el) => {
                    if (el) el.indeterminate = elegidas.length > 0 && !todas;
                  }}
                  onChange={(e) => setSeleccion(e.target.checked ? new Set(filas.map((f) => f.id)) : new Set())}
                  aria-label="Seleccionar todos los inscriptos de la lista"
                  className="size-4 accent-marino"
                />
                )}
              </th>
              <th scope="col" className="py-3 pl-1">
                <span className="sr-only">Ver ficha rápida</span>
              </th>
              <th scope="col" className="px-3 py-3">Alta</th>
              <th scope="col" className="px-3 py-3">Niño/a</th>
              <th scope="col" className="px-3 py-3">Documento</th>
              <th scope="col" className="px-3 py-3">Edad</th>
              <th scope="col" className="px-3 py-3">Grupo</th>
              <th scope="col" className="px-3 py-3">Asistencia</th>
              <th scope="col" className="px-3 py-3">Estado</th>
              <th scope="col" className="px-3 py-3">Contacto principal</th>
              <th scope="col" className="px-3 py-3">
                <span className="sr-only">Editar</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-marino/10">
            {filas.map((f) => (
              <FilaInscripto
                key={f.id}
                fila={f}
                opciones={opciones}
                familia={familias[f.nino.familiaId]}
                contacto={contactos[f.nino.familiaId]}
                temporadaId={temporadaId}
                mensajes={mensajes}
                puedeEditar={puedeEditar}
                puedeBorrar={puedeBorrar}
                grupos={grupos}
                seleccionada={seleccion.has(f.id)}
                alternarSeleccion={(marcada) => alternar(f.id, marcada)}
                fichasAbiertas={fichasAbiertas}
                masiva={
                  editandoTodos
                    ? { valores: ediciones[f.id] ?? iniciales(f), cambiar: cambiarMasivo(f), error: erroresFila[f.id], modificada: modificada(f) }
                    : undefined
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
