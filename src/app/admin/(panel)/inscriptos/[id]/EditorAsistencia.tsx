"use client";

import { useState } from "react";
import { claseEtiqueta } from "@/components/admin/estilos";
import { diasDeOpcion, horarios, type Opcion } from "@/lib/dominio/opciones";
import { formatearDiaCorto } from "@/lib/formato";

/** Valor de la casilla de un día: "aaaa-mm-dd@idOpcion". */
export const valorDia = (fecha: string, opcion: number) => `${fecha}@${opcion}`;

/** Modalidad y asistencia (opciones o días) dentro del formulario de inscripción del panel. */
export function EditorAsistencia({
  modalidad: modalidadInicial,
  opciones,
  opcionesElegidas,
  diasElegidos,
}: {
  modalidad: "SEMANAS" | "POR_DIA";
  /** Todas las opciones de la temporada, también las desactivadas. */
  opciones: Opcion[];
  opcionesElegidas: number[];
  diasElegidos: { fecha: string; opcion: number }[];
}) {
  const [modalidad, setModalidad] = useState(modalidadInicial);
  const grupos = horarios(opciones);
  const diaElegido = (fecha: string, opcion: number) => diasElegidos.some((d) => d.fecha === fecha && d.opcion === opcion);

  return (
    <fieldset className="sm:col-span-2">
      <legend className={claseEtiqueta}>Asistencia</legend>
      <div className="flex gap-4 text-sm">
        {([
          ["SEMANAS", "Opciones"],
          ["POR_DIA", "Días sueltos"],
        ] as const).map(([m, texto]) => (
          <label key={m} className="flex items-center gap-2">
            <input type="radio" name="modalidad" value={m} checked={modalidad === m} onChange={() => setModalidad(m)} className="accent-marino" />
            {texto}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs">Todas de un mismo horario. Si marca todas las de un horario, cuenta como colonia completa.</p>

      {/* Ambas listas quedan en el DOM (ocultas) para no perder lo marcado al cambiar de modalidad;
          el servidor guarda solo la de la modalidad elegida. */}
      <div className={`mt-2 space-y-2 text-sm ${modalidad === "SEMANAS" ? "" : "hidden"}`}>
        {grupos.map((h) => (
          <div key={h.clave}>
            <p className="mb-1 text-xs font-semibold text-marino">{h.texto}</p>
            <div className="flex flex-wrap gap-2">
              {h.opciones.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded-lg border border-marino/20 px-3 py-1.5">
                  <input type="checkbox" name="semanas" value={o.id} defaultChecked={opcionesElegidas.includes(o.id)} className="accent-marino" />
                  {o.nombre} ({formatearDiaCorto(o.fechaInicio)} al {formatearDiaCorto(o.fechaFin)})
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-2 space-y-2 text-sm ${modalidad === "POR_DIA" ? "" : "hidden"}`}>
        {grupos.flatMap((h) =>
          h.opciones.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-2">
              <span className="w-36 text-xs font-semibold text-marino">
                {o.nombre} · {h.texto}
              </span>
              {diasDeOpcion(o).map((dia) => (
                <label key={dia} className="flex items-center gap-1.5 rounded-lg border border-marino/20 px-2 py-1">
                  <input type="checkbox" name="dias" value={valorDia(dia, o.id)} defaultChecked={diaElegido(dia, o.id)} className="accent-marino" />
                  {formatearDiaCorto(dia)}
                </label>
              ))}
            </div>
          )),
        )}
      </div>
    </fieldset>
  );
}
