"use server";

import { updateTag } from "next/cache";
import { exigirPermiso } from "@/lib/auth/usuario";
import { validarContenido, type Contenido, type ErrorContenido } from "@/lib/contenido/esquema";
import { TAG_CONTENIDO, guardarVersion, imagenesUsadas } from "@/lib/contenido/servidor";
import { prisma } from "@/lib/prisma";
import { registrar } from "@/lib/registro/servidor";

export type ResultadoPublicar =
  | { ok: true; version: number; contenido: Contenido }
  | { ok: false; errores: ErrorContenido[] }
  | { ok: false; conflicto: true };

/**
 * Valida y publica el contenido de la página de inicio. Si hay errores no se
 * publica nada. `versionBase` es la versión sobre la que se empezó a editar:
 * si otro administrador publicó mientras tanto, avisa (salvo `forzar`).
 */
export async function publicarContenido(
  datos: unknown,
  versionBase: number | null,
  forzar: boolean,
): Promise<ResultadoPublicar> {
  const usuario = await exigirPermiso("contenido.editar");

  const r = validarContenido(datos);
  if (!r.ok) return r;

  try {
    const ids = imagenesUsadas(r.contenido);
    if (ids.length) {
      const existentes = await prisma.imagen.count({ where: { id: { in: ids } } });
      if (existentes !== new Set(ids).size) {
        return {
          ok: false,
          errores: [{ ruta: "", mensaje: "Una de las imágenes ya no existe. Volvé a elegirla y publicá de nuevo." }],
        };
      }
    }

    if (!forzar) {
      const ultima = await prisma.contenidoSitio.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
      if ((ultima?.id ?? null) !== versionBase) return { ok: false, conflicto: true };
    }

    const anterior = await prisma.contenidoSitio.findFirst({ orderBy: { id: "desc" }, select: { datos: true } });
    const version = await guardarVersion(r.contenido);
    updateTag(TAG_CONTENIDO);
    // Qué secciones cambiaron (el contenido completo queda en la versión guardada).
    const previo = (anterior?.datos ?? {}) as Record<string, unknown>;
    const secciones = Object.entries(r.contenido)
      .filter(([clave, valor]) => JSON.stringify(previo[clave]) !== JSON.stringify(valor))
      .map(([clave]) => clave);
    await registrar(
      { accion: "contenido.publicar", entidad: "contenido", entidadId: version, detalle: { seccionesCambiadas: secciones, forzado: forzar } },
      usuario,
    );
    return { ok: true, version, contenido: r.contenido };
  } catch (e) {
    console.error("No se pudo publicar el contenido:", e instanceof Error ? e.name : "desconocido");
    return { ok: false, errores: [{ ruta: "", mensaje: "No se pudo publicar. Probá de nuevo en unos minutos." }] };
  }
}
