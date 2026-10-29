"use client";

import { useTransition } from "react";
import { marcarContactado } from "@/app/admin/(panel)/acciones";
import { formatearFechaHora } from "@/lib/formato";

/**
 * Casilla "Contactado" de una familia en la temporada (vale para todos los
 * hermanos). Muestra cuándo y quién la marcó. Sin permiso de edición, solo se ve.
 */
export function MarcaContactado({
  familiaId,
  temporadaId,
  contacto,
  puedeEditar,
}: {
  familiaId: number;
  temporadaId: number;
  contacto: { fecha: string; por: string | null } | undefined;
  puedeEditar: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  const marcado = !!contacto;
  const detalle = contacto ? `${formatearFechaHora(new Date(contacto.fecha))}${contacto.por ? ` · ${contacto.por}` : ""}` : undefined;

  if (!puedeEditar) {
    return marcado ? (
      <span title={detalle} className="inline-block rounded-full bg-verde/15 px-2 py-0.5 text-xs font-semibold text-verde">
        Contactado
      </span>
    ) : null;
  }
  return (
    <label
      title={marcado ? `Contactado el ${detalle}. Tocá para desmarcar.` : "Marcar a la familia como contactada"}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold transition ${
        marcado ? "bg-verde/15 text-verde" : "border border-marino/20 text-texto/70 hover:border-marino/50"
      } ${pendiente ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={marcado}
        disabled={pendiente}
        onChange={(e) => {
          const valor = e.target.checked;
          iniciar(async () => {
            await marcarContactado(familiaId, temporadaId, valor);
          });
        }}
        className="size-3.5 accent-verde"
      />
      {marcado ? "Contactado" : "Sin contactar"}
    </label>
  );
}
