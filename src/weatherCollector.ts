import dotenv from "dotenv";
dotenv.config();
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import cron from "node-cron";
import axios from "axios";
import { getInitialCities, Location } from "./utils/cities";

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

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Get locations from the cities utility (Chicago, LA, and Durham NC)
const locations: Location[] = getInitialCities();

// Log which cities we're collecting data for
console.log(
  `Will collect historical weather data for ${locations.length} cities:`,
  locations.map((l) => l.name).join(", ")
);

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

async function fetchHistoricalWeatherData(
  location: Location
): Promise<WeatherData | null> {
  try {
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
          // Changed from 'extent' to latitude/longitude
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
    console.error(`Error fetching historical weather for ${location.name}:`);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error message:", error.message);
    }

    return null;
  }
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

async function collectWeatherData(): Promise<void> {
  console.log("Starting historical weather data collection...");

  // First, validate the API token
  const isTokenValid = await testApiToken();
  if (!isTokenValid) {
    console.error("Aborting collection due to invalid API token");
    return;
  }

  // Process locations sequentially with delays to avoid rate limits
  const weatherResults = [];
  for (const location of locations) {
    console.log(`Processing ${location.name}...`);

    // Add a 2-second delay between API calls
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const data = await fetchHistoricalWeatherData(location);
    if (data) {
      weatherResults.push(data);
    }
  }

  // Store all the results
  for (const weatherData of weatherResults) {
    // Add a small delay between database operations
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await storeWeatherData(weatherData);
  }

  console.log("Historical weather data collection completed");
}

// Schedule the job to run daily at midnight
cron.schedule("0 0 * * *", () => {
  console.log(
    `[${new Date().toISOString()}] Running scheduled historical weather collection...`
  );
  collectWeatherData().catch((err) => {
    console.error("Error during scheduled execution:", err);
  });
});

// Also run immediately when the script starts, after a short delay
console.log("Starting weather collection service...");
setTimeout(() => {
  collectWeatherData().catch((err) => {
    console.error("Error during initial execution:", err);
  });
}, 1000); // Delay slightly to ensure env vars are loaded
