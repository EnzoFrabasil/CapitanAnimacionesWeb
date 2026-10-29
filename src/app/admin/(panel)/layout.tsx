import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cerrarSesion } from "@/app/admin/login/acciones";
import { BarraTemporada } from "@/components/admin/BarraTemporada";
import { MenuPanel } from "@/components/admin/MenuPanel";
import { sitio } from "@/config/sitio";
import { menuPara } from "@/lib/auth/permisos";
import { usuarioActual } from "@/lib/auth/usuario";

export const metadata: Metadata = { title: `Panel | ${sitio.nombre}`, robots: { index: false } };

export default function LayoutPanel({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      {/* Por encima de las barras fijas de cada página (por ejemplo, la del editor de la página de inicio). */}
      <header className="relative z-[60] bg-marino text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-x-4 px-4 py-2.5">
          <Link href="/admin" className="flex shrink-0 items-center gap-2 font-titulo text-lg font-semibold">
            <Image src={sitio.logos.circular} alt="" width={512} height={512} className="size-9 rounded-full" />
            Panel
          </Link>
          <Suspense fallback={<div className="flex-1" />}>
            <Navegacion />
          </Suspense>
        </div>
      </header>
      <Suspense>
        <BarraTemporada />
      </Suspense>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

/** Menú según los permisos del usuario (cada página igual vuelve a verificar el suyo). */
async function Navegacion() {
  const usuario = await usuarioActual();
  if (!usuario) return <div className="flex-1" />;
  const grupos = usuario.debeCambiarPassword ? [] : menuPara(usuario.permisos).map((g) => ({ grupo: g.grupo, items: [...g.items] }));
  return (
    <>
      <MenuPanel grupos={grupos} />
      <div className="flex shrink-0 items-center gap-4 text-sm">
        <Link href="/admin/cuenta" className="hover:text-amarillo" title={`${usuario.email} · ${usuario.rol.nombre}`}>
          {usuario.nombre} <span className="hidden text-white/70 sm:inline">· Mi cuenta</span>
        </Link>
        <form action={cerrarSesion}>
          <button type="submit" className="font-medium hover:text-amarillo">
            Salir
          </button>
        </form>
      </div>
    </>
  );
}
