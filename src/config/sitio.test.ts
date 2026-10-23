import { describe, expect, it } from "vitest";
import { sitio } from "./sitio";

describe("sitio", () => {
  it("tiene las rutas de los logos dentro de /marca", () => {
    for (const ruta of Object.values(sitio.logos)) {
      expect(ruta.startsWith("/marca/")).toBe(true);
    }
  });
});
