import type { NextRequest } from "next/server";
import { generarBackup, nombreArchivoBackup } from "@/lib/admin/backup";
import { COOKIE_SESION, accesoPermitido } from "@/lib/auth/sesion";

/** Descarga una copia completa de la base (Configuración → Backups). */
export async function GET(request: NextRequest) {
  // El proxy ya filtra /api/admin/*, pero se vuelve a verificar acá.
  if (!accesoPermitido(request.cookies.get(COOKIE_SESION)?.value)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  const backup = await generarBackup();
  return new Response(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivoBackup()}"`,
      "Cache-Control": "no-store",
    },
  });
}
