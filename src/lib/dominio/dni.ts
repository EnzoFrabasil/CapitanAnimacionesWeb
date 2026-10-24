/**
 * Normaliza un documento: DNI argentino o documento/pasaporte de otro país.
 * Quita puntos, espacios y guiones y pasa letras a mayúsculas
 * ("45.123.456" → "45123456", "ab-123 456" → "AB123456"). Acepta de 5 a 20
 * letras o números, con al menos un número. Devuelve null si no es válido.
 */
export function normalizarDni(entrada: string): string | null {
  const limpio = entrada.replace(/[.\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{5,20}$/.test(limpio) && /\d/.test(limpio) ? limpio : null;
}

/** Mensaje para un documento inválido. */
export const MENSAJE_DNI_INVALIDO = "Revisá el documento: DNI o, si no es argentino, el número de documento o pasaporte.";
