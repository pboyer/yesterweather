import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";

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

/**
 * Set up the database schema for the weather application
 */
async function setupDatabase() {
  console.log("Setting up database tables...");

  try {
    // Check if the table already exists
    const { error: checkError } = await supabase
      .from("weather_data")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "42P01") {
      console.log("Weather data table does not exist yet. Creating it...");

      // Create the weather_data table through REST API or Supabase dashboard
      console.log(
        "Please create the weather_data table using the Supabase dashboard or SQL editor with the following SQL:"
      );
      console.log(`
        CREATE TABLE weather_data (
          id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          location_name TEXT NOT NULL,
          latitude TEXT NOT NULL,
          longitude TEXT NOT NULL,
          historical_data JSONB NOT NULL,
          collected_at TIMESTAMP WITH TIME ZONE NOT NULL,
          date_range JSONB NOT NULL,
          station_id TEXT,
          station_name TEXT
        );

        -- Create indexes
        CREATE INDEX weather_data_collected_at_idx ON weather_data (collected_at);
        CREATE INDEX weather_data_location_idx ON weather_data (location_name);
        CREATE INDEX weather_data_date_range_idx ON weather_data USING GIN (date_range);
        CREATE UNIQUE INDEX weather_data_location_daterange_idx 
        ON weather_data (location_name, (date_range->>'start'), (date_range->>'end'));
      `);

      // Prompt for confirmation
      console.log(
        "\nHave you created the table in the Supabase dashboard? (yes/no)"
      );
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question("> ", resolve);
      });

      readline.close();

      if (answer.toLowerCase() !== "yes") {
        console.log(
          "Setup aborted. Please run this script again after creating the table."
        );
        process.exit(0);
      }

      // Verify table creation again
      const { error: verifyError } = await supabase
        .from("weather_data")
        .select("id")
        .limit(1);

      if (verifyError) {
        console.error(
          "Error: Table still does not exist or has wrong schema:",
          verifyError.message
        );
        process.exit(1);
      }

      console.log("✅ Table verified and ready to use!");
    } else {
      console.log("✅ Weather data table already exists");
    }

    // Display schema information
    console.log("\nTable schema:");
    console.log('- location_name: City name and state (e.g., "Chicago, IL")');
    console.log("- latitude/longitude: Geographic coordinates");
    console.log(
      "- historical_data: JSONB field containing weather measurements"
    );
    console.log("- collected_at: Timestamp when data was collected");
    console.log("- date_range: JSONB field with start and end dates");
    console.log("- station_id/station_name: Weather station information");

    console.log(
      "\nThe database is now set up and ready for use with the weather collection service."
    );
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
}

// Execute the setup
setupDatabase().catch((err) => {
  console.error("Unhandled error during setup:", err);
  process.exit(1);
});
