import { describe, expect, it } from "vitest";
import { armarMensaje, enlaceWhatsapp, listaNombres, normalizarEnlaceGrupo, textoFechas, variablesDeMensaje, type DatosMensaje } from "./mensajes";
import { totalFamilia } from "./opciones";

/** El formato de precio usa espacio duro entre $ y el número (no se corta en dos líneas). */
const llano = (t: string) => t.replaceAll(String.fromCharCode(160), " ");

const familia: DatosMensaje = {
  contacto: "Laura",
  marca: "Capitán Animaciones",
  temporada: "Colonia de verano 2027",
  chicos: [
    {
      nombre: "Juana",
      asistencia: "Colonia completa · 8:30 a 12:30 hs",
      fechas: "Quincena 1 y Quincena 2 (4/1 al 29/1) · 8:30 a 12:30 hs",
      precio: 230000,
      grupo: { nombre: "Grupo 2", enlaceWhatsapp: "https://chat.whatsapp.com/AbCdEfGhIj12" },
    },
    {
      nombre: "Pedro",
      asistencia: "Quincena 1 · 8:30 a 12:30 hs",
      fechas: "Quincena 1 (4/1 al 15/1) · 8:30 a 12:30 hs",
      precio: 130000,
      grupo: { nombre: "Grupo 1", enlaceWhatsapp: null },
    },
  ],
  total: totalFamilia([230000, 130000], 10),
  porcentajeDescuento: 10,
  datosPago: "Alias: capitan.colonia",
};

describe("mensajes de WhatsApp", () => {
  it("arma el monto con el detalle de cada chico, el descuento y el total", () => {
    const texto = llano(armarMensaje(
      "¡Hola {contacto}! Somos {marca}.\n\n{detalle}\n\n{descuento}\nTotal: *{total}*\n\n{datosPago}",
      variablesDeMensaje(familia),
    ));
    expect(texto).toBe(
      "¡Hola Laura! Somos Capitán Animaciones.\n\n" +
        "• Juana: Colonia completa · 8:30 a 12:30 hs — $ 230.000\n" +
        "• Pedro: Quincena 1 · 8:30 a 12:30 hs — $ 130.000\n\n" +
        "Tienen un 10% de descuento por hermanos: −$ 36.000.\n" +
        "Total: *$ 324.000*\n\n" +
        "Alias: capitan.colonia",
    );
  });

  it("sin descuento ni grupos con link no deja líneas en blanco de más", () => {
    const sola = { ...familia, chicos: [familia.chicos[1]], total: totalFamilia([130000], 10) };
    const texto = llano(armarMensaje("Hola {contacto}\n\n{descuento}\n\nTotal {total}\n\n{gruposWhatsapp}\n\nChau", variablesDeMensaje(sola)));
    expect(texto).toBe("Hola Laura\n\nTotal $ 130.000\n\nChau");
  });

  it("lista los grupos de WhatsApp de papis de los chicos que tienen link", () => {
    expect(variablesDeMensaje(familia).gruposWhatsapp).toBe(
      "Si querés, sumate al grupo de WhatsApp de papis:\n• Grupo 2 (Juana): https://chat.whatsapp.com/AbCdEfGhIj12",
    );
  });

  it("deja como están las palabras que no conoce", () => {
    expect(armarMensaje("Hola {contacto}, {nada}", { contacto: "Ana" })).toBe("Hola Ana, {nada}");
  });

  it("une nombres y arma el link de WhatsApp con el texto", () => {
    expect(listaNombres(["Juana"])).toBe("Juana");
    expect(listaNombres(["Juana", "Pedro", "Ana"])).toBe("Juana, Pedro y Ana");
    expect(enlaceWhatsapp("+5491123456789", "Hola Ana & cía")).toBe("https://wa.me/5491123456789?text=Hola%20Ana%20%26%20c%C3%ADa");
    expect(enlaceWhatsapp("+5491123456789")).toBe("https://wa.me/5491123456789");
  });

  it("describe las fechas y el horario de cada chico", () => {
    const opcion = (id: number, numero: number, fechaInicio: string, fechaFin: string) => ({
      id,
      numero,
      nombre: `Quincena ${numero}`,
      fechaInicio,
      fechaFin,
      horaInicio: "08:30",
      horaFin: "12:30",
      precio: 130000,
    });
    const opciones = [opcion(1, 1, "2027-01-04", "2027-01-15"), opcion(2, 2, "2027-01-18", "2027-01-29"), opcion(3, 3, "2027-02-01", "2027-02-12")];
    const paquetes = [{ id: 1, nombre: "Colonia completa", precio: 230000, opciones: [1, 2] }];
    const semanas = (ids: number[]) => ({ modalidad: "SEMANAS" as const, opciones: ids, dias: [] });
    expect(textoFechas(opciones, paquetes, semanas([1, 2]))).toBe("Colonia completa (4/1 al 29/1) · 8:30 a 12:30 hs");
    expect(textoFechas(opciones, paquetes, semanas([2]))).toBe("Quincena 2 (18/1 al 29/1) · 8:30 a 12:30 hs");
    expect(textoFechas(opciones, paquetes, semanas([1, 2, 3]))).toBe("Colonia completa + Quincena 3 (4/1 al 29/1 y 1/2 al 12/2) · 8:30 a 12:30 hs");
    expect(textoFechas(opciones, [], semanas([1, 3]))).toBe("Quincena 1 y Quincena 3 (4/1 al 15/1 y 1/2 al 12/2) · 8:30 a 12:30 hs");
    expect(
      textoFechas(opciones, paquetes, {
        modalidad: "POR_DIA",
        opciones: [],
        dias: [
          { fecha: "2027-01-06", opcion: 1 },
          { fecha: "2027-01-05", opcion: 1 },
        ],
      }),
    ).toBe("2 días: 5/1 y 6/1 · 8:30 a 12:30 hs");
  });

  it("acepta solo links de grupos de WhatsApp", () => {
    expect(normalizarEnlaceGrupo("")).toBeNull();
    expect(normalizarEnlaceGrupo(" https://chat.whatsapp.com/AbCdEfGhIj12 ")).toBe("https://chat.whatsapp.com/AbCdEfGhIj12");
    expect(normalizarEnlaceGrupo("https://estafa.com/chat.whatsapp.com")).toBe("invalido");
  });
});
