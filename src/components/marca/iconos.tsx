// Íconos simples en SVG (heredan el color del texto con currentColor).

type PropsIcono = { className?: string };

export function IconoWhatsapp({ className }: PropsIcono) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 7.4c.3-.3.8-.3 1 .1l.9 1.9c.1.3 0 .6-.2.8l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.2-.2.5-.3.8-.2l1.9.9c.4.2.4.7.1 1l-.8.8c-.6.6-1.5.7-2.3.4a9.6 9.6 0 0 1-5.4-5.4c-.3-.8-.2-1.7.4-2.3l.7-.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconoInstagram({ className }: PropsIcono) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoFacebook({ className }: PropsIcono) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M14 8h2.5V4.5H14A4.5 4.5 0 0 0 9.5 9v2H7v3.5h2.5V21H13v-6.5h2.6l.5-3.5H13V9a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function IconoTiktok({ className }: PropsIcono) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M16.2 3c.4 2.2 1.8 3.7 4 4v3.2a7.4 7.4 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3.3a2.8 2.8 0 1 0 2.8 2.8V3h3.2Z" />
    </svg>
  );
}

export function IconoRed({ red, className }: PropsIcono & { red: string }) {
  if (red === "instagram") return <IconoInstagram className={className} />;
  if (red === "facebook") return <IconoFacebook className={className} />;
  if (red === "tiktok") return <IconoTiktok className={className} />;
  return null;
}

export function IconoFlecha({ className }: PropsIcono) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
