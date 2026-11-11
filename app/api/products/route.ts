import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { requireAdmin } from "@/lib/auth";
import { body, failure } from "@/lib/server-utils";
import { productInput } from "@/lib/product-input";
import { releaseExpiredOrders } from "@/lib/order-expiry";

export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("admin") === "1";
    if (admin) await requireAdmin();
    await connectDB();
    await releaseExpiredOrders().catch(() => { /* ne bloque jamais l’affichage du catalogue */ });
    const products = await ProductModel.find(admin ? {} : { active: { $ne: false } }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(products, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = productInput(await body(request));
    await connectDB();
    const product = await ProductModel.create(input);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
