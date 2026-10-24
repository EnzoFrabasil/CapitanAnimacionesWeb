"use server";

import { refresh } from "next/cache";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { edicionRapidaSchema, mensajesDeError, type EdicionRapida } from "@/lib/validacion/admin";

// Acciones del listado de inscriptos (edición rápida desde la tabla).

export async function guardarEdicionRapida(inscripcionNinoId: number, datos: EdicionRapida): Promise<ResultadoAccion> {
  await exigirAdmin();
  const r = edicionRapidaSchema.safeParse(datos);
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const d = r.data;

  const actual = await prisma.inscripcionNino.findUnique({
    where: { id: inscripcionNinoId },
    select: {
      ninoId: true,
      inscripcion: { select: { temporada: { select: { gruposEdad: { select: { id: true } } } } } },
      nino: {
        select: {
          responsables: {
            orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
            take: 1,
            select: { responsableId: true },
          },
        },
      },
    },
  });
  if (!actual) return fallo("El inscripto ya no existe. Recargá la página.");
  if (d.grupoEdadId !== null && !actual.inscripcion.temporada.gruposEdad.some((g) => g.id === d.grupoEdadId)) {
    return fallo("El grupo no es de esta temporada.");
  }
  const principal = actual.nino.responsables[0]?.responsableId;

  try {
    await prisma.$transaction([
      prisma.nino.update({ where: { id: actual.ninoId }, data: d.nino }),
      prisma.inscripcionNino.update({
        where: { id: inscripcionNinoId },
        data: { grupoEdadId: d.grupoEdadId, turno: d.turno, estado: d.estado },
      }),
      ...(principal && d.contacto ? [prisma.responsable.update({ where: { id: principal }, data: d.contacto })] : []),
    ]);
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ese WhatsApp ya pertenece a otro contacto." });
  }
  refresh();
  return exito("Cambios guardados.");
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Borra inscriptos dentro de una transacción, con una cantidad fija de
 * consultas sin importar cuántos sean. Los niños/as sin otras inscripciones se
 * borran también, y además la inscripción, la familia y los contactos que
 * quedan sin uso (son datos personales). Devuelve cuántos se borraron.
 */
async function borrarInscriptos(tx: Tx, ids: number[]): Promise<number> {
  const filas = await tx.inscripcionNino.findMany({
    where: { id: { in: ids } },
    select: {
      inscripcionId: true,
      nino: { select: { id: true, familiaId: true, responsables: { select: { responsableId: true } } } },
    },
  });
  if (filas.length === 0) return 0;
  const unicos = (valores: number[]) => [...new Set(valores)];
  const ninos = unicos(filas.map((f) => f.nino.id));
  const inscripciones = unicos(filas.map((f) => f.inscripcionId));
  const familias = unicos(filas.map((f) => f.nino.familiaId));
  const responsables = unicos(filas.flatMap((f) => f.nino.responsables.map((r) => r.responsableId)));

  const { count } = await tx.inscripcionNino.deleteMany({ where: { id: { in: ids } } });
  // Los vínculos niño-contacto se borran solos con el niño.
  await tx.nino.deleteMany({ where: { id: { in: ninos }, inscripciones: { none: {} } } });
  await tx.inscripcion.deleteMany({ where: { id: { in: inscripciones }, ninos: { none: {} } } });
  await tx.responsable.deleteMany({
    where: { id: { in: responsables }, ninos: { none: {} }, inscripcionesPrincipal: { none: {} } },
  });
  await tx.familia.deleteMany({ where: { id: { in: familias }, ninos: { none: {} }, inscripciones: { none: {} } } });
  return count;
}

const OPCIONES_BORRADO = { maxWait: 10_000, timeout: 60_000 };

export async function eliminarInscripto(inscripcionNinoId: number): Promise<ResultadoAccion> {
  await exigirAdmin();
  let borrados = 0;
  try {
    borrados = await prisma.$transaction((tx) => borrarInscriptos(tx, [inscripcionNinoId]), OPCIONES_BORRADO);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  if (borrados === 0) return fallo("El inscripto ya no existe. Recargá la página.");
  refresh();
  return exito("Inscripto eliminado.");
}

/** Elimina varios inscriptos juntos (selección múltiple del listado). Todo o nada. */
export async function eliminarInscriptos(ids: number[]): Promise<ResultadoAccion> {
  await exigirAdmin();
  const validos = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  if (validos.length === 0) return fallo("No hay inscriptos seleccionados.");
  let borrados = 0;
  try {
    borrados = await prisma.$transaction((tx) => borrarInscriptos(tx, validos), OPCIONES_BORRADO);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  refresh();
  return exito(`Se ${borrados === 1 ? "eliminó 1 inscripto" : `eliminaron ${borrados} inscriptos`}.`);
}
