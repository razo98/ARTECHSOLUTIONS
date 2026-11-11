import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-body" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

const description = "Réparation téléphone, maintenance informatique, création web, Starlink & WiFi-Zone, accessoires, imprimerie et livraison à Niamey.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ARTECH Solutions | Technologie & services à Niamey", template: "%s | ARTECH Solutions" },
  description,
  applicationName: "ARTECH Solutions",
  keywords: ["Niamey", "réparation téléphone", "maintenance informatique", "Starlink", "WiFi-Zone", "accessoires", "imprimerie", "site web", "Niger"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "fr_NE", siteName: "ARTECH Solutions", title: "ARTECH Solutions | Technologie & services à Niamey", description, url: "/", images: [{ url: "/logo-artech.jpeg", alt: "Logo ARTECH Solutions" }] },
  twitter: { card: "summary", title: "ARTECH Solutions", description, images: ["/logo-artech.jpeg"] },
};

export const viewport: Viewport = { themeColor: "#0867f2" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${manrope.variable} ${space.variable}`}>{children}</body>
    </html>
  );
}
