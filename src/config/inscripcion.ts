// Límites del formulario de inscripción. Cambiarlos acá alcanza para que
// se apliquen en el formulario y en la API.

/** Edad mínima y máxima (en años cumplidos, inclusive) para poder inscribir. */
export const EDAD_MINIMA = 2;
export const EDAD_MAXIMA = 17;

export const MAX_NINOS_POR_INSCRIPCION = 10;

export const LARGO_MAXIMO = {
  nombre: 80,
  parentesco: 40,
  email: 120,
  infoAdicional: 2000,
} as const;
