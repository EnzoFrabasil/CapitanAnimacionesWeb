import { describe, expect, it } from "vitest";
import { diasHabilesDeSemanas } from "./dias";
import { normalizarDni } from "./dni";
import { elegirFamilia } from "./familia";

describe("normalizarDni", () => {
  it("acepta documentos de otros países y pasaportes", () => {
    expect(normalizarDni("ab-123 456")).toBe("AB123456");
    expect(normalizarDni("4.567.890-1")).toBe("45678901");
    expect(normalizarDni("123456789")).toBe("123456789");
  });

  it("acepta puntos y espacios y guarda solo dígitos", () => {
    expect(normalizarDni("45.123.456")).toBe("45123456");
    expect(normalizarDni(" 45 123 456 ")).toBe("45123456");
    expect(normalizarDni("5.123.456")).toBe("5123456");
  });

  it("rechaza largos inválidos u otros caracteres", () => {
    expect(normalizarDni("1234")).toBeNull();
    expect(normalizarDni("ABCDEF")).toBeNull(); // sin números
    expect(normalizarDni("45/123/456")).toBeNull();
    expect(normalizarDni("1".repeat(21))).toBeNull();
    expect(normalizarDni("")).toBeNull();
  });
});

describe("diasHabilesDeSemanas", () => {
  it("devuelve solo lunes a viernes, sin repetir y ordenados", () => {
    const dias = diasHabilesDeSemanas([
      { fechaInicio: "2027-01-11", fechaFin: "2027-01-17" }, // lunes a domingo
      { fechaInicio: "2027-01-04", fechaFin: "2027-01-08" },
      { fechaInicio: "2027-01-08", fechaFin: "2027-01-11" }, // se superpone: viernes a lunes
    ]);
    expect(dias).toEqual([
      "2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08",
      "2027-01-11", "2027-01-12", "2027-01-13", "2027-01-14", "2027-01-15",
    ]);
  });
});

describe("elegirFamilia", () => {
  it("todos los contactos nuevos: familia nueva", () => {
    expect(elegirFamilia([null, null])).toEqual({ familiaId: null, notaAdmin: null });
  });

  it("contacto existente sin niños: familia nueva", () => {
    expect(elegirFamilia([{ responsableId: 1, familiaIds: [] }])).toEqual({ familiaId: null, notaAdmin: null });
  });

  it("usa la familia del primer contacto existente", () => {
    expect(elegirFamilia([null, { responsableId: 7, familiaIds: [4] }]).familiaId).toBe(4);
  });

  it("varias familias: usa la del primero, no las une y deja una nota", () => {
    const r = elegirFamilia([
      { responsableId: 1, familiaIds: [5] },
      { responsableId: 2, familiaIds: [3] },
    ]);
    expect(r.familiaId).toBe(5);
    expect(r.notaAdmin).toMatch(/#3, #5/);
  });

  it("un contacto en varias familias: la más antigua", () => {
    const r = elegirFamilia([{ responsableId: 1, familiaIds: [9, 2] }]);
    expect(r.familiaId).toBe(2);
    expect(r.notaAdmin).not.toBeNull();
  });
});
