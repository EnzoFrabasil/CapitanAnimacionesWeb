import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cerrarSesion } from "@/app/admin/login/acciones";
import { sitio } from "@/config/sitio";
import { estadoAuth } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: `Panel | ${sitio.nombre}`, robots: { index: false } };

export default function LayoutPanel({ children }: LayoutProps<"/admin">) {
  const abierto = estadoAuth() === "abierto";
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <header className="bg-marino text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-titulo text-lg font-semibold">
            <Image src={sitio.logos.circular} alt="" width={512} height={512} className="size-9 rounded-full" />
            Panel
          </Link>
          <nav aria-label="Panel" className="flex flex-1 gap-4 text-sm font-medium">
            <Link href="/admin" className="hover:text-amarillo">
              Inscriptos
            </Link>
            <Link href="/admin/inicio" className="hover:text-amarillo">
              Página de inicio
            </Link>
            <Link href="/admin/configuracion" className="hover:text-amarillo">
              Configuración
            </Link>
          </nav>
          <form action={cerrarSesion}>
            <button type="submit" className="text-sm font-medium hover:text-amarillo">
              {abierto ? "Ir al sitio" : "Cerrar sesión"}
            </button>
          </form>
        </div>
      </header>
      {abierto && (
        <p className="border-b-4 border-naranja bg-amarillo/25 px-4 py-2 text-center text-sm text-marino">
          <strong>Acceso sin contraseña (modo desarrollo).</strong> Configurá <code>ADMIN_PASSWORD</code> y{" "}
          <code>SESSION_SECRET</code> antes de publicar: en producción, sin ellas, el panel queda bloqueado.
        </p>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
