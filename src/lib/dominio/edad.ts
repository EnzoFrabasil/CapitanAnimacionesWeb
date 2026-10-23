import { EDAD_MAXIMA, EDAD_MINIMA } from "@/config/inscripcion";

/** Edad en años cumplidos a una fecha dada (ambas como Date a las 00:00 UTC). */
export function calcularEdad(fechaNacimiento: Date, alDia: Date): number {
  let edad = alDia.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const mesDif = alDia.getUTCMonth() - fechaNacimiento.getUTCMonth();
  if (mesDif < 0 || (mesDif === 0 && alDia.getUTCDate() < fechaNacimiento.getUTCDate())) {
    edad--;
  }
  return edad;
}

/** Mensaje de error si la fecha de nacimiento no es válida para inscribir, o null si está bien. */
export function validarFechaNacimiento(fechaNacimiento: Date, hoy: Date): string | null {
  if (fechaNacimiento >= hoy) return "La fecha de nacimiento tiene que ser anterior a hoy.";
  const edad = calcularEdad(fechaNacimiento, hoy);
  if (edad < EDAD_MINIMA || edad > EDAD_MAXIMA) {
    return `La edad tiene que estar entre ${EDAD_MINIMA} y ${EDAD_MAXIMA} años (hoy tendría ${edad}).`;
  }
  return null;
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
