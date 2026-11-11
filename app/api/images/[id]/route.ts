import sharp from "sharp";
import { ProductImage } from "@/models/ProductImage";
import { connectDB } from "@/lib/mongodb";
import { failure, HttpError } from "@/lib/server-utils";
import { thumbnailWidths } from "@/lib/shop";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(404, "Image introuvable.");
    // ?w=400 renvoie une miniature : la grille de la boutique n'a pas besoin de la photo en 1600 px.
    const width = Number(new URL(request.url).searchParams.get("w"));
    if (width && !thumbnailWidths.includes(width as never)) throw new HttpError(400, "Taille d’image invalide.");
    await connectDB(); const image = await ProductImage.findById(id);
    if (!image) throw new HttpError(404, "Image introuvable.");
    const data = width ? await sharp(image.data).resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer() : image.data;
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return failure(error); }
}
