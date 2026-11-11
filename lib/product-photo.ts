import sharp from "sharp";
import { HttpError } from "./server-utils";
export async function normalizePhoto(input: Buffer) {
  if (input.length > 5 * 1024 * 1024) throw new HttpError(413, "L’image doit faire au maximum 5 Mo.");
  try {
    const image = sharp(input, { limitInputPixels: 20000000, failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error();
    return await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { throw new HttpError(400, "Image invalide. Choisissez une photo JPG, PNG ou WebP, non animée (20 mégapixels maximum)."); }
}
