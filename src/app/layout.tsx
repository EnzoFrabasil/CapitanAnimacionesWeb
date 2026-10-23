import type { Metadata } from "next";
import { Fredoka, Poppins } from "next/font/google";
import { sitio } from "@/config/sitio";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: sitio.nombre,
  description: sitio.descripcion,
  icons: { icon: sitio.logos.circular, apple: sitio.logos.circular },
  openGraph: {
    title: sitio.nombre,
    description: sitio.descripcion,
    siteName: sitio.nombre,
    locale: "es_AR",
    type: "website",
    images: [{ url: sitio.logos.circular, width: 512, height: 512, alt: sitio.nombre }],
  },
  twitter: { card: "summary", images: [sitio.logos.circular] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${fredoka.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
