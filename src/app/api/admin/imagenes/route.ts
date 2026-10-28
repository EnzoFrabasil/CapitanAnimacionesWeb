import { usuarioConPermiso } from "@/lib/auth/usuario";
import { TAMANO_MAXIMO_IMAGEN, detectarTipoImagen } from "@/lib/contenido/imagenes";
import { prisma } from "@/lib/prisma";

// Sube una imagen para la página de inicio. Responde { ok: true, url } o { ok: false, error }.
// Queda sin usar hasta que se publique un contenido que la incluya.

function error(status: number, mensaje: string) {
  return Response.json({ ok: false, error: mensaje }, { status });
}

export async function POST(request: Request) {
  if (!(await usuarioConPermiso("contenido.editar"))) return error(403, "No autorizado.");

  let archivo: FormDataEntryValue | null;
  try {
    archivo = (await request.formData()).get("imagen");
  } catch {
    return error(400, "No llegó ninguna imagen.");
  }
  if (!(archivo instanceof File) || archivo.size === 0) return error(400, "No llegó ninguna imagen.");
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) return error(413, "La imagen es demasiado pesada (máximo 3 MB).");

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = detectarTipoImagen(bytes);
  if (!tipo) return error(415, "El archivo tiene que ser una imagen JPG, PNG o WebP.");

  try {
    const { id } = await prisma.imagen.create({
      data: { tipo, datos: bytes, tamano: bytes.length },
      select: { id: true },
    });
    return Response.json({ ok: true, url: `/imagenes/${id}` });
  } catch (e) {
    console.error("No se pudo guardar la imagen:", e instanceof Error ? e.name : "desconocido");
    return error(500, "No se pudo guardar la imagen. Probá de nuevo.");
  }
}
