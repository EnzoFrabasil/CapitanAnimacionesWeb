import type { MODALIDADES, TURNOS } from "@/lib/validacion/inscripcion";

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
  turno: (typeof TURNOS)[number] | "";
  modalidad: (typeof MODALIDADES)[number];
  semanas: number[];
  dias: string[];
}

/** Devuelve el error visible de un campo (por ejemplo "ninos.0.dni"), si corresponde mostrarlo. */
export type ErrorDe = (path: string) => string | undefined;

/** Acentos de color que rotan entre las tarjetas de cada niño/a. */
export const ACENTOS = [
  { borde: "border-t-naranja", punto: "bg-naranja" },
  { borde: "border-t-azul", punto: "bg-azul" },
  { borde: "border-t-verde", punto: "bg-verde" },
  { borde: "border-t-violeta", punto: "bg-violeta" },
  { borde: "border-t-amarillo", punto: "bg-amarillo" },
  { borde: "border-t-petroleo", punto: "bg-petroleo" },
  { borde: "border-t-rojo", punto: "bg-rojo" },
] as const;
