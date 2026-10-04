import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Coffee,
  Utensils,
  Landmark,
  Trees,
  Hotel,
  ShoppingBag,
  Bus,
  Compass,
  Navigation,
  Layers,
  Sparkles,
  Star,
  ExternalLink,
  MessageSquarePlus,
  RefreshCw,
  Camera,
  Check,
  Plus,
  Car,
  Footprints,
  Train,
} from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '../config';
import {
  PlaceMarker,
  PlaceCategory,
  MapViewportContext,
  ItineraryItem,
  RouteTravelMode,
} from '../types';
import { PlaceSearchInput } from './PlaceSearchInput';

interface MapContainerProps {
  places: PlaceMarker[];
  selectedPlace: PlaceMarker | null;
  onSelectPlace: (place: PlaceMarker | null) => void;
  onAskAboutPlace: (place: PlaceMarker) => void;
  onAskAboutCategory: (categoryLabel: string) => void;
  onViewportChanged: (context: MapViewportContext) => void;
  onAskAboutCurrentArea: () => void;
  onTakeSnapshot?: () => void;
  focusedPlace: PlaceMarker | null;
  restoreTarget?: { center: { lat: number; lng: number }; zoom: number } | null;
  itinerary?: ItineraryItem[];
  showRouteOnMap?: boolean;
  onToggleItineraryItem?: (place: PlaceMarker) => void;
  isPlaceInItinerary?: (id: string) => boolean;
  travelMode?: RouteTravelMode;
  onChangeTravelMode?: (mode: RouteTravelMode) => void;
}

// Sub-component to manage map camera, traffic layer, and center tracking
const MapController: React.FC<{
  places: PlaceMarker[];
  focusedPlace: PlaceMarker | null;
  selectedPlace: PlaceMarker | null;
  onViewportChanged: (context: MapViewportContext) => void;
  showTraffic: boolean;
  restoreTarget?: { center: { lat: number; lng: number }; zoom: number } | null;
}> = ({ places, focusedPlace, selectedPlace, onViewportChanged, showTraffic, restoreTarget }) => {
  const map = useMap();
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Restore snapshot view on map
  useEffect(() => {
    if (!map || !restoreTarget) return;
    map.panTo(restoreTarget.center);
    map.setZoom(restoreTarget.zoom);
  }, [map, restoreTarget]);

  // Sync traffic layer
  useEffect(() => {
    if (!map) return;
    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    }
    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, showTraffic]);

  // Pan to focused place when clicked in chat or places list
  useEffect(() => {
    if (!map) return;
    const target = focusedPlace || selectedPlace;
    if (target) {
      map.panTo({ lat: target.lat, lng: target.lng });
      map.setZoom(16);
    }
  }, [map, focusedPlace, selectedPlace]);

  // Fit bounds when a new set of places is generated
  useEffect(() => {
    if (!map || places.length === 0) return;
    if (places.length === 1) {
      map.panTo({ lat: places[0].lat, lng: places[0].lng });
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, { top: 70, right: 50, bottom: 50, left: 50 });
  }, [map, places]);

  // Report viewport changes back
  const handleCameraChange = useCallback(() => {
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom() || 13;
    if (center) {
      onViewportChanged({
        center: { lat: center.lat(), lng: center.lng() },
        zoom,
        selectedPlace: selectedPlace
          ? {
              name: selectedPlace.name,
              lat: selectedPlace.lat,
              lng: selectedPlace.lng,
              address: selectedPlace.address,
              category: selectedPlace.category,
            }
          : undefined,
      });
    }
  }, [map, onViewportChanged, selectedPlace]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', handleCameraChange);
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, handleCameraChange]);

  return null;
};

// Route renderer component to connect itinerary stops on Google Maps with travelMode
const MapRoutePolyline: React.FC<{
  itinerary: ItineraryItem[];
  visible: boolean;
  travelMode: RouteTravelMode;
}> = ({ itinerary, visible, travelMode }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!visible || itinerary.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      return;
    }

    const strokeColor =
      travelMode === 'walking'
        ? '#10b981' // Emerald for walking
        : travelMode === 'transit'
        ? '#a855f7' // Purple for transit
        : '#4f46e5'; // Indigo for driving

    const path = itinerary.map((item) => ({ lat: item.lat, lng: item.lng }));

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor,
        strokeOpacity: 0.9,
        strokeWeight: travelMode === 'walking' ? 4 : 5,
        map,
      });
    } else {
      polylineRef.current.setPath(path);
      polylineRef.current.setOptions({
        strokeColor,
        strokeWeight: travelMode === 'walking' ? 4 : 5,
      });
      polylineRef.current.setMap(map);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, itinerary, visible, travelMode]);

  return null;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  onAskAboutPlace,
  onAskAboutCategory,
  onViewportChanged,
  onAskAboutCurrentArea,
  onTakeSnapshot,
  focusedPlace,
  restoreTarget,
  itinerary = [],
  showRouteOnMap = false,
  onToggleItineraryItem,
  isPlaceInItinerary,
  travelMode = 'driving',
  onChangeTravelMode,
}) => {
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // San Francisco default
  const [hasUserMoved, setHasUserMoved] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const getCategoryDetails = (category: PlaceCategory) => {
    switch (category) {
      case 'cafe':
        return {
          icon: <Coffee className="w-3.5 h-3.5 text-white" />,
          color: '#d97706',
          bgClass: 'bg-amber-600',
          label: 'Cafe',
        };
      case 'restaurant':
        return {
          icon: <Utensils className="w-3.5 h-3.5 text-white" />,
          color: '#e11d48',
          bgClass: 'bg-rose-600',
          label: 'Restaurant',
        };
      case 'museum':
        return {
          icon: <Landmark className="w-3.5 h-3.5 text-white" />,
          color: '#4f46e5',
          bgClass: 'bg-indigo-600',
          label: 'Museum',
        };
      case 'park':
        return {
          icon: <Trees className="w-3.5 h-3.5 text-white" />,
          color: '#059669',
          bgClass: 'bg-emerald-600',
          label: 'Park',
        };
      case 'hotel':
        return {
          icon: <Hotel className="w-3.5 h-3.5 text-white" />,
          color: '#2563eb',
          bgClass: 'bg-blue-600',
          label: 'Hotel',
        };
      case 'shopping':
        return {
          icon: <ShoppingBag className="w-3.5 h-3.5 text-white" />,
          color: '#db2777',
          bgClass: 'bg-pink-600',
          label: 'Shopping',
        };
      case 'transit':
        return {
          icon: <Bus className="w-3.5 h-3.5 text-white" />,
          color: '#0891b2',
          bgClass: 'bg-cyan-600',
          label: 'Transit',
        };
      case 'landmark':
      default:
        return {
          icon: <Compass className="w-3.5 h-3.5 text-white" />,
          color: '#7c3aed',
          bgClass: 'bg-purple-600',
          label: 'Landmark',
        };
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setMapCenter({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation failed:', err);
      },
      { timeout: 8000 }
    );
  };

  const categories = [
    { label: 'Top Cafes', query: 'popular cafes and specialty coffee spots' },
    { label: 'Must-Try Eats', query: 'top-rated iconic restaurants and street food' },
    { label: 'Sights & Culture', query: 'key cultural landmarks, historic monuments, and museums' },
    { label: 'Scenic Parks', query: 'lush parks, viewpoints, and tranquil outdoor spaces' },
    { label: 'Shopping', query: 'popular shopping districts, markets, and boutiques' },
  ];

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col bg-slate-100 overflow-hidden">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker']}>
        {/* Top Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pointer-events-none">
          {/* Places Search Bar */}
          <div className="pointer-events-auto w-full md:w-auto flex-1 max-w-md">
            <PlaceSearchInput
              onPlaceSelect={(loc, name) => {
                setMapCenter(loc);
                setHasUserMoved(true);
                onSelectPlace({
                  id: `searched-${Date.now()}`,
                  name,
                  category: 'landmark',
                  lat: loc.lat,
                  lng: loc.lng,
                  description: `Searched location: ${name}`,
                  address: name,
                });
              }}
            />
          </div>

          {/* Quick Actions Right */}
          <div className="pointer-events-auto flex items-center gap-1.5 md:gap-2 self-end md:self-auto bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-200/80">
            {/* Route Travel Mode Toggle Group */}
            {onChangeTravelMode && (
              <div
                className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 mr-0.5"
                title="Itinerary Route Travel Mode"
              >
                <button
                  type="button"
                  onClick={() => onChangeTravelMode('driving')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    travelMode === 'driving'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Driving mode (Car)"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTravelMode('walking')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    travelMode === 'walking'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Walking mode (Pedestrian)"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Walk</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeTravelMode('transit')}
                  className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                    travelMode === 'transit'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Transit mode (Bus/Metro)"
                >
                  <Train className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Transit</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowTraffic(!showTraffic)}
              className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                showTraffic
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Real-Time Traffic Overlay"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Traffic</span>
            </button>

            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Center on my location"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">My Spot</span>
            </button>

            {onTakeSnapshot && (
              <button
                onClick={onTakeSnapshot}
                className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-xs font-medium flex items-center gap-1.5 transition-all group"
                title="Take Snapshot of current map view"
              >
                <Camera className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                <span className="hidden sm:inline">Snapshot</span>
              </button>
            )}

            {places.length > 0 && (
              <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-200/80 rounded-lg text-indigo-700 text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{places.length} Pins</span>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Chips Carousel */}
        <div className="absolute top-20 left-4 right-4 z-20 flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => onAskAboutCategory(cat.query)}
              className="whitespace-nowrap px-3 py-1.5 bg-white/95 hover:bg-indigo-600 hover:text-white backdrop-blur-md text-slate-700 text-xs font-semibold rounded-full shadow-md border border-slate-200/80 hover:border-indigo-600 transition-all active:scale-95 flex items-center gap-1.5 group"
            >
              <Sparkles className="w-3 h-3 text-indigo-500 group-hover:text-white transition-colors" />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Floating "Search this area with GeoChat" button if user panned */}
        {hasUserMoved && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
            <button
              onClick={() => {
                setHasUserMoved(false);
                onAskAboutCurrentArea();
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl font-medium text-xs md:text-sm flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 border border-indigo-400"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Explore this area with GeoChat</span>
            </button>
          </div>
        )}

        {/* The Google Map instance */}
        <div className="w-full h-full flex-1">
          <Map
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={mapCenter}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            mapTypeControl={true}
            streetViewControl={true}
            fullscreenControl={true}
            className="w-full h-full"
            onDragstart={() => setHasUserMoved(true)}
            onClick={(e) => {
              if (e.detail?.latLng) {
                const lat = e.detail.latLng.lat;
                const lng = e.detail.latLng.lng;
                onSelectPlace({
                  id: `custom-spot-${Date.now()}`,
                  name: 'Selected Spot',
                  category: 'landmark',
                  lat,
                  lng,
                  description: `Custom location dropped by user at (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                  address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                });
              }
            }}
          >
            {/* Map controller to sync bounds, camera, and traffic */}
            <MapController
              places={places}
              focusedPlace={focusedPlace}
              selectedPlace={selectedPlace}
              onViewportChanged={(ctx) => {
                onViewportChanged(ctx);
              }}
              showTraffic={showTraffic}
              restoreTarget={restoreTarget}
            />

            {/* Polyline connecting itinerary stops */}
            <MapRoutePolyline
              itinerary={itinerary}
              visible={showRouteOnMap}
              travelMode={travelMode}
            />

            {/* Render AI Suggested Markers */}
            {places.map((place) => {
              const details = getCategoryDetails(place.category);
              const isSelected = selectedPlace?.id === place.id;
              const isFocused = focusedPlace?.id === place.id;
              const itinIndex = itinerary.findIndex(
                (it) =>
                  it.id === place.id ||
                  it.placeId === place.id ||
                  (Math.abs(it.lat - place.lat) < 0.0001 && Math.abs(it.lng - place.lng) < 0.0001)
              );

              return (
                <AdvancedMarker
                  key={place.id}
                  position={{ lat: place.lat, lng: place.lng }}
                  onClick={() => onSelectPlace(place)}
                  title={place.name}
                  zIndex={isSelected || isFocused ? 50 : itinIndex !== -1 ? 40 : 10}
                >
                  <Pin
                    background={itinIndex !== -1 ? '#4f46e5' : details.color}
                    borderColor={isSelected || isFocused ? '#ffffff' : '#1e1b4b'}
                    glyphColor="#ffffff"
                    scale={isSelected || isFocused ? 1.3 : itinIndex !== -1 ? 1.15 : 1.0}
                  >
                    <div className="flex items-center justify-center p-0.5">
                      {itinIndex !== -1 ? (
                        <span className="text-[10px] font-black text-white px-0.5">
                          {itinIndex + 1}
                        </span>
                      ) : (
                        details.icon
                      )}
                    </div>
                  </Pin>
                </AdvancedMarker>
              );
            })}

            {/* Render user-clicked custom spot marker if not in places */}
            {selectedPlace && !places.some((p) => p.id === selectedPlace.id) && (
              <AdvancedMarker
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                onClick={() => onSelectPlace(selectedPlace)}
                title={selectedPlace.name}
                zIndex={60}
              >
                <Pin background="#4338ca" borderColor="#ffffff" glyphColor="#ffffff" scale={1.2}>
                  <Navigation className="w-3.5 h-3.5 text-white" />
                </Pin>
              </AdvancedMarker>
            )}

            {/* InfoWindow for Selected Place */}
            {selectedPlace && (
              <InfoWindow
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                onCloseClick={() => onSelectPlace(null)}
                pixelOffset={[0, -32]}
              >
                <div className="p-1 max-w-[280px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${
                        getCategoryDetails(selectedPlace.category).bgClass
                      }`}
                    >
                      {getCategoryDetails(selectedPlace.category).label}
                    </span>
                    {selectedPlace.rating && (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {selectedPlace.rating}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {selectedPlace.name}
                  </h3>

                  {selectedPlace.address && (
                    <p className="text-slate-500 text-xs mt-0.5 truncate">{selectedPlace.address}</p>
                  )}

                  {selectedPlace.description && (
                    <p className="text-slate-700 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                      {selectedPlace.description}
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      onClick={() => onAskAboutPlace(selectedPlace)}
                      className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Ask GeoChat</span>
                    </button>

                    {onToggleItineraryItem && (
                      <button
                        onClick={() => onToggleItineraryItem(selectedPlace)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                          isPlaceInItinerary?.(selectedPlace.id)
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
                        }`}
                        title={
                          isPlaceInItinerary?.(selectedPlace.id)
                            ? 'Remove from Itinerary'
                            : 'Add to Itinerary'
                        }
                      >
                        {isPlaceInItinerary?.(selectedPlace.id) ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>In Plan</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-slate-600" />
                            <span>+ Plan</span>
                          </>
                        )}
                      </button>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${selectedPlace.name} ${selectedPlace.address || ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>
      </APIProvider>
    </div>
  );
};
