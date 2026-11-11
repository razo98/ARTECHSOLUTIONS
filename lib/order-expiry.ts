import mongoose from "mongoose";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";

// Une commande jamais confirmée par la boutique et jamais payée libère son stock après ce délai (0 = désactivé).
const hours = Number(process.env.ORDER_EXPIRY_HOURS ?? 48);
const globalCache = global as typeof globalThis & { artechExpiryCheck?: number };

export async function releaseExpiredOrders() {
  if (!(hours > 0) || Date.now() - (globalCache.artechExpiryCheck || 0) < 5 * 60 * 1000) return;
  globalCache.artechExpiryCheck = Date.now();
  const expired = await OrderModel.find({ status: "pending", paymentStatus: "unpaid", createdAt: { $lt: new Date(Date.now() - hours * 3600000) } }).select("_id").limit(50).lean();
  for (const { _id } of expired) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Les conditions sont revérifiées dans la transaction : une commande confirmée ou payée entre-temps n'est pas touchée.
        const order = await OrderModel.findOneAndUpdate({ _id, status: "pending", paymentStatus: "unpaid" }, { $set: { status: "cancelled", expiredAt: new Date() }, $inc: { __v: 1 } }, { session, new: true });
        if (!order) return;
        for (const item of order.items) await ProductModel.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity, __v: 1 } }, { session });
      });
    } finally { await session.endSession(); }
  }
}
