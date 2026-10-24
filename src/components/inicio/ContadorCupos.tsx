import { connection } from "next/server";
import { cuposDisponibles } from "@/lib/cupos";
import { AvisoCupos } from "./AvisoCupos";

/** Aviso con los lugares que quedan, siempre al día (se calcula en cada visita, dentro de un Suspense). */
export async function ContadorCupos() {
  await connection();
  const cupos = await cuposDisponibles();
  if (!cupos) return null;
  return <AvisoCupos total={cupos.total} quedan={cupos.quedan} />;
}
