/**
 * Geospatial risk helpers.
 */

/**
 * Jurisdictions carrying elevated fraud/sanctions risk for a trading platform.
 *
 * This is a *starting* list drawn from FATF "high-risk and other monitored"
 * jurisdictions. It is deliberately a small weighted signal, not a block:
 * geography correlates weakly with individual intent, and hard-blocking by
 * country punishes travellers, expatriates and diaspora users who have done
 * nothing wrong.
 *
 * Treat this as a compliance input to review with counsel, not a finished
 * sanctions control — actual sanctions screening is a different, stricter
 * obligation than risk scoring.
 */
export const HIGH_RISK_COUNTRIES = new Set([
  "KP", // North Korea
  "IR", // Iran
  "MM", // Myanmar
  "SY", // Syria
  "AF", // Afghanistan
  "YE", // Yemen
  "SS", // South Sudan
  "CF", // Central African Republic
  "LY", // Libya
  "SO", // Somalia
  "HT", // Haiti
]);

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance in kilometres.
 *
 * Haversine is accurate to within ~0.5% for this purpose, which is far tighter
 * than the underlying data: IP geolocation is city-level at best and routinely
 * off by tens of kilometres, so added precision here would be false rigour.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Fastest plausible travel speed, km/h. Set above commercial cruise speed
 * (~900 km/h) to absorb airport transfers, timezone rounding and geolocation
 * error, so only genuinely impossible journeys trip the rule.
 */
const MAX_PLAUSIBLE_SPEED_KMH = 1000;

/**
 * Minimum separation before the rule engages. Below this, IP geolocation noise
 * alone — a user switching between mobile and broadband can appear to jump
 * cities — would produce constant false positives.
 */
const MIN_DISTANCE_KM = 500;

export interface TravelPoint {
  latitude: number;
  longitude: number;
  at: Date;
}

export interface ImpossibleTravelResult {
  impossible: boolean;
  distanceKm: number;
  hours: number;
  impliedSpeedKmh: number;
}

/**
 * Detect physically impossible movement between two authenticated locations.
 *
 * A true positive means the same credentials were used from two places one
 * person could not travel between in the elapsed time — which implies either
 * credential sharing, account compromise, or proxy/VPN use.
 */
export function detectImpossibleTravel(
  previous: TravelPoint,
  current: TravelPoint
): ImpossibleTravelResult {
  const distanceKm = haversineKm(
    previous.latitude,
    previous.longitude,
    current.latitude,
    current.longitude
  );

  const hours = Math.abs(current.at.getTime() - previous.at.getTime()) / 3_600_000;

  // Guard against a divide-by-zero on two logins in the same instant.
  const impliedSpeedKmh = hours > 0 ? distanceKm / hours : Infinity;

  return {
    impossible:
      distanceKm >= MIN_DISTANCE_KM && impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH,
    distanceKm: Math.round(distanceKm),
    hours: Number(hours.toFixed(2)),
    impliedSpeedKmh: Math.round(impliedSpeedKmh),
  };
}
