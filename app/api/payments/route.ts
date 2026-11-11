import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { paymentOptions } from "@/lib/payments";
import { paymentMethods } from "@/lib/shop";
import { body, failure, HttpError, string } from "@/lib/server-utils";
import { PaymentSetting } from "@/models/PaymentSetting";
import { connectDB } from "@/lib/mongodb";
export async function GET() {
  try { return NextResponse.json(await paymentOptions(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    await requireAdmin(); const data = await body(request);
    if (!paymentMethods.includes(data.method as never) || typeof data.available !== "boolean") throw new HttpError(400, "Moyen de paiement invalide.");
    const account = string(data.account, "Compte destinataire", 150, data.available ? 3 : 0);
    const instructions = string(data.instructions, "Instructions", 2000, 0);
    await connectDB();
    await PaymentSetting.updateOne({ method: data.method }, { $set: { account, instructions, available: data.available } }, { upsert: true });
    return NextResponse.json(await paymentOptions());
  } catch (error) { return failure(error); }
}
