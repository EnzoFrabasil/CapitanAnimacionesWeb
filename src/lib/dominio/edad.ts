/** Edad en años cumplidos a una fecha dada (ambas como Date a las 00:00 UTC). */
export function calcularEdad(fechaNacimiento: Date, alDia: Date): number {
  let edad = alDia.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const mesDif = alDia.getUTCMonth() - fechaNacimiento.getUTCMonth();
  if (mesDif < 0 || (mesDif === 0 && alDia.getUTCDate() < fechaNacimiento.getUTCDate())) {
    edad--;
  }
  return edad;
}

export interface RangoEdad {
  id: number;
  edadMin: number;
  edadMax: number;
}

/** Grupo cuyo rango (inclusivo) contiene la edad, o null si no hay ninguno ("sin grupo"). */
export function asignarGrupo<T extends RangoEdad>(edad: number, grupos: readonly T[]): T | null {
  return grupos.find((g) => g.edadMin <= edad && edad <= g.edadMax) ?? null;
}
