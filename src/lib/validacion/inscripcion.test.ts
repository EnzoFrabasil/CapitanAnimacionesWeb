import { describe, expect, it } from "vitest";
import { crearInscripcionSchema, edadParaMostrar, type ContextoInscripcion } from "./inscripcion";

const opcion = (id: number, numero: number, fechaInicio: string, fechaFin: string, horaInicio = "08:30", horaFin = "12:30") => ({
  id,
  numero,
  nombre: `Quincena ${numero}`,
  fechaInicio,
  fechaFin,
  horaInicio,
  horaFin,
  precio: 130000,
});

const contexto: ContextoInscripcion = {
  hoy: "2026-10-23",
  modalidades: ["SEMANAS", "POR_DIA"],
  opciones: [
    opcion(10, 1, "2027-01-04", "2027-01-08"),
    opcion(11, 2, "2027-01-11", "2027-01-15"),
    opcion(12, 3, "2027-01-04", "2027-01-15", "14:00", "18:00"),
  ],
};
const schema = crearInscripcionSchema(contexto);

const contacto = {
  nombre: " Laura ",
  apellido: "García",
  parentesco: "Madre",
  whatsapp: "11 2345-6789",
  whatsappAlt: "",
  email: "",
};

const nino = {
  nombre: "Tomás",
  apellido: "García",
  dni: "50.111.222",
  fechaNacimiento: "2019-05-01",
  infoAdicional: "",
  modalidad: "SEMANAS",
  semanas: [11, 10, 10],
  dias: [{ fecha: "2027-01-05", opcion: 10 }],
};

function errores(datos: unknown) {
  const r = schema.safeParse(datos);
  if (r.success) return [];
  return r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

describe("crearInscripcionSchema", () => {
  it("rechaza los días sueltos si la temporada no los permite", () => {
    const sinDias = crearInscripcionSchema({ ...contexto, modalidades: ["SEMANAS"] });
    const r = sinDias.safeParse({ contactos: [contacto], ninos: [nino, { ...nino, modalidad: "POR_DIA" }] });
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(["ninos.1.modalidad"]);
  });

  it("no deja mezclar opciones de distintos horarios", () => {
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, semanas: [10, 12] }] })).toEqual([
      "ninos.0.semanas: Elegí opciones de un mismo horario.",
    ]);
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, semanas: [12] }] })).toEqual([]);
  });

  it("acepta teléfonos con el código de país del formulario y uno sin número como vacío", () => {
    const r = schema.parse({
      contactos: [{ ...contacto, whatsapp: "+598 94 123 456", whatsappAlt: "+54 " }],
      ninos: [nino],
    });
    expect(r.contactos[0].whatsapp).toBe("+59894123456");
    expect(r.contactos[0].whatsappAlt).toBeUndefined();
  });

  it("normaliza los datos válidos", () => {
    const r = schema.parse({ contactos: [contacto], ninos: [nino] });
    expect(r.contactos[0]).toEqual({
      nombre: "Laura",
      apellido: "García",
      parentesco: "Madre",
      whatsapp: "+5491123456789",
      whatsappAlt: undefined,
      email: undefined,
    });
    expect(r.ninos[0].dni).toBe("50111222");
    expect(r.ninos[0].infoAdicional).toBeUndefined();
    // Opciones sin repetir y descarta los días porque la modalidad es SEMANAS.
    expect(r.ninos[0].semanas).toEqual([10, 11]);
    expect(r.ninos[0].dias).toEqual([]);
  });

  it("por día: acepta días hábiles de sus opciones y descarta las opciones", () => {
    const r = schema.parse({
      contactos: [contacto],
      ninos: [{ ...nino, modalidad: "POR_DIA", dias: [{ fecha: "2027-01-15", opcion: 11 }, { fecha: "2027-01-04", opcion: 10 }] }],
    });
    expect(r.ninos[0].dias).toEqual([
      { fecha: "2027-01-04", opcion: 10 },
      { fecha: "2027-01-15", opcion: 11 },
    ]);
    expect(r.ninos[0].semanas).toEqual([]);
  });

  it("por día: rechaza fines de semana, días fuera de su opción, horarios mezclados y lista vacía", () => {
    const conDias = (dias: { fecha: string; opcion: number }[]) => ({ contactos: [contacto], ninos: [{ ...nino, modalidad: "POR_DIA", dias }] });
    expect(errores(conDias([{ fecha: "2027-01-09", opcion: 10 }]))[0]).toMatch(/^ninos\.0\.dias: Solo se pueden/); // sábado
    expect(errores(conDias([{ fecha: "2027-01-12", opcion: 10 }]))[0]).toMatch(/^ninos\.0\.dias/); // fuera de la quincena 1
    expect(errores(conDias([{ fecha: "2027-01-04", opcion: 10 }, { fecha: "2027-01-05", opcion: 12 }]))[0]).toMatch(/mismo horario/);
    expect(errores(conDias([]))[0]).toMatch(/al menos un día/);
  });

  it("opciones: rechaza lista vacía u opciones de otra temporada", () => {
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, semanas: [] }] })[0]).toMatch(/Elegí al menos una opción/);
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, semanas: [99] }] })[0]).toMatch(/no es válida/);
  });

  it("exige entre 1 y 10 niños y al menos 1 contacto", () => {
    expect(errores({ contactos: [contacto], ninos: [] })[0]).toMatch(/al menos un niño/);
    expect(errores({ contactos: [contacto], ninos: Array(7).fill(nino) })[0]).toMatch(/hasta 6/);
    expect(errores({ contactos: Array(10).fill(null).map((_, i) => ({ ...contacto, whatsapp: `11 2345-67${10 + i}` })), ninos: Array(6).fill(nino) })).toEqual([]);
    expect(errores({ contactos: [], ninos: [nino] })[0]).toMatch(/al menos un contacto/);
  });

  it("no deja cargar más chicos que los lugares que quedan", () => {
    const quedanDos = crearInscripcionSchema({ ...contexto, lugares: 2 });
    const r = quedanDos.safeParse({ contactos: [contacto], ninos: [nino, nino, nino] });
    expect(r.error?.issues.map((i) => i.message)).toEqual(["Solo quedan 2 lugares: quitá los chicos que sobran."]);
    expect(quedanDos.safeParse({ contactos: [contacto], ninos: [nino, nino] }).success).toBe(true);
    // Con lugares de sobra manda el máximo por formulario.
    expect(crearInscripcionSchema({ ...contexto, lugares: 30 }).safeParse({ contactos: [contacto], ninos: Array(7).fill(nino) }).success).toBe(false);
  });

  it("marca WhatsApp repetidos entre contactos aunque estén escritos distinto", () => {
    const e = errores({
      contactos: [contacto, { ...contacto, nombre: "Diego", whatsapp: "+54 9 11 2345 6789" }],
      ninos: [nino],
    });
    expect(e).toEqual(["contactos.1.whatsapp: Este número ya está cargado en el contacto 1."]);
  });

  it("valida WhatsApp, email, DNI, fecha de nacimiento y campos obligatorios", () => {
    const e = errores({
      contactos: [{ ...contacto, nombre: "", whatsapp: "123", whatsappAlt: "456", email: "no-es-mail" }],
      ninos: [{ ...nino, dni: "123", fechaNacimiento: "2026-02-30" }],
    });
    expect(e).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^contactos\.0\.nombre:/),
        expect.stringMatching(/^contactos\.0\.whatsapp:/),
        expect.stringMatching(/^contactos\.0\.whatsappAlt:/),
        expect.stringMatching(/^contactos\.0\.email:/),
        expect.stringMatching(/^ninos\.0\.dni:/),
        expect.stringMatching(/^ninos\.0\.fechaNacimiento: Ingresá una fecha válida/),
      ]),
    );
  });

  it("muestra los errores de asistencia y de WhatsApp repetido aunque haya otros errores", () => {
    const e = errores({
      contactos: [contacto, { ...contacto, nombre: "", whatsapp: "1123456789" }],
      ninos: [{ ...nino, nombre: "", semanas: [] }],
    });
    expect(e).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^contactos\.1\.nombre:/),
        expect.stringMatching(/^contactos\.1\.whatsapp: Este número ya está cargado/),
        expect.stringMatching(/^ninos\.0\.nombre:/),
        expect.stringMatching(/^ninos\.0\.semanas: Elegí al menos una opción/),
      ]),
    );
  });

  it("rechaza edades fuera del rango", () => {
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, fechaNacimiento: "2025-01-01" }] })[0]).toMatch(/es para chicos de/);
  });
});

describe("edadParaMostrar", () => {
  it("calcula la edad o devuelve null si la fecha no sirve", () => {
    expect(edadParaMostrar("2019-05-01", "2026-10-23")).toBe(7);
    expect(edadParaMostrar("", "2026-10-23")).toBeNull();
    expect(edadParaMostrar("2027-01-01", "2026-10-23")).toBeNull();
  });
});
