/**
 * Calculate the geographic centroid (center point) from an array of coordinates
 * @param coordinates - Array of {lat: string, long: string} objects
 * @returns Object with {lat: number, lng: number} or null if no valid coordinates
 */
export const calculateCentroid = (
  coordinates: Array<{ lat: string; long: string }>
): { lat: number; lng: number } | null => {
  // Filter out invalid coordinates
  const validCoords = coordinates
    .map((coord) => ({
      lat: parseFloat(coord.lat),
      lng: parseFloat(coord.long),
    }))
    .filter((coord) => !isNaN(coord.lat) && !isNaN(coord.lng));
  if (validCoords.length === 0) {
    return null;
  }
  // Calculate average latitude and longitude
  const sum = validCoords.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat,
      lng: acc.lng + coord.lng,
    }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / validCoords.length,
    lng: sum.lng / validCoords.length,
  };
};

/**
 * Calculate the bounds (bounding box) from an array of coordinates
 * @param coordinates - Array of {lat: string, long: string} objects
 * @returns Object with {minLat, maxLat, minLng, maxLng} or null if no valid coordinates
 */
export const calculateBounds = (
  coordinates: Array<{ lat: string; long: string }>
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null => {
  // Filter out invalid coordinates
  const validCoords = coordinates
    .map((coord) => ({
      lat: parseFloat(coord.lat),
      lng: parseFloat(coord.long),
    }))
    .filter((coord) => !isNaN(coord.lat) && !isNaN(coord.lng));

  if (validCoords.length === 0) {
    return null;
  }

  const lats = validCoords.map((c) => c.lat);
  const lngs = validCoords.map((c) => c.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Ensure minimum bounds size to prevent too tight zoom
  const minLatRange = 0.01; // ~1km
  const minLngRange = 0.01; // ~1km
  
  const latRange = Math.max(maxLat - minLat, minLatRange);
  const lngRange = Math.max(maxLng - minLng, minLngRange);

  return {
    minLat: minLat - (latRange * 0.05), // Add 5% buffer
    maxLat: maxLat + (latRange * 0.05),
    minLng: minLng - (lngRange * 0.05),
    maxLng: maxLng + (lngRange * 0.05),
  };
};

