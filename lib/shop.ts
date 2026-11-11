export type ShopProduct = {
  _id: string; name: string; category: string; description: string; price: number;
  oldPrice?: number; image: string; badge?: string; stock: number; active: boolean; __v: number;
};
export const paymentMethods = ["MYNITA", "AMANATA", "WAVE"] as const;
export type PaymentMethod = typeof paymentMethods[number] | "IN_STORE";
export const paymentLabel = (method: PaymentMethod) => method === "IN_STORE" ? "Paiement en boutique" : method;
export const fulfillmentLabel = (order: { fulfillment?: string }) => order.fulfillment === "delivery" ? "Livraison" : "Retrait en boutique";
export const orderStatusLabel = (order: { status: string; fulfillment?: string }) => order.status === "ready" && order.fulfillment === "delivery" ? "Prête à livrer" : statusLabels[order.status];
export const orderStatuses = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"] as const;
export const statusLabels: Record<string, string> = {
  pending: "À confirmer", confirmed: "Confirmée", preparing: "En préparation", ready: "Prête au retrait",
  completed: "Remise au client", out_for_delivery: "En cours de livraison", cancelled: "Annulée", unpaid: "Non payé", submitted: "Paiement à vérifier", paid: "Payé",
};
export type ShopOrder = {
  _id: string; reference: string; token: string; createdAt: string;
  customer: { name: string; phone: string; note: string };
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number; status: string; paymentStatus: string; paymentMethod: PaymentMethod;
  paymentReference: string; __v: number;
  fulfillment?: "pickup" | "delivery"; expiredAt?: string; deliveryAddress?: string; deliveryFee?: number | null; subtotal?: number;
};
export type PaymentOption = { method: PaymentMethod; account: string; instructions: string; available: boolean };
export const thumbnailWidths = [160, 480] as const;
// Les photos importées (/api/images/…) existent en miniature ; les adresses HTTPS externes sont utilisées telles quelles.
export const thumbnail = (image: string, width: typeof thumbnailWidths[number]) => /^\/api\/images\/[a-f0-9]{24}$/.test(image) ? `${image}?w=${width}` : image;
export const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Impossible de terminer cette action.");
  return data as T;
}
