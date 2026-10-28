import Link from "next/link";
import { Suspense } from "react";
import { claseTarjeta } from "@/components/admin/estilos";
import { PERMISOS, SECCIONES, esPermiso } from "@/lib/auth/permisos";
import { exigirUsuario } from "@/lib/auth/usuario";

export default function PaginaSinAcceso({ searchParams }: PageProps<"/admin/sin-acceso">) {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
      <SinAcceso searchParams={searchParams} />
    </Suspense>
  );
}

async function SinAcceso({ searchParams }: Pick<PageProps<"/admin/sin-acceso">, "searchParams">) {
  const usuario = await exigirUsuario();
  const { permiso } = await searchParams;
  const pedido = typeof permiso === "string" && esPermiso(permiso) ? PERMISOS[permiso].nombre.toLowerCase() : null;
  const secciones = SECCIONES.filter((s) => usuario.permisos.has(s.permiso));

  return (
    <section className={`${claseTarjeta} mx-auto max-w-xl text-center`}>
      <h1 className="font-titulo text-2xl font-bold text-marino">No tenés acceso a esta sección</h1>
      <p className="mt-2 text-sm">
        Tu rol es <strong>{usuario.rol.nombre}</strong>
        {pedido && <> y no incluye el permiso para {pedido}</>}. Si lo necesitás, pedíselo a quien tenga acceso total.
      </p>
      {secciones.length > 0 && (
        <p className="mt-4 text-sm">
          Podés ir a:{" "}
          {secciones.map((s, i) => (
            <span key={s.href}>
              {i > 0 && " · "}
              <Link href={s.href} className="font-semibold text-marino underline">
                {s.nombre}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
