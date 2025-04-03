"use client";

import { CityWeatherData } from "@/types";
import { formatShortDate } from "@/lib/weatherUtils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface WeatherChartProps {
  weatherData: CityWeatherData;
}

export default function WeatherChart({ weatherData }: WeatherChartProps) {
  const labels = weatherData.dailyData.map((day) => formatShortDate(day.date));
  const temperatureData = weatherData.dailyData.map((day) => day.temperature);
  const precipitationData = weatherData.dailyData.map(
    (day) => day.precipitation
  );

  const temperatureChartData = {
    labels,
    datasets: [
      {
        label: "Temperature (°F)",
        data: temperatureData,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        tension: 0.3,
      },
    ],
  };

  const precipChartData = {
    labels,
    datasets: [
      {
        label: "Precipitation (in)",
        data: precipitationData,
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">Temperature History</h3>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <Line
            data={temperatureChartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: "top" as const,
                },
                title: {
                  display: false,
                },
              },
              scales: {
                y: {
                  title: {
                    display: true,
                    text: "Temperature (°F)",
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Precipitation History</h3>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <Bar
            data={precipChartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: "top" as const,
                },
                title: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: "Precipitation (in)",
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
