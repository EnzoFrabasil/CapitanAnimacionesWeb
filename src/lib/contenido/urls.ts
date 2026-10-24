import type { Contenido } from "./esquema";

// Enlaces que se arman a partir del contenido editable.

export const urlWhatsapp = (whatsapp: Contenido["whatsapp"]) =>
  `https://wa.me/${whatsapp.numero}?text=${encodeURIComponent(whatsapp.mensaje)}`;

/**
 * Lo que se busca en Google Maps: nombre del lugar + dirección. Con el nombre,
 * Maps encuentra el lugar exacto aunque la dirección sea solo la ciudad.
 */
export const busquedaUbicacion = ({ titulo, direccion }: Pick<Contenido["ubicacion"], "titulo" | "direccion">) =>
  [titulo, direccion].map((t) => t.trim()).filter(Boolean).join(", ");

export const urlMapa = (busqueda: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(busqueda)}&output=embed`;

export const urlComoLlegar = (busqueda: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busqueda)}`;
