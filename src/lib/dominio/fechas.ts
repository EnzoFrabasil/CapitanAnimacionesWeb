// Las fechas sin hora (nacimiento, semanas, días) se manejan como Date a las
// 00:00 UTC, que es como Prisma lee y escribe las columnas @db.Date.

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

/** Fecha de hoy en Argentina, como Date a las 00:00 UTC. */
export function hoyEnArgentina(ahora: Date = new Date()): Date {
  // en-CA formatea como aaaa-mm-dd.
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  return fechaDesdeIso(iso);
}

/** Convierte "aaaa-mm-dd" en Date a las 00:00 UTC. Devuelve null si no es una fecha real. */
export function fechaDesdeIsoONull(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

export function fechaDesdeIso(iso: string): Date {
  const fecha = fechaDesdeIsoONull(iso);
  if (!fecha) throw new Error(`Fecha inválida: ${iso}`);
  return fecha;
}

/** Date (00:00 UTC) a "aaaa-mm-dd". */
export function fechaAIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function sumarDias(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setUTCDate(copia.getUTCDate() + dias);
  return copia;
}
