import type { Metadata } from "next";

export const metadata: Metadata = { title: "Suivi de commande", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function CommandeLayout({ children }: { children: React.ReactNode }) { return children; }
