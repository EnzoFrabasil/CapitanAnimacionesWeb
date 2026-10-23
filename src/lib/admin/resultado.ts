import { Prisma } from "@/generated/prisma/client";

/** Resultado que devuelven las acciones del panel para mostrar en pantalla. */
export type ResultadoAccion = { ok: true; mensaje: string } | { ok: false; errores: string[] };

export type AccionPanel = (previo: ResultadoAccion | null, datos: FormData) => Promise<ResultadoAccion>;

export const exito = (mensaje: string): ResultadoAccion => ({ ok: true, mensaje });
export const fallo = (...errores: string[]): ResultadoAccion => ({ ok: false, errores });

/** Traduce errores conocidos de Prisma a mensajes para el panel (sin datos personales en el log). */
export function falloPorExcepcion(e: unknown, mensajes: { unico?: string; enUso?: string } = {}): ResultadoAccion {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return fallo(mensajes.unico ?? "Ya existe un registro con esos datos.");
    if (e.code === "P2003") return fallo(mensajes.enUso ?? "No se puede borrar porque está en uso.");
    if (e.code === "P2025") return fallo("El registro ya no existe. Recargá la página.");
    console.error("Error de base de datos en el panel:", e.code);
  } else {
    console.error("Error en el panel:", e instanceof Error ? e.name : "desconocido");
  }
  return fallo("No se pudo guardar. Probá de nuevo.");
}
