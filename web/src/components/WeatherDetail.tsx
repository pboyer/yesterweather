import { CityWeatherData } from "@/types";
import WeatherChart from "@/components/WeatherChart";
import {
  formatDate,
  formatTemperature,
  formatPrecipitation,
} from "@/lib/weatherUtils";

interface WeatherDetailProps {
  weatherData: CityWeatherData;
}

export default function WeatherDetail({ weatherData }: WeatherDetailProps) {
  // Sort dailyData in reverse chronological order
  const sortedDailyData = [...weatherData.dailyData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Daily Weather</h3>
            <div className="space-y-4">
              {sortedDailyData.map((day) => (
                <div
                  key={day.date}
                  className="border-b border-gray-200 dark:border-gray-700 pb-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{formatDate(day.date)}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {day.precipitation !== null &&
                          day.precipitation > 0 && (
                            <span className="block">
                              Precipitation:{" "}
                              {formatPrecipitation(day.precipitation)}
                            </span>
                          )}
                        {day.snow !== null && day.snow > 0 && (
                          <span className="block">Snow: {day.snow} in</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xl font-bold">
                      {formatTemperature(day.temperature)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">
              About {weatherData.city}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {weatherData.city} is located in {weatherData.state}.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Data shows weather patterns from{" "}
              {formatDate(weatherData.dateRange.start)} to{" "}
              {formatDate(weatherData.dateRange.end)}, including daily
              temperature, precipitation, and snow measurements.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-6">
              Last updated: {weatherData.lastUpdated}
            </div>
          </div>
        </div>
      </div>

      <WeatherChart weatherData={weatherData} />
    </div>
  );
}
