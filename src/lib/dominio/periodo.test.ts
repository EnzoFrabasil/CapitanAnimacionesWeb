import { describe, expect, it } from "vitest";
import { crearInscripcionSchema } from "@/lib/validacion/inscripcion";
import { etiquetaModalidad, etiquetaTurno, periodo } from "./periodo";

describe("periodo", () => {
  it("arma singular, plural e inicial", () => {
    expect(periodo("Quincena")).toEqual({ singular: "Quincena", plural: "Quincenas", inicial: "Q" });
    expect(periodo()).toEqual({ singular: "Semana", plural: "Semanas", inicial: "S" });
    expect(etiquetaModalidad("SEMANAS", periodo("Quincena"))).toBe("Por quincenas");
    expect(etiquetaModalidad("POR_DIA", periodo("Quincena"))).toBe("Por día");
  });

  it("acepta cualquier nombre y arma el plural en castellano", () => {
    expect(periodo("Mes").plural).toBe("Meses");
    expect(periodo("Vez").plural).toBe("Veces");
    expect(periodo("  Turno  ")).toEqual({ singular: "Turno", plural: "Turnos", inicial: "T" });
    expect(periodo("").singular).toBe("Semana");
  });

  it("muestra el horario del turno si está cargado", () => {
    expect(etiquetaTurno("MANANA", { MANANA: "8:30 a 12:30 hs" })).toBe("Mañana (8:30 a 12:30 hs)");
    expect(etiquetaTurno("TARDE", { MANANA: "8:30 a 12:30 hs", TARDE: " " })).toBe("Tarde");
  });

  it("usa el nombre del período en los errores del formulario", () => {
    const schema = crearInscripcionSchema({
      hoy: "2026-10-23",
      semanas: [{ id: 1, numero: 1, fechaInicio: "2027-01-04", fechaFin: "2027-01-15" }],
      nombrePeriodo: "Quincena",
    });
    const r = schema.safeParse({
      contactos: [{ nombre: "Ana", apellido: "Paz", parentesco: "", whatsapp: "11 2345-6789", whatsappAlt: "", email: "" }],
      ninos: [{ nombre: "Leo", apellido: "Paz", dni: "50111222", fechaNacimiento: "2019-05-01", infoAdicional: "", turno: "MANANA", modalidad: "SEMANAS", semanas: [], dias: [] }],
    });
    expect(r.error?.issues.map((i) => i.message)).toContain("Elegí a qué quincenas va a asistir.");
  });
});
