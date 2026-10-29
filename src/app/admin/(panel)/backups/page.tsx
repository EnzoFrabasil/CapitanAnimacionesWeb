import { Suspense } from "react";
import { claseBoton } from "@/components/admin/estilos";
import { EncabezadoPagina, Seccion } from "@/components/admin/Seccion";
import { exigirPermiso } from "@/lib/auth/usuario";

export default function PaginaBackups() {
  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Backups"
        ayuda="Una copia de seguridad de todo: temporadas, inscriptos, contactos, la página de inicio y sus imágenes."
      />
      <Suspense fallback={<p>Cargando…</p>}>
        <Backups />
      </Suspense>
    </div>
  );
}

async function Backups() {
  await exigirPermiso("backups.descargar");
  return (
    <Seccion
      titulo="Descargar una copia"
      ayuda="Guardala en un lugar seguro: tiene datos personales de los chicos. Bajá una nueva cada tanto, por ejemplo una vez por semana mientras haya inscripciones. No incluye contraseñas."
      className="max-w-2xl"
    >
      <a href="/api/admin/backup" download className={`${claseBoton.primario} inline-block`}>
        Descargar backup
      </a>
    </Seccion>
  );
}
