-- Weather data database setup for Yesterday's Weather application
-- Run this SQL in the Supabase SQL Editor to set up your database schema

-- Create the weather_data table
CREATE TABLE IF NOT EXISTS weather_data (
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

-- Create an index for efficient querying by collection date
CREATE INDEX IF NOT EXISTS weather_data_collected_at_idx 
ON weather_data (collected_at);

-- Create an index for location-based queries
CREATE INDEX IF NOT EXISTS weather_data_location_idx 
ON weather_data (location_name);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS weather_data_date_range_idx 
ON weather_data USING GIN (date_range);

-- Add a unique constraint to prevent duplicate entries for the same location at the same time
CREATE UNIQUE INDEX IF NOT EXISTS weather_data_location_daterange_idx 
ON weather_data (location_name, (date_range->>'start'), (date_range->>'end'));

-- Enable row-level security (RLS)
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;

-- Create policies for row-level security
-- Allow anyone to read weather data (it's public information)
CREATE POLICY "Weather data is publicly readable"
ON weather_data FOR SELECT
USING (true);

-- Only allow authenticated users with service role to insert/update/delete
CREATE POLICY "Only service role can modify weather data"
ON weather_data FOR ALL
USING (auth.role() = 'service_role');

-- Grant appropriate permissions
GRANT SELECT ON weather_data TO anon, authenticated;
GRANT ALL ON weather_data TO service_role;

-- Commit the changes
COMMIT; 