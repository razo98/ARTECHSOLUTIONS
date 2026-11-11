import { paymentMethods, PaymentOption } from "./shop";
import { PaymentSetting } from "@/models/PaymentSetting";
import { connectDB } from "./mongodb";
export async function paymentOptions(): Promise<PaymentOption[]> {
  await connectDB();
  const settings = await PaymentSetting.find({}).lean();
  return paymentMethods.map(method => {
    const setting = settings.find(s => s.method === method);
    return { method, account: String(setting?.account || ""), instructions: String(setting?.instructions || "Indiquez la référence de commande lors du transfert, puis transmettez la référence de transaction."), available: !!setting?.available && !!setting?.account };
  });
}
