import mongoose, { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { body, failure, HttpError, integer } from "@/lib/server-utils";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); const data = await body(request); const { id } = await params;
    if (!isValidObjectId(id)) throw new HttpError(404, "Commande introuvable.");
    const version = integer(data.__v, "Version");
    await connectDB(); const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await OrderModel.findOne({ _id: id, __v: version }).session(session);
        if (!order) throw new HttpError(409, "Cette commande a changé. Actualisez la liste.");
        if (order.status === "cancelled" || order.status === "completed") throw new HttpError(409, "Cette commande est clôturée.");
        if (data.action === "set-delivery-fee") {
          if (order.fulfillment !== "delivery" || order.paymentStatus !== "unpaid") throw new HttpError(409, "Les frais ne peuvent être modifiés qu’avant le paiement d’une livraison.");
          order.deliveryFee = integer(data.deliveryFee, "Frais de livraison", 0, 100000);
          order.subtotal ??= order.items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
          order.total = order.subtotal + order.deliveryFee;
        } else if (data.action === "collect-in-store") {
          if (order.paymentMethod !== "IN_STORE" || order.fulfillment === "delivery" || order.paymentStatus !== "unpaid") throw new HttpError(409, "Encaissement en boutique impossible pour cette commande.");
          order.paymentStatus = "paid";
          order.paymentReference = `Encaissement boutique - ${order.reference}`;
        } else if (data.action === "approve-payment") {
          if (order.fulfillment === "delivery" && order.deliveryFee == null) throw new HttpError(409, "Confirmez les frais de livraison.");
          if (order.paymentStatus !== "submitted") throw new HttpError(409, "Aucun paiement à vérifier.");
          order.paymentStatus = "paid";
        } else if (data.action === "reject-payment") {
          if (order.paymentStatus !== "submitted") throw new HttpError(409, "Aucun paiement à vérifier.");
          order.paymentStatus = "unpaid";
        } else if (data.action === "cancel") {
          if (order.paymentStatus === "paid") throw new HttpError(409, "Commande payée : traitez d’abord le remboursement avec le client hors de cette interface.");
          order.status = "cancelled";
          for (const item of order.items) await ProductModel.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity, __v: 1 } }, { session });
        } else if (data.action === "advance") {
          const next: Record<string, string> = { pending: "confirmed", confirmed: "preparing", preparing: "ready", ready: "completed" };
          if (order.fulfillment === "delivery") { next.ready = "out_for_delivery"; next.out_for_delivery = "completed"; }
          if (order.fulfillment === "delivery" && ["ready", "out_for_delivery"].includes(order.status) && order.deliveryFee == null) throw new HttpError(409, "Confirmez les frais de livraison avant l’envoi.");
          if (["ready", "out_for_delivery"].includes(order.status) && order.paymentStatus !== "paid") throw new HttpError(409, "Validez le paiement avant de remettre ou livrer la commande.");
          if (!next[order.status]) throw new HttpError(409, "Transition impossible.");
          order.status = next[order.status];
        } else throw new HttpError(400, "Action invalide.");
        order.__v += 1; await order.save({ session });
      });
    } finally { await session.endSession(); }
    return NextResponse.json(await OrderModel.findById(id));
  } catch (error) { return failure(error); }
}
