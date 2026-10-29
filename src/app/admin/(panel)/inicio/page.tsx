import { Suspense } from "react";
import { contenidoInicial } from "@/config/contenidoInicial";
import { exigirPermiso } from "@/lib/auth/usuario";
import { listarVersiones } from "@/lib/contenido/servidor";
import { EditorInicio } from "./EditorInicio";


export default function PaginaEditorInicio({ searchParams }: PageProps<"/admin/inicio">) {
  return (
    <Suspense fallback={<p>Cargando el editor…</p>}>
      <Editor searchParams={searchParams} />
    </Suspense>
  );
}

async function Editor({ searchParams }: Pick<PageProps<"/admin/inicio">, "searchParams">) {
  await exigirPermiso("contenido.editar");
  const { pestana } = await searchParams;
  const versiones = await listarVersiones();
  return (
    <EditorInicio
      publicado={versiones[0]?.contenido ?? contenidoInicial}
      versionPublicada={versiones[0]?.id ?? null}
      versiones={versiones.map((v) => ({ id: v.id, creadoEn: v.creadoEn, contenido: v.contenido }))}
      pestanaInicial={pestana === "inscripcion" ? "inscripcion" : "inicio"}
    />
  );
}
