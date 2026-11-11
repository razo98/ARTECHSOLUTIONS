// Adresse publique du site (ex. https://artech-solutions.com), utilisée pour le référencement : sitemap, aperçus de partage, fiche Google.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
