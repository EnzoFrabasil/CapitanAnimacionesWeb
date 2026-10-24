import { ETIQUETA_TURNO } from "@/lib/formato";

// Cómo se llama cada período de la colonia (las "semanas" de la base) y los
// horarios de los turnos. Se configuran por temporada desde el panel.

/** Sugerencias para el panel; se puede escribir cualquier nombre. */
export const NOMBRES_PERIODO_SUGERIDOS = ["Semana", "Quincena"] as const;
export const LARGO_MAXIMO_PERIODO = 30;

export interface Periodo {
  /** "Semana", "Quincena" */
  singular: string;
  /** "Semanas", "Quincenas" */
  plural: string;
  /** Abreviatura para el listado del panel: "S1", "Q1" */
  inicial: string;
}

/** Plural en castellano: "Semana" → "Semanas", "Mes" → "Meses", "Vez" → "Veces". */
export function pluralizar(palabra: string): string {
  if (/[aeiouáéíóú]$/i.test(palabra)) return `${palabra}s`;
  if (/z$/i.test(palabra)) return `${palabra.slice(0, -1)}ces`;
  return `${palabra}es`;
}

export function periodo(nombre: string = "Semana"): Periodo {
  const singular = nombre.trim() || "Semana";
  return { singular, plural: pluralizar(singular), inicial: singular.charAt(0).toUpperCase() };
}

/** "Por quincenas" / "Por día" */
export const etiquetaModalidad = (modalidad: "SEMANAS" | "POR_DIA", p: Periodo) =>
  modalidad === "SEMANAS" ? `Por ${p.plural.toLowerCase()}` : "Por día";

export type HorariosTurno = Partial<Record<keyof typeof ETIQUETA_TURNO, string>>;

/** "Mañana (8:30 a 12:30 hs)", o solo "Mañana" si no hay horario cargado. */
export function etiquetaTurno(turno: keyof typeof ETIQUETA_TURNO, horarios?: HorariosTurno): string {
  const horario = horarios?.[turno]?.trim();
  return horario ? `${ETIQUETA_TURNO[turno]} (${horario})` : ETIQUETA_TURNO[turno];
}
