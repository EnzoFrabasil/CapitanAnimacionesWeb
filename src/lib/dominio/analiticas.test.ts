import { describe, expect, it } from "vitest";
import { calcularAnaliticas, type InscriptoAnalitica } from "./analiticas";
import type { Opcion } from "./opciones";

const opcion = (id: number, numero: number, horaInicio = "08:30", horaFin = "12:30"): Opcion => ({
  id,
  numero,
  nombre: `Quincena ${numero}`,
  fechaInicio: numero === 1 ? "2027-01-04" : "2027-01-18",
  fechaFin: numero === 1 ? "2027-01-15" : "2027-01-29",
  horaInicio,
  horaFin,
  precio: 130000,
});
const opciones = [opcion(1, 1), opcion(2, 2)];
const precios = { coloniaCompleta: 230000, dia: null, descuentoHermanos: 10 };
const grupos = [
  { id: 10, nombre: "Grupo 1" },
  { id: 20, nombre: "Grupo 2" },
];

let siguiente = 1;
const chico = (datos: Partial<InscriptoAnalitica> & Pick<InscriptoAnalitica, "familiaId">): InscriptoAnalitica => ({
  id: siguiente++,
  estado: "EN_ESPERA",
  modoDescuento: "AUTOMATICO",
  grupoId: 10,
  alta: "2026-10-24",
  asistencia: { modalidad: "SEMANAS", opciones: [1, 2], dias: [] },
  ...datos,
});

const calcular = (inscriptos: InscriptoAnalitica[], cupo: number | null = 40) =>
  calcularAnaliticas({ inscriptos, opciones, precios, grupos, cupo, hasta: "2026-10-27" });

describe("calcularAnaliticas", () => {
  it("reparte el total de la familia (con descuento) según el estado de cada chico", () => {
    const a = calcular([
      chico({ familiaId: 1, estado: "CONFIRMADO" }), // colonia completa 230.000
      chico({ familiaId: 1, grupoId: 20, asistencia: { modalidad: "SEMANAS", opciones: [1], dias: [] } }), // 130.000
      chico({ familiaId: 2, estado: "CANCELADO" }),
    ]);
    // Familia 1: 360.000 − 10 % = 324.000 → 207.000 confirmado + 117.000 pendiente.
    expect(a.dinero).toEqual({ confirmado: 207000, pendiente: 117000, descuentos: 36000, aConfirmar: 0 });
    expect(a.ninos).toEqual({ confirmados: 1, enEspera: 1, activos: 2, cancelados: 1 });
    expect(a.familias).toBe(1);
    expect(a.cupo).toEqual({ total: 40, ocupados: 2, quedan: 38 });
  });

  it("cuenta chicos por grupo y estado, y agrega Sin grupo solo si hay alguno", () => {
    expect(calcular([chico({ familiaId: 1 })]).grupos.map((g) => g.nombre)).toEqual(["Grupo 1", "Grupo 2"]);
    const a = calcular([chico({ familiaId: 1, estado: "CONFIRMADO" }), chico({ familiaId: 2, grupoId: null })]);
    expect(a.grupos).toEqual([
      { id: 10, nombre: "Grupo 1", confirmados: 1, enEspera: 0 },
      { id: 20, nombre: "Grupo 2", confirmados: 0, enEspera: 0 },
      { id: null, nombre: "Sin grupo", confirmados: 0, enEspera: 1 },
    ]);
  });

  it("separa colonia completa de cada opción, por horario", () => {
    const a = calcular([
      chico({ familiaId: 1 }),
      chico({ familiaId: 2, asistencia: { modalidad: "SEMANAS", opciones: [2], dias: [] } }),
      chico({ familiaId: 3, asistencia: { modalidad: "POR_DIA", opciones: [], dias: [{ fecha: "2027-01-05", opcion: 1 }] } }),
    ]);
    expect(a.horarios).toEqual([
      {
        texto: "8:30 a 12:30 hs",
        total: 3,
        filas: [
          { nombre: "Colonia completa", confirmados: 0, enEspera: 1 },
          { nombre: "Quincena 1", confirmados: 0, enEspera: 1 },
          { nombre: "Quincena 2", confirmados: 0, enEspera: 1 },
        ],
      },
    ]);
    // Días sueltos sin precio por día: no suman y se informan aparte.
    expect(a.dinero.aConfirmar).toBe(1);
  });

  it("arma la serie por día con los días sin altas y sin cupo devuelve null", () => {
    const a = calcular(
      [chico({ familiaId: 1, alta: "2026-10-25" }), chico({ familiaId: 2, alta: "2026-10-25", estado: "CANCELADO" })],
      null,
    );
    expect(a.porDia).toEqual([
      { fecha: "2026-10-25", cantidad: 2 },
      { fecha: "2026-10-26", cantidad: 0 },
      { fecha: "2026-10-27", cantidad: 0 },
    ]);
    expect(a.cupo).toBeNull();
    expect(calcular([]).porDia).toEqual([]);
  });
});
