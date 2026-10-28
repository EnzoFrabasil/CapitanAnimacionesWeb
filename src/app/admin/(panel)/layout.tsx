import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cerrarSesion } from "@/app/admin/login/acciones";
import { sitio } from "@/config/sitio";
import { SECCIONES } from "@/lib/auth/permisos";
import { usuarioActual } from "@/lib/auth/usuario";

export const metadata: Metadata = { title: `Panel | ${sitio.nombre}`, robots: { index: false } };

export default function LayoutPanel({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <header className="bg-marino text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-titulo text-lg font-semibold">
            <Image src={sitio.logos.circular} alt="" width={512} height={512} className="size-9 rounded-full" />
            Panel
          </Link>
          <Suspense fallback={<div className="flex-1" />}>
            <Navegacion />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

/** Menú según los permisos del usuario (cada página igual vuelve a verificar el suyo). */
async function Navegacion() {
  const usuario = await usuarioActual();
  if (!usuario) return <div className="flex-1" />;
  return (
    <>
      <nav aria-label="Panel" className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
        {!usuario.debeCambiarPassword &&
          SECCIONES.filter((s) => usuario.permisos.has(s.permiso)).map((s) => (
            <Link key={s.href} href={s.href} className="hover:text-amarillo">
              {s.nombre}
            </Link>
          ))}
      </nav>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/admin/cuenta" className="hover:text-amarillo" title={`${usuario.email} · ${usuario.rol.nombre}`}>
          {usuario.nombre} <span className="text-white/70">· Mi cuenta</span>
        </Link>
        <form action={cerrarSesion}>
          <button type="submit" className="font-medium hover:text-amarillo">
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}
