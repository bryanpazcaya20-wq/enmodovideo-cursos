import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import { WhatsAppSupport } from "@/components/layout/whatsapp-support";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "En Modo Video — Cursos de CapCut para celular y PC",
    template: "%s · En Modo Video",
  },
  description:
    "Cursos completos de edición de video con CapCut, desde cero hasta nivel pro, para tu celular o tu PC. Pago único con PayPal y acceso de por vida.",
  applicationName: "En Modo Video",
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "En Modo Video",
    images: ["/brand/logo-completo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0a14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <WhatsAppSupport />
      </body>
    </html>
  );
}
