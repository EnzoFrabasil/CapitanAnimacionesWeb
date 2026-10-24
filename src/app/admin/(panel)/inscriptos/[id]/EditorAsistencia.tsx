"use client";

import { useState } from "react";
import { claseEtiqueta } from "@/components/admin/estilos";
import { diasHabilesDeSemanas } from "@/lib/dominio/dias";
import { etiquetaModalidad, periodo } from "@/lib/dominio/periodo";
import { formatearDiaCorto } from "@/lib/formato";

/** Modalidad y asistencia (semanas o días) dentro del formulario de inscripción del panel. */
export function EditorAsistencia({
  nombrePeriodo,
  modalidad: modalidadInicial,
  semanas,
  semanasElegidas,
  diasElegidos,
}: {
  nombrePeriodo: string;
  modalidad: "SEMANAS" | "POR_DIA";
  semanas: { id: number; numero: number; fechaInicio: string; fechaFin: string }[];
  semanasElegidas: number[];
  diasElegidos: string[];
}) {
  const [modalidad, setModalidad] = useState(modalidadInicial);

  return (
    <fieldset className="sm:col-span-2">
      <legend className={claseEtiqueta}>Asistencia</legend>
      <div className="flex gap-4 text-sm">
        {(["SEMANAS", "POR_DIA"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2">
            <input type="radio" name="modalidad" value={m} checked={modalidad === m} onChange={() => setModalidad(m)} className="accent-marino" />
            {etiquetaModalidad(m, periodo(nombrePeriodo))}
          </label>
        ))}
      </div>

      {/* Ambas listas quedan en el DOM (ocultas) para no perder lo marcado al cambiar de modalidad;
          el servidor guarda solo la de la modalidad elegida. */}
      <div className={`mt-2 flex flex-wrap gap-3 text-sm ${modalidad === "SEMANAS" ? "" : "hidden"}`}>
        {semanas.map((s) => (
          <label key={s.id} className="flex items-center gap-2 rounded-lg border border-marino/20 px-3 py-1.5">
            <input type="checkbox" name="semanas" value={s.id} defaultChecked={semanasElegidas.includes(s.id)} className="accent-marino" />
            Semana {s.numero} ({formatearDiaCorto(s.fechaInicio)} al {formatearDiaCorto(s.fechaFin)})
          </label>
        ))}
      </div>
      <div className={`mt-2 space-y-2 text-sm ${modalidad === "POR_DIA" ? "" : "hidden"}`}>
        {semanas.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-xs font-semibold text-marino">
              {nombrePeriodo} {s.numero}
            </span>
            {diasHabilesDeSemanas([s]).map((dia) => (
              <label key={dia} className="flex items-center gap-1.5 rounded-lg border border-marino/20 px-2 py-1">
                <input type="checkbox" name="dias" value={dia} defaultChecked={diasElegidos.includes(dia)} className="accent-marino" />
                {formatearDiaCorto(dia)}
              </label>
            ))}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
