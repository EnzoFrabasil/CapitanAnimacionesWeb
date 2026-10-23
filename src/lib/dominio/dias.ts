import { fechaAIso, fechaDesdeIso, sumarDias } from "./fechas";

export interface SemanaRango {
  fechaInicio: string; // aaaa-mm-dd
  fechaFin: string; // aaaa-mm-dd
}

export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getUTCDay();
  return dia >= 1 && dia <= 5;
}

/** Días de lunes a viernes dentro de las semanas (inclusive), ordenados y sin repetir, como aaaa-mm-dd. */
export function diasHabilesDeSemanas(semanas: readonly SemanaRango[]): string[] {
  const dias = new Set<string>();
  for (const s of semanas) {
    const fin = fechaDesdeIso(s.fechaFin);
    for (let d = fechaDesdeIso(s.fechaInicio); d <= fin; d = sumarDias(d, 1)) {
      if (esDiaHabil(d)) dias.add(fechaAIso(d));
    }
  }
  return [...dias].sort();
}
