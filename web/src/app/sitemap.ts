import { MetadataRoute } from "next";
import { getCityList } from "@/services/weatherService";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get the base URL from environment or default to localhost
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Get all city names
  const cityNames = await getCityList();

  // Generate city page URLs
  const cityUrls = cityNames.map((cityName) => {
    const slug = encodeURIComponent(
      cityName.toLowerCase().replace(/\s+/g, "-")
    );
    return {
      url: `${baseUrl}/city/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    };
  });

  // Add static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ];

  // Combine all URLs
  return [...staticPages, ...cityUrls];
}
