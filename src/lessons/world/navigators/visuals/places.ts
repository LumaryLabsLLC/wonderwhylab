/**
 * Real cities with their coordinates (to about 0.1°) and standard time zones
 * (UTC offset in whole hours, ignoring summer time). Used by the 10–12 World lessons.
 */
export interface City {
  name: string;
  lat: number;
  lon: number;
  /** Standard time, hours ahead of (+) or behind (−) UTC. Only for whole-hour zones. */
  utc?: number;
}

export const CITIES: City[] = [
  { name: 'London', lat: 51.5, lon: -0.1, utc: 0 },
  { name: 'Paris', lat: 48.9, lon: 2.4, utc: 1 },
  { name: 'Cairo', lat: 30.0, lon: 31.2, utc: 2 },
  { name: 'Moscow', lat: 55.8, lon: 37.6, utc: 3 },
  { name: 'Nairobi', lat: -1.3, lon: 36.8, utc: 3 },
  { name: 'Dubai', lat: 25.2, lon: 55.3, utc: 4 },
  { name: 'Mumbai', lat: 19.1, lon: 72.9 },
  { name: 'Bangkok', lat: 13.8, lon: 100.5, utc: 7 },
  { name: 'Singapore', lat: 1.35, lon: 103.8, utc: 8 },
  { name: 'Jakarta', lat: -6.2, lon: 106.8, utc: 7 },
  { name: 'Beijing', lat: 39.9, lon: 116.4, utc: 8 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7, utc: 9 },
  { name: 'Sydney', lat: -33.9, lon: 151.2, utc: 10 },
  { name: 'Auckland', lat: -36.8, lon: 174.8, utc: 12 },
  { name: 'Lagos', lat: 6.5, lon: 3.4, utc: 1 },
  { name: 'Cape Town', lat: -33.9, lon: 18.4, utc: 2 },
  { name: 'Reykjavík', lat: 64.1, lon: -21.9, utc: 0 },
  { name: 'Rio de Janeiro', lat: -22.9, lon: -43.2, utc: -3 },
  { name: 'Buenos Aires', lat: -34.6, lon: -58.4, utc: -3 },
  { name: 'Lima', lat: -12.0, lon: -77.0, utc: -5 },
  { name: 'New York', lat: 40.7, lon: -74.0, utc: -5 },
  { name: 'Chicago', lat: 41.9, lon: -87.6, utc: -6 },
  { name: 'Mexico City', lat: 19.4, lon: -99.1, utc: -6 },
  { name: 'Los Angeles', lat: 34.1, lon: -118.2, utc: -8 },
  { name: 'Vancouver', lat: 49.3, lon: -123.1, utc: -8 },
  { name: 'Anchorage', lat: 61.2, lon: -149.9, utc: -9 },
];

export const city = (name: string) => CITIES.find((c) => c.name === name)!;
