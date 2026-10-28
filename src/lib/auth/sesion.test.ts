import { describe, expect, it } from "vitest";
import { hashToken, hashearPassword, nuevoToken, passwordAleatoria, problemaPassword, verificarPassword } from "./claves";
import { permisosDeRol, seccionInicial } from "./permisos";
import { pareceSesion } from "./sesion";

describe("contraseñas", () => {
  it("verifica solo la contraseña correcta y cada hash es distinto", async () => {
    const hash = await hashearPassword("timón-del-capitán");
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verificarPassword("timón-del-capitán", hash)).toBe(true);
    expect(await verificarPassword("timón-del-capitan", hash)).toBe(false);
    expect(await verificarPassword("", hash)).toBe(false);
    expect(await hashearPassword("timón-del-capitán")).not.toBe(hash);
  });

  it("un hash mal formado nunca coincide", async () => {
    expect(await verificarPassword("x", "")).toBe(false);
    expect(await verificarPassword("x", "md5$abc")).toBe(false);
  });

  it("pide un largo mínimo y rechaza las obvias", () => {
    expect(problemaPassword("corta")).toMatch(/al menos 10/);
    expect(problemaPassword("aaaaaaaaaaaa")).toMatch(/fácil/);
    expect(problemaPassword("1234567890abc")).toMatch(/fácil/);
    expect(problemaPassword("ana.perez2026!", "ana.perez@example.com")).toMatch(/email/);
    expect(problemaPassword("marinero-del-sur")).toBeNull();
  });

  it("genera contraseñas al azar sin caracteres confusos", () => {
    const p = passwordAleatoria();
    expect(p).toHaveLength(14);
    expect(p).not.toMatch(/[0O1lI]/);
    expect(passwordAleatoria()).not.toBe(p);
  });
});

describe("tokens de sesión", () => {
  it("la cookie guarda el token y la base solo su hash", () => {
    const { token, hash } = nuevoToken();
    expect(pareceSesion(token)).toBe(true);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toBe(token);
  });

  it("el proxy descarta cookies que no tienen forma de token", () => {
    expect(pareceSesion(undefined)).toBe(false);
    expect(pareceSesion("")).toBe(false);
    expect(pareceSesion("1790000000000.firma-vieja")).toBe(false);
    expect(pareceSesion("a".repeat(44))).toBe(false);
  });
});

describe("permisos", () => {
  it("el rol total tiene todo; los demás solo lo suyo y sin permisos inexistentes", () => {
    expect(permisosDeRol({ esTotal: true, permisos: [] }).has("usuarios.gestionar")).toBe(true);
    const inscripciones = permisosDeRol({ esTotal: false, permisos: ["inscriptos.ver", "algo.viejo"] });
    expect([...inscripciones]).toEqual(["inscriptos.ver"]);
  });

  it("al entrar lleva a la primera sección permitida", () => {
    expect(seccionInicial(new Set(["inscriptos.ver"]))).toBe("/admin");
    expect(seccionInicial(new Set(["analiticas.ver"]))).toBe("/admin/analiticas");
    expect(seccionInicial(new Set())).toBe("/admin/cuenta");
  });
});
