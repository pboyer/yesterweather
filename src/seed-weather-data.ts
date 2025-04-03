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
async function testApiToken(): Promise<boolean> {
  try {
    console.log("Testing NOAA CDO API token validity...");

    // Make a simple request to the datasets endpoint
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
      console.log("API token is valid!");
      return true;
    } else {
      console.error(`API token test failed with status: ${response.status}`);
      return false;
    }
  } catch (error: any) {
    console.error("API token test failed with error:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Fetch active cities from the database
async function fetchActiveCities(): Promise<City[]> {
  try {
    const { data, error } = await supabase.rpc("get_active_cities");

    if (error) {
      console.error("Error fetching cities:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching cities:", error);
    return [];
  }
}

async function fetchHistoricalWeatherData(
  location: Location,
  retryCount: number = 1
): Promise<WeatherData | null> {
  let attempts = 0;
  let lastError: any = null;

  while (attempts <= retryCount) {
    try {
      if (attempts > 0) {
        console.log(`Retry attempt ${attempts} for ${location.name}...`);
        // Add a longer delay between retries
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      console.log(`Fetching historical weather data for ${location.name}...`);

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
        console.error(`No weather stations found near ${location.name}`);
        return null;
      }

      const station = stationResponse.data.results[0];
      console.log(
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
      console.error(`Error fetching historical weather for ${location.name}:`);

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(`Status: ${error.response.status}`);
        console.error(`Status Text: ${error.response.statusText}`);

        // Rate limit handling
        if (error.response.status === 429) {
          console.log("Rate limit hit, waiting longer before retry...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", error.message);
      }

      attempts++;

      // If we've exhausted all retry attempts, return null
      if (attempts > retryCount) {
        console.error(
          `Failed to fetch data for ${location.name} after ${
            retryCount + 1
          } attempts.`
        );
        return null;
      }

      // Otherwise, continue the loop and retry
      console.log(
        `Will retry in 3 seconds (attempt ${attempts} of ${retryCount})...`
      );
    }
  }

  return null;
}

async function storeWeatherData(weatherData: WeatherData): Promise<void> {
  try {
    const { error } = await supabase.from("weather_data").insert(weatherData);

    if (error) throw error;
    console.log(
      `Successfully stored historical weather data for ${weatherData.location_name}`
    );
  } catch (error: any) {
    console.error(
      `Error storing historical weather data for ${weatherData.location_name}:`,
      error.message
    );
  }
}

// Check if weather data already exists for a location and date range
async function checkExistingWeatherData(
  locationName: string,
  startDate: string,
  endDate: string
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
      console.log("Contains query failed, trying alternative method");
    }

    // Fallback: Get all records for the location and check manually
    const { data, error } = await supabase
      .from("weather_data")
      .select("date_range")
      .eq("location_name", locationName);

    if (error) {
      console.error("Error in fallback query:", error);
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
    console.error("Error checking existing weather data:", error);
    return false;
  }
}

async function seedWeatherData(
  limit: number = 0,
  skipExisting: boolean = true,
  maxRetries: number = 1
): Promise<void> {
  console.log("Starting weather data seeding...");

  // First, validate the API token
  const isTokenValid = await testApiToken();
  if (!isTokenValid) {
    console.error("Aborting seeding due to invalid API token");
    return;
  }

  // Fetch active cities from the database
  const cities = await fetchActiveCities();

  if (cities.length === 0) {
    console.error("No active cities found in the database. Aborting.");
    return;
  }

  console.log(`Found ${cities.length} active cities in the database.`);

  // Apply limit if specified (for testing with fewer cities)
  const citiesToProcess =
    limit > 0 && limit < cities.length ? cities.slice(0, limit) : cities;

  console.log(`Will process ${citiesToProcess.length} cities.`);

  // Convert cities to locations
  const locations = citiesToProcess.map(cityToLocation);

  // Process locations sequentially with delays to avoid rate limits
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const endDate = getYesterdayDate();
  const startDate = getWeekAgoDate();

  for (const location of locations) {
    console.log(`Processing ${location.name}...`);

    // Check if we already have data for this location and date range
    if (skipExisting) {
      const exists = await checkExistingWeatherData(
        location.name,
        startDate,
        endDate
      );
      if (exists) {
        console.log(
          `Weather data already exists for ${location.name} from ${startDate} to ${endDate}. Skipping.`
        );
        skipCount++;
        continue;
      }
    }

    // Add a 2-second delay between API calls to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Fetch data with retry logic
    const data = await fetchHistoricalWeatherData(location, maxRetries);

    if (data) {
      // Store data immediately after successful fetch
      await storeWeatherData(data);
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`Weather data seeding completed:`);
  console.log(`- Successfully processed: ${successCount} cities`);
  console.log(`- Skipped (already exists): ${skipCount} cities`);
  console.log(`- Failed to process: ${failCount} cities`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;
const forceArg = args.find((arg) => arg === "--force");
const skipExisting = !forceArg;
const retryArg = args.find((arg) => arg.startsWith("--retries="));
const maxRetries = retryArg ? parseInt(retryArg.split("=")[1], 10) : 1;

// Run the seeding function
seedWeatherData(limit, skipExisting, maxRetries).catch((err) => {
  console.error("Error during weather data seeding:", err);
  process.exit(1);
});
