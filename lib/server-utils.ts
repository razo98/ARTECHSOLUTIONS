import { NextResponse } from "next/server";
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Service indisponible. Réessayez dans quelques instants." }, { status: 503 });
}
const firstHeader = (request: Request, name: string) => request.headers.get(name)?.split(",")[0].trim() || "";
export function clientIp(request: Request) {
  return firstHeader(request, "x-forwarded-for") || firstHeader(request, "x-real-ip") || "inconnue";
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const requestUrl = new URL(request.url);
    // Derrière un hébergeur (proxy), l'hôte et le protocole publics sont transmis dans les en-têtes x-forwarded-*.
    const expectedHost = firstHeader(request, "x-forwarded-host") || request.headers.get("host") || requestUrl.host;
    const expectedProtocol = firstHeader(request, "x-forwarded-proto") ? `${firstHeader(request, "x-forwarded-proto")}:` : requestUrl.protocol;
    let valid = false;
    try { const parsed = new URL(origin); valid = parsed.host === expectedHost && parsed.protocol === expectedProtocol; } catch {}
    if (!valid) throw new HttpError(403, "Origine non autorisée.");
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Origine non autorisée.");
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  sameOrigin(request);
  const text = await request.text();
  if (text.length > 30000) throw new HttpError(413, "Formulaire trop volumineux.");
  try {
    const value = JSON.parse(text);
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value;
  } catch { throw new HttpError(400, "Formulaire invalide."); }
}
export function string(value: unknown, label: string, max = 200, min = 1) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new HttpError(400, `${label} : valeur invalide.`);
  return value.trim();
}
export function integer(value: unknown, label: string, min = 0, max = 100000000) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, `${label} : nombre invalide.`);
  return value;
}
