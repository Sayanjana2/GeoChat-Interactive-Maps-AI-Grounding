import { GOOGLE_MAPS_API_KEY } from '../config';
import { PlaceMarker, MapSnapshot } from '../types';

/**
 * Generates a high-resolution Google Maps Static API snapshot URL and snapshot object.
 */
export function createMapSnapshot(
  center: { lat: number; lng: number },
  zoom: number,
  places: PlaceMarker[] = [],
  locationName?: string
): MapSnapshot {
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  const roundedZoom = Math.min(Math.max(Math.round(zoom), 1), 20);

  const params = new URLSearchParams({
    center: `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`,
    zoom: `${roundedZoom}`,
    size: '640x360',
    scale: '2',
    format: 'png',
    maptype: 'roadmap',
    key: GOOGLE_MAPS_API_KEY,
    solution_id: 'gmp_mcp_codeassist_v1_aistudio',
  });

  let url = `${baseUrl}?${params.toString()}`;

  // Center indicator marker
  url += `&markers=color:0x4f46e5%7C${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;

  // Markers for mapped places
  const subset = places.slice(0, 10);
  subset.forEach((p, idx) => {
    const label = idx < 9 ? `${idx + 1}` : '';
    const color =
      p.category === 'cafe'
        ? '0xd97706'
        : p.category === 'restaurant'
        ? '0xe11d48'
        : p.category === 'park'
        ? '0x059669'
        : '0x7c3aed';
    url += `&markers=color:${color}${label ? `%7Clabel:${label}` : ''}%7C${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  });

  return {
    id: `snapshot-${Date.now()}`,
    imageUrl: url,
    center,
    zoom: roundedZoom,
    locationName,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    placesCount: places.length,
    places: subset,
  };
}
