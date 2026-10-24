import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";
import { ZONA_HORARIA, fechaDesdeIso } from "@/lib/dominio/fechas";

// Formatos para mostrar en pantalla (sirven en cliente y servidor).

export const ETIQUETA_MODALIDAD = { SEMANAS: "Opciones", POR_DIA: "Días sueltos" } as const;
export const ETIQUETA_ESTADO = { EN_ESPERA: "En espera", CONFIRMADO: "Confirmado", CANCELADO: "Cancelado" } as const;

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** "aaaa-mm-dd" -> "lun 4/1" */
export function formatearDiaCorto(iso: string): string {
  const fecha = fechaDesdeIso(iso);
  return `${DIAS_SEMANA[fecha.getUTCDay()]} ${fecha.getUTCDate()}/${fecha.getUTCMonth() + 1}`;
}

/** "aaaa-mm-dd" -> "04/01/2027" */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA_HORARIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Momento -> "04/01/2027 14:05" (hora de Argentina) */
export function formatearFechaHora(fecha: Date): string {
  return fechaHora.format(fecha).replace(",", "");
}

/** "+5491123456789" -> "+54 9 11 2345 6789" */
export function formatearWhatsapp(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
