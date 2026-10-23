// Estilos del panel: misma marca que el sitio, pero sobria y priorizando la legibilidad.

export const claseInput =
  "w-full rounded-lg border border-marino/25 bg-white px-3 py-2 text-sm text-texto focus:border-azul focus:ring-2 focus:ring-azul/25 focus:outline-none";

export const claseEtiqueta = "mb-1 block text-sm font-medium text-marino";

export const claseBoton = {
  primario:
    "rounded-lg bg-marino px-4 py-2 text-sm font-semibold text-white transition hover:bg-marino/90 disabled:cursor-wait disabled:opacity-60",
  secundario:
    "rounded-lg border border-marino/30 bg-white px-4 py-2 text-sm font-semibold text-marino transition hover:border-marino disabled:cursor-wait disabled:opacity-60",
  peligro:
    "rounded-lg border border-rojo/40 bg-white px-4 py-2 text-sm font-semibold text-rojo transition hover:border-rojo hover:bg-rojo/5 disabled:cursor-wait disabled:opacity-60",
  destacado:
    "rounded-lg bg-naranja px-4 py-2 text-base font-bold text-white transition hover:bg-naranja/90 disabled:cursor-wait disabled:opacity-60",
} as const;

export const claseTarjeta = "rounded-2xl border border-marino/10 bg-white p-5 shadow-sm";
