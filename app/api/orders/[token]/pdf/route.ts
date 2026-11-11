import { orderByToken } from "@/lib/order-access";
import { failure } from "@/lib/server-utils";
import { createReceipt } from "@/lib/receipt";
import { ShopOrder } from "@/lib/shop";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const order = await orderByToken((await params).token);
    const bytes = await createReceipt(order.toObject() as ShopOrder);
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${order.reference}.pdf"`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return failure(error); }
}
