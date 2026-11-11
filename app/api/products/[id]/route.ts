import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { productInput } from "@/lib/product-input";
import { body, failure, HttpError, integer } from "@/lib/server-utils";
import { ProductModel } from "@/models/Product";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); const { id } = await params;
    if (!isValidObjectId(id)) throw new HttpError(404, "Article introuvable.");
    const data = await body(request); const version = integer(data.__v, "Version"); const input = productInput(data);
    await connectDB();
    const { oldPrice, ...fields } = input;
    const product = await ProductModel.findOneAndUpdate({ _id: id, __v: version }, { $set: { ...fields, ...(oldPrice === undefined ? {} : { oldPrice }) }, $inc: { __v: 1 }, ...(oldPrice === undefined ? { $unset: { oldPrice: 1 } } : {}) }, { new: true, runValidators: true });
    if (!product) throw new HttpError(409, "Cet article a changé. Actualisez le catalogue avant de réessayer.");
    return NextResponse.json(product);
  } catch (error) { return failure(error); }
}
