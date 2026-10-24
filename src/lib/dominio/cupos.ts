// Cálculo de lugares disponibles de una temporada (sin acceso a la base).

export interface Cupos {
  total: number;
  ocupados: number;
  quedan: number;
}

export function calcularCupos(total: number, ocupados: number): Cupos {
  return { total, ocupados, quedan: Math.max(0, total - ocupados) };
}

export type UrgenciaCupos = "completo" | "ultimos" | "normal";

/** "ultimos" cuando queda el 15 % o menos del cupo (y como mínimo con 5 lugares o menos). */
export function urgenciaCupos({ total, quedan }: Pick<Cupos, "total" | "quedan">): UrgenciaCupos {
  if (quedan <= 0) return "completo";
  if (quedan <= Math.max(5, Math.floor(total * 0.15))) return "ultimos";
  return "normal";
}
