import type { Contenido } from "./esquema";

// Enlaces que se arman a partir del contenido editable.

export const urlWhatsapp = (whatsapp: Contenido["whatsapp"]) =>
  `https://wa.me/${whatsapp.numero}?text=${encodeURIComponent(whatsapp.mensaje)}`;

export const urlMapa = (direccion: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;

export const urlComoLlegar = (direccion: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
