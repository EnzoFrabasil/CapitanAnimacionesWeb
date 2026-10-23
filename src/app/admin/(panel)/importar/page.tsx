import Link from "next/link";
import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth/admin";
import { ImportarCsv } from "./ImportarCsv";

export default function PaginaImportar() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-marino underline">
          ← Inscriptos
        </Link>
        <h1 className="mt-1 font-titulo text-3xl font-bold text-marino">Importar CSV</h1>
        <p className="mt-1 max-w-3xl text-sm">
          Columnas que se pueden modificar: estado, nombre, apellido, dni, fecha_nacimiento, grupo (por nombre, tiene que
          existir en la temporada; vacío o &quot;Sin grupo&quot; lo deja sin grupo), turno, info_adicional y los datos del
          contacto principal. El resto de las columnas se ignora.
        </p>
      </div>
      <Suspense fallback={<p>Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}

async function Contenido() {
  await exigirAdmin();
  return <ImportarCsv />;
}
