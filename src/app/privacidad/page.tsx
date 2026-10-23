import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/components/marca/Encabezado";
import { PiePagina } from "@/components/marca/PiePagina";
import { VERSION_PRIVACIDAD } from "@/config/inscripcion";
import { sitio, urlWhatsapp } from "@/config/sitio";

// Texto informativo de la Ley 25.326 (art. 6) en lenguaje simple.
// Si cambiás el contenido, actualizá VERSION_PRIVACIDAD en src/config/inscripcion.ts.

export const metadata: Metadata = {
  title: `Cuidamos tus datos | ${sitio.nombre}`,
  description: `Cómo usa ${sitio.nombre} los datos que cargás en la inscripción.`,
};

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-titulo text-xl font-semibold text-marino">{titulo}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default function PaginaPrivacidad() {
  return (
    <>
      <Encabezado />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <article className="space-y-6 rounded-3xl bg-white p-6 shadow-md sm:p-8">
          <header>
            <h1 className="font-titulo text-3xl font-bold text-marino">Cuidamos tus datos</h1>
            <p className="mt-2">
              Te contamos, sin vueltas, qué hacemos con la información que cargás al inscribir a los chicos.
            </p>
          </header>

          <Bloque titulo="¿Para qué los usamos?">
            <p>
              Solo para organizar la colonia: armar los grupos y turnos, comunicarnos con vos por WhatsApp y cuidar a
              los chicos durante las actividades. La información adicional (alergias, medicación, etc.) la conoce el
              equipo de profes para poder cuidarlos mejor.
            </p>
          </Bloque>

          <Bloque titulo="¿Quién los ve?">
            <p>
              Únicamente el equipo de {sitio.nombre}. No los vendemos ni los compartimos con nadie más, y los guardamos
              en un sistema protegido con contraseña.
            </p>
          </Bloque>

          <Bloque titulo="¿Qué datos son necesarios?">
            <p>
              Los marcados como obligatorios en el formulario: sin ellos no podemos tomar la inscripción. El email, el
              otro WhatsApp y la información adicional son opcionales.
            </p>
          </Bloque>

          <Bloque titulo="Podés pedirnos cambios cuando quieras">
            <p>
              Si querés ver, corregir o borrar tus datos o los de los chicos, escribinos por{" "}
              <a href={urlWhatsapp} className="font-medium text-marino underline underline-offset-2">
                WhatsApp
              </a>{" "}
              y lo resolvemos. Es gratis.
            </p>
          </Bloque>

          <footer className="space-y-2 border-t border-marino/10 pt-4 text-xs text-texto/80">
            <p>
              Responsable de la base de datos: {sitio.nombre}. Los titulares de los datos pueden ejercer el derecho de
              acceso en forma gratuita a intervalos no inferiores a seis meses, salvo interés legítimo, y solicitar su
              rectificación, actualización o supresión (Ley 25.326, arts. 14 a 16).
            </p>
            <p>
              La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, tiene la atribución de
              atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre
              protección de datos personales.
            </p>
            <p>Versión {VERSION_PRIVACIDAD}.</p>
          </footer>
        </article>

        <p className="mt-6 text-center">
          <Link href="/inscripcion" className="font-semibold text-marino underline underline-offset-4">
            Ir a la inscripción
          </Link>
        </p>
      </main>
      <PiePagina />
    </>
  );
}
