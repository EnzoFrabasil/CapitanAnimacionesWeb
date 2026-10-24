import { describe, expect, it } from "vitest";
import { calcularCupos, urgenciaCupos } from "./cupos";

describe("cupos", () => {
  it("descuenta un lugar por inscripto y no baja de cero", () => {
    expect(calcularCupos(50, 12)).toEqual({ total: 50, ocupados: 12, quedan: 38 });
    expect(calcularCupos(50, 60).quedan).toBe(0);
  });

  it("marca los últimos lugares y el cupo completo", () => {
    expect(urgenciaCupos({ total: 100, quedan: 40 })).toBe("normal");
    expect(urgenciaCupos({ total: 100, quedan: 15 })).toBe("ultimos");
    expect(urgenciaCupos({ total: 20, quedan: 5 })).toBe("ultimos");
    expect(urgenciaCupos({ total: 20, quedan: 0 })).toBe("completo");
  });
});
