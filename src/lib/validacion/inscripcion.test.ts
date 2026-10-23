import { describe, expect, it } from "vitest";
import { crearInscripcionSchema, edadParaMostrar, type ContextoInscripcion } from "./inscripcion";

const contexto: ContextoInscripcion = {
  hoy: "2026-10-23",
  semanas: [
    { id: 10, numero: 1, fechaInicio: "2027-01-04", fechaFin: "2027-01-08" },
    { id: 11, numero: 2, fechaInicio: "2027-01-11", fechaFin: "2027-01-15" },
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
  turno: "MANANA",
  modalidad: "SEMANAS",
  semanas: [11, 10, 10],
  dias: ["2027-01-05"],
};

function errores(datos: unknown) {
  const r = schema.safeParse(datos);
  if (r.success) return [];
  return r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

describe("crearInscripcionSchema", () => {
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
    // Semanas sin repetir y descarta los días porque la modalidad es SEMANAS.
    expect(r.ninos[0].semanas).toEqual([10, 11]);
    expect(r.ninos[0].dias).toEqual([]);
  });

  it("por día: acepta días hábiles de la temporada y descarta semanas", () => {
    const r = schema.parse({
      contactos: [contacto],
      ninos: [{ ...nino, modalidad: "POR_DIA", dias: ["2027-01-15", "2027-01-04"] }],
    });
    expect(r.ninos[0].dias).toEqual(["2027-01-04", "2027-01-15"]);
    expect(r.ninos[0].semanas).toEqual([]);
  });

  it("por día: rechaza fines de semana, días fuera de la temporada y lista vacía", () => {
    const conDias = (dias: string[]) => ({ contactos: [contacto], ninos: [{ ...nino, modalidad: "POR_DIA", dias }] });
    expect(errores(conDias(["2027-01-09"]))[0]).toMatch(/^ninos\.0\.dias: Solo se pueden/); // sábado
    expect(errores(conDias(["2027-01-18"]))[0]).toMatch(/^ninos\.0\.dias/); // fuera
    expect(errores(conDias([]))[0]).toMatch(/al menos un día/);
  });

  it("semanas: rechaza lista vacía o semanas de otra temporada", () => {
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, semanas: [] }] })[0]).toMatch(/al menos una semana/);
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, semanas: [99] }] })[0]).toMatch(/no es válida/);
  });

  it("exige entre 1 y 10 niños y al menos 1 contacto", () => {
    expect(errores({ contactos: [contacto], ninos: [] })[0]).toMatch(/al menos un niño/);
    expect(errores({ contactos: [contacto], ninos: Array(11).fill(nino) })[0]).toMatch(/hasta 10/);
    expect(errores({ contactos: Array(10).fill(null).map((_, i) => ({ ...contacto, whatsapp: `11 2345-67${10 + i}` })), ninos: Array(10).fill(nino) })).toEqual([]);
    expect(errores({ contactos: [], ninos: [nino] })[0]).toMatch(/al menos un contacto/);
  });

  it("marca WhatsApp repetidos entre contactos aunque estén escritos distinto", () => {
    const e = errores({
      contactos: [contacto, { ...contacto, nombre: "Diego", whatsapp: "+54 9 11 2345 6789" }],
      ninos: [nino],
    });
    expect(e).toEqual(["contactos.1.whatsapp: Este WhatsApp ya está cargado en el contacto 1."]);
  });

  it("valida WhatsApp, email, DNI, fecha de nacimiento y campos obligatorios", () => {
    const e = errores({
      contactos: [{ ...contacto, nombre: "", whatsapp: "123", whatsappAlt: "456", email: "no-es-mail" }],
      ninos: [{ ...nino, dni: "123", fechaNacimiento: "2026-02-30", turno: "NOCHE" }],
    });
    expect(e).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^contactos\.0\.nombre:/),
        expect.stringMatching(/^contactos\.0\.whatsapp:/),
        expect.stringMatching(/^contactos\.0\.whatsappAlt:/),
        expect.stringMatching(/^contactos\.0\.email:/),
        expect.stringMatching(/^ninos\.0\.dni:/),
        expect.stringMatching(/^ninos\.0\.fechaNacimiento: Ingresá una fecha válida/),
        expect.stringMatching(/^ninos\.0\.turno:/),
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
        expect.stringMatching(/^contactos\.1\.whatsapp: Este WhatsApp ya está cargado/),
        expect.stringMatching(/^ninos\.0\.nombre:/),
        expect.stringMatching(/^ninos\.0\.semanas: Elegí al menos una semana/),
      ]),
    );
  });

  it("rechaza edades fuera del rango", () => {
    expect(errores({ contactos: [contacto], ninos: [{ ...nino, fechaNacimiento: "2025-01-01" }] })[0]).toMatch(/edad/);
  });
});

describe("edadParaMostrar", () => {
  it("calcula la edad o devuelve null si la fecha no sirve", () => {
    expect(edadParaMostrar("2019-05-01", "2026-10-23")).toBe(7);
    expect(edadParaMostrar("", "2026-10-23")).toBeNull();
    expect(edadParaMostrar("2027-01-01", "2026-10-23")).toBeNull();
  });
});
