import { describe, expect, it } from "vitest";
import {
  describirAsistencia,
  esColoniaCompleta,
  formatearPrecio,
  horarios,
  precioChico,
  textoHorario,
  totalFamilia,
  type Opcion,
} from "./opciones";

const opcion = (id: number, nombre: string, horaInicio = "08:30", horaFin = "12:30"): Opcion => ({
  id,
  numero: id,
  nombre,
  fechaInicio: id % 2 ? "2027-01-04" : "2027-01-18",
  fechaFin: id % 2 ? "2027-01-15" : "2027-01-29",
  horaInicio,
  horaFin,
  precio: 130_000,
});

const manana = [opcion(1, "Quincena 1"), opcion(2, "Quincena 2")];
const tarde = [opcion(3, "Quincena 1", "14:00", "18:00"), opcion(4, "Quincena 2", "14:00", "18:00")];
const todas = [...manana, ...tarde];
const precios = { coloniaCompleta: 230_000, dia: null, descuentoHermanos: 10 };
const porOpciones = (ids: number[]) => ({ modalidad: "SEMANAS" as const, opciones: ids, dias: [] });

describe("opciones", () => {
  it("muestra el horario sin ceros de más", () => {
    expect(textoHorario({ horaInicio: "08:30", horaFin: "12:30" })).toBe("8:30 a 12:30 hs");
    expect(horarios(todas).map((h) => h.texto)).toEqual(["8:30 a 12:30 hs", "14:00 a 18:00 hs"]);
  });

  it("reconoce la colonia completa: todas las opciones de un mismo horario", () => {
    expect(esColoniaCompleta(todas, [1, 2])).toBe(true);
    expect(esColoniaCompleta(todas, [1])).toBe(false);
    expect(esColoniaCompleta(todas, [1, 4])).toBe(false); // distintos horarios
    expect(esColoniaCompleta([opcion(1, "Única")], [1])).toBe(false); // una sola opción no es "colonia completa"
    const tres = [...manana, opcion(5, "Quincena 3")];
    expect(esColoniaCompleta(tres, [1, 2])).toBe(false);
    expect(describirAsistencia(tres, porOpciones([1, 2]))).toBe("Quincena 1 y Quincena 2 · 8:30 a 12:30 hs");
    expect(describirAsistencia(todas, porOpciones([3, 4]))).toBe("Colonia completa · 14:00 a 18:00 hs");
  });

  it("cobra la colonia completa o la suma de opciones", () => {
    expect(precioChico(todas, precios, porOpciones([1]))).toBe(130_000);
    expect(precioChico(todas, precios, porOpciones([1, 2]))).toBe(230_000);
    expect(precioChico(todas, { ...precios, coloniaCompleta: null }, porOpciones([1, 2]))).toBe(260_000);
  });

  it("el precio acordado desde el panel reemplaza al calculado", () => {
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioAcordado: 180_000 })).toBe(180_000);
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioAcordado: 0 })).toBe(0);
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioAcordado: null })).toBe(230_000);
  });

  it("días sueltos: precio por día o a confirmar", () => {
    const dias = { modalidad: "POR_DIA" as const, opciones: [], dias: [{ fecha: "2027-01-05", opcion: 1 }, { fecha: "2027-01-06", opcion: 1 }] };
    expect(precioChico(todas, precios, dias)).toBeNull();
    expect(precioChico(todas, { ...precios, dia: 15_000 }, dias)).toBe(30_000);
    expect(describirAsistencia(todas, dias)).toBe("2 días · 8:30 a 12:30 hs");
  });

  it("aplica el descuento por hermanos sobre el total de la familia", () => {
    expect(totalFamilia([230_000], 10)).toEqual({ subtotal: 230_000, descuento: 0, total: 230_000, incompleto: false });
    expect(totalFamilia([230_000, 230_000], 10)).toEqual({ subtotal: 460_000, descuento: 46_000, total: 414_000, incompleto: false });
    expect(totalFamilia([230_000, 130_000], 10).total).toBe(324_000);
    expect(totalFamilia([230_000, 130_000], 10, "NO").descuento).toBe(0);
    expect(totalFamilia([230_000], 10, "SI").total).toBe(207_000);
    expect(totalFamilia([230_000, null], 10)).toMatchObject({ subtotal: 230_000, incompleto: true });
  });

  it("formatea precios en pesos", () => {
    expect(formatearPrecio(230_000).replace(/\s/g, " ")).toBe("$ 230.000");
  });
});
