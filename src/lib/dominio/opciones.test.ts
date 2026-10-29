import { describe, expect, it } from "vitest";
import {
  combinacion,
  describirAsistencia,
  formatearPrecio,
  horarios,
  precioCalculado,
  precioChico,
  textoHorario,
  totalFamilia,
  type Opcion,
  type Paquete,
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
const completaManana: Paquete = { id: 1, nombre: "Colonia completa", precio: 230_000, opciones: [1, 2] };
const completaTarde: Paquete = { id: 2, nombre: "Colonia completa", precio: 230_000, opciones: [3, 4] };
const precios = { paquetes: [completaManana, completaTarde], dia: null, descuentoHermanos: 10 };
const porOpciones = (ids: number[]) => ({ modalidad: "SEMANAS" as const, opciones: ids, dias: [] });

describe("opciones", () => {
  it("muestra el horario sin ceros de más", () => {
    expect(textoHorario({ horaInicio: "08:30", horaFin: "12:30" })).toBe("8:30 a 12:30 hs");
    expect(horarios(todas).map((h) => h.texto)).toEqual(["8:30 a 12:30 hs", "14:00 a 18:00 hs"]);
  });

  it("cobra un paquete cuando se eligen todas sus opciones, o la suma de opciones", () => {
    expect(precioChico(todas, precios, porOpciones([1]))).toBe(130_000);
    expect(precioChico(todas, precios, porOpciones([1, 2]))).toBe(230_000);
    expect(precioChico(todas, { ...precios, paquetes: [] }, porOpciones([1, 2]))).toBe(260_000);
    expect(describirAsistencia(todas, precios.paquetes, porOpciones([3, 4]))).toBe("Colonia completa · 14:00 a 18:00 hs");
    expect(describirAsistencia(todas, precios.paquetes, porOpciones([1]))).toBe("Quincena 1 · 8:30 a 12:30 hs");
  });

  it("agregar una tercera quincena no cambia el paquete: se cobra el paquete + la suelta", () => {
    const tres = [...manana, opcion(5, "Quincena 3")];
    expect(precioChico(tres, precios, porOpciones([1, 2]))).toBe(230_000);
    expect(precioChico(tres, precios, porOpciones([1, 2, 5]))).toBe(360_000);
    expect(describirAsistencia(tres, precios.paquetes, porOpciones([1, 2, 5]))).toBe("Colonia completa + Quincena 3 · 8:30 a 12:30 hs");
    expect(describirAsistencia(tres, precios.paquetes, porOpciones([1, 5]))).toBe("Quincena 1 y Quincena 3 · 8:30 a 12:30 hs");
  });

  it("elige la combinación de paquetes más barata, sin repetir opciones", () => {
    const tres = [...manana, opcion(5, "Quincena 3")];
    const paquetes: Paquete[] = [
      completaManana,
      { id: 3, nombre: "Segunda mitad", precio: 220_000, opciones: [2, 5] },
      { id: 4, nombre: "Todo el verano", precio: 320_000, opciones: [1, 2, 5] },
    ];
    const c = combinacion(tres, paquetes, [1, 2, 5]);
    expect(c.precio).toBe(320_000);
    expect(c.paquetes.map((p) => p.nombre)).toEqual(["Todo el verano"]);
    expect(c.sueltas).toEqual([]);
    // Sin "Todo el verano": Quincena 1 suelta + "Segunda mitad" (350.000) gana a "Colonia completa" + Q3 (360.000).
    expect(combinacion(tres, paquetes.slice(0, 2), [1, 2, 5])).toMatchObject({ precio: 350_000, sueltas: [{ id: 1 }] });
    // Un paquete con una opción que no se eligió no se aplica.
    expect(combinacion(tres, paquetes, [1]).paquetes).toEqual([]);
  });

  it("el precio acordado o el congelado al confirmar reemplazan al calculado", () => {
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioAcordado: 180_000 })).toBe(180_000);
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioAcordado: 0 })).toBe(0);
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioAcordado: null })).toBe(230_000);
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioConfirmado: 200_000 })).toBe(200_000);
    expect(precioChico(todas, precios, { ...porOpciones([1, 2]), precioAcordado: 150_000, precioConfirmado: 200_000 })).toBe(150_000);
    expect(precioCalculado(todas, precios, { ...porOpciones([1, 2]), precioConfirmado: 200_000 })).toBe(230_000);
  });

  it("días sueltos: precio por día o a confirmar", () => {
    const dias = { modalidad: "POR_DIA" as const, opciones: [], dias: [{ fecha: "2027-01-05", opcion: 1 }, { fecha: "2027-01-06", opcion: 1 }] };
    expect(precioChico(todas, precios, dias)).toBeNull();
    expect(precioChico(todas, { ...precios, dia: 15_000 }, dias)).toBe(30_000);
    expect(describirAsistencia(todas, precios.paquetes, dias)).toBe("2 días · 8:30 a 12:30 hs");
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
