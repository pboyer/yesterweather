# Yesterday's Weather

A service to collect historical weather data from NOAA's Climate Data Online (CDO) API and store it in a Supabase database.

## Features

- Collects historical weather data for configured cities (Chicago, LA, and Durham NC by default)
- Uses the NOAA Climate Data Online (CDO) API
- Stores data in Supabase
- Runs on a daily schedule
- Written in TypeScript with ts-node for direct execution

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Get a NOAA CDO API token from https://www.ncdc.noaa.gov/cdo-web/token
4. Create a `.env` file with the following content:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NOAA_CDO_TOKEN=your-cdo-api-token
   ```
5. Run the SQL setup script in your Supabase SQL editor (from `src/setup.sql`)
6. Run the cities table setup script in your Supabase SQL editor (from `src/setup-cities.sql`)

## Usage

### Populating the Cities Database

To populate the cities database with data from the SimpleMaps US Cities dataset:

```
npm run populate-cities
```

This will:

1. Read the US cities data from the CSV file in the data directory
2. Filter to include only cities with population over 50,000
3. Format the data for our database schema
4. Insert the cities into the Supabase database

### Seeding Weather Data

To seed the weather data for all cities in the database:

```
npm run seed-weather
```

This script will:

1. Fetch all active cities from the database
2. For each city, find the nearest weather station
3. Fetch historical weather data for the past 7 days
4. Store the data in the weather_data table immediately after each successful fetch
5. Skip cities that already have data for the current date range
6. Retry failed API requests once by default

Options:

- `--limit=N` - Process only the first N cities (useful for testing)
- `--force` - Force update even if data already exists for the date range
- `--retries=N` - Number of times to retry failed NOAA API requests (default: 1)

Examples:

```
npm run seed-weather -- --limit=5
npm run seed-weather -- --force
npm run seed-weather -- --retries=3
npm run seed-weather -- --limit=10 --force --retries=2
```

### Test Collection (without updating Supabase)

To test the weather data collection without updating Supabase:

```
npm run test-collect
```

This will output the collected data and save it to JSON files in the `test_output` directory.

### Running the Service

To start the collection service:

```
npm start
```

The service will collect data when started and then run every day at midnight.

### Development

For development with auto-restart on file changes:

```
npm run dev
```

### Debug

To run with Node.js inspector:

```
npm run debug
```

## Data Structure

The application collects historical weather data from NOAA weather stations near the specified cities. The data is structured as follows:

- **location_name**: City and state
- **latitude/longitude**: Geographic coordinates
- **station_id/station_name**: Information about the weather station used
- **date_range**: Start and end dates for the data collection period
- **historical_data**: The actual weather data from NOAA
- **collected_at**: Timestamp when the data was collected

## License

ISC
