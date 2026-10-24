"use client";

import { useState, useTransition } from "react";
import type { FilaInscripto as Fila } from "@/lib/admin/consultas";
import { periodo } from "@/lib/dominio/periodo";
import type { ResultadoAccion } from "@/lib/admin/resultado";
import { eliminarInscriptos } from "./acciones";
import { FilaInscripto } from "./FilaInscripto";

/** Tabla del listado con selección múltiple para eliminar varios inscriptos juntos. */
export function TablaInscriptos({
  filas,
  totalSemanas,
  nombrePeriodo,
  grupos,
}: {
  filas: Fila[];
  totalSemanas: number;
  nombrePeriodo: string;
  grupos: { id: number; nombre: string }[];
}) {
  const [seleccion, setSeleccion] = useState<ReadonlySet<number>>(new Set());
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, iniciar] = useTransition();

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
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-marino/5 text-xs tracking-wide text-marino uppercase">
            <tr>
              <th scope="col" className="py-3 pl-3">
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
              </th>
              <th scope="col" className="px-3 py-3">Alta</th>
              <th scope="col" className="px-3 py-3">Niño/a</th>
              <th scope="col" className="px-3 py-3">Documento</th>
              <th scope="col" className="px-3 py-3">Edad</th>
              <th scope="col" className="px-3 py-3">Grupo</th>
              <th scope="col" className="px-3 py-3">Turno</th>
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
                totalSemanas={totalSemanas}
                inicialPeriodo={periodo(nombrePeriodo).inicial}
                grupos={grupos}
                seleccionada={seleccion.has(f.id)}
                alternarSeleccion={(marcada) => alternar(f.id, marcada)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
