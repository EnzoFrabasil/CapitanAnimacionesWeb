// Validación de las imágenes que se suben desde el editor de la página de inicio.

/** Tamaño máximo por imagen (el editor las achica antes de subirlas, así que sobra). */
export const TAMANO_MAXIMO_IMAGEN = 3 * 1024 * 1024;

/**
 * Detecta el formato por los primeros bytes del archivo (no se confía en el
 * nombre ni en el tipo que manda el navegador). Solo PNG, JPEG y WebP.
 */
export function detectarTipoImagen(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  const empieza = (firma: number[], desde = 0) => firma.every((b, i) => bytes[desde + i] === b);
  if (empieza([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (empieza([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (empieza([0x52, 0x49, 0x46, 0x46]) && empieza([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}
