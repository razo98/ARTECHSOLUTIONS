"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, MessageCircle, ShoppingBag, X } from "lucide-react";

const quoteServices = ["Maintenance informatique logicielle", "Réparation téléphone / iPhone", "Site web & application", "Starlink & WiFi-Zone", "Imprimerie", "Livraison"];
const openQuote = (service?: string) => window.dispatchEvent(new CustomEvent("artech:quote", { detail: service }));

export function QuoteButton({ className, service, children }: { className: string; service?: string; children: React.ReactNode }) {
  return <button type="button" className={className} onClick={() => openQuote(service)}>{children}</button>;
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [["#accueil", "Accueil"], ["#services", "Services"], ["#starlink", "Starlink & WiFi"], ["/boutique", "Boutique"], ["#apropos", "À propos"], ["#contact", "Contact"]];
  return (
    <header className="nav-wrap">
      <nav className="nav container" aria-label="Navigation principale">
        <a className="logo" href="#accueil">
          <Image className="brand-image" src="/logo-artech.jpeg" alt="Logo ARTECH Solutions" width={54} height={54} priority/>
          <span className="brand-name"><strong><em>ARTECH</em> SOLUTIONS</strong><small>La technologie au service de vos besoins</small></span>
        </a>
        <div id="menu-principal" className={`nav-links ${menuOpen ? "open" : ""}`}>
          {links.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </div>
        <div className="nav-actions">
          <a className="cart-button" aria-label="Ouvrir le panier" href="/boutique#panier"><ShoppingBag size={21}/></a>
          <QuoteButton className="button nav-cta">Demander un devis <ArrowRight size={17}/></QuoteButton>
          <button type="button" className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen} aria-controls="menu-principal">{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </nav>
    </header>
  );
}

export function QuoteModal() {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState(quoteServices[0]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const show = (event: Event) => { const requested = (event as CustomEvent<string | undefined>).detail; if (requested) setService(requested); setOpen(true); };
    window.addEventListener("artech:quote", show);
    return () => window.removeEventListener("artech:quote", show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLInputElement>("input")?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("keydown", close); previousFocus?.focus(); };
  }, [open]);
  const sendQuote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = encodeURIComponent(`Bonjour ARTECH Solutions, je souhaite demander un devis.\n\nNom : ${data.get("name")}\nTéléphone : ${data.get("phone")}\nService : ${data.get("service")}\nBesoin : ${data.get("details")}`);
    window.open(`https://wa.me/22799897842?text=${message}`, "_blank", "noopener");
  };
  return (
    // inert retire le formulaire caché de la navigation au clavier et des lecteurs d'écran.
    <div className={`quote-modal ${open ? "open" : ""}`} inert={!open}>
      <div className="quote-overlay" onClick={() => setOpen(false)}/>
      <div className="quote-box" ref={box} role="dialog" aria-modal="true" aria-labelledby="quote-title">
        <button type="button" className="quote-close" onClick={() => setOpen(false)} aria-label="Fermer"><X/></button>
        <div className="eyebrow">Demande de devis</div>
        <h3 id="quote-title">Décrivez votre besoin</h3>
        <p>Remplissez ces informations, puis envoyez vous-même la demande dans WhatsApp.</p>
        <form onSubmit={sendQuote}>
          <label>Nom complet<input name="name" required autoComplete="name" placeholder="Votre nom"/></label>
          <label>Numéro de téléphone<input name="phone" required type="tel" autoComplete="tel" placeholder="Ex. 90 00 00 00"/></label>
          <label>Service<select name="service" value={service} onChange={e => setService(e.target.value)}>{quoteServices.map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Votre besoin<textarea name="details" required rows={4} placeholder="Appareil, version de Windows, logiciel concerné, problème rencontré ou autre précision..."/></label>
          <button className="button whatsapp" type="submit"><MessageCircle/> Continuer sur WhatsApp</button>
        </form>
      </div>
    </div>
  );
}
