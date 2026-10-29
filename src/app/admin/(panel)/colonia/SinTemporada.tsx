import Link from "next/link";
import { claseTarjeta } from "@/components/admin/estilos";

/** Aviso cuando todavía no hay ninguna temporada creada. */
export function SinTemporada() {
  return (
    <p className={`${claseTarjeta} text-sm`}>
      Todavía no hay ninguna temporada.{" "}
      <Link href="/admin/colonia/temporadas" className="font-semibold text-marino underline">
        Creá la primera en Temporadas
      </Link>
      .
    </p>
  );
}
