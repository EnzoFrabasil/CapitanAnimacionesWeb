import { Suspense } from "react";
import { claseEtiqueta, claseInput, claseTarjeta } from "@/components/admin/estilos";
import { FormAccion } from "@/components/admin/FormAccion";
import { LARGO_MINIMO_PASSWORD } from "@/lib/auth/claves";
import { PERMISOS, SECCIONES } from "@/lib/auth/permisos";
import { exigirUsuario } from "@/lib/auth/usuario";
import { cambiarMiPassword } from "./acciones";

export default function PaginaCuenta() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-titulo text-3xl font-bold text-marino">Mi cuenta</h1>
      <Suspense fallback={<p>Cargando…</p>}>
        <Cuenta />
      </Suspense>
    </div>
  );
}

function CampoClave({ nombre, etiqueta, autoComplete }: { nombre: string; etiqueta: string; autoComplete: string }) {
  return (
    <div>
      <label htmlFor={`cuenta-${nombre}`} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <input id={`cuenta-${nombre}`} name={nombre} type="password" required autoComplete={autoComplete} className={claseInput} />
    </div>
  );
}

async function Cuenta() {
  const yo = await exigirUsuario({ permitirCambioPendiente: true });
  const secciones = SECCIONES.filter((s) => yo.permisos.has(s.permiso));

  return (
    <>
      {yo.debeCambiarPassword && (
        <p role="alert" className="rounded-2xl border-2 border-amarillo bg-amarillo/15 p-4 text-sm text-marino">
          <strong>Antes de seguir, elegí tu propia contraseña.</strong> La que tenés te la dio otra persona.
        </p>
      )}

      <section aria-labelledby="mis-datos" className={claseTarjeta}>
        <h2 id="mis-datos" className="mb-3 text-lg font-semibold text-marino">
          Mis datos
        </h2>
        <dl className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-medium text-marino">Nombre</dt>
          <dd>{yo.nombre}</dd>
          <dt className="font-medium text-marino">Email</dt>
          <dd>{yo.email}</dd>
          <dt className="font-medium text-marino">Rol</dt>
          <dd>{yo.rol.nombre}</dd>
          <dt className="font-medium text-marino">Puede</dt>
          <dd>
            <ul className="list-inside list-disc">
              {[...yo.permisos].map((p) => (
                <li key={p}>{PERMISOS[p].nombre}</li>
              ))}
            </ul>
          </dd>
        </dl>
        {!yo.debeCambiarPassword && secciones.length === 0 && (
          <p className="mt-3 text-sm">Tu rol todavía no tiene acceso a ninguna sección. Pedíselo a quien tenga acceso total.</p>
        )}
      </section>

      <section aria-labelledby="cambiar-clave" className={claseTarjeta}>
        <h2 id="cambiar-clave" className="mb-3 text-lg font-semibold text-marino">
          Cambiar contraseña
        </h2>
        <FormAccion accion={cambiarMiPassword} textoBoton="Cambiar contraseña">
          <div className="grid gap-3">
            <CampoClave nombre="actual" etiqueta="Contraseña actual" autoComplete="current-password" />
            <CampoClave nombre="nueva" etiqueta="Contraseña nueva" autoComplete="new-password" />
            <CampoClave nombre="repetida" etiqueta="Repetí la contraseña nueva" autoComplete="new-password" />
          </div>
          <p className="mt-2 text-xs">
            Mínimo {LARGO_MINIMO_PASSWORD} caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar.
          </p>
        </FormAccion>
      </section>
    </>
  );
}
