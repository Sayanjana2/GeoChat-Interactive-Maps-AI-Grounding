import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
}

interface PlaceSearchInputProps {
  onPlaceSelect: (location: { lat: number; lng: number }, name: string) => void;
}

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({ onPlaceSelect }) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize AutocompleteSessionToken
  useEffect(() => {
    if (placesLib && !sessionTokenRef.current) {
      try {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      } catch (e) {
        console.warn('Could not initialize AutocompleteSessionToken:', e);
      }
    }
  }, [placesLib]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!input.trim() || !placesLib) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        if (placesLib.AutocompleteSuggestion) {
          const request: any = {
            input,
            sessionToken: sessionTokenRef.current,
          };
          // Optional center biasing from map center
          if (map) {
            const center = map.getCenter();
            if (center) {
              request.locationBias = {
                center: { lat: center.lat(), lng: center.lng() },
                radius: 50000,
              };
            }
          }
          const { suggestions: rawSuggestions } =
            await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

          if (rawSuggestions && Array.isArray(rawSuggestions)) {
            const mapped: PlaceSuggestion[] = rawSuggestions.map((s: any) => ({
              placeId: s.placePrediction?.placeId || '',
              primaryText: s.placePrediction?.mainText?.text || s.placePrediction?.text?.text || '',
              secondaryText: s.placePrediction?.secondaryText?.text || '',
            }));
            setSuggestions(mapped.filter((s) => s.placeId));
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.warn('Autocomplete fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [placesLib, map]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        fetchSuggestions(query);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // When user selects a suggestion
  const handleSelect = async (suggestion: PlaceSuggestion) => {
    setQuery(suggestion.primaryText);
    setIsOpen(false);
    setSuggestions([]);

    if (!placesLib || !suggestion.placeId) return;

    try {
      if (placesLib.Place) {
        const place = new placesLib.Place({
          id: suggestion.placeId,
          requestedLanguage: 'en',
        });
        await place.fetchFields({
          fields: ['displayName', 'location', 'formattedAddress'],
        });

        if (place.location) {
          const lat: number =
            typeof place.location.lat === 'function'
              ? place.location.lat()
              : Number(place.location.lat);
          const lng: number =
            typeof place.location.lng === 'function'
              ? place.location.lng()
              : Number(place.location.lng);
          const name = place.displayName || suggestion.primaryText;

          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(15);
          }
          onPlaceSelect({ lat, lng }, name);
        }
      }
      // Reset session token after selection
      if (placesLib.AutocompleteSessionToken) {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      }
    } catch (err) {
      console.warn('Error fetching place fields:', err);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center bg-white rounded-xl shadow-lg border border-slate-200/80 hover:border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
        <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="Search any city, neighborhood, or place..."
          className="w-full py-2.5 px-3 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none rounded-xl"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mr-3 shrink-0" />}
        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            className="p-1 mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200/80 py-1.5 z-50 max-h-72 overflow-y-auto">
          {suggestions.map((item) => (
            <button
              key={item.placeId}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/70 flex items-start gap-2.5 transition-colors group"
            >
              <MapPin className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 truncate">{item.primaryText}</div>
                {item.secondaryText && (
                  <div className="text-xs text-slate-500 truncate">{item.secondaryText}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
