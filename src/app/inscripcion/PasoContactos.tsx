"use client";

import { CampoTexto, MensajeError } from "./campos";
import type { ContactoForm, ErrorDe } from "./tipos";

interface Props {
  contactos: ContactoForm[];
  cambiar: (indice: number, campo: keyof ContactoForm, valor: string) => void;
  tocar: (path: string) => void;
  agregar: () => void;
  quitar: (indice: number) => void;
  errorDe: ErrorDe;
}

export function PasoContactos({ contactos, cambiar, tocar, agregar, quitar, errorDe }: Props) {
  return (
    <div className="space-y-6">
      <p>
        ¿Con quién hablamos? Te vamos a escribir por WhatsApp para confirmar la inscripción. Podés sumar a otras
        personas (por ejemplo, el otro papá o mamá, o quien busca a los chicos).
      </p>

      {contactos.map((c, i) => {
        const id = (campo: keyof ContactoForm) => `contactos.${i}.${campo}`;
        const props = (campo: keyof ContactoForm) => ({
          id: id(campo),
          valor: c[campo],
          onCambio: (v: string) => cambiar(i, campo, v),
          onSalir: () => tocar(id(campo)),
          error: errorDe(id(campo)),
        });

        return (
          <section
            key={i}
            aria-labelledby={`contacto-${i}-titulo`}
            className="animate-aparecer rounded-3xl border-t-8 border-t-marino bg-white p-5 shadow-md sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 id={`contacto-${i}-titulo`} className="font-titulo text-xl font-semibold text-marino">
                Contacto {i + 1}
                {i === 0 && (
                  <span className="ml-2 rounded-full bg-amarillo px-3 py-0.5 align-middle text-sm text-marino">
                    Contacto principal
                  </span>
                )}
              </h3>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  className="rounded-full px-3 py-1 text-sm font-medium text-rojo underline-offset-4 hover:underline"
                >
                  Quitar contacto
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto {...props("nombre")} etiqueta="Nombre" autoComplete={i === 0 ? "given-name" : "off"} />
              <CampoTexto {...props("apellido")} etiqueta="Apellido" autoComplete={i === 0 ? "family-name" : "off"} />
              <div className="sm:col-span-2">
                <CampoTexto
                  {...props("parentesco")}
                  etiqueta="Parentesco con los chicos"
                  placeholder="Madre, padre, abuela, tío…"
                />
              </div>
              <CampoTexto
                {...props("whatsapp")}
                etiqueta="WhatsApp"
                tipo="tel"
                inputMode="tel"
                autoComplete={i === 0 ? "tel-national" : "off"}
                placeholder="11 2345-6789"
                ayuda="Con código de área, como lo escribas."
              />
              <CampoTexto
                {...props("whatsappAlt")}
                etiqueta="Otro WhatsApp"
                opcional
                tipo="tel"
                inputMode="tel"
                autoComplete="off"
              />
              <div className="sm:col-span-2">
                <CampoTexto
                  {...props("email")}
                  etiqueta="Email"
                  opcional
                  tipo="email"
                  inputMode="email"
                  autoComplete={i === 0 ? "email" : "off"}
                />
              </div>
            </div>
          </section>
        );
      })}

      <MensajeError id="contactos-error" mensaje={errorDe("contactos")} />

      <button
        type="button"
        onClick={agregar}
        className="w-full rounded-2xl border-2 border-dashed border-marino/40 bg-white/60 px-4 py-4 font-titulo text-lg font-semibold text-marino transition hover:border-marino hover:bg-white"
      >
        + Agregar otro contacto
      </button>
    </div>
  );
}
