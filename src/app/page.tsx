import type { Metadata } from "next";
import { Suspense } from "react";
import { ContadorCupos } from "@/components/inicio/ContadorCupos";
import { TextoCupos } from "@/components/inicio/TextoCupos";
import { VistaInicio } from "@/components/inicio/VistaInicio";
import { Bienvenida } from "@/components/marca/Bienvenida";
import { sitio } from "@/config/sitio";
import { obtenerContenido } from "@/lib/contenido/servidor";

// El contenido se edita desde el panel (Página de inicio) y queda cacheado
// hasta la próxima publicación. El cartel de lugares se calcula en cada visita.

export async function generateMetadata(): Promise<Metadata> {
  const { descripcion } = await obtenerContenido();
  return { description: descripcion, openGraph: { title: sitio.nombre, description: descripcion } };
}

export default async function Inicio() {
  return (
    <VistaInicio
      contenido={await obtenerContenido()}
      lugares={
        <Suspense fallback={null}>
          <TextoCupos />
        </Suspense>
      }
      extras={
        <>
          <Bienvenida />
          <Suspense fallback={null}>
            <ContadorCupos />
          </Suspense>
        </>
      }
    />
  );
}
