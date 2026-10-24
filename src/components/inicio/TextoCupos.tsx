import { connection } from "next/server";
import { urgenciaCupos } from "@/lib/dominio/cupos";
import { cuposDisponibles } from "@/lib/cupos";

/** Línea discreta con los lugares que quedan, arriba del botón "Inscribite" (siempre al día). */
export async function TextoCupos() {
  await connection();
  const cupos = await cuposDisponibles();
  if (!cupos) return null;

  const urgencia = urgenciaCupos(cupos);
  const numero = (
    <span className={`font-semibold tabular-nums ${urgencia === "normal" ? "text-naranja" : "text-rojo"}`}>
      {cupos.quedan}
    </span>
  );
  return (
    <p className="mb-4 text-lg">
      {urgencia === "completo" ? (
        "¡Se completaron los lugares! Anotate en la lista de espera."
      ) : cupos.quedan === 1 ? (
        "¡Queda el último lugar!"
      ) : urgencia === "ultimos" ? (
        <>¡Quedan los últimos {numero} lugares!</>
      ) : (
        <>¡Quedan {numero} lugares!</>
      )}
    </p>
  );
}
