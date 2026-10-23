import { sitio } from "@/config/sitio";

// Página provisoria: la página de inicio real se arma en la etapa 5.
export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-titulo text-4xl font-bold text-marino">{sitio.nombre}</h1>
      <p>¡Sumate a la tripulación! Muy pronto vas a poder inscribirte acá.</p>
    </main>
  );
}
