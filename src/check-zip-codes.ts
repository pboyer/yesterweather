import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

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

async function checkZipCodes() {
  console.log("Checking city zip codes in database...");

  // Get a sample of cities
  const { data: cities, error } = await supabase
    .from("cities")
    .select("name, state_code, zip_codes")
    .order("name", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error fetching cities:", error);
    return;
  }

  if (!cities || cities.length === 0) {
    console.log("No cities found in database.");
    return;
  }

  console.log(`Found ${cities.length} cities:`);
  console.log("-----------------------------");

  cities.forEach((city) => {
    console.log(
      `${city.name}, ${city.state_code}: ${city.zip_codes || "No zip codes"}`
    );
  });

  // Count cities with zip codes
  const { count, error: countError } = await supabase
    .from("cities")
    .select("*", { count: "exact", head: true })
    .not("zip_codes", "is", null);

  if (countError) {
    console.error("Error counting cities with zip codes:", countError);
    return;
  }

  const { count: totalCount, error: totalCountError } = await supabase
    .from("cities")
    .select("*", { count: "exact", head: true });

  if (totalCountError) {
    console.error("Error counting total cities:", totalCountError);
    return;
  }

  console.log("-----------------------------");
  console.log(`${count} out of ${totalCount} cities have zip codes.`);
}

checkZipCodes()
  .then(() => {
    console.log("Check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during check:", error);
    process.exit(1);
  });
