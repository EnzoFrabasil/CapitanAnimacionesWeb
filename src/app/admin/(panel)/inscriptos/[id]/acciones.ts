"use server";

import { refresh } from "next/cache";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirAdmin } from "@/lib/auth/admin";
import { fechaDesdeIso } from "@/lib/dominio/fechas";
import { diasDeOpcion, horariosElegidos, type ModoDescuento } from "@/lib/dominio/opciones";
import { prisma } from "@/lib/prisma";
import { aOpcion } from "@/lib/temporada";
import { inscripcionAdminSchema, mensajesDeError, ninoAdminSchema, responsableAdminSchema } from "@/lib/validacion/admin";

type Previo = ResultadoAccion | null;

export async function actualizarNino(ninoId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = ninoAdminSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  try {
    await prisma.nino.update({ where: { id: ninoId }, data: r.data });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Datos del niño/a guardados.");
}

export async function actualizarInscripcion(inscripcionNinoId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = inscripcionAdminSchema.safeParse({
    grupoEdadId: datos.get("grupoEdadId") ?? "",
    estado: datos.get("estado"),
    modalidad: datos.get("modalidad"),
    semanas: datos.getAll("semanas"),
    dias: datos.getAll("dias"),
    notasAdmin: datos.get("notasAdmin") ?? "",
    posibleDuplicado: datos.get("posibleDuplicado") === "on",
  });
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const d = r.data;

  const actual = await prisma.inscripcionNino.findUnique({
    where: { id: inscripcionNinoId },
    select: { inscripcion: { select: { temporada: { include: { semanas: true, gruposEdad: true } } } } },
  });
  if (!actual) return fallo("La inscripción ya no existe. Recargá la página.");
  const { semanas, gruposEdad } = actual.inscripcion.temporada;

  if (d.grupoEdadId !== null && !gruposEdad.some((g) => g.id === d.grupoEdadId)) return fallo("El grupo no es de esta temporada.");
  const opciones = semanas.map(aOpcion);
  const semanasElegidas = [...new Set(d.semanas)];
  // Cada día llega como "aaaa-mm-dd@idOpcion"; un mismo día se guarda una sola vez.
  const porFecha = new Map<string, number>();
  for (const valor of d.dias) {
    const [fecha, opcion] = valor.split("@");
    if (!porFecha.has(fecha)) porFecha.set(fecha, Number(opcion));
  }
  const diasElegidos = [...porFecha].map(([fecha, opcion]) => ({ fecha, opcion }));
  if (d.modalidad === "SEMANAS") {
    if (semanasElegidas.length === 0) return fallo("Elegí al menos una opción.");
    if (semanasElegidas.some((id) => !opciones.some((o) => o.id === id))) return fallo("Alguna opción elegida no es de esta temporada.");
    if (horariosElegidos(opciones, semanasElegidas).length > 1) return fallo("Elegí opciones de un mismo horario.");
  } else {
    if (diasElegidos.length === 0) return fallo("Elegí al menos un día.");
    const valido = (dia: { fecha: string; opcion: number }) => {
      const opcion = opciones.find((o) => o.id === dia.opcion);
      return opcion !== undefined && diasDeOpcion(opcion).includes(dia.fecha);
    };
    if (!diasElegidos.every(valido)) return fallo("Algún día no es hábil o está fuera de las fechas de su opción.");
    if (horariosElegidos(opciones, diasElegidos.map((x) => x.opcion)).length > 1) return fallo("Elegí días de un mismo horario.");
  }

  try {
    await prisma.$transaction([
      prisma.inscripcionNino.update({
        where: { id: inscripcionNinoId },
        data: {
          grupoEdadId: d.grupoEdadId,
          estado: d.estado,
          modalidad: d.modalidad,
          notasAdmin: d.notasAdmin,
          posibleDuplicado: d.posibleDuplicado,
        },
      }),
      prisma.inscripcionSemana.deleteMany({ where: { inscripcionNinoId } }),
      prisma.inscripcionDia.deleteMany({ where: { inscripcionNinoId } }),
      ...(d.modalidad === "SEMANAS"
        ? [prisma.inscripcionSemana.createMany({ data: semanasElegidas.map((semanaId) => ({ inscripcionNinoId, semanaId })) })]
        : [prisma.inscripcionDia.createMany({ data: diasElegidos.map((dia) => ({ inscripcionNinoId, fecha: fechaDesdeIso(dia.fecha), semanaId: dia.opcion })) })]),
    ]);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Inscripción guardada.");
}

export async function actualizarResponsable(
  ninoId: number,
  responsableId: number,
  _previo: Previo,
  datos: FormData,
): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = responsableAdminSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const { parentesco, ...responsable } = r.data;
  try {
    await prisma.$transaction([
      prisma.responsable.update({ where: { id: responsableId }, data: responsable }),
      prisma.ninoResponsable.update({ where: { ninoId_responsableId: { ninoId, responsableId } }, data: { parentesco } }),
    ]);
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ese WhatsApp ya pertenece a otro contacto." });
  }
  refresh();
  return exito("Contacto guardado.");
}

/** Vincula un contacto al niño. Si el WhatsApp ya existe se vincula ese contacto sin modificar sus datos. */
export async function agregarResponsable(ninoId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = responsableAdminSchema.safeParse(Object.fromEntries(datos));
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const { parentesco, ...nuevo } = r.data;

  try {
    const mensaje = await prisma.$transaction(async (tx) => {
      const existente = await tx.responsable.findUnique({ where: { whatsapp: nuevo.whatsapp } });
      if (existente) {
        const vinculo = await tx.ninoResponsable.findUnique({
          where: { ninoId_responsableId: { ninoId, responsableId: existente.id } },
        });
        if (vinculo) return null;
      }
      const responsable = existente ?? (await tx.responsable.create({ data: nuevo }));
      const ultimo = await tx.ninoResponsable.aggregate({ where: { ninoId }, _max: { orden: true } });
      await tx.ninoResponsable.create({
        data: { ninoId, responsableId: responsable.id, parentesco, esPrincipal: false, orden: (ultimo._max.orden ?? -1) + 1 },
      });
      return existente
        ? `Se vinculó el contacto existente ${existente.nombre} ${existente.apellido} (sus datos no se modificaron).`
        : "Contacto agregado.";
    });
    if (!mensaje) return fallo("Ese contacto ya está vinculado a este niño/a.");
    refresh();
    return exito(mensaje);
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ese WhatsApp ya pertenece a otro contacto." });
  }
}

export async function quitarResponsable(ninoId: number, responsableId: number): Promise<ResultadoAccion> {
  await exigirAdmin();
  try {
    const error = await prisma.$transaction(async (tx) => {
      const vinculos = await tx.ninoResponsable.findMany({ where: { ninoId }, orderBy: { orden: "asc" } });
      const quitado = vinculos.find((v) => v.responsableId === responsableId);
      if (!quitado) return "Ese contacto ya no está vinculado.";
      if (vinculos.length === 1) return "El niño/a tiene que tener al menos un contacto.";
      await tx.ninoResponsable.delete({ where: { ninoId_responsableId: { ninoId, responsableId } } });
      if (quitado.esPrincipal) {
        const siguiente = vinculos.find((v) => v.responsableId !== responsableId)!;
        await tx.ninoResponsable.update({
          where: { ninoId_responsableId: { ninoId, responsableId: siguiente.responsableId } },
          data: { esPrincipal: true },
        });
      }
      return null;
    });
    if (error) return fallo(error);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Contacto quitado (el contacto sigue existiendo para otros niños).");
}

export async function hacerPrincipal(ninoId: number, responsableId: number): Promise<ResultadoAccion> {
  await exigirAdmin();
  try {
    await prisma.$transaction([
      prisma.ninoResponsable.updateMany({ where: { ninoId }, data: { esPrincipal: false } }),
      prisma.ninoResponsable.update({
        where: { ninoId_responsableId: { ninoId, responsableId } },
        data: { esPrincipal: true },
      }),
    ]);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Contacto principal actualizado.");
}

export async function moverAFamilia(ninoId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const destino = String(datos.get("familiaId") ?? "").trim().replace(/^#/, "");
  try {
    let familiaId: number;
    if (destino.toLowerCase() === "nueva") {
      familiaId = (await prisma.familia.create({ data: {} })).id;
    } else {
      familiaId = Number(destino);
      if (!Number.isInteger(familiaId) || familiaId <= 0) return fallo('Escribí el número de familia o "nueva".');
      if (!(await prisma.familia.findUnique({ where: { id: familiaId } }))) return fallo(`No existe la familia #${familiaId}.`);
    }
    await prisma.nino.update({ where: { id: ninoId }, data: { familiaId } });
    refresh();
    return exito(`El niño/a ahora está en la familia #${familiaId}.`);
  } catch (e) {
    return falloPorExcepcion(e);
  }
}

/** Pasa todos los niños e inscripciones de otra familia a esta, y borra la otra. */
export async function unirFamilias(familiaId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const otra = Number(String(datos.get("otraFamiliaId") ?? "").trim().replace(/^#/, ""));
  if (!Number.isInteger(otra) || otra <= 0) return fallo("Escribí el número de la otra familia.");
  if (otra === familiaId) return fallo("Es la misma familia.");
  if (datos.get("confirmar") !== "on") return fallo("Marcá la casilla para confirmar la unión.");
  try {
    if (!(await prisma.familia.findUnique({ where: { id: otra } }))) return fallo(`No existe la familia #${otra}.`);
    await prisma.$transaction([
      prisma.nino.updateMany({ where: { familiaId: otra }, data: { familiaId } }),
      prisma.inscripcion.updateMany({ where: { familiaId: otra }, data: { familiaId } }),
      prisma.familia.delete({ where: { id: otra } }),
    ]);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito(`La familia #${otra} se unió a la familia #${familiaId}.`);
}

const MODOS_DESCUENTO: readonly ModoDescuento[] = ["AUTOMATICO", "SI", "NO"];

/** Descuento por hermanos de la familia: automático (2 o más chicos), forzado o quitado. */
export async function cambiarDescuentoHermanos(familiaId: number, _previo: Previo, datos: FormData): Promise<ResultadoAccion> {
  await exigirAdmin();
  const modo = MODOS_DESCUENTO.find((m) => m === datos.get("descuentoHermanos"));
  if (!modo) return fallo("Elegí una opción de descuento.");
  try {
    await prisma.familia.update({ where: { id: familiaId }, data: { descuentoHermanos: modo } });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito("Descuento guardado.");
}
