"use client";

import { startTransition, useActionState, type ReactNode } from "react";
import type { AccionPanel, ResultadoAccion } from "@/lib/admin/resultado";
import { claseBoton } from "./estilos";

export function MensajeResultado({ resultado }: { resultado: ResultadoAccion | null }) {
  if (!resultado) return null;
  if (resultado.ok) {
    return (
      <p role="status" className="text-sm font-medium text-marino">
        <span aria-hidden className="mr-1 inline-block size-2 rounded-full bg-verde" />
        {resultado.mensaje}
      </p>
    );
  }
  return (
    <ul role="alert" className="space-y-0.5 text-sm font-medium text-rojo">
      {resultado.errores.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

/**
 * Formulario que ejecuta una acción del servidor y muestra su resultado.
 * Se envía a mano (no con `action=`) para que React no borre lo escrito si hay un error.
 */
export function FormAccion({
  accion,
  children,
  textoBoton,
  textoPendiente = "Guardando…",
  variante = "primario",
  className = "",
}: {
  accion: AccionPanel;
  children?: ReactNode;
  textoBoton: string;
  textoPendiente?: string;
  variante?: keyof typeof claseBoton;
  className?: string;
}) {
  const [resultado, ejecutar, pendiente] = useActionState(accion, null);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => ejecutar(datos));
      }}
    >
      {children}
      <div className={`flex flex-wrap items-center gap-3 ${children ? "mt-4" : ""}`}>
        <button type="submit" disabled={pendiente} className={claseBoton[variante]}>
          {pendiente ? textoPendiente : textoBoton}
        </button>
        <div aria-live="polite">
          <MensajeResultado resultado={resultado} />
        </div>
      </div>
    </form>
  );
}
