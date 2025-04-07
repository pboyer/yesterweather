import dotenv from "dotenv";
dotenv.config();
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import fs from "fs";
import path from "path";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const noaaToken = process.env.NOAA_CDO_TOKEN;

if (!supabaseUrl || !supabaseKey || !noaaToken) {
  console.error(
    "Error: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NOAA_CDO_TOKEN)."
  );
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Simple logger interface for both console and file logging
interface Logger {
  log(message: string): void;
  error(message: string, error?: any): void;
  close?(): void;
}

// Default console logger
const consoleLogger: Logger = {
  log(message: string) {
    console.log(message);
  },
  error(message: string, error?: any) {
    console.error(message);
    if (error) {
      console.error(error);
    }
  },
};

// Custom concurrency control function
async function concurrentMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const inProgress = new Set<Promise<void>>();
  let index = 0;

  return new Promise((resolve, reject) => {
    // Process the next item from the input array
    const processNext = () => {
      if (index >= items.length && inProgress.size === 0) {
        resolve(results);
        return;
      }

      // Process more items if we have capacity and items left
      while (inProgress.size < concurrency && index < items.length) {
        const idx = index++;
        const item = items[idx];

        // Create a promise for this item
        const promiseFunction = async () => {
          try {
            const result = await fn(item);
            results[idx] = result;
          } catch (err) {
            reject(err);
          } finally {
            inProgress.delete(promise);
            processNext();
          }
        };

        const promise = promiseFunction();
        inProgress.add(promise);
      }
    };

    // Start processing
    processNext();
  });
}

interface City {
  id: number;
  name: string;
  state: string;
  state_code: string;
  display_name: string;
  slug: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number;
  active: boolean;
}

interface Location {
  name: string;
  lat: string;
  lon: string;
}

interface WeatherData {
  location_name: string;
  latitude: string;
  longitude: string;
  historical_data: any;
  collected_at: string;
  date_range: {
    start: string;
    end: string;
  };
  station_id: string;
  station_name: string;
}

interface ProcessResult {
  success: boolean;
  location: Location;
  data?: WeatherData;
  skipped?: boolean;
  error?: any;
}

interface BatchFetchOptions {
  limit?: number;
  skipExisting?: boolean;
  maxRetries?: number;
  concurrency?: number;
  logger?: Logger;
}

// Get yesterday's date and format it as YYYY-MM-DD
const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
};

// Get a date 7 days ago and format it as YYYY-MM-DD
const getWeekAgoDate = (): string => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return weekAgo.toISOString().split("T")[0];
};

// Convert database city to location format
function cityToLocation(city: City): Location {
  return {
    name: city.display_name,
    lat: city.latitude.toString(),
    lon: city.longitude.toString(),
  };
}

// Function to test if the API token is valid
async function testApiToken(logger: Logger): Promise<boolean> {
  try {
    logger.log("Testing NOAA CDO API token validity...");

    const response = await axios.get(
      "https://www.ncdc.noaa.gov/cdo-web/api/v2/datasets",
      {
        headers: {
          token: noaaToken,
        },
        params: {
          limit: 1,
        },
      }
    );

    if (response.status === 200) {
      logger.log("API token is valid!");
      return true;
    } else {
      logger.error(`API token test failed with status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    logger.error("API token test failed with error:", error);
    return false;
  }
}

// Fetch active cities from the database
async function fetchActiveCities(logger: Logger): Promise<City[]> {
  try {
    const { data, error } = await supabase.rpc("get_active_cities");

    if (error) {
      logger.error("Error fetching cities:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Error fetching cities:", error);
    return [];
  }
}

// Check if weather data already exists for a location and date range
async function checkExistingWeatherData(
  locationName: string,
  startDate: string,
  endDate: string,
  logger: Logger
): Promise<boolean> {
  try {
    // First try using the contains operator
    try {
      const { count, error } = await supabase
        .from("weather_data")
        .select("id", { count: "exact" })
        .eq("location_name", locationName)
        .contains("date_range", { start: startDate, end: endDate })
        .limit(1);

      if (!error) {
        return (count || 0) > 0;
      }
    } catch (innerError) {
      logger.log("Contains query failed, trying alternative method");
    }

    // Fallback: Get all records for the location and check manually
    const { data, error } = await supabase
      .from("weather_data")
      .select("date_range")
      .eq("location_name", locationName);

    if (error) {
      logger.error("Error in fallback query:", error);
      return false;
    }

    // Check each record manually
    if (data && data.length > 0) {
      return data.some(
        (record) =>
          record.date_range &&
          record.date_range.start === startDate &&
          record.date_range.end === endDate
      );
    }

    return false;
  } catch (error) {
    logger.error("Error checking existing weather data:", error);
    return false;
  }
}

async function fetchHistoricalWeatherData(
  location: Location,
  retryCount: number = 1,
  logger: Logger
): Promise<WeatherData | null> {
  let attempts = 0;
  let lastError: any = null;

  while (attempts <= retryCount) {
    try {
      if (attempts > 0) {
        logger.log(`Retry attempt ${attempts} for ${location.name}...`);
        // Add a delay between retries
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      logger.log(`Fetching historical weather data for ${location.name}...`);

      // First, we need to find a weather station near this location
      const stationResponse = await axios.get(
        `https://www.ncdc.noaa.gov/cdo-web/api/v2/stations`,
        {
          headers: {
            token: noaaToken,
          },
          params: {
            limit: 5,
            sortfield: "name",
            sortorder: "asc",
            datasetid: "GHCND", // Daily Summaries
            latitude: location.lat,
            longitude: location.lon,
            radius: 25, // 25-mile radius
          },
        }
      );

      if (
        !stationResponse.data.results ||
        stationResponse.data.results.length === 0
      ) {
        logger.error(`No weather stations found near ${location.name}`);
        return null;
      }

      const station = stationResponse.data.results[0];
      logger.log(
        `Found station near ${location.name}: ${station.name} (${station.id})`
      );

      // Define date range for historical data (default to last 7 days)
      const endDate = getYesterdayDate();
      const startDate = getWeekAgoDate();

      // Now fetch the actual weather data for this station
      const dataResponse = await axios.get(
        `https://www.ncdc.noaa.gov/cdo-web/api/v2/data`,
        {
          headers: {
            token: noaaToken,
          },
          params: {
            datasetid: "GHCND", // Daily Summaries
            stationid: station.id,
            startdate: startDate,
            enddate: endDate,
            limit: 1000,
            units: "standard",
          },
        }
      );

      return {
        location_name: location.name,
        latitude: location.lat,
        longitude: location.lon,
        historical_data: dataResponse.data,
        collected_at: new Date().toISOString(),
        date_range: {
          start: startDate,
          end: endDate,
        },
        station_id: station.id,
        station_name: station.name,
      };
    } catch (error: any) {
      lastError = error;
      logger.error(
        `Error fetching historical weather for ${location.name}:`,
        error
      );

      // Rate limit handling
      if (error.response && error.response.status === 429) {
        logger.log("Rate limit hit, waiting longer before retry...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      attempts++;

      // If we've exhausted all retry attempts, return null
      if (attempts > retryCount) {
        logger.error(
          `Failed to fetch data for ${location.name} after ${
            retryCount + 1
          } attempts.`
        );
        return null;
      }

      // Otherwise, continue the loop and retry
      logger.log(
        `Will retry in 2 seconds (attempt ${attempts} of ${retryCount})...`
      );
    }
  }

  return null;
}

async function storeWeatherData(
  weatherData: WeatherData,
  logger: Logger
): Promise<void> {
  try {
    const { error } = await supabase.from("weather_data").insert(weatherData);

    if (error) throw error;
    logger.log(
      `Successfully stored historical weather data for ${weatherData.location_name}`
    );
  } catch (error: any) {
    logger.error(
      `Error storing historical weather data for ${weatherData.location_name}:`,
      error
    );
  }
}

async function processCity(
  location: Location,
  skipExisting: boolean,
  maxRetries: number,
  startDate: string,
  endDate: string,
  logger: Logger
): Promise<ProcessResult> {
  try {
    logger.log(`Processing ${location.name}...`);

    // Check if we already have data for this location and date range
    if (skipExisting) {
      const exists = await checkExistingWeatherData(
        location.name,
        startDate,
        endDate,
        logger
      );
      if (exists) {
        logger.log(
          `Weather data already exists for ${location.name} from ${startDate} to ${endDate}. Skipping.`
        );
        return { success: true, location, skipped: true };
      }
    }

    // Fetch data with retry logic
    const data = await fetchHistoricalWeatherData(location, maxRetries, logger);

    if (data) {
      // Store data immediately after successful fetch
      await storeWeatherData(data, logger);
      return { success: true, location, data };
    } else {
      return { success: false, location, error: "Failed to fetch data" };
    }
  } catch (error) {
    logger.error(`Error processing city ${location.name}:`, error);
    return { success: false, location, error };
  }
}

export async function batchFetchWeatherData(
  options: BatchFetchOptions = {}
): Promise<void> {
  const {
    limit = 0,
    skipExisting = true,
    maxRetries = 1,
    concurrency = 3,
    logger = consoleLogger,
  } = options;

  logger.log("Starting batch weather data fetching...");
  logger.log(`Concurrency level: ${concurrency}`);

  // First, validate the API token
  const isTokenValid = await testApiToken(logger);
  if (!isTokenValid) {
    logger.error("Aborting fetching due to invalid API token");
    return;
  }

  // Fetch active cities from the database
  const cities = await fetchActiveCities(logger);

  if (cities.length === 0) {
    logger.error("No active cities found in the database. Aborting.");
    return;
  }

  logger.log(`Found ${cities.length} active cities in the database.`);

  // Apply limit if specified (for testing with fewer cities)
  const citiesToProcess =
    limit > 0 && limit < cities.length ? cities.slice(0, limit) : cities;

  logger.log(`Will process ${citiesToProcess.length} cities.`);

  // Convert cities to locations
  const locations = citiesToProcess.map(cityToLocation);

  // Date range for all cities
  const endDate = getYesterdayDate();
  const startDate = getWeekAgoDate();

  // Process cities in parallel with controlled concurrency using our custom function
  logger.log(`Processing cities with concurrency level of ${concurrency}...`);

  const processCityFn = (location: Location) =>
    processCity(location, skipExisting, maxRetries, startDate, endDate, logger);

  const results = await concurrentMap(locations, processCityFn, concurrency);

  // Calculate statistics
  const successCount = results.filter(
    (r: ProcessResult) => r.success && !r.skipped
  ).length;
  const skipCount = results.filter((r: ProcessResult) => r.skipped).length;
  const failCount = results.filter((r: ProcessResult) => !r.success).length;

  logger.log(`Weather data fetching completed:`);
  logger.log(`- Successfully processed: ${successCount} cities`);
  logger.log(`- Skipped (already exists): ${skipCount} cities`);
  logger.log(`- Failed to process: ${failCount} cities`);

  // List cities that failed
  if (failCount > 0) {
    logger.log("\nFailed cities:");
    results
      .filter((r: ProcessResult) => !r.success)
      .forEach((result: ProcessResult) => {
        logger.log(`- ${result.location.name}`);
      });
  }
}

// When run directly as a script
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;
  const forceArg = args.find((arg) => arg === "--force");
  const skipExisting = !forceArg;
  const retryArg = args.find((arg) => arg.startsWith("--retries="));
  const maxRetries = retryArg ? parseInt(retryArg.split("=")[1], 10) : 1;
  const concurrencyArg = args.find((arg) => arg.startsWith("--concurrency="));
  const concurrency = concurrencyArg
    ? parseInt(concurrencyArg.split("=")[1], 10)
    : 3;

  // Run the fetching function with command line options
  batchFetchWeatherData({
    limit,
    skipExisting,
    maxRetries,
    concurrency,
  }).catch((err) => {
    console.error("Error during batch weather data fetching:", err);
    process.exit(1);
  });
}
