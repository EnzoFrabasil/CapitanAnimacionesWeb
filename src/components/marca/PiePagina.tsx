import { sitio } from "@/config/sitio";

export function PiePagina() {
  return (
    <footer className="mt-auto bg-marino text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center text-sm sm:flex-row sm:justify-between">
        <p className="font-titulo text-base font-semibold">{sitio.nombre}</p>
        <a href={sitio.instagram.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
          Instagram {sitio.instagram.usuario}
        </a>
      </div>
    </footer>
  );
}
