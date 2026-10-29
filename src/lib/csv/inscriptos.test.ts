import { describe, expect, it } from "vitest";
import { BOM } from "./formato";
import {
  COLUMNAS,
  generarCsvInscriptos,
  leerArchivo,
  leerEstado,
  leerFecha,
  planificarImportacion,
  referenciasDelArchivo,
  type ContextoExport,
  type ContextoImportacion,
  type EstadoActual,
  type InscriptoExport,
} from "./inscriptos";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

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
const ctxExport: ContextoExport = {
  opciones: [opcion(10, 1, "2027-01-04", "2027-01-15"), opcion(11, 2, "2027-01-18", "2027-01-29")],
  precios: { coloniaCompleta: 230000, dia: null, descuentoHermanos: 10 },
};
const csvDe = (filas: InscriptoExport[]) => generarCsvInscriptos(filas, ctxExport);

const tomas: InscriptoExport = {
  id: 1,
  estado: "EN_ESPERA",
  modalidad: "SEMANAS",
  edadAlInscribir: 7,
  posibleDuplicado: false,
  inscripcion: { numero: 1, fechaAlta: new Date("2026-10-23T03:47:00Z") },
  grupoEdad: { nombre: "Marineros (6 a 8)" },
  semanas: [{ semanaId: 11 }, { semanaId: 10 }],
  dias: [],
  nino: {
    nombre: "Tomás",
    apellido: "García",
    dni: "50111222",
    fechaNacimiento: d("2019-03-10"),
    infoAdicional: "Alérgico al maní; usa \"EpiPen\".\nAvisar a la profe.",
    responsables: [{ parentesco: "Madre", responsable: { nombre: "Laura", apellido: "García", whatsapp: "+5491123456789", email: "laura@example.com" } }],
  },
};

const lucas: InscriptoExport = {
  ...tomas,
  id: 3,
  modalidad: "POR_DIA",
  posibleDuplicado: true,
  grupoEdad: null,
  semanas: [],
  dias: [{ fecha: d("2027-01-15"), semanaId: 10 }, { fecha: d("2027-01-04"), semanaId: 10 }],
  inscripcion: { numero: 2, fechaAlta: new Date("2026-10-24T15:00:00Z") },
  nino: {
    ...tomas.nino,
    nombre: "Lucas",
    apellido: "Pérez",
    dni: "47555666",
    infoAdicional: null,
    responsables: [{ parentesco: "Padre", responsable: { nombre: "Martín", apellido: "Pérez", whatsapp: "+5493514567890", email: null } }],
  },
};

describe("generarCsvInscriptos", () => {
  const csv = csvDe([tomas, lucas]);
  const lineas = csv.slice(1).split("\r\n");

  it("empieza con BOM, usa ; y tiene las columnas pedidas", () => {
    expect(csv.startsWith(BOM)).toBe(true);
    expect(lineas[0]).toBe(COLUMNAS.join(";"));
  });

  it("formatea fechas dd/mm/aaaa, etiquetas en español y asistencia", () => {
    const fila = leerArchivo(csv).filas[0].valores;
    expect(fila).toMatchObject({
      id: "1",
      numero_inscripcion: "1",
      fecha_alta: "23/10/2026 00:47",
      estado: "En espera",
      fecha_nacimiento: "10/03/2019",
      grupo: "Marineros (6 a 8)",
      horario: "8:30 a 12:30 hs",
      modalidad: "Opciones",
      asistencia: "Colonia completa",
      dias: "",
      precio: "230000",
      info_adicional: tomas.nino.infoAdicional,
      posible_duplicado: "No",
      contacto_whatsapp: "+5491123456789",
    });
    const fila2 = leerArchivo(csv).filas[1].valores;
    expect(fila2).toMatchObject({ grupo: "", modalidad: "Días sueltos", asistencia: "2 días", dias: "04/01/2027, 15/01/2027", precio: "", posible_duplicado: "Sí", contacto_email: "" });
  });

  it("protege el WhatsApp (empieza con +) contra fórmulas y escapa el texto con ; y saltos de línea", () => {
    expect(csv).toContain(";'+5491123456789;");
    expect(csv).toContain('"Alérgico al maní; usa ""EpiPen"".\nAvisar a la profe."');
  });
});

describe("lectores de valores", () => {
  it("leerFecha acepta formatos comunes de Excel", () => {
    expect(leerFecha("04/01/2027")).toBe("2027-01-04");
    expect(leerFecha("4/1/2027")).toBe("2027-01-04");
    expect(leerFecha("04-01-2027")).toBe("2027-01-04");
    expect(leerFecha("2027-01-04")).toBe("2027-01-04");
    expect(leerFecha("31/02/2027")).toBeNull();
    expect(leerFecha("ayer")).toBeNull();
  });

  it("leerEstado acepta etiquetas o códigos, sin importar tildes ni mayúsculas", () => {
    expect(leerEstado("confirmado")).toBe("CONFIRMADO");
    expect(leerEstado("EN_ESPERA")).toBe("EN_ESPERA");
    expect(leerEstado(" En espera ")).toBe("EN_ESPERA");
    expect(leerEstado("Contactado")).toBe("CONTACTADO");
    expect(leerEstado("pagado")).toBeNull();
  });
});

// ---------------------------------------------------------------------------

const actualDe = (f: InscriptoExport, extra: Partial<EstadoActual> = {}): EstadoActual => ({
  id: f.id,
  ninoId: f.id * 10,
  temporadaId: 1,
  estado: f.estado,
  grupoEdadId: f.grupoEdad ? 2 : null,
  nino: {
    nombre: f.nino.nombre,
    apellido: f.nino.apellido,
    dni: f.nino.dni,
    fechaNacimiento: f.nino.fechaNacimiento.toISOString().slice(0, 10),
    infoAdicional: f.nino.infoAdicional,
  },
  contacto: {
    responsableId: f.id * 100,
    ...f.nino.responsables[0].responsable,
    parentesco: f.nino.responsables[0].parentesco,
    ninosVinculados: 1,
  },
  ...extra,
});

const contexto = (actuales: EstadoActual[], whatsapps: [string, number][] = []): ContextoImportacion => ({
  actuales: new Map(actuales.map((a) => [a.id, a])),
  gruposPorTemporada: new Map([
    [
      1,
      [
        { id: 1, nombre: "Grumetes (3 a 5)" },
        { id: 2, nombre: "Marineros (6 a 8)" },
        { id: 3, nombre: "Piratas (9 a 12)" },
      ],
    ],
  ]),
  responsablePorWhatsapp: new Map([...actuales.map((a) => [a.contacto!.whatsapp, a.contacto!.responsableId] as [string, number]), ...whatsapps]),
  hoy: "2026-10-23",
});

/** Genera el CSV exportado y le aplica modificaciones como si se editara en Excel. */
function editar(filas: InscriptoExport[], cambios: Record<number, Partial<Record<(typeof COLUMNAS)[number], string>>> = {}, extra = "") {
  const archivo = leerArchivo(csvDe(filas));
  const lineas = [COLUMNAS.join(";")];
  for (const { valores } of archivo.filas) {
    const v = { ...valores, ...cambios[Number(valores.id)] };
    lineas.push(COLUMNAS.map((c) => `"${(v[c] ?? "").replace(/"/g, '""')}"`).join(";"));
  }
  return lineas.join("\n") + extra;
}

describe("planificarImportacion", () => {
  const ctx = contexto([actualDe(tomas), actualDe(lucas)]);

  it("el CSV exportado sin cambios no genera cambios", () => {
    const plan = planificarImportacion(leerArchivo(csvDe([tomas, lucas])), ctx);
    expect(plan).toMatchObject({ errorGeneral: null, filasLeidas: 2, cambios: [], sinCambios: 2, errores: [], ignoradas: [] });
  });

  it("muestra los cambios campo por campo con valor anterior y nuevo", () => {
    const texto = editar([tomas, lucas], {
      1: { estado: "Confirmado", grupo: "piratas (9 a 12)", horario: "14 a 18 hs", dni: "50.111.223", fecha_nacimiento: "9/3/2019" },
      3: { contacto_whatsapp: "351 456-7891", contacto_email: "martin@example.com", info_adicional: "Celíaco", grupo: "Sin grupo" },
    });
    const plan = planificarImportacion(leerArchivo(texto), ctx);
    expect(plan.errores).toEqual([]);
    expect(plan.cambios.map((c) => [c.id, c.campos])).toEqual([
      [
        1,
        [
          { columna: "dni", anterior: "50111222", nuevo: "50111223" },
          { columna: "fecha_nacimiento", anterior: "10/03/2019", nuevo: "09/03/2019" },
          { columna: "estado", anterior: "En espera", nuevo: "Confirmado" },
          { columna: "grupo", anterior: "Marineros (6 a 8)", nuevo: "Piratas (9 a 12)" },
        ],
      ],
      [
        3,
        [
          { columna: "info_adicional", anterior: "(vacío)", nuevo: "Celíaco" },
          { columna: "contacto_whatsapp", anterior: "+54 9 351 456 7890", nuevo: "+54 9 351 456 7891" },
          { columna: "contacto_email", anterior: "(vacío)", nuevo: "martin@example.com" },
        ],
      ],
    ]);
    expect(plan.cambios[0].datos).toMatchObject({
      nino: { dni: "50111223", fechaNacimiento: "2019-03-09" },
      inscripcion: { estado: "CONFIRMADO", grupoEdadId: 3 },
      responsable: {},
    });
    expect(plan.cambios[1].datos).toMatchObject({
      responsableId: 300,
      responsable: { whatsapp: "+5493514567891", email: "martin@example.com" },
      nino: { infoAdicional: "Celíaco" },
    });
  });

  it("ignora filas sin id o con id inexistente y no borra las que faltan", () => {
    const texto = editar([tomas], {}, '\n;"Nuevo";\n999;Otro\nabc;x');
    const plan = planificarImportacion(leerArchivo(texto), ctx);
    expect(plan.ignoradas.map((i) => i.motivo)).toEqual([
      "No tiene id (las filas nuevas no se crean).",
      "No existe un inscripto con id 999.",
      "No existe un inscripto con id abc.",
    ]);
    expect(plan.sinCambios).toBe(1); // Lucas no está en el archivo y no pasa nada
  });

  it("informa errores por fila y no aplica esas filas", () => {
    const texto = editar([tomas, lucas], {
      1: { estado: "Pagado", dni: "123", grupo: "Delfines", fecha_nacimiento: "30/02/2019", nombre: "" },
      3: { contacto_whatsapp: "123", contacto_email: "no-es-mail" },
    });
    const plan = planificarImportacion(leerArchivo(texto), ctx);
    expect(plan.cambios).toEqual([]);
    expect(plan.errores.map((e) => [e.fila, e.id, e.mensajes.length])).toEqual([
      [2, 1, 5],
      [3, 3, 2],
    ]);
  });

  it("rechaza un WhatsApp que ya es de otro contacto e ids repetidos", () => {
    const texto = editar([tomas, lucas], { 3: { contacto_whatsapp: "11 2345-6789" } }) + "\n" + editar([tomas]).split("\n")[1];
    const plan = planificarImportacion(leerArchivo(texto), ctx);
    expect(plan.errores.map((e) => e.mensajes[0])).toEqual([
      "El WhatsApp +54 9 11 2345 6789 ya pertenece a otro contacto.",
      "El id 1 está repetido (ya aparece en la fila 2).",
    ]);
  });

  it("advierte si se edita un contacto compartido y detecta filas contradictorias", () => {
    const sofia: InscriptoExport = { ...tomas, id: 2, nino: { ...tomas.nino, nombre: "Sofía", dni: "52333444" } };
    const compartido = { responsableId: 100, ninosVinculados: 2 };
    const ctx2 = contexto([
      actualDe(tomas, { contacto: { ...actualDe(tomas).contacto!, ...compartido } }),
      actualDe(sofia, { contacto: { ...actualDe(tomas).contacto!, ...compartido } }),
    ]);

    const igual = planificarImportacion(leerArchivo(editar([tomas, sofia], { 1: { contacto_nombre: "Laurita" }, 2: { contacto_nombre: "Laurita" } })), ctx2);
    expect(igual.errores).toEqual([]);
    expect(igual.cambios[0].advertencias[0]).toMatch(/vinculado a 2 niños: el cambio afecta a todos/);

    const distinto = planificarImportacion(leerArchivo(editar([tomas, sofia], { 1: { contacto_nombre: "Laurita" }, 2: { contacto_nombre: "Lau" } })), ctx2);
    expect(distinto.cambios).toHaveLength(1);
    expect(distinto.errores[0].mensajes[0]).toMatch(/La fila 2 cambia el mismo dato a otro valor/);
  });

  it("acepta coma como separador y columnas parciales (solo cambia las que vienen)", () => {
    const plan = planificarImportacion(leerArchivo("id,estado,columna_rara\n1,Cancelado,x\n"), ctx);
    expect(plan.columnasIgnoradas).toEqual(["columna_rara"]);
    expect(plan.cambios[0].campos).toEqual([{ columna: "estado", anterior: "En espera", nuevo: "Cancelado" }]);
  });

  it("exige la columna id", () => {
    expect(planificarImportacion(leerArchivo("nombre;apellido\nA;B"), ctx).errorGeneral).toMatch(/Falta la columna "id"/);
  });

  it("referenciasDelArchivo junta ids y WhatsApp normalizados", () => {
    const archivo = leerArchivo(editar([tomas, lucas], { 3: { contacto_whatsapp: "351 456-7891" } }));
    expect(referenciasDelArchivo(archivo)).toEqual({ ids: [1, 3], whatsapps: ["+5491123456789", "+5493514567891"] });
  });
});
