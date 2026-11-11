"use client";
import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
export default function ProductPhoto({ initial, onBusy }: { initial: string; onBusy: (busy: boolean) => void }) {
  const [url, setUrl] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) { setError("Choisissez une image de 5 Mo maximum."); return; }
    setBusy(true); onBusy(true);
    try {
      const response = await fetch("/api/images", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d’envoyer cette image.");
      setUrl(data.url);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); onBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="product-photo-field"><span>Photo de l’article</span><img src={url || "/logo-artech.jpeg"} alt="Aperçu de la photo de l’article"/><input type="hidden" name="image" value={url}/><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choisir la photo de l’article" className="photo-file-input" disabled={busy} onChange={event => upload(event.target.files?.[0])}/><button type="button" className="c-button secondary" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={18}/>{busy ? "Envoi de la photo…" : "Choisir une photo dans mes fichiers"}</button><p className="c-muted">JPG, PNG ou WebP · 5 Mo maximum. Enregistrez l’article pour publier cette photo dans la boutique.</p>{error && <p role="alert" className="c-error">{error}</p>}<details><summary>Ou utiliser une adresse d’image HTTPS</summary><label>Adresse de la photo<input type="url" disabled={busy} placeholder="https://…" onChange={event => { if (event.target.value.startsWith("https://")) setUrl(event.target.value); }}/></label></details></div>;
}
