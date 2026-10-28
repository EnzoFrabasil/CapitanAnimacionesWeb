"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./acciones";

export function FormularioLogin({ desde }: { desde?: string }) {
  const [error, accion, pendiente] = useActionState(iniciarSesion, null);

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="desde" value={desde ?? ""} />
      <div>
        <label htmlFor="email" className="mb-1 block font-medium text-marino">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          className="w-full rounded-xl border-2 border-marino/20 px-4 py-3 focus:border-azul focus:ring-4 focus:ring-azul/20 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block font-medium text-marino">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          className="w-full rounded-xl border-2 border-marino/20 px-4 py-3 focus:border-azul focus:ring-4 focus:ring-azul/20 focus:outline-none"
        />
      </div>
      {error && (
        <p id="login-error" role="alert" className="font-medium text-rojo">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-full bg-marino px-6 py-3 font-titulo text-lg font-semibold text-white transition hover:bg-marino/90 disabled:opacity-70"
      >
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
