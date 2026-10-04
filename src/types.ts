export type ChatRole = 'explorer' | 'planner' | 'grounding';
export type RouteTravelMode = 'driving' | 'walking' | 'transit';

export type PlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'landmark'
  | 'museum'
  | 'park'
  | 'hotel'
  | 'transit'
  | 'shopping'
  | 'other';

export interface PlaceMarker {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  description: string;
  address?: string;
  rating?: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MapSnapshot {
  id: string;
  imageUrl: string;
  center: { lat: number; lng: number };
  zoom: number;
  locationName?: string;
  timestamp: string;
  placesCount: number;
  places?: PlaceMarker[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  snapshot?: MapSnapshot;
  places?: PlaceMarker[];
  groundingSources?: GroundingSource[];
  searchQueries?: string[];
  modelUsed?: string;
}

export interface MapViewportContext {
  center: { lat: number; lng: number };
  zoom: number;
  locationName?: string;
  selectedPlace?: {
    name: string;
    lat: number;
    lng: number;
    address?: string;
    category?: string;
  };
}

export interface ItineraryItem {
  id: string;
  placeId?: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address?: string;
  description?: string;
  rating?: number;
  notes?: string;
  timeSlot?: string;
}
