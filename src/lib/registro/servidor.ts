import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { usuarioActual } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { ipDeRequest } from "@/lib/rate-limit";

export interface Evento {
  /** "inscripto.editar", "usuario.crear", "csv.descargar", etc. */
  accion: string;
  entidad?: string;
  entidadId?: string | number;
  detalle?: Prisma.InputJsonValue;
}

/**
 * Guarda un evento en el registro con el usuario de la sesión y la IP.
 * Si el registro falla no se interrumpe la acción (ya se hizo): se avisa en el log del servidor.
 */
export async function registrar(
  evento: Evento,
  usuario?: { id: number; email: string } | null,
): Promise<void> {
  try {
    const quien = usuario === undefined ? await usuarioActual() : usuario;
    await prisma.registro.create({
      data: {
        accion: evento.accion,
        entidad: evento.entidad,
        entidadId: evento.entidadId === undefined ? undefined : String(evento.entidadId),
        detalle: evento.detalle,
        usuarioId: quien?.id,
        usuarioEmail: quien?.email,
        ip: ipDeRequest(await headers()),
      },
    });
  } catch (e) {
    console.error("No se pudo guardar el registro:", evento.accion, e instanceof Error ? e.name : "desconocido");
  }
}
