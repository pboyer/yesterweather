import { format, parseISO } from "date-fns";
import {
  CityWeatherData,
  ProcessedWeatherData,
  WeatherData,
  WeatherResult,
} from "@/types";

/**
 * Convert raw weather data from Supabase into a more usable format
 */
export function processWeatherData(data: WeatherData): CityWeatherData {
  // Extract city and state from location_name (format: "City, STATE")
  const [city, state] = data.location_name
    .split(",")
    .map((part) => part.trim());

  // Get state code from the state name (e.g., "Illinois" -> "IL")
  const stateCode = state || "";

  // Create a slug from the city name and state code (to match the database format)
  const slug = `${city.toLowerCase()}-${stateCode.toLowerCase()}`.replace(
    /\s+/g,
    "-"
  );

  // Group results by date
  const resultsByDate: Record<string, WeatherResult[]> = {};

  data.historical_data.results.forEach((result) => {
    // Extract just the date part (YYYY-MM-DD)
    const datePart = result.date.split("T")[0];

    if (!resultsByDate[datePart]) {
      resultsByDate[datePart] = [];
    }

    resultsByDate[datePart].push(result);
  });

  // Process data for each day
  const dailyData: ProcessedWeatherData[] = Object.keys(resultsByDate)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map((date) => {
      const dayResults = resultsByDate[date];

      // Find specific weather metrics
      const maxTemp =
        dayResults.find((r) => r.datatype === "TMAX")?.value || null;
      const precip =
        dayResults.find((r) => r.datatype === "PRCP")?.value || null;
      const snow = dayResults.find((r) => r.datatype === "SNOW")?.value || null;
      const snowDepth =
        dayResults.find((r) => r.datatype === "SNWD")?.value || null;

      return {
        date,
        temperature: maxTemp,
        precipitation: precip,
        snow,
        snowDepth,
      };
    });

  return {
    city,
    state,
    fullName: data.location_name,
    slug,
    dailyData,
    dateRange: data.date_range,
    stationName: data.station_name,
    lastUpdated: format(parseISO(data.collected_at), "MMMM d, yyyy"),
  };
}

/**
 * Format temperature for display
 */
export function formatTemperature(temp: number | null): string {
  if (temp === null) return "N/A";
  return `${temp}°F`;
}

/**
 * Format precipitation for display
 */
export function formatPrecipitation(precip: number | null): string {
  if (precip === null) return "N/A";
  return `${precip} in`;
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "EEEE, MMMM d, yyyy");
}

/**
 * Format a short date for display
 */
export function formatShortDate(dateString: string): string {
  return format(parseISO(dateString), "MMM d");
}
