export interface Location {
  name: string;
  lat: string;
  lon: string;
}

export interface CityData {
  id: number;
  name: string;
  state: string;
  state_code: string;
  display_name: string;
  slug: string;
  latitude: number;
  longitude: number;
  timezone: string;
  active: boolean;
  created_at: string;
  zip_codes?: string;
}

export interface WeatherData {
  id: number;
  location_name: string;
  latitude: string;
  longitude: string;
  historical_data: {
    metadata: {
      resultset: {
        offset: number;
        count: number;
        limit: number;
      };
    };
    results: WeatherResult[];
  };
  collected_at: string;
  date_range: {
    start: string;
    end: string;
  };
  station_id: string;
  station_name: string;
}

export interface WeatherResult {
  date: string;
  datatype: string;
  station: string;
  attributes: string;
  value: number;
}

export interface ProcessedWeatherData {
  date: string;
  temperature: number | null;
  precipitation: number | null;
  snow: number | null;
  snowDepth: number | null;
}

export interface CityWeatherData {
  city: string;
  state: string;
  fullName: string;
  slug: string;
  dailyData: ProcessedWeatherData[];
  dateRange: {
    start: string;
    end: string;
  };
  stationName: string;
  lastUpdated: string;
}
