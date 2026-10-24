import { Suspense } from "react";
import { contenidoInicial } from "@/config/contenidoInicial";
import { exigirAdmin } from "@/lib/auth/admin";
import { listarVersiones } from "@/lib/contenido/servidor";
import { EditorInicio } from "./EditorInicio";


export default function PaginaEditorInicio() {
  return (
    <Suspense fallback={<p>Cargando el editor…</p>}>
      <Editor />
    </Suspense>
  );
}

async function Editor() {
  await exigirAdmin();
  const versiones = await listarVersiones();
  return (
    <EditorInicio
      publicado={versiones[0]?.contenido ?? contenidoInicial}
      versionPublicada={versiones[0]?.id ?? null}
      versiones={versiones.map((v) => ({ id: v.id, creadoEn: v.creadoEn, contenido: v.contenido }))}
    />
  );
}
