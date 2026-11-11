import { HttpError, integer, string } from "./server-utils";
export function productInput(input: Record<string, unknown>) {
  const image = string(input.image, "Image", 2000);
  if (image !== "/logo-artech.jpeg" && !/^\/api\/images\/[a-f0-9]{24}$/.test(image)) {
    try { if (new URL(image).protocol !== "https:") throw new Error(); }
    catch { throw new HttpError(400, "L’image doit utiliser une adresse HTTPS."); }
  }
  if (typeof input.active !== "boolean") throw new HttpError(400, "Visibilité invalide.");
  const price = integer(input.price, "Prix", 1, 10000000);
  const oldPrice = input.oldPrice == null ? undefined : integer(input.oldPrice, "Ancien prix", price, 10000000);
  return { name: string(input.name, "Nom", 160), category: string(input.category, "Catégorie", 80),
    description: string(input.description ?? "", "Description", 3000, 0), image, price, oldPrice,
    badge: string(input.badge ?? "", "Étiquette", 40, 0), stock: integer(input.stock, "Stock", 0, 100000), active: input.active };
}
