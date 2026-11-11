import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/", "/api/images/"], disallow: ["/admin", "/commande/", "/api/"] }, sitemap: `${siteUrl}/sitemap.xml` };
}
