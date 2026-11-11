import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Boutique d’accessoires à Niamey",
  description: "Accessoires téléphone et informatique en stock à Niamey : prix en FCFA, retrait au Quartier Zak ou livraison, paiement MYNITA, AMANATA, WAVE ou en boutique.",
  alternates: { canonical: "/boutique" },
  openGraph: { title: "Boutique ARTECH Solutions", url: "/boutique" },
};

export default function BoutiqueLayout({ children }: { children: React.ReactNode }) { return children; }
