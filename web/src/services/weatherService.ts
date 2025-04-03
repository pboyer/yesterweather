import { supabase } from "@/lib/supabase";
import { CityData, CityWeatherData, WeatherData } from "@/types";
import { processWeatherData } from "@/lib/weatherUtils";

/**
 * Get all available cities from the cities table
 */
export async function getCities(): Promise<CityData[]> {
  try {
    // Call the stored procedure for getting active cities
    const { data, error } = await supabase.rpc("get_active_cities");

    if (error) {
      console.error("Error fetching cities:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching cities:", error);
    return [];
  }
}

/**
 * Get city information by slug
 */
export async function getCityBySlug(slug: string): Promise<CityData | null> {
  try {
    // Call the stored procedure for getting city by slug
    const { data, error } = await supabase.rpc("get_city_by_slug", {
      city_slug: slug,
    });

    if (error) {
      console.error(`Error fetching city with slug ${slug}:`, error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error(`No city found with slug ${slug}`);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error(`Unexpected error fetching city with slug ${slug}:`, error);
    return null;
  }
}

/**
 * Get all city locations for which we have weather data
 * @deprecated Use getCities() instead
 */
export async function getCityList(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("weather_data")
      .select("location_name")
      .order("location_name");

    if (error) {
      console.error("Error fetching city list:", error);
      return [];
    }

    // Remove duplicates and extract just the city names
    const cityNames = [...new Set(data.map((item) => item.location_name))];
    return cityNames;
  } catch (error) {
    console.error("Unexpected error fetching city list:", error);
    return [];
  }
}

/**
 * Get the latest weather data for a specific city
 */
export async function getCityWeather(
  cityName: string
): Promise<CityWeatherData | null> {
  try {
    // Get the most recent weather data for this city
    const { data, error } = await supabase
      .from("weather_data")
      .select("*")
      .eq("location_name", cityName)
      .order("collected_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(`Error fetching weather data for ${cityName}:`, error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error(`No weather data found for ${cityName}`);
      return null;
    }

    // Process and return the weather data
    return processWeatherData(data[0] as WeatherData);
  } catch (error) {
    console.error(`Unexpected error fetching weather for ${cityName}:`, error);
    return null;
  }
}

/**
 * Get weather data for a city by slug
 */
export async function getCityWeatherBySlug(
  slug: string
): Promise<CityWeatherData | null> {
  try {
    // First get the city details by slug
    const city = await getCityBySlug(slug);
    if (!city) return null;

    // Then get weather using the display name
    return getCityWeather(city.display_name);
  } catch (error) {
    console.error(`Unexpected error fetching weather for slug ${slug}:`, error);
    return null;
  }
}

/**
 * Get all cities with their latest weather data
 */
export async function getAllCitiesWeather(): Promise<CityWeatherData[]> {
  try {
    // Get all active cities first
    const cities = await getCities();

    // Then get the weather data for each city
    const promises = cities.map((city) => getCityWeather(city.display_name));
    const results = await Promise.all(promises);

    // Filter out any nulls (cities for which we couldn't get data)
    return results.filter(
      (result): result is CityWeatherData => result !== null
    );
  } catch (error) {
    console.error("Unexpected error fetching all cities weather:", error);
    return [];
  }
}
