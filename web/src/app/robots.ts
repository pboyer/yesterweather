import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Get the base URL from environment or default to localhost
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
