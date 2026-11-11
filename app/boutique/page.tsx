"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { api, money, thumbnail, paymentMethods, paymentLabel, PaymentMethod, ShopProduct } from "@/lib/shop";
import "../commerce.css";

type Cart = Record<string, number>;
export default function Boutique() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [cart, setCart] = useState<Cart>({}); const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Tous");
  const [open, setOpen] = useState(false); const [detail, setDetail] = useState<ShopProduct | null>(null);
  const [busy, setBusy] = useState(false); const [lastOrder, setLastOrder] = useState("");
  const [notice, setNotice] = useState("");
  const [fulfillment, setFulfillment] = useState("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MYNITA");
  const checkoutKeyRef = useRef("");
  async function refresh() {
    setLoading(true); setError("");
    try { setProducts(await api<ShopProduct[]>("/api/products")); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    refresh();
    try {
      const stored = JSON.parse(localStorage.getItem("artech-cart") || "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) setCart(Object.fromEntries(Object.entries(stored).filter(([id, n]) => /^[a-f0-9]{24}$/.test(id) && Number.isInteger(n) && Number(n) > 0 && Number(n) <= 100)) as Cart);
      setLastOrder(localStorage.getItem("artech-last-order") || "");
    } catch { /* Storage may be unavailable. */ }
    setLoaded(true);
    if (window.location.hash === "#panier") setOpen(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem("artech-cart", JSON.stringify(cart)); } catch {} } }, [cart, loaded]);
  useEffect(() => {
    if (!open && !detail) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) { setOpen(false); setDetail(null); } };
    document.addEventListener("keydown", close); const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; };
  }, [open, detail, busy]);
  const visible = useMemo(() => products.filter(p => (category === "Tous" || p.category === category) && `${p.name} ${p.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [products, category, query]);
  const count = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const lines = products.filter(p => cart[p._id]);
  const total = lines.reduce((sum, p) => sum + p.price * cart[p._id], 0);
  const invalid = Object.keys(cart).some(id => !products.find(p => p._id === id)) || lines.some(p => cart[p._id] > p.stock);
  function quantity(p: ShopProduct, change: number) {
    if (busy) return;
    setCart(current => { const next = { ...current }; const n = Math.max(0, Math.min(100, p.stock, (next[p._id] || 0) + change)); if (n) next[p._id] = n; else delete next[p._id]; return next; });
    if (change > 0) setNotice(`${p.name} ajouté au panier`);
  }
  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      let checkoutKey = checkoutKeyRef.current;
      if (!checkoutKey) {
        try { checkoutKey = sessionStorage.getItem("artech-checkout-key") || ""; } catch {}
        checkoutKey ||= crypto.randomUUID(); checkoutKeyRef.current = checkoutKey;
        try { sessionStorage.setItem("artech-checkout-key", checkoutKey); } catch {}
      }
      const result = await api<{ token: string }>("/api/orders", { method: "POST", body: JSON.stringify({ checkoutKey, customer: { name: form.get("name"), phone: form.get("phone"), note: form.get("note") }, paymentMethod, fulfillment, deliveryAddress: form.get("deliveryAddress"), items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })) }) });
      try { localStorage.setItem("artech-last-order", result.token); localStorage.removeItem("artech-cart"); sessionStorage.removeItem("artech-checkout-key"); } catch {}
      window.location.assign(`/commande/${result.token}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <main className="commerce">
    <header className="store-nav"><a className="store-brand" href="/"><img src="/logo-artech.jpeg" alt=""/><span>ARTECH <b>SOLUTIONS</b><small>La boutique</small></span></a><nav><a href="/"><ArrowLeft size={16}/> Accueil</a>{lastOrder && <a href={`/commande/${lastOrder}`}>Ma dernière commande</a>}<button className="c-button" onClick={() => setOpen(true)}><ShoppingBag size={18}/> Panier <span className="count">{count}</span></button></nav></header>
    <section className="store-hero"><div><span className="c-kicker">VOTRE UNIVERS TECH · NIAMEY</span><h1>Les bons accessoires.<br/><em>Tout simplement.</em></h1><p>Découvrez nos articles, consultez le stock disponible et préparez votre commande en quelques clics.</p><div className="store-trust"><span><Package size={17}/> Stock en temps réel</span><span><ShieldCheck size={17}/> Paiement vérifié en boutique</span></div></div><div className="hero-shop-icon"><ShoppingBag strokeWidth={1}/><span>Accessoires & informatique</span></div></section>
    <section className="store-content"><div className="catalog-title"><div><span className="c-kicker">LA SÉLECTION ARTECH</span><h2>Notre catalogue <small>{products.length} articles</small></h2></div><label className="c-search"><Search size={19}/><input aria-label="Rechercher un article" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un article…"/></label></div>
      <div className="c-tabs">{["Tous", ...Array.from(new Set(products.map(p => p.category)))].map(c => <button key={c} className={category === c ? "selected" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div>
      {notice && <p className="c-notice" role="status"><Check size={16}/>{notice}<button onClick={() => setOpen(true)}>Voir le panier</button><button aria-label="Fermer la notification" onClick={() => setNotice("")}><X size={16}/></button></p>}
      {error && !open && <div className="c-error" role="alert">{error} <button onClick={refresh}>Réessayer</button></div>}
      {loading ? <div className="c-empty">Chargement du catalogue…</div> : visible.length === 0 ? <div className="c-empty"><Package size={44}/><h3>{products.length ? "Aucun résultat" : "La sélection arrive bientôt"}</h3><p>{products.length ? "Essayez une autre recherche." : "Nos nouveaux articles seront présentés ici dès leur mise en ligne."}</p></div> : <div className="store-grid">{visible.map(p => <article className="store-product" key={p._id}><button className="store-product-image" onClick={() => setDetail(p)} aria-label={`Voir ${p.name}`}><img src={thumbnail(p.image, 480)} alt={p.name} loading="lazy" decoding="async" onError={e => { e.currentTarget.src = "/logo-artech.jpeg"; }}/>{p.badge && <span className="product-tag">{p.badge}</span>}</button><div className="store-product-body"><span className="c-kicker">{p.category}</span><button className="product-name" onClick={() => setDetail(p)}>{p.name}</button><p className={p.stock ? "stock" : "stock out"}><i/>{p.stock ? `${p.stock} en stock` : "Rupture de stock"}</p><div className="product-bottom"><div><strong>{money(p.price)}</strong>{p.oldPrice && <del>{money(p.oldPrice)}</del>}</div><button className="add-product" aria-label={`Ajouter ${p.name} au panier`} disabled={!p.stock || (cart[p._id] || 0) >= Math.min(p.stock, 100)} onClick={() => quantity(p, 1)}><Plus size={22}/></button></div></div></article>)}</div>}
    </section><footer className="store-footer"><span>ARTECH Solutions · Quartier Zak, Niamey</span><a href="tel:+22799897842">+227 99 89 78 42</a><a href="/admin">Espace administrateur</a></footer>
    {detail && <div className="c-modal"><button className="c-backdrop" aria-label="Fermer" onClick={() => setDetail(null)}/><section className="c-dialog product-detail" role="dialog" aria-modal="true" aria-label={detail.name}><button autoFocus className="c-close" aria-label="Fermer" onClick={() => setDetail(null)}><X/></button><img src={detail.image} alt={detail.name}/><span className="c-kicker">{detail.category}</span><h2>{detail.name}</h2><p className="product-description">{detail.description || "Contactez notre équipe pour plus de renseignements sur cet article."}</p><p className="stock">{detail.stock} en stock</p><h3>{money(detail.price)}</h3><button className="c-button" disabled={!detail.stock || (cart[detail._id] || 0) >= Math.min(detail.stock, 100)} onClick={() => { quantity(detail, 1); setDetail(null); setOpen(true); }}><ShoppingBag size={18}/> Ajouter au panier</button></section></div>}
    {open && <div className="c-modal"><button className="c-backdrop" aria-label="Fermer le panier" disabled={busy} onClick={() => setOpen(false)}/><section className="c-dialog cart-dialog" role="dialog" aria-modal="true" aria-label="Votre panier"><button autoFocus className="c-close" aria-label="Fermer le panier" disabled={busy} onClick={() => setOpen(false)}><X/></button><span className="c-kicker">VOTRE SÉLECTION</span><h2>Mon panier <small>({count})</small></h2>{error && <p className="c-error" role="alert">{error} <button disabled={busy || loading} onClick={refresh}>Actualiser le stock</button></p>}{!count ? <div className="c-empty"><ShoppingBag size={40}/><h3>Votre panier est vide</h3><button className="c-button" onClick={() => setOpen(false)}>Découvrir les articles</button></div> : <><div>{lines.map(p => <div className="c-cart-line" key={p._id}><img src={thumbnail(p.image, 160)} alt=""/><div><strong>{p.name}</strong><small>{money(p.price)} / unité · {p.stock} disponibles</small><div className="c-quantity"><button disabled={busy} aria-label={`Diminuer ${p.name}`} onClick={() => quantity(p, -1)}><Minus size={14}/></button><span>{cart[p._id]}</span><button disabled={busy || cart[p._id] >= Math.min(p.stock, 100)} aria-label={`Augmenter ${p.name}`} onClick={() => quantity(p, 1)}><Plus size={14}/></button><button disabled={busy} aria-label={`Retirer ${p.name}`} onClick={() => setCart(c => { const n = { ...c }; delete n[p._id]; return n; })}><Trash2 size={15}/></button></div></div><strong>{money(p.price * cart[p._id])}</strong></div>)}</div>{invalid && <div className="c-error">Le stock de certains articles a changé. <button disabled={busy} onClick={() => setCart(Object.fromEntries(lines.filter(p => p.stock > 0).map(p => [p._id, Math.min(cart[p._id], p.stock)])))}>Ajuster mon panier</button></div>}<div className="c-total"><span>{fulfillment === "delivery" ? "Sous-total articles" : "Total à régler"}</span><strong>{money(total)}</strong></div><p className="c-muted">{fulfillment === "delivery" ? "Frais de livraison à confirmer selon votre quartier, avant tout paiement." : "Retrait gratuit à la boutique, Quartier Zak, Niamey."}</p><form className="c-form" onSubmit={checkout}><h3>Vos coordonnées</h3><label>Nom complet<input name="name" autoComplete="name" required minLength={2} maxLength={120}/></label><label>Téléphone<input name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={25} placeholder="+227…"/></label><label>Note pour la boutique (facultatif)<textarea name="note" maxLength={1000} rows={2}/></label><fieldset><legend>Comment recevoir votre commande ?</legend><div className="payment-choices"><label><input type="radio" name="fulfillment" value="pickup" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")}/><span>Retrait en boutique</span></label><label><input type="radio" name="fulfillment" value="delivery" checked={fulfillment === "delivery"} onChange={() => { setFulfillment("delivery"); if (paymentMethod === "IN_STORE") setPaymentMethod("MYNITA"); }}/><span>Livraison</span></label></div></fieldset>{fulfillment === "delivery" && <label>Quartier, adresse et repères de livraison<textarea name="deliveryAddress" required minLength={8} maxLength={600} rows={3} placeholder="Quartier, rue, numéro de porte ou point de repère…"/></label>}<fieldset><legend>Moyen de paiement souhaité</legend><div className="payment-choices">{([...paymentMethods, ...(fulfillment === "pickup" ? ["IN_STORE" as const] : [])]).map(method => <label key={method}><input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)}/><span>{paymentLabel(method)}</span></label>)}</div></fieldset><p className="c-muted">{paymentMethod === "IN_STORE" ? "Téléchargez votre reçu après la commande et présentez-le à la boutique pour payer et récupérer vos articles." : fulfillment === "delivery" ? "Notre équipe vous contacte pour convenir des frais de livraison. Attendez le total final avant votre transfert." : "Vous recevrez les instructions de transfert après la commande. Le paiement sera confirmé par notre équipe après vérification."}</p><button className="c-button wide" disabled={busy || invalid || loading || !lines.length}>{busy ? "Enregistrement…" : "Confirmer ma commande"}<ArrowRight size={18}/></button></form></>}</section></div>}
  </main>;
}
