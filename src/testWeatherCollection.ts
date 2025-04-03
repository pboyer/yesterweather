import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import { getInitialCities, Location } from "./utils/cities";
import fs from "fs";
import path from "path";

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

// For historical data, we need to use NOAA's Climate Data Online (CDO) API
const noaaToken = process.env.NOAA_CDO_TOKEN;
if (!noaaToken) {
  console.error(
    "Error: Missing required environment variable NOAA_CDO_TOKEN. Please get an API token from https://www.ncdc.noaa.gov/cdo-web/token"
  );
  process.exit(1);
}

// Get yesterday's date and format it as YYYY-MM-DD
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
};

// Get a date 7 days ago and format it as YYYY-MM-DD
const getWeekAgoDate = () => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return weekAgo.toISOString().split("T")[0];
};

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
          // Changed the extent format to match NOAA CDO API requirements
          // latitude,longitude specifying a point
          latitude: location.lat,
          longitude: location.lon,
          radius: 25, // 25-mile radius
        },
      }
    );

    // Add more detailed debugging
    console.log(`Station API response status: ${stationResponse.status}`);
    if (!stationResponse.data || !stationResponse.data.results) {
      console.log(
        "Station API response data:",
        JSON.stringify(stationResponse.data, null, 2)
      );
    }

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

    console.log(`Requesting data from ${startDate} to ${endDate}`);

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

    console.log(`Successfully fetched historical data for ${location.name}`);

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

    console.error("Error config:", {
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params,
      headers: error.config?.headers,
    });

    return null;
  }
}

async function mockStoreWeatherData(weatherData: WeatherData): Promise<void> {
  try {
    console.log(
      `[TEST MODE] Would store historical weather data for ${weatherData.location_name}`
    );

    // Print a summary of the data
    const results = weatherData.historical_data.results || [];
    if (results.length > 0) {
      console.log(`Data points: ${results.length}`);
      console.log(
        `Date range: ${weatherData.date_range.start} to ${weatherData.date_range.end}`
      );

      // Group data by date
      const dataByDate = results.reduce((acc: any, item: any) => {
        if (!acc[item.date]) {
          acc[item.date] = [];
        }
        acc[item.date].push(item);
        return acc;
      }, {});

      // Print summary of dates
      console.log(`Days with data: ${Object.keys(dataByDate).length}`);
    } else {
      console.log(`No data points found for the requested period`);
    }

    // Optionally save to a local JSON file for inspection
    const outputDir = path.join(__dirname, "../test_output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = path.join(
      outputDir,
      `${weatherData.location_name.replace(/,?\s+/g, "_")}_historical_${
        weatherData.date_range.start
      }_to_${weatherData.date_range.end}.json`
    );

    fs.writeFileSync(filename, JSON.stringify(weatherData, null, 2));

    console.log(`Saved test data to ${filename}`);
  } catch (error: any) {
    console.error(
      `Error in mock store for ${weatherData.location_name}:`,
      error.message
    );
  }
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

async function testCollectWeatherData(): Promise<void> {
  console.log("Starting TEST historical weather data collection...");
  console.log("NOTE: This will NOT update Supabase");

  // First, validate the API token
  const isTokenValid = await testApiToken();
  if (!isTokenValid) {
    console.error("Aborting test due to invalid API token");
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

  const storePromises = weatherResults.map(mockStoreWeatherData);
  await Promise.all(storePromises);

  console.log("TEST historical weather data collection completed");
}

// Run the test
testCollectWeatherData().catch((err) => {
  console.error("Error during test execution:", err);
  process.exit(1);
});
