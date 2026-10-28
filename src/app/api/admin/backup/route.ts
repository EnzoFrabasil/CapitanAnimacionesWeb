import { generarBackup, nombreArchivoBackup } from "@/lib/admin/backup";
import { usuarioConPermiso } from "@/lib/auth/usuario";
import { registrar } from "@/lib/registro/servidor";

/** Descarga una copia completa de la base (Configuración → Backups). */
export async function GET() {
  // El proxy ya filtra /api/admin/*, pero se vuelve a verificar acá (sesión y permiso).
  const usuario = await usuarioConPermiso("backups.descargar");
  if (!usuario) return Response.json({ ok: false, error: "No autorizado." }, { status: 403 });
  const backup = await generarBackup();
  await registrar({ accion: "backup.descargar", entidad: "base" }, usuario);
  return new Response(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivoBackup()}"`,
      "Cache-Control": "no-store",
    },
  });
}
