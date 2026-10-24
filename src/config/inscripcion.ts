// Límites del formulario de inscripción. Cambiarlos acá alcanza para que
// se apliquen en el formulario y en la API.

/**
 * Edad mínima y máxima (en años cumplidos, inclusive) por defecto. Cada
 * temporada tiene las suyas (Configuración → temporada).
 */
export const EDAD_MINIMA = 2;
export const EDAD_MAXIMA = 17;

export const MAX_NINOS_POR_INSCRIPCION = 10;

/**
 * Versión del texto de /privacidad. Se guarda con cada inscripción como
 * constancia de qué aceptó la familia: cambiala cada vez que edites ese texto.
 */
export const VERSION_PRIVACIDAD = "2026-10";

export const LARGO_MAXIMO = {
  nombre: 80,
  parentesco: 40,
  email: 120,
  infoAdicional: 2000,
} as const;
