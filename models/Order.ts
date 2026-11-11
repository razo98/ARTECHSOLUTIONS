import { Schema, model, models } from "mongoose";
const OrderSchema = new Schema({
  reference: { type: String, required: true, unique: true }, token: { type: String, required: true, unique: true },
  checkoutKey: { type: String, required: true, unique: true, select: false },
  customer: { name: String, phone: String, note: String },
  fulfillment: { type: String, enum: ["pickup", "delivery"], default: "pickup" },
  deliveryAddress: { type: String, default: "" },
  deliveryFee: { type: Number, default: 0 },
  subtotal: Number,
  items: [{ productId: { type: Schema.Types.ObjectId, required: true }, name: String, price: Number, quantity: Number, _id: false }],
  total: { type: Number, required: true }, status: { type: String, default: "pending" },
  paymentStatus: { type: String, default: "unpaid" }, paymentMethod: { type: String, required: true },
  paymentReference: { type: String, default: "" },
  expiredAt: Date,
}, { timestamps: true });
OrderSchema.index({ status: 1, paymentStatus: 1, createdAt: 1 });
export const OrderModel = models.Order || model("Order", OrderSchema);
