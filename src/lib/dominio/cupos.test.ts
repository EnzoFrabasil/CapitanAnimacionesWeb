import { describe, expect, it } from "vitest";
import { calcularCupos, lugaresLibres, maximoNinosPorFormulario, urgenciaCupos, verificarCupo } from "./cupos";

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

  it("deja entrar solo si alcanzan los lugares y avisa cuando se completa", () => {
    expect(verificarCupo(40, 30, 3)).toEqual({ entra: true, cierra: false });
    expect(verificarCupo(40, 37, 3)).toEqual({ entra: true, cierra: true });
    expect(verificarCupo(40, 38, 3)).toEqual({ entra: false, quedan: 2 });
    // Desbordado (más ocupados que cupo): no entra nadie.
    expect(verificarCupo(40, 42, 1)).toEqual({ entra: false, quedan: 0 });
    // Sin cupo cargado no hay límite.
    expect(verificarCupo(null, 500, 6)).toEqual({ entra: true, cierra: false });
  });

  it("limita los chicos por formulario a los lugares libres", () => {
    expect(maximoNinosPorFormulario(6, null)).toBe(6);
    expect(maximoNinosPorFormulario(6, 20)).toBe(6);
    expect(maximoNinosPorFormulario(6, 2)).toBe(2);
    expect(lugaresLibres(40, 42)).toBe(0);
    expect(lugaresLibres(null, 3)).toBeNull();
  });
});
