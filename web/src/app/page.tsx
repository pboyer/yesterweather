import { Metadata } from "next";
import WeatherCard from "@/components/WeatherCard";
import CitySearch from "@/components/CitySearch";
import { getAllCitiesWeather, getCities } from "@/services/weatherService";

export const metadata: Metadata = {
  title: "Yesterday's Weather - Historical US Weather Data",
  description:
    "Browse historical weather data for major cities across the United States including Chicago, Los Angeles, and Durham.",
};

// Revalidate the page every 6 hours
export const revalidate = 21600;

export default async function Home() {
  // Load all cities data for search
  const cities = await getCities();
  const citiesWeather = await getAllCitiesWeather();

  return (
    <div>
      <CitySearch cities={cities} />

      {citiesWeather.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">
            No Weather Data Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Weather data is currently being collected. Please check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {citiesWeather.map((cityWeather) => (
            <WeatherCard key={cityWeather.fullName} weatherData={cityWeather} />
          ))}
        </div>
      )}
    </div>
  );
}
