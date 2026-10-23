"use client";

import { sitio } from "@/config/sitio";
import { MensajeError } from "./campos";

/**
 * Consentimiento para el uso de los datos (Ley 25.326). A propósito es una casilla
 * simple con un texto cálido: el detalle formal queda en /privacidad.
 */
export function CasillaPrivacidad({
  marcada,
  error,
  cambiar,
}: {
  marcada: boolean;
  error?: string;
  cambiar: (marcada: boolean) => void;
}) {
  return (
    <div className="mt-6 px-1">
      <label htmlFor="aceptaPrivacidad" className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          id="aceptaPrivacidad"
          type="checkbox"
          checked={marcada}
          onChange={(e) => cambiar(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "aceptaPrivacidad-error" : undefined}
          className={`mt-0.5 size-5 shrink-0 accent-marino ${error ? "outline-2 outline-offset-2 outline-rojo" : ""}`}
        />
        <span>
          Acepto que {sitio.nombre} use estos datos para organizar la colonia y cuidar a los chicos.{" "}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener"
            className="font-medium text-marino underline underline-offset-2"
          >
            Ver más
          </a>
        </span>
      </label>
      <MensajeError id="aceptaPrivacidad-error" mensaje={error} />
    </div>
  );
}
