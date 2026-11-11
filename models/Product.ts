import { Schema, model, models } from "mongoose";

const ProductSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: Number,
  image: { type: String, required: true },
  badge: String,
  description: { type: String, default: "" },
  active: { type: Boolean, default: true },
  stock: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export const ProductModel = models.Product || model("Product", ProductSchema);
