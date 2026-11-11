import Image from "next/image";
import { siteUrl } from "@/lib/site";
import { QuoteButton, QuoteModal, SiteHeader } from "./home-interactive";
import { ArrowRight, Check, Code2, Headphones, Laptop, MapPin, MessageCircle, PackageCheck, Phone, Printer, Router, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Truck, Wifi, Wrench, Zap } from "lucide-react";

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "ARTECH Solutions",
  description: "Accessoires, réparation téléphone, maintenance informatique, sites web, Starlink & WiFi-Zone, imprimerie et livraison à Niamey.",
  image: `${siteUrl}/logo-artech.jpeg`,
  url: siteUrl,
  telephone: "+22799897842",
  address: { "@type": "PostalAddress", streetAddress: "Quartier Zak", addressLocality: "Niamey", addressCountry: "NE" },
  areaServed: "Niamey",
  sameAs: ["https://wa.me/22799897842"],
};

const services = [
  { icon: Smartphone, title: "Réparation téléphone", text: "Écran, batterie, connecteur et diagnostic rapide pour toutes marques.", n: "01" },
  { icon: Wrench, title: "Maintenance informatique logicielle", text: "Installation de Windows, pilotes, logiciels autorisés, mises à jour et résolution de problèmes système.", n: "02" },
  { icon: Code2, title: "Sites web & applications", text: "Des solutions digitales modernes, rapides et adaptées à votre activité.", n: "03" },
  { icon: Wifi, title: "Starlink & WiFi-Zone", text: "Installation Starlink, MikroTik, Wi-Fi Mesh, portails captifs et extension de couverture.", n: "04" },
  { icon: ShoppingCart, title: "Vente d’accessoires", text: "Accessoires pour téléphones et ordinateurs adaptés à vos équipements.", n: "05" },
  { icon: Printer, title: "Imprimerie", text: "Photocopies, impressions, cartes de visite, invitations et photos de carte.", n: "06" },
  { icon: Truck, title: "Livraison", text: "Produits, courses et colis livrés à Niamey, selon la zone à confirmer.", n: "07" },
];

export default function Home() {
  return (
    <main>
      <SiteHeader/>

      <section className="hero" id="accueil">
        <div className="hero-orb one"/><div className="hero-orb two"/>
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={16}/> La technologie au service de vos besoins</div>
            <h1>Accessoires & services<br/><span>numériques</span><br/>à Niamey.</h1>
            <p>ARTECH Solutions vous accompagne pour vos accessoires, réparations, besoins informatiques, installations Starlink et WiFi-Zone, projets web et travaux d’impression.</p>
            <div className="hero-actions">
              <a href="/boutique" className="button primary"><ShoppingBag size={18}/> Voir la boutique</a>
              <QuoteButton className="button secondary">Demander un devis <ArrowRight size={18}/></QuoteButton>
            </div>
            <div className="trust-row"><ShieldCheck/><div><strong>Une entreprise locale et accessible</strong><span>Conseil, diagnostic et accompagnement à Niamey</span></div></div>
          </div>
          <div className="hero-visual">
            <div className="device-card">
              <div className="device-top"><span/><span/><span/></div>
              <div className="device-screen"><div className="screen-icon"><Laptop size={72}/></div><h3>Solutions sans limites.</h3><p>Tout votre univers tech, au même endroit.</p></div>
            </div>
            <div className="float-card delivery"><Truck/><span><b>Livraison rapide</b><small>Partout à Niamey</small></span><Check/></div>
            <div className="float-card quality"><ShieldCheck/><span><b>Qualité garantie</b><small>Des produits fiables</small></span></div>
            <div className="dots"/>
          </div>
        </div>
        <div className="marquee"><div>{["Réparation", "Maintenance", "Développement web", "Accessoires", "Imprimerie", "Livraison", "Réparation", "Maintenance"].map((x, i)=><span key={i}>{x}<i>✦</i></span>)}</div></div>
      </section>

      <section className="section services" id="services">
        <div className="container">
          <div className="section-head"><div><div className="eyebrow">Ce que nous faisons</div><h2>Des services pensés<br/>pour <span>vous simplifier la vie.</span></h2></div><p>De la réparation express à la création de votre présence digitale, notre équipe vous accompagne avec expertise et réactivité.</p></div>
          <div className="services-grid">{services.map(({icon: Icon, title, text, n}) => <article className="service-card" key={title}><div className="service-icon"><Icon/></div><span className="service-num">{n}</span><h3>{title}</h3><p>{text}</p><a href="#contact">En savoir plus <ArrowRight size={16}/></a></article>)}</div>
        </div>
      </section>

      <section className="section shop" id="boutique">
        <div className="container">
          <div className="shop-head"><div><div className="eyebrow light">La boutique ARTECH</div><h2>Les accessoires<br/><span>dont vous avez besoin.</span></h2><p className="demo-note">Découvrez nos articles, leurs prix et le stock disponible. Préparez votre panier et retrouvez le récapitulatif de votre commande en PDF.</p></div><a href="/boutique" className="button white">Ouvrir la boutique <ArrowRight size={17}/></a></div>
          <div className="shop-benefits"><span><PackageCheck/> Stock disponible en ligne</span><span><ShoppingBag/> Panier et commande</span><span><ShieldCheck/> MYNITA · AMANATA · WAVE</span><span><Headphones/> Suivi avec notre équipe</span></div>
        </div>
      </section>

      <section className="section network" id="starlink"><div className="container network-grid"><div className="network-copy"><div className="eyebrow">Connexion & réseaux</div><h2>Starlink et WiFi-Zone,<br/><span>configurés pour votre réalité.</span></h2><p>Connectez un domicile, un commerce, des bureaux ou déployez une zone Wi-Fi. Nous étudions le lieu et l’usage avant de proposer le matériel et l’installation adaptés.</p><div className="network-points"><span><Router/> Configuration MikroTik et portails captifs</span><span><Wifi/> Réseaux Mesh et extension de couverture</span><span><Zap/> Installation et activation Starlink</span></div><QuoteButton className="button primary" service="Starlink & WiFi-Zone">Demander une étude <ArrowRight/></QuoteButton></div><div className="network-card"><div className="signal"><Wifi size={74}/></div><h3>Une solution adaptée au lieu</h3><p>Matériel, installation, activation et abonnement sont présentés séparément dans chaque proposition.</p><div><Check/> Étude du besoin</div><div><Check/> Configuration sur mesure</div><div><Check/> Accompagnement après installation</div></div></div></section>

      <section className="section about" id="apropos"><div className="container about-grid"><div className="about-visual"><div className="tech-circle"><Zap size={72} fill="currentColor"/></div><div className="experience"><b>100%</b><span>engagés pour<br/>votre satisfaction</span></div></div><div className="about-copy"><div className="eyebrow">Pourquoi ARTECH ?</div><h2>La proximité d’ici.<br/><span>L’expertise de demain.</span></h2><p>ARTECH Solutions est une entreprise nigérienne qui rend la technologie plus simple, accessible et utile au quotidien.</p><ul><li><Check/> Une équipe compétente et à votre écoute</li><li><Check/> Des interventions rapides et transparentes</li><li><Check/> Des solutions adaptées à chaque budget</li></ul><a className="text-link" href="#contact">Parlons de votre projet <ArrowRight/></a></div></div></section>

      <footer id="contact"><div className="container footer-intro"><div><div className="eyebrow light">Un projet ? Un besoin ?</div><h2>On trouve la solution, ensemble.</h2><p>Contactez-nous ou passez à la boutique au Quartier Zak.</p></div><QuoteButton className="button footer-quote">Demander un devis <ArrowRight/></QuoteButton></div><div className="container footer-single"><a className="logo footer-logo" href="#accueil"><Image className="brand-image" src="/logo-artech.jpeg" alt="Logo ARTECH Solutions" width={54} height={54}/><span className="brand-name"><strong><em>ARTECH</em> SOLUTIONS</strong><small>La technologie au service de vos besoins</small></span></a><div className="footer-contacts"><a href="tel:+22799897842"><Phone/> <span><small>Commandes & WhatsApp</small>+227 99 89 78 42</span></a><a href="tel:+22799459834"><Phone/> <span><small>Numéro complémentaire</small>+227 99 45 98 34</span></a><a href="https://www.google.com/maps/search/?api=1&query=H3CM%2B7JW%2C%20Niamey" target="_blank" rel="noreferrer"><MapPin/> <span><small>Notre localisation</small>H3CM+7JW, Quartier Zak, Niamey</span></a><a className="footer-whatsapp" href="https://wa.me/message/5GVVXMVFGL7TK1" target="_blank" rel="noreferrer"><MessageCircle/> WhatsApp</a></div></div><div className="container copyright"><span>© 2026 ARTECH Solutions. Tous droits réservés.</span><span>Prix et disponibilités à confirmer.</span></div></footer>

      <a className="whatsapp-float" href="https://wa.me/22799897842" target="_blank" rel="noreferrer" aria-label="Écrire à ARTECH Solutions sur WhatsApp"><MessageCircle fill="currentColor"/></a>
      <QuoteModal/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}/>
    </main>
  );
}
