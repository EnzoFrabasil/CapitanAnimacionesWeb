"use server";

import { refresh } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { cookies } from "next/headers";
import { COOKIE_TEMPORADA } from "@/lib/admin/temporadaPanel";
import { exito, fallo, falloPorExcepcion, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirPermiso, exigirUsuario } from "@/lib/auth/usuario";
import { precioConfirmadoAlCambiar } from "@/lib/admin/precioConfirmado";
import { prisma } from "@/lib/prisma";
import { diferencias } from "@/lib/registro/diferencias";
import { registrar, type Evento } from "@/lib/registro/servidor";
import { edicionRapidaSchema, mensajesDeError, ninoAdminSchema, type EdicionRapida } from "@/lib/validacion/admin";

// Acciones del listado de inscriptos (edición rápida desde la tabla).

/** Elige la temporada que se mira en todo el panel (barra de arriba). */
export async function elegirTemporadaPanel(temporadaId: number): Promise<void> {
  await exigirUsuario();
  if (!Number.isInteger(temporadaId) || !(await prisma.temporada.findUnique({ where: { id: temporadaId }, select: { id: true } }))) return;
  (await cookies()).set(COOKIE_TEMPORADA, String(temporadaId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 365 * 24 * 60 * 60,
  });
  refresh();
}

type Preparada =
  | { ok: false; error: string }
  | {
      ok: true;
      operaciones: Prisma.PrismaPromise<unknown>[];
      /** Contacto principal que se modifica (para detectar dos filas que lo cambian distinto). */
      contacto: { id: number; datos: string } | null;
      evento: Evento;
    };

/**
 * Valida la edición rápida de una fila y arma las operaciones para guardarla
 * (sin ejecutarlas), así se pueden guardar varias filas en una sola transacción.
 */
async function prepararEdicionRapida(inscripcionNinoId: number, datos: EdicionRapida): Promise<Preparada> {
  const r = edicionRapidaSchema.safeParse(datos);
  if (!r.success) return { ok: false, error: mensajesDeError(r.error).join(" ") };
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
  if (!actual) return { ok: false, error: "El inscripto ya no existe. Recargá la página." };
  if (d.grupoEdadId !== null && !actual.inscripcion.temporada.gruposEdad.some((g) => g.id === d.grupoEdadId)) {
    return { ok: false, error: "El grupo no es de esta temporada." };
  }
  const principal = actual.nino.responsables[0]?.responsableId;
  const contactoAntes = actual.nino.responsables[0]?.responsable;
  // Al pasar a Confirmado el precio queda fijo; al salir de Confirmado se libera.
  const precioConfirmado = await precioConfirmadoAlCambiar(prisma, inscripcionNinoId, d.estado);

  return {
    ok: true,
    operaciones: [
      prisma.nino.update({ where: { id: actual.ninoId }, data: d.nino }),
      prisma.inscripcionNino.update({ where: { id: inscripcionNinoId }, data: { grupoEdadId: d.grupoEdadId, estado: d.estado, precioConfirmado } }),
      ...(principal && d.contacto ? [prisma.responsable.update({ where: { id: principal }, data: d.contacto })] : []),
    ],
    contacto: principal && d.contacto ? { id: principal, datos: JSON.stringify(d.contacto) } : null,
    evento: {
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
  };
}

export async function guardarEdicionRapida(inscripcionNinoId: number, datos: EdicionRapida): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("inscriptos.editar");
  const preparada = await prepararEdicionRapida(inscripcionNinoId, datos);
  if (!preparada.ok) return fallo(preparada.error);
  try {
    await prisma.$transaction(preparada.operaciones);
  } catch (e) {
    return falloPorExcepcion(e, { unico: "Ese WhatsApp ya pertenece a otro contacto." });
  }
  await registrar(preparada.evento, usuario);
  refresh();
  return exito("Cambios guardados.");
}

export type ResultadoEdicionMasiva =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; /** Error de cada fila con problemas (por id de la fila). */ porFila: Record<number, string> };

const MAXIMO_EDICION_MASIVA = 500;

/**
 * "Editar todos": guarda varias filas juntas. Primero valida todas; si alguna
 * tiene un error no se guarda ninguna (todo o nada, en una sola transacción).
 */
export async function guardarEdicionesMasivas(cambios: { id: number; datos: EdicionRapida }[]): Promise<ResultadoEdicionMasiva> {
  const usuario = await exigirPermiso("inscriptos.editar");
  if (!Array.isArray(cambios) || cambios.length === 0) return { ok: true, mensaje: "No había cambios para guardar." };
  if (cambios.length > MAXIMO_EDICION_MASIVA) return { ok: false, error: `Se pueden guardar hasta ${MAXIMO_EDICION_MASIVA} filas juntas.`, porFila: {} };

  const porFila: Record<number, string> = {};
  const listas: Extract<Preparada, { ok: true }>[] = [];
  const contactos = new Map<number, { datos: string; fila: number }>();
  for (const c of cambios) {
    const preparada = await prepararEdicionRapida(c.id, c.datos);
    if (!preparada.ok) {
      porFila[c.id] = preparada.error;
      continue;
    }
    // Hermanos con el mismo contacto principal: no puede quedar cambiado de dos formas distintas.
    if (preparada.contacto) {
      const previo = contactos.get(preparada.contacto.id);
      if (previo && previo.datos !== preparada.contacto.datos) {
        porFila[c.id] = "Este contacto también está en otra fila con datos distintos: dejalos iguales.";
        continue;
      }
      contactos.set(preparada.contacto.id, { datos: preparada.contacto.datos, fila: c.id });
    }
    listas.push(preparada);
  }
  const conError = Object.keys(porFila).length;
  if (conError > 0) {
    return {
      ok: false,
      error: `No se guardó nada: ${conError === 1 ? "1 fila tiene" : `${conError} filas tienen`} un error (marcadas en rojo). Corregilas y guardá de nuevo.`,
      porFila,
    };
  }

  try {
    await prisma.$transaction(listas.flatMap((l) => l.operaciones));
  } catch (e) {
    const r = falloPorExcepcion(e, { unico: "Algún WhatsApp ya pertenece a otro contacto." });
    return { ok: false, error: `${r.ok ? "" : r.errores[0]} No se guardó nada.`, porFila: {} };
  }
  for (const l of listas) await registrar(l.evento, usuario);
  refresh();
  return { ok: true, mensaje: `Se ${listas.length === 1 ? "guardó 1 inscripto" : `guardaron ${listas.length} inscriptos`}.` };
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
