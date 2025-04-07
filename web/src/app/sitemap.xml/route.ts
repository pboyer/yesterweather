import { getCities } from "@/services/weatherService";
import { CityData } from "@/types";

// Define the sitemap entry type
interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency: string;
  priority: number;
}

export async function GET(): Promise<Response> {
  try {
    // Verify if Supabase URL is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Generate the base sitemap with static routes
    const baseEntries: SitemapEntry[] = [
      {
        url: "https://yesterweather.vercel.app",
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: "https://yesterweather.vercel.app/about",
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
      },
    ];

    // If Supabase is configured, add city routes
    let cityEntries: SitemapEntry[] = [];

    if (supabaseUrl) {
      try {
        const cities = await getCities();
        cityEntries = cities.map((city: CityData) => ({
          url: `https://yesterweather.vercel.app/city/${city.slug}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.9,
        }));
      } catch (error) {
        console.error("Error fetching cities for sitemap:", error);
        // Continue with just the base entries if city fetch fails
      }
    }

    // Combine all entries
    const entries: SitemapEntry[] = [...baseEntries, ...cityEntries];

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    // Return the XML with proper content type
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);

    // Return a basic sitemap as fallback
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yesterweather.vercel.app</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
}
