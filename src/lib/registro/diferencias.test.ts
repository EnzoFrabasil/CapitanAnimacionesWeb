import { describe, expect, it } from "vitest";
import { diferencias, sinSecretos } from "./diferencias";

describe("diferencias", () => {
  it("guarda solo lo que cambió, con antes y después", () => {
    expect(
      diferencias(
        { nombre: "Juana", dni: "45382822", grupoEdadId: 2, infoAdicional: null },
        { nombre: "Juana", dni: "45382823", grupoEdadId: null, infoAdicional: "" },
      ),
    ).toEqual({ dni: { antes: "45382822", despues: "45382823" }, grupoEdadId: { antes: 2, despues: null } });
  });

  it("muestra fechas como aaaa-mm-dd y listas como texto", () => {
    expect(
      diferencias(
        { fechaNacimiento: new Date("2019-03-10T00:00:00Z"), semanas: [1] },
        { fechaNacimiento: new Date("2019-03-09T00:00:00Z"), semanas: [1, 2] },
      ),
    ).toEqual({
      fechaNacimiento: { antes: "2019-03-10", despues: "2019-03-09" },
      semanas: { antes: "1", despues: "1, 2" },
    });
  });

  it("nunca incluye contraseñas ni hashes", () => {
    expect(diferencias({ passwordHash: "a" }, { passwordHash: "b", password: "x" })).toEqual({});
    expect(sinSecretos({ email: "a@b.com", password: "secreta", tokenHash: "x" })).toEqual({ email: "a@b.com" });
  });
});
