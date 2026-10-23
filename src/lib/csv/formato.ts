// CSV para Excel en español: UTF-8 con BOM, separador ";" y fin de línea CRLF.

export const BOM = "﻿";
export const SEPARADOR = ";";

const INICIO_FORMULA = /^[=+\-@]/;

/**
 * Prepara un valor para una celda: evita la inyección de fórmulas (si empieza con
 * =, +, - o @ se antepone ') y lo encierra entre comillas si hace falta.
 */
export function celda(valor: string | number | null | undefined): string {
  let texto = valor === null || valor === undefined ? "" : String(valor);
  if (INICIO_FORMULA.test(texto)) texto = `'${texto}`;
  if (/[;",\r\n]/.test(texto) || texto !== texto.trim()) {
    texto = `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function generarCsv(encabezados: readonly string[], filas: readonly (readonly (string | number | null | undefined)[])[]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(SEPARADOR));
  return BOM + lineas.join("\r\n") + "\r\n";
}

/** Quita el ' que agrega `celda` delante de =, +, - o @. */
export function quitarProteccionFormula(texto: string): string {
  return /^'[=+\-@]/.test(texto) ? texto.slice(1) : texto;
}

/** Detecta el separador (";" o ",") contando en la primera línea, fuera de comillas. */
function detectarSeparador(texto: string): ";" | "," {
  let puntoYComa = 0;
  let coma = 0;
  let entreComillas = false;
  for (const c of texto) {
    if (c === '"') entreComillas = !entreComillas;
    else if (!entreComillas && (c === "\n" || c === "\r")) break;
    else if (!entreComillas && c === ";") puntoYComa++;
    else if (!entreComillas && c === ",") coma++;
  }
  return coma > puntoYComa ? "," : ";";
}

/**
 * Parsea un CSV (RFC 4180): acepta ";" o ",", con o sin BOM, comillas dobles
 * escapadas y saltos de línea dentro de comillas. Descarta las filas vacías.
 */
export function parsearCsv(entrada: string): string[][] {
  const texto = entrada.startsWith(BOM) ? entrada.slice(1) : entrada;
  const sep = detectarSeparador(texto);
  const filas: string[][] = [];
  let fila: string[] = [];
  let valor = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        valor += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        valor += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === sep) {
      fila.push(valor);
      valor = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(valor);
      filas.push(fila);
      fila = [];
      valor = "";
    } else {
      valor += c;
    }
  }
  if (valor !== "" || fila.length > 0) {
    fila.push(valor);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((v) => v.trim() !== ""));
}
