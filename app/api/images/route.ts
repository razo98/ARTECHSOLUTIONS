import { normalizePhoto } from "@/lib/product-photo";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { failure, HttpError, sameOrigin } from "@/lib/server-utils";
import { ProductImage } from "@/models/ProductImage";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireAdmin(); sameOrigin(request);
    const limit = 5 * 1024 * 1024;
    if (!request.body) throw new HttpError(400, "Choisissez une image.");
    if (Number(request.headers.get("content-length")) > limit) throw new HttpError(413, "L’image doit faire au maximum 5 Mo.");
    const reader = request.body.getReader(); const chunks: Buffer[] = []; let size = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.length;
        if (size > limit) { await reader.cancel(); throw new HttpError(413, "L’image doit faire au maximum 5 Mo."); }
        chunks.push(Buffer.from(chunk.value));
      }
    } finally { reader.releaseLock(); }
    const data = await normalizePhoto(Buffer.concat(chunks));
    await connectDB(); const image = await ProductImage.create({ data, contentType: "image/webp" });
    return NextResponse.json({ url: `/api/images/${image._id}` }, { status: 201 });
  } catch (error) { return failure(error); }
}
