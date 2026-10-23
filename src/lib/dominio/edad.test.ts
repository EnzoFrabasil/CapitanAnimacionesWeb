import { describe, expect, it } from "vitest";
import { EDAD_MAXIMA, EDAD_MINIMA } from "@/config/inscripcion";
import { asignarGrupo, calcularEdad, validarFechaNacimiento } from "./edad";
import { fechaDesdeIso as f, hoyEnArgentina } from "./fechas";

describe("calcularEdad", () => {
  it("cuenta años cumplidos", () => {
    expect(calcularEdad(f("2018-03-10"), f("2026-10-23"))).toBe(8);
  });

  it("el día del cumpleaños ya los cumplió", () => {
    expect(calcularEdad(f("2018-10-23"), f("2026-10-23"))).toBe(8);
  });

  it("el día anterior al cumpleaños todavía no", () => {
    expect(calcularEdad(f("2018-10-24"), f("2026-10-23"))).toBe(7);
    expect(calcularEdad(f("2018-11-01"), f("2026-10-23"))).toBe(7);
  });

  it("nacido un 29 de febrero cumple el 1 de marzo en años no bisiestos", () => {
    expect(calcularEdad(f("2016-02-29"), f("2026-02-28"))).toBe(9);
    expect(calcularEdad(f("2016-02-29"), f("2026-03-01"))).toBe(10);
  });
});

describe("hoyEnArgentina", () => {
  it("usa la fecha de Argentina (UTC-3), no la de UTC", () => {
    // 23/10 a las 01:30 UTC todavía es 22/10 en Buenos Aires.
    expect(hoyEnArgentina(new Date("2026-10-23T01:30:00Z"))).toEqual(f("2026-10-22"));
    expect(hoyEnArgentina(new Date("2026-10-23T03:30:00Z"))).toEqual(f("2026-10-23"));
  });
});

describe("validarFechaNacimiento", () => {
  const hoy = f("2026-10-23");

  it("acepta edades dentro del rango", () => {
    expect(validarFechaNacimiento(f("2019-05-01"), hoy)).toBeNull();
    expect(validarFechaNacimiento(f(`${2026 - EDAD_MINIMA}-10-23`), hoy)).toBeNull();
    expect(validarFechaNacimiento(f(`${2026 - EDAD_MAXIMA - 1}-10-24`), hoy)).toBeNull();
  });

  it("rechaza fechas de hoy o futuras", () => {
    expect(validarFechaNacimiento(hoy, hoy)).toMatch(/anterior a hoy/);
    expect(validarFechaNacimiento(f("2027-01-01"), hoy)).toMatch(/anterior a hoy/);
  });

  it("rechaza edades fuera del rango", () => {
    expect(validarFechaNacimiento(f(`${2026 - EDAD_MINIMA}-10-24`), hoy)).toMatch(/edad/);
    expect(validarFechaNacimiento(f(`${2026 - EDAD_MAXIMA - 1}-10-23`), hoy)).toMatch(/edad/);
  });
});

describe("asignarGrupo", () => {
  const grupos = [
    { id: 1, nombre: "3 a 5", edadMin: 3, edadMax: 5 },
    { id: 2, nombre: "6 a 8", edadMin: 6, edadMax: 8 },
    { id: 3, nombre: "9 a 12", edadMin: 9, edadMax: 12 },
  ];

  it("los límites son inclusivos", () => {
    expect(asignarGrupo(3, grupos)?.id).toBe(1);
    expect(asignarGrupo(5, grupos)?.id).toBe(1);
    expect(asignarGrupo(6, grupos)?.id).toBe(2);
    expect(asignarGrupo(12, grupos)?.id).toBe(3);
  });

  it("devuelve null (sin grupo) si ningún rango contiene la edad", () => {
    expect(asignarGrupo(2, grupos)).toBeNull();
    expect(asignarGrupo(13, grupos)).toBeNull();
    expect(asignarGrupo(7, [])).toBeNull();
  });
});
