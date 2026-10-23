import type { ColorAcento } from "@/config/sitio";

// Clases de Tailwind por color de acento. Tienen que estar escritas completas
// para que Tailwind las detecte (no se pueden armar con `border-${color}`).
export const CLASES_ACENTO: Record<
  ColorAcento,
  { bordeSuperior: string; borde: string; punto: string; fondoSuave: string }
> = {
  naranja: { bordeSuperior: "border-t-naranja", borde: "border-naranja", punto: "bg-naranja", fondoSuave: "bg-naranja/10" },
  azul: { bordeSuperior: "border-t-azul", borde: "border-azul", punto: "bg-azul", fondoSuave: "bg-azul/10" },
  verde: { bordeSuperior: "border-t-verde", borde: "border-verde", punto: "bg-verde", fondoSuave: "bg-verde/10" },
  violeta: { bordeSuperior: "border-t-violeta", borde: "border-violeta", punto: "bg-violeta", fondoSuave: "bg-violeta/10" },
  amarillo: { bordeSuperior: "border-t-amarillo", borde: "border-amarillo", punto: "bg-amarillo", fondoSuave: "bg-amarillo/15" },
  petroleo: { bordeSuperior: "border-t-petroleo", borde: "border-petroleo", punto: "bg-petroleo", fondoSuave: "bg-petroleo/10" },
  rojo: { bordeSuperior: "border-t-rojo", borde: "border-rojo", punto: "bg-rojo", fondoSuave: "bg-rojo/10" },
};

/** Orden en que rotan los acentos (por ejemplo, en las tarjetas de cada niño). */
export const ORDEN_ACENTOS: readonly ColorAcento[] = ["naranja", "azul", "verde", "violeta", "amarillo", "petroleo", "rojo"];
