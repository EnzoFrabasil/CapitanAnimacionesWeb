import Image from "next/image";
import Link from "next/link";
import { sitio } from "@/config/sitio";

export function Exito({ numero, titulo, texto }: { numero: number; titulo: string; texto: string }) {
  return (
    <section className="animate-aparecer rounded-3xl bg-white p-6 text-center shadow-md sm:p-10" aria-live="polite">
      <Image
        src={sitio.logos.capitanColgado}
        alt=""
        width={2213}
        height={1669}
        className="mx-auto h-56 w-auto animate-balanceo sm:h-72"
      />
      <h1 className="mt-6 font-titulo text-3xl font-bold text-marino sm:text-4xl">{titulo}</h1>
      <p className="mt-4 text-lg">Tu número de inscripción es</p>
      <p className="mt-1 font-titulo text-5xl font-bold text-marino">N.º {numero}</p>
      {texto && <p className="mx-auto mt-6 max-w-md whitespace-pre-line">{texto}</p>}
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-naranja px-8 py-3 font-titulo text-xl font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
