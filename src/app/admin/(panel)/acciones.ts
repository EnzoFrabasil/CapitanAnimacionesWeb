"use server";

import { refresh } from "next/cache";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirPermiso } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { diferencias } from "@/lib/registro/diferencias";
import { registrar } from "@/lib/registro/servidor";
import { edicionRapidaSchema, mensajesDeError, ninoAdminSchema, type EdicionRapida } from "@/lib/validacion/admin";

// Acciones del listado de inscriptos (edición rápida desde la tabla).

export async function guardarEdicionRapida(inscripcionNinoId: number, datos: EdicionRapida): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("inscriptos.editar");
  const r = edicionRapidaSchema.safeParse(datos);
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const d = r.data;

  const actual = await prisma.inscripcionNino.findUnique({
    where: { id: inscripcionNinoId },
    select: {
      ninoId: true,
      grupoEdadId: true,
      estado: true,
      inscripcion: { select: { temporada: { select: { gruposEdad: { select: { id: true } } } } } },
      nino: {
        select: {
          nombre: true,
          apellido: true,
          dni: true,
          responsables: {
            orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
            take: 1,
            select: { responsableId: true, responsable: { select: { nombre: true, apellido: true, whatsapp: true } } },
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
  const contactoAntes = actual.nino.responsables[0]?.responsable;

  try {
    await prisma.$transaction([
      prisma.nino.update({ where: { id: actual.ninoId }, data: d.nino }),
      prisma.inscripcionNino.update({
        where: { id: inscripcionNinoId },
        data: { grupoEdadId: d.grupoEdadId, estado: d.estado },
      }),
      ...(principal && d.contacto ? [prisma.responsable.update({ where: { id: principal }, data: d.contacto })] : []),
    ]);
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ese WhatsApp ya pertenece a otro contacto." });
  }
  await registrar(
    {
      accion: "inscripto.editar",
      entidad: "inscripto",
      entidadId: inscripcionNinoId,
      detalle: {
        nino: `${actual.nino.nombre} ${actual.nino.apellido}`,
        desde: "edición rápida",
        cambios: {
          ...diferencias(actual.nino, d.nino),
          ...diferencias(actual, { grupoEdadId: d.grupoEdadId, estado: d.estado }),
          ...(contactoAntes && d.contacto
            ? Object.fromEntries(Object.entries(diferencias(contactoAntes, d.contacto)).map(([k, v]) => [`contacto.${k}`, v]))
            : {}),
        },
      },
    },
    usuario,
  );
  refresh();
  return exito("Cambios guardados.");
}

/** Cambia la información adicional (alergias, medicación, etc.) desde la ficha rápida. Vacío la borra. */
export async function guardarInfoAdicional(inscripcionNinoId: number, texto: string): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("inscriptos.editar");
  const r = ninoAdminSchema.shape.infoAdicional.safeParse(texto);
  if (!r.success) return fallo(...mensajesDeError(r.error));
  let fila;
  try {
    fila = await prisma.inscripcionNino.findUnique({
      where: { id: inscripcionNinoId },
      select: { ninoId: true, nino: { select: { nombre: true, apellido: true, infoAdicional: true } } },
    });
    if (!fila) return fallo("El inscripto ya no existe. Recargá la página.");
    await prisma.nino.update({ where: { id: fila.ninoId }, data: { infoAdicional: r.data } });
  } catch (e) {
    return falloPorExcepcion(e);
  }
  await registrar(
    {
      accion: "inscripto.editar",
      entidad: "inscripto",
      entidadId: inscripcionNinoId,
      detalle: {
        nino: `${fila.nino.nombre} ${fila.nino.apellido}`,
        desde: "ficha rápida",
        cambios: diferencias(fila.nino, { infoAdicional: r.data }),
      },
    },
    usuario,
  );
  refresh();
  return exito("Información adicional guardada.");
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Borra inscriptos dentro de una transacción, con una cantidad fija de
 * consultas sin importar cuántos sean. Los niños/as sin otras inscripciones se
 * borran también, y además la inscripción, la familia y los contactos que
 * quedan sin uso (son datos personales). Devuelve a quiénes se borró (para el registro).
 */
async function borrarInscriptos(tx: Tx, ids: number[]): Promise<string[]> {
  const filas = await tx.inscripcionNino.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      inscripcionId: true,
      inscripcion: { select: { numero: true } },
      nino: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          dni: true,
          familiaId: true,
          responsables: { select: { responsableId: true } },
        },
      },
    },
  });
  if (filas.length === 0) return [];
  const unicos = (valores: number[]) => [...new Set(valores)];
  const ninos = unicos(filas.map((f) => f.nino.id));
  const inscripciones = unicos(filas.map((f) => f.inscripcionId));
  const familias = unicos(filas.map((f) => f.nino.familiaId));
  const responsables = unicos(filas.flatMap((f) => f.nino.responsables.map((r) => r.responsableId)));

  await tx.inscripcionNino.deleteMany({ where: { id: { in: ids } } });
  // Los vínculos niño-contacto se borran solos con el niño.
  await tx.nino.deleteMany({ where: { id: { in: ninos }, inscripciones: { none: {} } } });
  await tx.inscripcion.deleteMany({ where: { id: { in: inscripciones }, ninos: { none: {} } } });
  await tx.responsable.deleteMany({
    where: { id: { in: responsables }, ninos: { none: {} }, inscripcionesPrincipal: { none: {} } },
  });
  await tx.familia.deleteMany({ where: { id: { in: familias }, ninos: { none: {} }, inscripciones: { none: {} } } });
  return filas.map((f) => `${f.nino.nombre} ${f.nino.apellido} (DNI ${f.nino.dni}, insc. N.º ${f.inscripcion.numero})`);
}

const OPCIONES_BORRADO = { maxWait: 10_000, timeout: 60_000 };

export async function eliminarInscripto(inscripcionNinoId: number): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("inscriptos.borrar");
  let borrados: string[] = [];
  try {
    borrados = await prisma.$transaction((tx) => borrarInscriptos(tx, [inscripcionNinoId]), OPCIONES_BORRADO);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  if (borrados.length === 0) return fallo("El inscripto ya no existe. Recargá la página.");
  await registrar({ accion: "inscripto.eliminar", entidad: "inscripto", entidadId: inscripcionNinoId, detalle: { eliminados: borrados } }, usuario);
  refresh();
  return exito("Inscripto eliminado.");
}

/** Elimina varios inscriptos juntos (selección múltiple del listado). Todo o nada. */
export async function eliminarInscriptos(ids: number[]): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("inscriptos.borrar");
  const validos = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  if (validos.length === 0) return fallo("No hay inscriptos seleccionados.");
  let borrados: string[] = [];
  try {
    borrados = await prisma.$transaction((tx) => borrarInscriptos(tx, validos), OPCIONES_BORRADO);
  } catch (e) {
    return falloPorExcepcion(e);
  }
  if (borrados.length > 0) {
    await registrar({ accion: "inscripto.eliminar", entidad: "inscripto", detalle: { eliminados: borrados } }, usuario);
  }
  refresh();
  return exito(`Se ${borrados.length === 1 ? "eliminó 1 inscripto" : `eliminaron ${borrados.length} inscriptos`}.`);
}
