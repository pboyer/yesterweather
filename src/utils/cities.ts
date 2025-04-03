import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

export interface City {
  city: string;
  city_ascii: string;
  state_id: string;
  state_name: string;
  lat: string;
  lng: string;
  population: string;
  timezone: string;
  // Other fields we might need later
}

export interface Location {
  name: string;
  lat: string;
  lon: string;
}

// Fallback cities in case we can't load the CSV
const fallbackCities: Location[] = [
  { name: "Chicago, IL", lat: "41.8781", lon: "-87.6298" },
  { name: "Los Angeles, CA", lat: "34.0522", lon: "-118.2437" },
  { name: "Durham, NC", lat: "35.9940", lon: "-78.8986" },
];

/**
 * Loads city data from the SimpleMaps US Cities CSV file
 * @returns Array of City objects
 */
export function loadCities(): City[] {
  try {
    // Get the CSV file path
    const csvFilePath = path.join(
      __dirname,
      "../../data/simplemaps_uscities_basicv1.90/uscities.csv"
    );

    // Read the CSV file
    const fileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });

    // Parse the CSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    return records as City[];
  } catch (error) {
    console.error("Error loading city data:", error);
    return [];
  }
}

/**
 * Filters cities by name and state abbreviation
 * @param cities Array of City objects
 * @param filters Array of [city, state] tuples to include
 * @returns Filtered array of City objects
 */
export function filterCities(
  cities: City[],
  filters: [string, string][]
): City[] {
  return cities.filter((city) => {
    return filters.some(([cityName, stateId]) => {
      return (
        city.city_ascii.toLowerCase() === cityName.toLowerCase() &&
        city.state_id.toLowerCase() === stateId.toLowerCase()
      );
    });
  });
}

/**
 * Converts City objects to Location objects for weather API
 * @param cities Array of City objects
 * @returns Array of Location objects
 */
export function citiesToLocations(cities: City[]): Location[] {
  return cities.map((city) => ({
    name: `${city.city}, ${city.state_id}`,
    lat: city.lat,
    lon: city.lng,
  }));
}

/**
 * Gets the initial set of cities for the app (Chicago, LA, and Durham NC)
 * @returns Array of Location objects
 */
export function getInitialCities(): Location[] {
  try {
    const allCities = loadCities();

    if (allCities.length === 0) {
      console.warn("No cities loaded from CSV. Using fallback cities.");
      return fallbackCities;
    }

    // Filter for Chicago, LA, and Durham
    const filteredCities = filterCities(allCities, [
      ["Chicago", "IL"],
      ["Los Angeles", "CA"],
      ["Durham", "NC"],
    ]);

    if (filteredCities.length === 0) {
      console.warn("No matching cities found. Using fallback cities.");
      return fallbackCities;
    }

    return citiesToLocations(filteredCities);
  } catch (error) {
    console.error("Error in getInitialCities:", error);
    return fallbackCities;
  }
}
