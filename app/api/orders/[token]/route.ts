import { NextResponse } from "next/server";
import { orderByToken } from "@/lib/order-access";
import { body, failure, HttpError, string } from "@/lib/server-utils";
import { OrderModel } from "@/models/Order";
import { paymentOptions } from "@/lib/payments";
type Context = { params: Promise<{ token: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { return NextResponse.json(await orderByToken((await params).token), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }); }
  catch (error) { return failure(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    const data = await body(request); const order = await orderByToken((await params).token);
    if (order.fulfillment === "delivery" && order.deliveryFee == null) throw new HttpError(409, "Attendez la confirmation des frais de livraison avant de payer.");
    const paymentReference = string(data.paymentReference, "Référence de transaction", 120, 3);
    if (!(await paymentOptions()).some(p => p.method === order.paymentMethod && p.available)) throw new HttpError(400, "Ce moyen de paiement n’est pas encore configuré. Contactez la boutique.");
    const updated = await OrderModel.findOneAndUpdate({ _id: order._id, __v: order.__v, status: { $ne: "cancelled" }, paymentStatus: { $in: ["unpaid", "submitted"] } }, { $set: { paymentReference, paymentStatus: "submitted" }, $inc: { __v: 1 } }, { new: true });
    if (!updated) throw new HttpError(409, "Cette commande a changé, est annulée ou son paiement a été validé. Actualisez son récapitulatif.");
    return NextResponse.json(updated);
  } catch (error) { return failure(error); }
}
