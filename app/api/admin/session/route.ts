import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Schema, models, model } from "mongoose";
import { configured, createSession, equal, isAdmin, passwordMatches } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { body, clientIp, failure, HttpError, sameOrigin, string } from "@/lib/server-utils";
const Attempt = models.LoginAttempt || model("LoginAttempt", new Schema({ _id: String, count: Number, expiresAt: { type: Date, expires: 0 } }));
export async function GET() { return NextResponse.json({ authenticated: await isAdmin(), configured: configured() }, { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  try {
    const input = await body(request);
    if (!configured()) throw new HttpError(503, "Configurez ADMIN_EMAIL, ADMIN_PASSWORD et SESSION_SECRET dans .env.local.");
    const email = string(input.email, "Adresse e-mail", 200); const password = string(input.password, "Mot de passe", 200);
    await connectDB();
    // Limite par adresse IP : un inconnu ne peut pas bloquer la connexion de l'administrateur depuis un autre appareil.
    const bucket = Math.floor(Date.now() / 900000);
    const ip = createHash("sha256").update(clientIp(request)).digest("hex").slice(0, 32);
    const attempt = await Attempt.findOneAndUpdate({ _id: `admin-${ip}-${bucket}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 900000) } }, { upsert: true, new: true });
    // Plafond global de sécurité, au cas où l'adresse IP transmise serait falsifiée.
    const global = await Attempt.findOneAndUpdate({ _id: `admin-all-${bucket}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 900000) } }, { upsert: true, new: true });
    if (attempt.count > 10 || global.count > 300) throw new HttpError(429, "Trop de tentatives. Réessayez dans 15 minutes.");
    const validPassword = passwordMatches(password);
    if (!equal(email.toLowerCase(), process.env.ADMIN_EMAIL!.toLowerCase()) || !validPassword) throw new HttpError(401, "Identifiants incorrects.");
    await createSession(); return NextResponse.json({ authenticated: true });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try { sameOrigin(request); (await cookies()).delete("artech-admin"); return NextResponse.json({ ok: true }); }
  catch (error) { return failure(error); }
}
