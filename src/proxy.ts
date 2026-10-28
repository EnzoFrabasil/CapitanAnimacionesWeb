import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, pareceSesion } from "@/lib/auth/sesion";

// Primera barrera del panel, sin ir a la base: solo mira que haya una cookie de
// sesión con forma válida. Cada página, acción y API del panel valida la sesión
// y el permiso de verdad (exigirPermiso / usuarioConPermiso).
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  if (pareceSesion(request.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  const login = new URL("/admin/login", request.url);
  login.searchParams.set("desde", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
