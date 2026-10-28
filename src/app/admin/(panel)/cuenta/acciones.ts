"use server";

import { redirect } from "next/navigation";
import { exito, fallo, type ResultadoAccion } from "@/lib/admin/resultado";
import { hashearPassword, problemaPassword, verificarPassword } from "@/lib/auth/claves";
import { seccionInicial } from "@/lib/auth/permisos";
import { cerrarSesionesDe, exigirUsuario } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { registrar } from "@/lib/registro/servidor";

/** Cambia la contraseña propia (pide la actual). Cierra las demás sesiones abiertas. */
export async function cambiarMiPassword(_previo: ResultadoAccion | null, datos: FormData): Promise<ResultadoAccion> {
  const yo = await exigirUsuario({ permitirCambioPendiente: true });
  const actual = String(datos.get("actual") ?? "");
  const nueva = String(datos.get("nueva") ?? "");
  const repetida = String(datos.get("repetida") ?? "");

  const usuario = await prisma.usuario.findUnique({ where: { id: yo.id }, select: { passwordHash: true } });
  if (!usuario || !(await verificarPassword(actual, usuario.passwordHash))) return fallo("La contraseña actual no es correcta.");
  if (nueva !== repetida) return fallo("Las dos contraseñas nuevas no coinciden.");
  if (nueva === actual) return fallo("La contraseña nueva tiene que ser distinta de la actual.");
  const problema = problemaPassword(nueva, yo.email);
  if (problema) return fallo(problema);

  await prisma.usuario.update({ where: { id: yo.id }, data: { passwordHash: await hashearPassword(nueva), debeCambiarPassword: false } });
  await cerrarSesionesDe(yo.id, true);
  await registrar({ accion: "cuenta.password", entidad: "usuario", entidadId: yo.id }, yo);
  // Si era el cambio obligatorio del primer ingreso, sigue a su sección.
  if (yo.debeCambiarPassword) redirect(seccionInicial(yo.permisos));
  return exito("Contraseña cambiada. Se cerraron tus sesiones en otros dispositivos.");
}
