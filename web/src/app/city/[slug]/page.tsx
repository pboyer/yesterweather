import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCities,
  getCityBySlug,
  getCityWeatherBySlug,
} from "@/services/weatherService";
import WeatherDetail from "@/components/WeatherDetail";

export const revalidate = 21600; // Revalidate every 6 hours

// Simple params type for internal use
type Params = {
  slug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const city = await getCityBySlug(params.slug);

  if (!city) {
    return {
      title: "City Not Found",
    };
  }

  return {
    title: `${city.display_name} Weather History - Yesterday's Weather`,
    description: `View historical weather data for ${city.display_name} including temperature, precipitation, and snow measurements.`,
  };
}

export async function generateStaticParams() {
  const cities = await getCities();
  return cities.map((city) => ({
    slug: city.slug,
  }));
}

// For Next.js 15, use a more explicit approach
interface PageParams {
  params: {
    slug: string;
  };
}

export default async function CityPage(props: PageParams) {
  const { slug } = props.params;
  const cityWeather = await getCityWeatherBySlug(slug);

  if (!cityWeather) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">
        {cityWeather.city}, {cityWeather.state} Weather History
      </h1>

      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Historical weather data from {cityWeather.stationName}
      </p>

      <WeatherDetail weatherData={cityWeather} />
    </div>
  );
}
