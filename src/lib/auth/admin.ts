import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, accesoPermitido } from "./sesion";

/** Verifica la sesión del panel; si no es válida, redirige al login. Usar en cada página y acción del panel. */
export async function exigirAdmin(): Promise<void> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!accesoPermitido(token)) redirect("/admin/login");
}
