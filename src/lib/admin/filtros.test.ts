import { describe, expect, it } from "vitest";
import { condicionDeFiltros, filtrosAQuery, leerFiltros } from "./filtros";

describe("leerFiltros", () => {
  it("lee valores válidos e ignora los inválidos", () => {
    expect(
      leerFiltros({ temporada: "2", grupo: "sin", horario: "8:30", estado: "NADA", semana: "x", duplicados: "1", q: "  ana  " }),
    ).toEqual({ temporada: 2, grupo: "sin", horario: undefined, estado: undefined, semana: undefined, duplicados: "1", info: undefined, contacto: undefined, q: "ana" });
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
          { nino: { infoAdicional: { contains: "García", mode: "insensitive" } } },
        ],
      },
      {
        OR: [
          { nino: { nombre: { contains: "45.123", mode: "insensitive" } } },
          { nino: { apellido: { contains: "45.123", mode: "insensitive" } } },
          { nino: { infoAdicional: { contains: "45.123", mode: "insensitive" } } },
          { nino: { dni: { contains: "45123" } } },
        ],
      },
    ]);
  });

  it("filtro de información adicional deja afuera los vacíos", () => {
    const where = condicionDeFiltros(leerFiltros({ info: "1" }), 1);
    expect((where.AND as unknown[]).slice(1)).toEqual([
      { nino: { infoAdicional: { not: null } } },
      { NOT: { nino: { infoAdicional: "" } } },
    ]);
  });

  it("filtro de contacto busca familias marcadas (o no) en la temporada", () => {
    const contactada = { contactos: { some: { temporadaId: 7 } } };
    expect((condicionDeFiltros(leerFiltros({ contacto: "si" }), 7).AND as unknown[])[1]).toEqual({ nino: { familia: contactada } });
    expect((condicionDeFiltros(leerFiltros({ contacto: "no" }), 7).AND as unknown[])[1]).toEqual({ NOT: { nino: { familia: contactada } } });
    expect(leerFiltros({ contacto: "quizas" }).contacto).toBeUndefined();
  });

  it("filtros por opción y por horario incluyen a los que van por días sueltos", () => {
    const porOpcion = condicionDeFiltros(leerFiltros({ semana: "3" }), 1);
    expect((porOpcion.AND as unknown[])[1]).toEqual({
      OR: [{ semanas: { some: { semanaId: 3 } } }, { dias: { some: { semanaId: 3 } } }],
    });
    const semana = { horaInicio: "08:30", horaFin: "12:30" };
    const porHorario = condicionDeFiltros(leerFiltros({ horario: "08:30-12:30" }), 1);
    expect((porHorario.AND as unknown[])[1]).toEqual({
      OR: [{ semanas: { some: { semana } } }, { dias: { some: { semana } } }],
    });
  });
});
