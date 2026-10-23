import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";
import { fechaDesdeIso } from "@/lib/dominio/fechas";

// Formatos para mostrar en pantalla (sirven en cliente y servidor).

export const ETIQUETA_TURNO = { MANANA: "Mañana", TARDE: "Tarde" } as const;
export const ETIQUETA_MODALIDAD = { SEMANAS: "Por semanas", POR_DIA: "Por día" } as const;
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

/** "+5491123456789" -> "+54 9 11 2345 6789" */
export function formatearWhatsapp(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}
