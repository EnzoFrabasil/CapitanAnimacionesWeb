/** Quita puntos y espacios. Devuelve null si no quedan 7 u 8 dígitos. */
export function normalizarDni(entrada: string): string | null {
  const limpio = entrada.replace(/[.\s]/g, "");
  return /^\d{7,8}$/.test(limpio) ? limpio : null;
}
