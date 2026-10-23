import Image from "next/image";
import Link from "next/link";
import { sitio } from "@/config/sitio";

export function Encabezado({ mostrarInscribite = true }: { mostrarInscribite?: boolean }) {
  return (
    <header className="bg-marino">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 rounded-xl focus-visible:outline-4 focus-visible:outline-amarillo">
          <Image
            src={sitio.logos.texto}
            alt={sitio.nombre}
            width={600}
            height={160}
            priority
            className="h-12 w-auto sm:h-14"
          />
        </Link>
        {mostrarInscribite && (
          <Link
            href="/inscripcion"
            className="rounded-full bg-naranja px-5 py-2 font-titulo text-lg font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-4 focus-visible:outline-amarillo"
          >
            Inscribite
          </Link>
        )}
      </div>
    </header>
  );
}
