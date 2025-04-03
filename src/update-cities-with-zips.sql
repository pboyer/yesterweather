-- Enable trigram extension first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add zip_codes column to cities table
ALTER TABLE IF EXISTS cities ADD COLUMN IF NOT EXISTS zip_codes TEXT;

-- Create index for zip code search (after pg_trgm is enabled)
CREATE INDEX IF NOT EXISTS cities_zip_codes_idx ON cities USING gin(zip_codes gin_trgm_ops);

-- Update sample cities with their zip codes
UPDATE cities 
SET zip_codes = '60601,60602,60603,60604,60605,60606,60607,60608,60609,60610'
WHERE name = 'Chicago' AND state_code = 'IL';

UPDATE cities 
SET zip_codes = '90001,90002,90003,90004,90005,90006,90007,90008,90009,90010'
WHERE name = 'Los Angeles' AND state_code = 'CA';

UPDATE cities 
SET zip_codes = '27701,27702,27703,27704,27705,27706,27707,27708,27709,27710'
WHERE name = 'Durham' AND state_code = 'NC';

-- Update the get_active_cities function to include zip codes
CREATE OR REPLACE FUNCTION get_active_cities()
RETURNS SETOF cities
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM cities WHERE active = TRUE ORDER BY name ASC;
$$;

-- Update the get_city_by_slug function to include zip codes
CREATE OR REPLACE FUNCTION get_city_by_slug(city_slug TEXT)
RETURNS SETOF cities
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM cities WHERE slug = city_slug;
$$;

-- Add a search function for cities
CREATE OR REPLACE FUNCTION search_cities(search_term TEXT)
RETURNS SETOF cities
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM cities 
  WHERE 
    active = TRUE AND (
      name ILIKE '%' || search_term || '%' OR
      state ILIKE '%' || search_term || '%' OR
      state_code ILIKE '%' || search_term || '%' OR
      display_name ILIKE '%' || search_term || '%' OR
      zip_codes ILIKE '%' || search_term || '%'
    )
  ORDER BY 
    CASE 
      WHEN name ILIKE search_term || '%' THEN 1
      WHEN name ILIKE '%' || search_term || '%' THEN 2
      WHEN state_code = UPPER(search_term) THEN 3
      WHEN zip_codes ILIKE '%' || search_term || '%' THEN 4
      ELSE 5
    END,
    population DESC
  LIMIT 20;
$$;

-- Commit the transaction
COMMIT; 