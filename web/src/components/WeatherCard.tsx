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
  // Get the most recent data point
  const latestData =
    weatherData.dailyData.length > 0
      ? weatherData.dailyData[weatherData.dailyData.length - 1]
      : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <Link href={`/city/${weatherData.slug}`} className="block">
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {weatherData.city}, {weatherData.state}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Station: {weatherData.stationName}
          </p>

          {latestData ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatShortDate(latestData.date)}
                </span>

                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatTemperature(latestData.temperature)}
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Precip: {formatPrecipitation(latestData.precipitation)}
                  </div>
                </div>
              </div>

              {latestData.snow !== null && latestData.snow > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Snow:</span> {latestData.snow}{" "}
                  in
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No recent data available
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Last updated: {weatherData.lastUpdated}
          </div>
        </div>
      </Link>
    </div>
  );
}
