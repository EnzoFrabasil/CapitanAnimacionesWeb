import { describe, expect, it } from "vitest";
import { condicionDeFiltros, filtrosAQuery, leerFiltros } from "./filtros";

describe("leerFiltros", () => {
  it("lee valores válidos e ignora los inválidos", () => {
    expect(
      leerFiltros({ temporada: "2", grupo: "sin", turno: "MANANA", estado: "NADA", semana: "x", duplicados: "1", q: "  ana  " }),
    ).toEqual({ temporada: 2, grupo: "sin", turno: "MANANA", estado: undefined, semana: undefined, duplicados: "1", q: "ana" });
    expect(leerFiltros({ grupo: ["3", "4"], q: "" })).toMatchObject({ grupo: 3, q: undefined });
  });

  it("filtrosAQuery omite los vacíos", () => {
    expect(filtrosAQuery(leerFiltros({ temporada: "1", grupo: "sin", q: "" }))).toBe("temporada=1&grupo=sin");
  });
});

describe("condicionDeFiltros", () => {
  it("arma la condición con temporada, grupo nulo y búsqueda por palabras y DNI", () => {
    const where = condicionDeFiltros(leerFiltros({ grupo: "sin", q: "García 45.123" }), 7);
    expect(where.AND).toEqual([
      { inscripcion: { temporadaId: 7 } },
      { grupoEdadId: null },
      {
        OR: [
          { nino: { nombre: { contains: "García", mode: "insensitive" } } },
          { nino: { apellido: { contains: "García", mode: "insensitive" } } },
        ],
      },
      {
        OR: [
          { nino: { nombre: { contains: "45.123", mode: "insensitive" } } },
          { nino: { apellido: { contains: "45.123", mode: "insensitive" } } },
          { nino: { dni: { contains: "45123" } } },
        ],
      },
    ]);
  });

  it("filtro por semana incluye a los que van por día esa semana", () => {
    const semana = { id: 3, fechaInicio: new Date("2027-01-04"), fechaFin: new Date("2027-01-08") };
    const where = condicionDeFiltros(leerFiltros({ semana: "3" }), 1, semana);
    expect((where.AND as unknown[])[1]).toEqual({
      OR: [
        { semanas: { some: { semanaId: 3 } } },
        { dias: { some: { fecha: { gte: semana.fechaInicio, lte: semana.fechaFin } } } },
      ],
    });
  });
});
