import { Schema, model, models } from "mongoose";
const schema = new Schema({ method: { type: String, unique: true, required: true }, account: { type: String, default: "" }, instructions: { type: String, default: "" }, available: { type: Boolean, default: false } }, { timestamps: true });
export const PaymentSetting = models.PaymentSetting || model("PaymentSetting", schema);
