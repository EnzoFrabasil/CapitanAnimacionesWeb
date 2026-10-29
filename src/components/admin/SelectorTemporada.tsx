"use client";

import { useTransition } from "react";
import { elegirTemporadaPanel } from "@/app/admin/(panel)/acciones";

/** Selector de la temporada que se mira en todo el panel. */
export function SelectorTemporada({ actual, temporadas }: { actual: number; temporadas: { id: number; nombre: string }[] }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-marino">Temporada</span>
      <select
        value={actual}
        disabled={pendiente}
        onChange={(e) => {
          const id = Number(e.target.value);
          iniciar(() => elegirTemporadaPanel(id));
        }}
        className="rounded-lg border border-marino/25 bg-white px-2 py-1 text-sm font-semibold text-marino focus:border-azul focus:ring-2 focus:ring-azul/25 focus:outline-none disabled:opacity-60"
      >
        {temporadas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
