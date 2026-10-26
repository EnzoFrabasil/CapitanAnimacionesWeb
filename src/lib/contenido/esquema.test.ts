import { describe, expect, it } from "vitest";
import { contenidoInicial } from "@/config/contenidoInicial";
import { validarContenido, type Contenido } from "./esquema";
import { detectarTipoImagen } from "./imagenes";

const valido: Contenido = {
  ...contenidoInicial,
  whatsapp: { ...contenidoInicial.whatsapp, numero: "11 2345-6789" },
};

const errores = (datos: unknown) => {
  const r = validarContenido(datos);
  return r.ok ? [] : r.errores.map((e) => e.ruta);
};

describe("validarContenido", () => {
  it("acepta el contenido inicial con un WhatsApp real y lo normaliza a dígitos", () => {
    const r = validarContenido(valido);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.contenido.whatsapp.numero).toBe("5491123456789");
  });

  it("vuelve a aceptar un contenido ya publicado (WhatsApp en dígitos)", () => {
    const r = validarContenido(valido);
    if (!r.ok) throw new Error("debería ser válido");
    expect(validarContenido(r.contenido).ok).toBe(true);
  });

  it("marca la ruta exacta de cada campo con error", () => {
    const datos = structuredClone(valido);
    datos.secciones[1].titulo = "   ";
    datos.preguntas.lista[0].respuesta = "";
    datos.whatsapp.numero = "123";
    expect(errores(datos)).toEqual(
      expect.arrayContaining(["secciones.1.titulo", "preguntas.lista.0.respuesta", "whatsapp.numero"]),
    );
  });

  it("solo acepta imágenes de la marca o subidas desde el editor", () => {
    for (const imagen of ["/marca/capitan-timon.png", "/imagenes/cmh1x2y3z0000abcd1234"]) {
      expect(errores({ ...valido, inicio: { ...valido.inicio, imagen } })).toEqual([]);
    }
    for (const imagen of ["https://otro-sitio.com/a.png", "/marca/../.env", "javascript:alert(1)"]) {
      expect(errores({ ...valido, inicio: { ...valido.inicio, imagen } })).toEqual(["inicio.imagen"]);
    }
  });

  it("exige enlaces https en las redes", () => {
    const red = { red: "facebook", nombre: "Facebook", usuario: "capitan", url: "javascript:alert(1)" };
    expect(errores({ ...valido, contacto: { ...valido.contacto, redes: [red] } })).toEqual(["contacto.redes.0.url"]);
  });

  it("completa los textos de la inscripción en versiones publicadas antes de que existieran", () => {
    const { inscripcion: _sinTextos, ...anterior } = valido;
    const r = validarContenido(anterior);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.contenido.inscripcion.titulo).toBe(contenidoInicial.inscripcion.titulo);
  });

  it("completa los textos del total en versiones publicadas antes de que existieran", () => {
    const { totalTitulo: _t, totalNota: _n, descuentoTexto: _d, ...textosViejos } = valido.inscripcion;
    const r = validarContenido({ ...valido, inscripcion: textosViejos });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.contenido.inscripcion.totalTitulo).toBe(contenidoInicial.inscripcion.totalTitulo);
  });

  it("marca los textos de la inscripción vacíos", () => {
    expect(errores({ ...valido, inscripcion: { ...valido.inscripcion, botonEnviar: " " } })).toEqual([
      "inscripcion.botonEnviar",
    ]);
  });

  it("rechaza secciones con el mismo id", () => {
    const datos = { ...valido, secciones: [valido.secciones[0], valido.secciones[0]] };
    expect(errores(datos)).toEqual(["secciones"]);
  });
});

describe("detectarTipoImagen", () => {
  it("reconoce PNG, JPEG y WebP por sus primeros bytes", () => {
    expect(detectarTipoImagen(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectarTipoImagen(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectarTipoImagen(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
  });

  it("rechaza otros archivos aunque digan ser imágenes", () => {
    expect(detectarTipoImagen(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(detectarTipoImagen(new Uint8Array([]))).toBeNull();
  });
});
