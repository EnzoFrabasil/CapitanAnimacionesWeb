// Cálculo de lugares disponibles de una temporada (sin acceso a la base).

export interface Cupos {
  total: number;
  ocupados: number;
  quedan: number;
}

export function calcularCupos(total: number, ocupados: number): Cupos {
  return { total, ocupados, quedan: Math.max(0, total - ocupados) };
}

/** Lugares libres de una temporada, o null si no tiene cupo (sin límite). */
export const lugaresLibres = (cupo: number | null, ocupados: number): number | null =>
  cupo === null ? null : Math.max(0, cupo - ocupados);

/** Cuántos chicos se pueden cargar en un formulario: el máximo por inscripción, o menos si quedan menos lugares. */
export const maximoNinosPorFormulario = (maximoPorInscripcion: number, lugares: number | null): number =>
  lugares === null ? maximoPorInscripcion : Math.min(maximoPorInscripcion, lugares);

export type ResultadoCupo =
  | { entra: true; /** Con esta inscripción se llena el cupo: hay que cerrarla. */ cierra: boolean }
  | { entra: false; quedan: number };

/** Si una inscripción de `pedidos` chicos entra en el cupo, y si lo completa. */
export function verificarCupo(cupo: number | null, ocupados: number, pedidos: number): ResultadoCupo {
  const quedan = lugaresLibres(cupo, ocupados);
  if (quedan === null) return { entra: true, cierra: false };
  if (pedidos > quedan) return { entra: false, quedan };
  return { entra: true, cierra: pedidos === quedan };
}

export type UrgenciaCupos = "completo" | "ultimos" | "normal";

/** "ultimos" cuando queda el 15 % o menos del cupo (y como mínimo con 5 lugares o menos). */
export function urgenciaCupos({ total, quedan }: Pick<Cupos, "total" | "quedan">): UrgenciaCupos {
  if (quedan <= 0) return "completo";
  if (quedan <= Math.max(5, Math.floor(total * 0.15))) return "ultimos";
  return "normal";
}
