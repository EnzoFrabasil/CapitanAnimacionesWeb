import { prisma } from "@/lib/prisma";

// Sirve las imágenes subidas desde el editor. Son inmutables (cambiar una imagen
// sube una nueva con otro id), así que se pueden cachear para siempre.

export async function GET(_request: Request, ctx: RouteContext<"/imagenes/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response("No encontrada", { status: 404 });

  const imagen = await prisma.imagen.findUnique({ where: { id }, select: { tipo: true, datos: true } });
  if (!imagen) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(imagen.datos), {
    headers: {
      "Content-Type": imagen.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
