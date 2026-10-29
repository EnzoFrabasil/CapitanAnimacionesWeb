"use server";

import { refresh } from "next/cache";
import { exito, fallo, type ResultadoAccion } from "@/lib/admin/resultado";
import { exigirPermiso } from "@/lib/auth/usuario";
import { PLANTILLAS } from "@/lib/dominio/mensajes";
import { ajustesMensajesSchema, guardarMensajes, obtenerMensajes } from "@/lib/mensajes/servidor";
import { diferencias } from "@/lib/registro/diferencias";
import { registrar } from "@/lib/registro/servidor";
import { mensajesDeError } from "@/lib/validacion/admin";

export async function guardarMensajesWhatsapp(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const usuario = await exigirPermiso("mensajes.editar");
  const r = ajustesMensajesSchema.safeParse({
    plantillas: Object.fromEntries(PLANTILLAS.map((p) => [p, String(datos.get(p) ?? "")])),
    datosPago: String(datos.get("datosPago") ?? ""),
  });
  if (!r.success) return fallo(...mensajesDeError(r.error));
  const antes = await obtenerMensajes();
  try {
    await guardarMensajes(r.data);
  } catch {
    return fallo("No se pudo guardar. Probá de nuevo.");
  }
  await registrar(
    {
      accion: "mensajes.editar",
      entidad: "ajuste",
      entidadId: "mensajesWhatsapp",
      detalle: { cambios: diferencias({ ...antes.plantillas, datosPago: antes.datosPago }, { ...r.data.plantillas, datosPago: r.data.datosPago }) },
    },
    usuario,
  );
  refresh();
  return exito("Mensajes guardados. Ya se usan desde el ícono de WhatsApp en Inscriptos.");
}
