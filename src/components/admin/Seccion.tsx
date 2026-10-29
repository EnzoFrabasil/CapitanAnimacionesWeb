import type { ReactNode } from "react";
import { claseTarjeta } from "./estilos";

/** Título de cada página del panel con una línea que explica para qué sirve. */
export function EncabezadoPagina({ titulo, ayuda, children }: { titulo: string; ayuda: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-titulo text-3xl font-bold text-marino">{titulo}</h1>
        <p className="mt-1 max-w-3xl text-sm text-texto/90">{ayuda}</p>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Tarjeta con título (y una ayuda opcional) para agrupar un formulario. */
export function Seccion({ titulo, ayuda, children, className = "" }: { titulo: string; ayuda?: ReactNode; children: ReactNode; className?: string }) {
  const id = `seccion-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`${claseTarjeta} ${className}`}>
      <h2 id={id} className="text-lg font-semibold text-marino">
        {titulo}
      </h2>
      {ayuda && <p className="mt-1 text-sm text-texto/80">{ayuda}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
