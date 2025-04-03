-- Cities data setup for Yesterday's Weather application
-- Run this SQL in the Supabase SQL Editor to set up your cities reference table

-- Create the cities table
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  state_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  timezone TEXT NOT NULL,
  population INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_idx ON cities (slug);
CREATE UNIQUE INDEX IF NOT EXISTS cities_name_state_code_idx ON cities (name, state_code);
CREATE INDEX IF NOT EXISTS cities_population_idx ON cities (population);

-- Insert initial city data
INSERT INTO cities (name, state, state_code, display_name, slug, latitude, longitude, timezone, population)
VALUES 
  ('Chicago', 'Illinois', 'IL', 'Chicago, IL', 'chicago-il', 41.8781, -87.6298, 'America/Chicago', 2746388),
  ('Los Angeles', 'California', 'CA', 'Los Angeles, CA', 'los-angeles-ca', 34.0522, -118.2437, 'America/Los_Angeles', 3898747),
  ('Durham', 'North Carolina', 'NC', 'Durham, NC', 'durham-nc', 35.9940, -78.8986, 'America/New_York', 278993)
ON CONFLICT (name, state_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug = EXCLUDED.slug,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  timezone = EXCLUDED.timezone,
  population = EXCLUDED.population,
  active = TRUE;

-- Enable Row Level Security
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY cities_select_policy ON cities
  FOR SELECT
  TO PUBLIC
  USING (TRUE);
  
CREATE POLICY cities_insert_update_delete_policy ON cities
  USING (auth.uid() IS NOT NULL AND auth.jwt() ->> 'role' = 'service_role');

-- Create city functions
CREATE OR REPLACE FUNCTION get_active_cities()
RETURNS SETOF cities
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM cities WHERE active = TRUE ORDER BY name ASC;
$$;

CREATE OR REPLACE FUNCTION get_city_by_slug(city_slug TEXT)
RETURNS SETOF cities
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM cities WHERE slug = city_slug;
$$;

-- Commit the transaction
COMMIT; 