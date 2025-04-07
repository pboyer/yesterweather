import Link from "next/link";
import { CityWeatherData } from "@/types";
import {
  formatShortDate,
  formatTemperature,
  formatPrecipitation,
} from "@/lib/weatherUtils";

interface WeatherCardProps {
  weatherData: CityWeatherData;
}

export default function WeatherCard({ weatherData }: WeatherCardProps) {
  const latestData = weatherData.dailyData[0];

  return (
    <Link
      href={`/city/${weatherData.slug}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold">
              {weatherData.city}, {weatherData.state}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {formatShortDate(latestData.date)}
            </p>
          </div>
          <div className="text-2xl font-bold">
            {formatTemperature(latestData.temperature)}
          </div>
        </div>

        <div className="space-y-2">
          {latestData.precipitation !== null &&
            latestData.precipitation > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Precipitation
                </span>
                <span>{formatPrecipitation(latestData.precipitation)}</span>
              </div>
            )}
          {latestData.snow !== null && latestData.snow > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Snow</span>
              <span>{latestData.snow} in</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
