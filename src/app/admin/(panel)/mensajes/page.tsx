import { Suspense } from "react";
import { EncabezadoPagina } from "@/components/admin/Seccion";
import { exigirPermiso } from "@/lib/auth/usuario";
import { obtenerMensajes } from "@/lib/mensajes/servidor";
import { EditorMensajes } from "./EditorMensajes";

export default function PaginaMensajes() {
  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Mensajes de WhatsApp"
        ayuda="Los textos que aparecen al tocar el ícono de WhatsApp en Inscriptos. Se abren ya escritos en WhatsApp con los datos de cada familia; nada se envía solo."
      />
      <Suspense fallback={<p>Cargando…</p>}>
        <Mensajes />
      </Suspense>
    </div>
  );
}

async function Mensajes() {
  await exigirPermiso("mensajes.editar");
  return <EditorMensajes inicial={await obtenerMensajes()} />;
}
