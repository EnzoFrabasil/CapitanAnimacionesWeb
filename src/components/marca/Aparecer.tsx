"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Hace aparecer el contenido con un desplazamiento suave cuando entra en pantalla.
 * Sin JavaScript se ve normal, y con prefers-reduced-motion aparece sin movimiento
 * (ver [data-aparecer] en globals.css).
 */
export function Aparecer({
  children,
  className,
  retraso = 0,
}: {
  children: ReactNode;
  className?: string;
  retraso?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-aparecer=""
      data-visible={visible ? "" : undefined}
      style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
