import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { temporadaParaListado } from "./consultas";

// Temporada que se está mirando en el panel. Se elige en la barra de arriba y
// vale para todas las secciones (inscriptos, analíticas, la colonia). Si no se
// eligió ninguna, la abierta o la más reciente.

export const COOKIE_TEMPORADA = "panel_temporada";

/** Temporada del panel (con sus opciones y grupos). Un id pedido explícitamente (link viejo) tiene prioridad. */
export const temporadaDelPanel = cache(async (pedida?: number) => {
  const elegida = Number((await cookies()).get(COOKIE_TEMPORADA)?.value);
  return temporadaParaListado(pedida ?? (Number.isInteger(elegida) && elegida > 0 ? elegida : undefined));
});
