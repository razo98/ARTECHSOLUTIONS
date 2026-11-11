import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "./server-utils";
export function configured() { return !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET); }
function signature(value: string) { return createHmac("sha256", process.env.SESSION_SECRET || "").update(value).digest("hex"); }
export function equal(a: string, b: string) {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function passwordMatches(password: string) {
  const salt = process.env.SESSION_SECRET || "";
  return timingSafeEqual(scryptSync(password, salt, 64), scryptSync(process.env.ADMIN_PASSWORD || "", salt, 64));
}
export async function isAdmin() {
  if (!configured()) return false;
  const value = (await cookies()).get("artech-admin")?.value || "";
  const [expires, nonce, sig] = value.split(".");
  return !!expires && Number(expires) > Date.now() && !!nonce && !!sig && equal(sig, signature(`${expires}.${nonce}`));
}
export async function requireAdmin() { if (!await isAdmin()) throw new HttpError(401, "Connectez-vous à l’espace administrateur."); }
export async function createSession() {
  const value = `${Date.now() + 8 * 60 * 60 * 1000}.${randomBytes(16).toString("hex")}`;
  (await cookies()).set("artech-admin", `${value}.${signature(value)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60,
  });
}
