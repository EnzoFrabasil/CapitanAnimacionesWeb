import { IconoWhatsapp } from "./iconos";

/** Botón flotante para escribirle a la colonia por WhatsApp. */
export function BotonWhatsapp({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      title="Escribinos por WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-verde text-white shadow-lg ring-4 ring-white transition hover:scale-110 hover:shadow-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-marino sm:right-6 sm:bottom-6 sm:size-16"
    >
      <IconoWhatsapp className="size-8 sm:size-9" />
    </a>
  );
}
