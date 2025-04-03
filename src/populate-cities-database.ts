import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

// Load environment variables
dotenv.config();

// Initialize Supabase client with admin privileges
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Error: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface CityRecord {
  city: string;
  city_ascii: string;
  state_id: string;
  state_name: string;
  county_fips: string;
  county_name: string;
  lat: string;
  lng: string;
  population: string;
  density: string;
  source: string;
  military: string;
  incorporated: string;
  timezone: string;
  ranking: string;
  zips: string;
  id: string;
}

interface CityInsert {
  name: string;
  state: string;
  state_code: string;
  display_name: string;
  slug: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number;
  zip_codes?: string;
}

/**
 * Create a slug from a city name and state
 */
function createSlug(cityName: string, stateCode: string): string {
  return `${cityName.toLowerCase()}-${stateCode.toLowerCase()}`
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Load city data from CSV file
 */
function loadCitiesFromCSV(): CityRecord[] {
  try {
    // Get the CSV file path
    const csvFilePath = path.join(
      __dirname,
      "../data/simplemaps_uscities_basicv1.90/uscities.csv"
    );

    // Read the CSV file
    const fileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });

    // Parse the CSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    return records as CityRecord[];
  } catch (error) {
    console.error("Error loading city data:", error);
    return [];
  }
}

/**
 * Transform CSV city records to database format
 */
function transformCityRecords(records: CityRecord[]): CityInsert[] {
  return records.map((record) => {
    // Create a proper display name
    const displayName = `${record.city}, ${record.state_id}`;

    // Create a slug
    const slug = createSlug(record.city, record.state_id);

    // Get zip codes (limited to 10 for display purposes)
    const zipCodes = record.zips
      ? record.zips.split(/\s+/).slice(0, 10).join(",")
      : "";

    return {
      name: record.city,
      state: record.state_name,
      state_code: record.state_id,
      display_name: displayName,
      slug: slug,
      latitude: parseFloat(record.lat),
      longitude: parseFloat(record.lng),
      timezone: record.timezone,
      population: parseInt(record.population, 10) || 0,
      zip_codes: zipCodes,
    };
  });
}

/**
 * Insert cities into the database
 */
async function insertCities(cities: CityInsert[]): Promise<void> {
  const BATCH_SIZE = 100; // Process in batches to avoid timeouts

  console.log(`Inserting ${cities.length} cities into database...`);

  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const batch = cities.slice(i, i + BATCH_SIZE);

    console.log(
      `Processing batch ${i / BATCH_SIZE + 1} (${batch.length} cities)...`
    );

    const { error } = await supabase.from("cities").upsert(batch, {
      onConflict: "name,state_code",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
    } else {
      console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1}`);
    }

    // Add a small delay between batches
    if (i + BATCH_SIZE < cities.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Filter cities by population
 */
function filterCitiesByPopulation(
  cities: CityRecord[],
  minPopulation: number
): CityRecord[] {
  return cities.filter((city) => {
    const population = parseInt(city.population, 10) || 0;
    return population >= minPopulation;
  });
}

/**
 * Main function
 */
async function populateCitiesDatabase() {
  console.log("Starting city database population...");

  // Load all cities from CSV
  const allCities = loadCitiesFromCSV();

  if (allCities.length === 0) {
    console.error("No cities found in CSV file. Aborting.");
    process.exit(1);
  }

  console.log(`Loaded ${allCities.length} cities from CSV file.`);

  // Filter out small cities to keep the database manageable
  // Only include cities with population over 50,000
  const filteredCities = filterCitiesByPopulation(allCities, 50000);

  console.log(
    `Filtered to ${filteredCities.length} cities with population over 50,000.`
  );

  // Transform records to database format
  const citiesToInsert = transformCityRecords(filteredCities);

  // Insert into database
  await insertCities(citiesToInsert);

  console.log("City database population complete!");
}

// Run the main function
populateCitiesDatabase().catch((error) => {
  console.error("Error populating database:", error);
  process.exit(1);
});
