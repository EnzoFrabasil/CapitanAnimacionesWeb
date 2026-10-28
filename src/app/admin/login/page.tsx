import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sitio } from "@/config/sitio";
import { seccionInicial } from "@/lib/auth/permisos";
import { usuarioActual } from "@/lib/auth/usuario";
import { prisma } from "@/lib/prisma";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = { title: `Panel | ${sitio.nombre}`, robots: { index: false } };

export default function PaginaLogin({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-marino/10 p-8 shadow-lg">
        <Image src={sitio.logos.circular} alt="" width={512} height={512} className="mx-auto size-20 rounded-full" />
        <h1 className="mt-4 text-center font-titulo text-2xl font-bold text-marino">Panel de administración</h1>
        <div className="mt-6">
          <Suspense>
            <Contenido searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  // Leer searchParams primero hace que esto se evalúe en cada request (no en el build).
  const { desde } = await searchParams;
  const usuario = await usuarioActual();
  if (usuario) redirect(seccionInicial(usuario.permisos));
  if ((await prisma.usuario.count()) === 0) {
    return (
      <p role="alert" className="rounded-xl border-2 border-amarillo p-4 text-sm">
        Todavía no hay usuarios. Creá el primero (con acceso total) desde la terminal del proyecto con{" "}
        <code>npm run usuarios:crear</code>. Ver el README.
      </p>
    );
  }
  return <FormularioLogin desde={typeof desde === "string" ? desde : undefined} />;
}
