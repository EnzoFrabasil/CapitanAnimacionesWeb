import { describe, expect, it } from "vitest";
import { BOM, celda, generarCsv, parsearCsv, quitarProteccionFormula } from "./formato";

describe("celda", () => {
  it("deja los valores simples como están", () => {
    expect(celda("Tomás")).toBe("Tomás");
    expect(celda(7)).toBe("7");
    expect(celda(null)).toBe("");
    expect(celda(undefined)).toBe("");
  });

  it("escapa ; comillas, comas y saltos de línea", () => {
    expect(celda("a;b")).toBe('"a;b"');
    expect(celda('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(celda("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"');
    expect(celda("a,b")).toBe('"a,b"');
    expect(celda(" con espacios ")).toBe('" con espacios "');
  });

  it("previene inyección de fórmulas", () => {
    expect(celda("=SUMA(A1)")).toBe("'=SUMA(A1)");
    expect(celda("+5491123456789")).toBe("'+5491123456789");
    expect(celda("-1")).toBe("'-1");
    expect(celda("@usuario")).toBe("'@usuario");
    expect(celda('=HYPERLINK("x";"y")')).toBe(`"'=HYPERLINK(""x"";""y"")"`);
  });
});

describe("generarCsv", () => {
  it("usa BOM, ; y CRLF", () => {
    expect(generarCsv(["a", "b"], [["1", "x;y"]])).toBe(`${BOM}a;b\r\n1;"x;y"\r\n`);
  });
});

describe("parsearCsv", () => {
  it("vuelve a leer lo generado (ida y vuelta)", () => {
    const filas = [
      ["1", "García; Tomás", 'Le dicen "Tomi"', "Alergia:\nmaní", "", "+5491123456789"],
      ["2", "Sofía", "", "", " x ", "=1+1"],
    ];
    const leidas = parsearCsv(generarCsv(["id", "a", "b", "c", "d", "e"], filas));
    expect(leidas[0]).toEqual(["id", "a", "b", "c", "d", "e"]);
    expect(leidas[1].map(quitarProteccionFormula)).toEqual(filas[0]);
    expect(leidas[2].map(quitarProteccionFormula)).toEqual(filas[1]);
  });

  it("acepta coma como separador, sin BOM, con LF y sin salto final", () => {
    expect(parsearCsv('id,nombre\n1,"Pérez, Lucas"\n2,Ana')).toEqual([
      ["id", "nombre"],
      ["1", "Pérez, Lucas"],
      ["2", "Ana"],
    ]);
  });

  it("detecta ; aunque haya comas dentro de comillas en el encabezado", () => {
    expect(parsearCsv('"a,b";c\r\n1;2')).toEqual([
      ["a,b", "c"],
      ["1", "2"],
    ]);
  });

  it("descarta filas vacías", () => {
    expect(parsearCsv("a;b\r\n\r\n;\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("quitarProteccionFormula", () => {
  it("solo quita el apóstrofo que protege una fórmula", () => {
    expect(quitarProteccionFormula("'+549")).toBe("+549");
    expect(quitarProteccionFormula("'hola")).toBe("'hola");
    expect(quitarProteccionFormula("O'Brien")).toBe("O'Brien");
  });
});
