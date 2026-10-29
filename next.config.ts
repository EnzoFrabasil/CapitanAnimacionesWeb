import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // "Configuración" del panel se dividió en las secciones de La colonia (links viejos o guardados).
  redirects() {
    return [
      { source: "/admin/configuracion", destination: "/admin/colonia/fechas", permanent: false },
      { source: "/admin/configuracion/:id", destination: "/admin/colonia/temporadas", permanent: false },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
