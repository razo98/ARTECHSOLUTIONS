import { OrderModel } from "@/models/Order";
import { connectDB } from "./mongodb";
import { HttpError } from "./server-utils";
export async function orderByToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404, "Commande introuvable.");
  await connectDB(); const order = await OrderModel.findOne({ token });
  if (!order) throw new HttpError(404, "Commande introuvable.");
  return order;
}
