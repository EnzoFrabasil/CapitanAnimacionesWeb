import { ETIQUETA_TURNO } from "@/lib/formato";

// Cómo se llama cada período de la colonia (las "semanas" de la base) y los
// horarios de los turnos. Se configuran por temporada desde el panel.

export const NOMBRES_PERIODO = ["Semana", "Quincena"] as const;
export type NombrePeriodo = (typeof NOMBRES_PERIODO)[number];

export interface Periodo {
  /** "Semana", "Quincena" */
  singular: string;
  /** "Semanas", "Quincenas" */
  plural: string;
  /** Abreviatura para el listado del panel: "S1", "Q1" */
  inicial: string;
}

export function periodo(nombre: string = "Semana"): Periodo {
  return { singular: nombre, plural: `${nombre}s`, inicial: nombre.charAt(0).toUpperCase() };
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
