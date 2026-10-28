import { Suspense } from "react";
import { contenidoInicial } from "@/config/contenidoInicial";
import { exigirPermiso } from "@/lib/auth/usuario";
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
  await exigirPermiso("contenido.editar");
  const versiones = await listarVersiones();
  return (
    <EditorInicio
      publicado={versiones[0]?.contenido ?? contenidoInicial}
      versionPublicada={versiones[0]?.id ?? null}
      versiones={versiones.map((v) => ({ id: v.id, creadoEn: v.creadoEn, contenido: v.contenido }))}
    />
  );
}
