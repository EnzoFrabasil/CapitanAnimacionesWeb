import { describe, expect, it } from "vitest";
import { gruposTemporadaSchema } from "@/lib/validacion/grupos";
import { validarGruposEdad } from "./grupos";

const g = (nombre: string, edadMin: number, edadMax: number) => ({ nombre, edadMin, edadMax });

describe("validarGruposEdad", () => {
  it("acepta rangos contiguos y con huecos, en cualquier orden", () => {
    expect(validarGruposEdad([g("C", 9, 12), g("A", 3, 5), g("B", 6, 8)])).toEqual([]);
    expect(validarGruposEdad([g("A", 3, 4), g("B", 7, 8)])).toEqual([]);
    expect(validarGruposEdad([g("Único", 5, 5)])).toEqual([]);
    expect(validarGruposEdad([])).toEqual([]);
  });

  it("detecta superposición en el límite (los rangos son inclusivos)", () => {
    const errores = validarGruposEdad([g("A", 3, 6), g("B", 6, 8)]);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/se superponen/);
  });

  it("detecta un rango contenido dentro de otro", () => {
    expect(validarGruposEdad([g("A", 3, 12), g("B", 6, 8)])).toHaveLength(1);
  });

  it("rechaza edadMin mayor que edadMax", () => {
    expect(validarGruposEdad([g("A", 8, 6)])[0]).toMatch(/mínima no puede ser mayor/);
  });

  it("rechaza negativos y no enteros", () => {
    expect(validarGruposEdad([g("A", -1, 4)])[0]).toMatch(/enteros/);
    expect(validarGruposEdad([g("A", 3.5, 4)])[0]).toMatch(/enteros/);
  });

  it("rechaza nombres vacíos o repetidos (sin importar mayúsculas)", () => {
    expect(validarGruposEdad([g("  ", 3, 4)])[0]).toMatch(/nombre/);
    expect(validarGruposEdad([g("Piratas", 3, 4), g("piratas ", 5, 6)])[0]).toMatch(/repetido/);
  });
});

describe("gruposTemporadaSchema", () => {
  it("convierte números escritos como texto y aplica las validaciones", () => {
    const ok = gruposTemporadaSchema.safeParse([{ nombre: "A", edadMin: "3", edadMax: "5" }]);
    expect(ok.success && ok.data[0].edadMin).toBe(3);

    const mal = gruposTemporadaSchema.safeParse([g("A", 3, 6), g("B", 5, 8)]);
    expect(mal.success).toBe(false);
  });
});
