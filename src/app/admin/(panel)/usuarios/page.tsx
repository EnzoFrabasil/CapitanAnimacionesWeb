import { Suspense } from "react";
import { Campo, Selector } from "@/components/admin/Campo";
import { claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { LARGO_MINIMO_PASSWORD } from "@/lib/auth/claves";
import { LISTA_PERMISOS, PERMISOS, type Permiso } from "@/lib/auth/permisos";
import { exigirPermiso } from "@/lib/auth/usuario";
import { formatearFechaHora } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import {
  cambiarActivoUsuario,
  crearRol,
  crearUsuario,
  editarUsuario,
  eliminarRol,
  guardarPermisosRol,
  resetearPassword,
} from "./acciones";

export default function PaginaUsuarios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-titulo text-3xl font-bold text-marino">Usuarios</h1>
        <p className="text-sm">
          Quién entra al panel y qué puede hacer cada uno. Todo lo que se cambia acá queda en el registro.
        </p>
      </div>
      <Suspense fallback={<p>Cargando usuarios…</p>}>
        <Usuarios />
      </Suspense>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const id = `seccion-${titulo.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={claseTarjeta}>
      <h2 id={id} className="mb-3 text-lg font-semibold text-marino">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function CampoPassword({ prefijo, ayuda }: { prefijo: string; ayuda: string }) {
  return (
    <div className="sm:col-span-2">
      <Campo nombre="password" etiqueta="Contraseña" tipo="text" idPrefijo={prefijo} ayuda={ayuda} />
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="debeCambiarPassword" defaultChecked className="size-4 accent-marino" />
        Pedirle que la cambie al entrar
      </label>
    </div>
  );
}

const GRUPOS = [...new Set(LISTA_PERMISOS.map((p) => PERMISOS[p].grupo))];

function CasillasPermisos({ prefijo, marcados }: { prefijo: string; marcados: readonly string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {GRUPOS.map((grupo) => (
        <fieldset key={grupo}>
          <legend className="mb-1 text-xs font-semibold tracking-wide text-marino uppercase">{grupo}</legend>
          <div className="space-y-1">
            {LISTA_PERMISOS.filter((p) => PERMISOS[p].grupo === grupo).map((p) => (
              <label key={p} htmlFor={`${prefijo}-${p}`} className="flex items-start gap-2 text-sm">
                <input
                  id={`${prefijo}-${p}`}
                  type="checkbox"
                  name="permisos"
                  value={p}
                  defaultChecked={marcados.includes(p)}
                  className="mt-0.5 size-4 shrink-0 accent-marino"
                />
                {PERMISOS[p].nombre}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

async function Usuarios() {
  const yo = await exigirPermiso("usuarios.gestionar");
  const [usuarios, roles] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      select: { id: true, email: true, nombre: true, rolId: true, activo: true, debeCambiarPassword: true, ultimoIngreso: true, creadoEn: true },
    }),
    prisma.rol.findMany({ orderBy: [{ esTotal: "desc" }, { id: "asc" }], include: { _count: { select: { usuarios: true } } } }),
  ]);
  const opcionesRol = roles.map((r) => ({ valor: r.id, texto: r.nombre }));
  const ayudaPassword = `Dejala vacía para generar una al azar (se muestra una sola vez). Si la escribís, mínimo ${LARGO_MINIMO_PASSWORD} caracteres.`;

  return (
    <>
      <Seccion titulo="Personas con acceso">
        <ul className="space-y-4">
          {usuarios.map((u) => (
            <li key={u.id} className={`rounded-xl border p-4 ${u.activo ? "border-marino/15" : "border-dashed border-marino/15 bg-marino/[0.03]"}`}>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-semibold text-marino">
                  {u.nombre} {u.id === yo.id && <span className="font-normal text-texto/70">(vos)</span>}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.activo ? "bg-verde/15 text-verde" : "bg-marino/10 text-marino/70"}`}>
                  {u.activo ? "Activo" : "Desactivado"}
                </span>
                {u.debeCambiarPassword && (
                  <span className="rounded-full bg-amarillo/30 px-2 py-0.5 text-xs font-semibold text-marino">Tiene que cambiar la contraseña</span>
                )}
                <span className="text-xs text-texto/70">
                  {u.ultimoIngreso ? `Último ingreso: ${formatearFechaHora(u.ultimoIngreso)}` : "Nunca entró"}
                </span>
              </div>
              <FormAccion accion={editarUsuario.bind(null, u.id)} textoBoton="Guardar" variante="secundario">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo nombre="nombre" etiqueta="Nombre" valor={u.nombre} requerido idPrefijo={`u${u.id}`} />
                  <Campo nombre="email" etiqueta="Email" tipo="email" valor={u.email} requerido idPrefijo={`u${u.id}`} />
                  <Selector nombre="rolId" etiqueta="Rol" valor={u.rolId} opciones={opcionesRol} idPrefijo={`u${u.id}`} />
                </div>
              </FormAccion>
              <div className="mt-3 flex flex-wrap items-start gap-4 border-t border-marino/10 pt-3">
                <details className="min-w-0 flex-1">
                  <summary className="cursor-pointer text-sm font-semibold text-marino">Cambiar contraseña</summary>
                  <FormAccion accion={resetearPassword.bind(null, u.id)} textoBoton="Cambiar contraseña" variante="secundario" className="mt-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CampoPassword prefijo={`p${u.id}`} ayuda={ayudaPassword} />
                    </div>
                    <p className="mt-2 text-xs">Se cierran sus sesiones abiertas: va a tener que entrar con la contraseña nueva.</p>
                  </FormAccion>
                </details>
                {u.id !== yo.id && (
                  <FormAccion
                    accion={cambiarActivoUsuario.bind(null, u.id, !u.activo)}
                    textoBoton={u.activo ? "Desactivar" : "Activar"}
                    textoPendiente={u.activo ? "Desactivando…" : "Activando…"}
                    variante={u.activo ? "peligro" : "secundario"}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          Desactivar a alguien le corta el acceso al instante. No se borra, para que su historial siga en el registro.
        </p>
      </Seccion>

      <Seccion titulo="Agregar usuario">
        <FormAccion accion={crearUsuario} textoBoton="Crear usuario" textoPendiente="Creando…">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo nombre="nombre" etiqueta="Nombre" requerido idPrefijo="nuevo" />
            <Campo nombre="email" etiqueta="Email" tipo="email" requerido idPrefijo="nuevo" />
            <Selector nombre="rolId" etiqueta="Rol" valor={roles.find((r) => !r.esTotal)?.id} opciones={opcionesRol} idPrefijo="nuevo" />
            <CampoPassword prefijo="nuevo" ayuda={ayudaPassword} />
          </div>
        </FormAccion>
      </Seccion>

      <Seccion titulo="Roles y permisos">
        <p className="mb-4 text-sm">
          Cada rol agrupa permisos. Si cambiás los permisos de un rol, cambia para todas las personas que lo tienen.
        </p>
        <div className="space-y-4">
          {roles.map((r) => (
            <article key={r.id} aria-label={`Rol ${r.nombre}`} className="rounded-xl border border-marino/15 p-4">
              {r.esTotal ? (
                <>
                  <h3 className="font-semibold text-marino">
                    {r.nombre} <span className="font-normal text-texto/70">· {r._count.usuarios} {r._count.usuarios === 1 ? "persona" : "personas"}</span>
                  </h3>
                  <p className="mt-1 text-sm">
                    Tiene todos los permisos, también los que se agreguen en el futuro. Es el único que gestiona usuarios y roles,
                    así que siempre tiene que quedar al menos una persona activa con este rol.
                  </p>
                </>
              ) : (
                <>
                  <FormAccion accion={guardarPermisosRol.bind(null, r.id)} textoBoton="Guardar rol" variante="secundario">
                    <div className="mb-3 flex flex-wrap items-end gap-3">
                      <Campo nombre="nombre" etiqueta="Nombre del rol" valor={r.nombre} requerido idPrefijo={`rol${r.id}`} className="w-64" />
                      <p className="pb-2 text-xs text-texto/70">
                        {r._count.usuarios} {r._count.usuarios === 1 ? "persona" : "personas"}
                      </p>
                    </div>
                    <CasillasPermisos prefijo={`rol${r.id}`} marcados={r.permisos} />
                  </FormAccion>
                  {r._count.usuarios === 0 && (
                    <FormAccion accion={eliminarRol.bind(null, r.id)} textoBoton="Eliminar rol" textoPendiente="Eliminando…" variante="peligro" className="mt-2" />
                  )}
                </>
              )}
            </article>
          ))}
        </div>
        <details className="mt-4 rounded-xl border-2 border-dashed border-marino/25 p-4">
          <summary className="cursor-pointer font-semibold text-marino">+ Crear rol</summary>
          <FormAccion accion={crearRol} textoBoton="Crear rol" textoPendiente="Creando…" className="mt-3">
            <Campo nombre="nombre" etiqueta="Nombre del rol" requerido idPrefijo="rol-nuevo" className="mb-3 w-64" />
            <CasillasPermisos prefijo="rol-nuevo" marcados={["inscriptos.ver"] satisfies Permiso[]} />
          </FormAccion>
        </details>
      </Seccion>
    </>
  );
}
