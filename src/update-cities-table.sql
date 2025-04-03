-- Add population column to cities table
ALTER TABLE cities ADD COLUMN IF NOT EXISTS population INTEGER DEFAULT 0;

-- Create an index on population for efficient filtering
CREATE INDEX IF NOT EXISTS cities_population_idx ON cities (population);

-- Update the insert statement in future scripts to include population
-- Example:
-- INSERT INTO cities (name, state, state_code, display_name, slug, latitude, longitude, timezone, population)
-- VALUES ('City Name', 'State', 'ST', 'City Name, ST', 'city-name-st', 12.3456, -12.3456, 'America/Timezone', 100000);

-- Commit the transaction
COMMIT; 