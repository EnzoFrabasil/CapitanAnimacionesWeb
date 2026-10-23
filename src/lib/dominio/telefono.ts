import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

// La metadata "mobile" valida que el número sea de celular, que es lo que
// necesitamos para WhatsApp. Todo es Argentina: no se pregunta el país.

function movilArgentino(texto: string): string | null {
  const numero = parsePhoneNumberFromString(texto, "AR");
  if (numero?.country === "AR" && numero.isValid()) return numero.number;
  return null;
}

/**
 * Normaliza un WhatsApp argentino escrito de cualquier forma
 * ("11 2345-6789", "011 15 2345 6789", "+54 9 11 2345 6789", ...)
 * a E.164 de móvil (+549...). Devuelve null si no es un celular argentino válido.
 */
export function normalizarWhatsapp(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;

  const directo = movilArgentino(texto);
  if (directo) return directo;

  // Si viene con prefijo internacional, tiene que ser +54.
  let digitos = texto.replace(/\D/g, "");
  if (texto.startsWith("+") || digitos.startsWith("00")) {
    digitos = digitos.replace(/^00/, "");
    if (!digitos.startsWith("54")) return null;
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
