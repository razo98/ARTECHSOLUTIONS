import { randomBytes } from "node:crypto";
import mongoose, { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { releaseExpiredOrders } from "@/lib/order-expiry";
import { body, failure, HttpError, integer, string } from "@/lib/server-utils";
import { paymentMethods } from "@/lib/shop";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
export async function GET() {
  try { await requireAdmin(); await connectDB(); await releaseExpiredOrders().catch(() => {}); return NextResponse.json(await OrderModel.find({}).sort({ createdAt: -1 }).lean(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const data = await body(request);
    const checkoutKey = string(data.checkoutKey, "Clé de commande", 80);
    if (!/^[a-f0-9-]{36}$/i.test(checkoutKey)) throw new HttpError(400, "Clé de commande invalide.");
    const customer = data.customer as Record<string, unknown> | undefined;
    const name = string(customer?.name, "Nom", 120, 2); const phone = string(customer?.phone, "Téléphone", 25, 8);
    if (!/^\+?[\d\s()-]{8,25}$/.test(phone)) throw new HttpError(400, "Téléphone invalide.");
    const note = string(customer?.note ?? "", "Note", 1000, 0);
    const fulfillment = data.fulfillment ?? "pickup";
    if (fulfillment !== "pickup" && fulfillment !== "delivery") throw new HttpError(400, "Choisissez la livraison ou le retrait.");
    const deliveryAddress = fulfillment === "delivery" ? string(data.deliveryAddress, "Adresse et quartier de livraison", 600, 8) : "";
    if (!paymentMethods.includes(data.paymentMethod as never) && data.paymentMethod !== "IN_STORE") throw new HttpError(400, "Choisissez un moyen de paiement.");
    if (fulfillment === "delivery" && data.paymentMethod === "IN_STORE") throw new HttpError(400, "Le paiement en boutique nécessite un retrait en boutique.");
    if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 50) throw new HttpError(400, "Le panier doit contenir entre 1 et 50 articles.");
    const seen = new Set<string>();
    const lines = data.items.map((item: { productId?: unknown; quantity?: unknown } | null) => {
      if (!item || typeof item !== "object") throw new HttpError(400, "Article invalide ou en double.");
      const productId = string(item.productId, "Article", 24);
      if (!isValidObjectId(productId) || seen.has(productId)) throw new HttpError(400, "Article invalide ou en double.");
      seen.add(productId); return { productId, quantity: integer(item.quantity, "Quantité", 1, 100) };
    });
    await connectDB(); await OrderModel.init();
    const existing = await OrderModel.findOne({ checkoutKey });
    if (existing) return NextResponse.json({ token: existing.token });
    const session = await mongoose.startSession();
    let token = "";
    try {
      await session.withTransaction(async () => {
        const previous = await OrderModel.findOne({ checkoutKey }).session(session);
        if (previous) { token = previous.token; return; }
        const items = [];
        for (const line of lines) {
          const product = await ProductModel.findOneAndUpdate({ _id: line.productId, active: { $ne: false }, stock: { $gte: line.quantity } }, { $inc: { stock: -line.quantity, __v: 1 } }, { session, new: true });
          if (!product) throw new HttpError(409, "Un article n’est plus disponible dans la quantité demandée. Actualisez votre panier.");
          items.push({ ...line, name: product.name, price: product.price });
        }
        token = randomBytes(32).toString("hex");
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await OrderModel.create([{ reference: `ART-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`, token, checkoutKey, customer: { name, phone, note }, items, subtotal, total: subtotal, fulfillment, deliveryAddress, deliveryFee: fulfillment === "delivery" ? null : 0, paymentMethod: data.paymentMethod }], { session });
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const duplicate = await OrderModel.findOne({ checkoutKey });
        if (!duplicate) throw error;
        token = duplicate.token;
      } else throw error;
    } finally { await session.endSession(); }
    return NextResponse.json({ token }, { status: 201 });
  } catch (error) { return failure(error); }
}
