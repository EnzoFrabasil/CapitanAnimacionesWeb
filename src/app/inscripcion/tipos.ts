import { CLASES_ACENTO, ORDEN_ACENTOS } from "@/components/marca/acentos";
import type { MODALIDADES } from "@/lib/validacion/inscripcion";

// Estado del formulario tal como lo edita la persona (todo texto, sin normalizar).

export interface ContactoForm {
  nombre: string;
  apellido: string;
  parentesco: string;
  whatsapp: string;
  whatsappAlt: string;
  email: string;
}

export interface NinoForm {
  clave: number; // solo para las keys de React, no se envía
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  infoAdicional: string;
  modalidad: (typeof MODALIDADES)[number];
  semanas: number[];
  /** Días sueltos, cada uno con la opción a la que pertenece. */
  dias: { fecha: string; opcion: number }[];
}

/** Devuelve el error visible de un campo (por ejemplo "ninos.0.dni"), si corresponde mostrarlo. */
export type ErrorDe = (path: string) => string | undefined;

/** Acentos de color que rotan entre las tarjetas de cada niño/a. */
export const ACENTOS = ORDEN_ACENTOS.map((color) => ({
  borde: CLASES_ACENTO[color].bordeSuperior,
  punto: CLASES_ACENTO[color].punto,
}));
