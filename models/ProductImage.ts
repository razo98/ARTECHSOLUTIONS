import { Schema, model, models } from "mongoose";
const schema = new Schema({ data: { type: Buffer, required: true }, contentType: { type: String, default: "image/webp" } }, { timestamps: true });
export const ProductImage = models.ProductImage || model("ProductImage", schema);
