import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js/mobile";

// La metadata "mobile" valida que el número sea de celular, que es lo que
// necesitamos para WhatsApp. Se acepta cualquier país: el formulario pide el
// código de país aparte (arranca en 54) y, si no hay "+", se asume Argentina.

/** Código de país con el que arrancan los campos de teléfono del formulario. */
export const CODIGO_PAIS_INICIAL = "54";

/** Separa "+54 11 2345-6789" en código de país ("54") y el resto del número. */
export function separarTelefono(valor: string): { codigo: string; numero: string } {
  const m = /^\s*\+(\d{0,4})\s*(.*)$/.exec(valor);
  return m ? { codigo: m[1], numero: m[2] } : { codigo: CODIGO_PAIS_INICIAL, numero: valor };
}

/** Une código de país y número en el texto que se valida ("+54 11 2345-6789"). */
export const unirTelefono = (codigo: string, numero: string) => `+${codigo} ${numero}`;

/** true si el campo quedó solo con un código de país (por ejemplo "+54"), o sea, sin número. */
export function soloCodigoDePais(entrada: string): boolean {
  return /^\+\d{0,4}$/.test(entrada.replace(/[\s-]/g, ""));
}

/** Países (códigos ISO, por ejemplo "UY") que usan un código telefónico ("598"). */
export function paisesDelCodigo(codigo: string): string[] {
  if (!codigo) return [];
  return getCountries().filter((pais) => getCountryCallingCode(pais) === codigo);
}

function movilArgentino(texto: string): string | null {
  const numero = parsePhoneNumberFromString(texto, "AR");
  if (numero?.country === "AR" && numero.isValid()) return numero.number;
  return null;
}

/**
 * Normaliza un celular a E.164 (+549..., +598..., etc.). Devuelve null si no es
 * un celular válido.
 *
 * - Con "+" o "00" y un código de país distinto de 54: se valida para ese país.
 * - Argentina, escrito de cualquier forma ("11 2345-6789", "011 15 2345 6789",
 *   "+54 9 11 2345 6789", ...): se lleva a +549 + código de área + número.
 */
export function normalizarWhatsapp(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto || soloCodigoDePais(texto)) return null;

  const directo = movilArgentino(texto);
  if (directo) return directo;

  let digitos = texto.replace(/\D/g, "");
  if (texto.startsWith("+") || digitos.startsWith("00")) {
    digitos = digitos.replace(/^00/, "");
    if (!digitos.startsWith("54")) {
      const extranjero = parsePhoneNumberFromString(`+${digitos}`);
      return extranjero?.isValid() ? extranjero.number : null;
    }
    digitos = digitos.slice(2);
  } else if (digitos.startsWith("54") && digitos.length >= 12) {
    digitos = digitos.slice(2);
  }
  digitos = digitos.replace(/^0/, "").replace(/^9/, "");

  // Código de área + número sin el 9 de móvil (10 dígitos): "11 2345-6789".
  if (digitos.length === 10) return movilArgentino(`+549${digitos}`);

  // Con el "15" después del código de área (de 2 a 4 dígitos): "2944 15 123456".
  if (digitos.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (digitos.slice(largoArea, largoArea + 2) !== "15") continue;
      const sin15 = digitos.slice(0, largoArea) + digitos.slice(largoArea + 2);
      const movil = movilArgentino(`+549${sin15}`);
      if (movil) return movil;
    }
  }
  return null;
}
