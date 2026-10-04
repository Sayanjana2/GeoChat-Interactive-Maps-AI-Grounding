import React, { useState, useCallback } from 'react';
import { QuotaBanner } from './components/QuotaBanner';
import { MapContainer } from './components/MapContainer';
import { ChatPanel } from './components/ChatPanel';
import { TripPlanner } from './components/TripPlanner';
import {
  ChatMessage,
  ChatRole,
  PlaceMarker,
  MapViewportContext,
  MapSnapshot,
  ItineraryItem,
  RouteTravelMode,
} from './types';
import { createMapSnapshot } from './utils/mapSnapshot';
import { MessageSquare, Map as MapIcon, PanelLeftClose, PanelLeftOpen, CalendarCheck } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceMarker[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceMarker | null>(null);
  const [focusedPlace, setFocusedPlace] = useState<PlaceMarker | null>(null);
  const [viewportContext, setViewportContext] = useState<MapViewportContext | null>(null);
  const [activeRole, setActiveRole] = useState<ChatRole>('explorer');
  const [activeModel, setActiveModel] = useState<string>('gemini-3.5-flash');
  const [inputPrefill, setInputPrefill] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'itinerary'>('chat');
  const [mobileTab, setMobileTab] = useState<'map' | 'chat' | 'itinerary'>('map');
  const [pendingSnapshot, setPendingSnapshot] = useState<MapSnapshot | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{
    center: { lat: number; lng: number };
    zoom: number;
  } | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [showRouteOnMap, setShowRouteOnMap] = useState<boolean>(true);
  const [travelMode, setTravelMode] = useState<RouteTravelMode>('driving');

  // Send message to server-side Gemini endpoint
  const handleSendMessage = useCallback(
    async (
      text: string,
      options?: { role?: ChatRole; model?: string; snapshot?: MapSnapshot }
    ) => {
      const role = options?.role || activeRole;
      const model = options?.model || activeModel;
      const snapshot = options?.snapshot;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        snapshot,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setInputPrefill('');
      setPendingSnapshot(null);

      try {
        // Construct conversation history for multi-turn chat
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            model,
            roleId: role,
            mapContext: viewportContext,
            useSearch: true, // Search Grounding feature
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${response.status}`);
        }

        const data = await response.json();

        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: data.text || 'I checked the map and search data for you.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          places: data.places || [],
          groundingSources: data.groundingSources || [],
          searchQueries: data.searchQueries || [],
          modelUsed: data.modelUsed,
        };

        setMessages((prev) => [...prev, modelMsg]);

        // If places were returned, merge them onto the map
        if (data.places && data.places.length > 0) {
          setPlaces((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPlaces = data.places.filter((p: PlaceMarker) => !existingIds.has(p.id));
            return [...prev, ...newPlaces];
          });
          // Focus first place
          setFocusedPlace(data.places[0]);
          setSelectedPlace(data.places[0]);
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Failed to get chat response:', error);
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'model',
          content: `⚠️ **Unable to fetch response:** ${error.message || 'Please verify your network or try again.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeRole, activeModel, messages, viewportContext]
  );

  // Take a map snapshot: if directToChat is true, post immediately and prompt AI
  const handleTakeSnapshot = useCallback(
    (directToChat: boolean = false) => {
      const center = viewportContext?.center || { lat: 37.7749, lng: -122.4194 };
      const zoom = viewportContext?.zoom || 13;
      const snapshot = createMapSnapshot(center, zoom, places, viewportContext?.locationName);

      if (directToChat) {
        handleSendMessage(
          `📸 Attached map snapshot at (${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}) with zoom ${zoom}. What are the notable attractions, hidden spots, and highlights visible in this view?`,
          { role: activeRole, model: activeModel, snapshot }
        );
        setIsSidebarOpen(true);
        setSidebarTab('chat');
        setMobileTab('chat');
      } else {
        setPendingSnapshot(snapshot);
        setIsSidebarOpen(true);
        setSidebarTab('chat');
      }
    },
    [viewportContext, places, handleSendMessage, activeRole, activeModel]
  );

  const handleRestoreView = (center: { lat: number; lng: number }, zoom: number) => {
    setRestoreTarget({ center, zoom });
    setMobileTab('map');
  };

  const handleAskAboutPlace = (place: PlaceMarker) => {
    setInputPrefill(
      `Tell me more about ${place.name} at ${place.address || 'this location'}. What are the highlights, opening hours, and visitor tips?`
    );
    setSidebarTab('chat');
    setMobileTab('chat');
    setIsSidebarOpen(true);
  };

  const handleAskAboutCategory = (categoryQuery: string) => {
    handleSendMessage(
      `What are the best ${categoryQuery} in this area right now? Provide current details, highlights, and plot them on the map.`
    );
    setSidebarTab('chat');
    setMobileTab('chat');
  };

  const handleAskAboutCurrentArea = () => {
    handleSendMessage(
      `What are the top highlights, interesting spots, and things to do around my current map view?`
    );
    setSidebarTab('chat');
    setMobileTab('chat');
  };

  const handleFocusPlace = (place: PlaceMarker) => {
    setFocusedPlace(place);
    setSelectedPlace(place);
    setMobileTab('map');
  };

  // Itinerary Item Management
  const handleToggleItineraryItem = (place: PlaceMarker) => {
    setItinerary((prev) => {
      const exists = prev.some((it) => it.id === place.id || it.placeId === place.id);
      if (exists) {
        return prev.filter((it) => it.id !== place.id && it.placeId !== place.id);
      } else {
        return [
          ...prev,
          {
            id: place.id || `itin-${Date.now()}`,
            placeId: place.id,
            name: place.name,
            category: place.category,
            lat: place.lat,
            lng: place.lng,
            address: place.address,
            description: place.description,
            rating: place.rating,
          },
        ];
      }
    });
  };

  const isPlaceInItinerary = (id: string) => {
    return itinerary.some((it) => it.id === id || it.placeId === id);
  };

  const handleAddAllPinnedPlaces = () => {
    setItinerary((prev) => {
      const existingIds = new Set(prev.map((it) => it.placeId || it.id));
      const newItems: ItineraryItem[] = places
        .filter((p) => !existingIds.has(p.id))
        .map((p) => ({
          id: p.id,
          placeId: p.id,
          name: p.name,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          address: p.address,
          description: p.description,
          rating: p.rating,
        }));
      return [...prev, ...newItems];
    });
  };

  const handleOptimizeRoute = (mode: RouteTravelMode = travelMode) => {
    if (itinerary.length === 0) return;
    setSidebarTab('chat');
    setMobileTab('chat');
    const stopsSummary = itinerary
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.name} (${item.category}) - ${item.address || `${item.lat}, ${item.lng}`}`
      )
      .join('\n');

    const modeDetails =
      mode === 'walking'
        ? 'Mode: WALKING (Pedestrian). Optimize for scenic sidewalks, walkable streetscapes, parks, walking distances under 20 mins between stops, and note any steep hills or stairs.'
        : mode === 'transit'
        ? 'Mode: PUBLIC TRANSIT (Metro/Bus/Train). Recommend specific transit lines, stations, transfer points, and walking links between transit and each destination.'
        : 'Mode: DRIVING (Car). Optimize the driving order to minimize congested corridors and left turns, and provide parking advice or garage locations for each stop.';

    handleSendMessage(
      `Please optimize this ${itinerary.length}-stop travel itinerary for **${mode.toUpperCase()}** travel mode:\n\n${stopsSummary}\n\n${modeDetails}\n\nProvide the recommended sequence, estimated transit times and distances between stops, suggested duration at each place, and essential local tips.`,
      { role: 'planner' }
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Quota Banner for Demo Key (mandated by GMP guidelines) */}
      <QuotaBanner />

      {/* Main App Body */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Sidebar Container (Desktop: Collapsible; Mobile: Tab view) */}
        <div
          className={`${
            isSidebarOpen ? 'w-full md:w-[440px] xl:w-[480px]' : 'w-0'
          } ${
            mobileTab === 'chat' || mobileTab === 'itinerary' ? 'flex' : 'hidden md:flex'
          } h-full flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 relative z-30 overflow-hidden shadow-2xl`}
        >
          {/* Top Sidebar Tab Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-3 pt-2 shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                  sidebarTab === 'chat'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>GeoChat</span>
                {messages.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {messages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setSidebarTab('itinerary')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                  sidebarTab === 'itinerary'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Trip Planner</span>
                {itinerary.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-bold">
                    {itinerary.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden relative">
            {sidebarTab === 'chat' ? (
              <ChatPanel
                messages={messages}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                onClearChat={() => {
                  setMessages([]);
                  setPlaces([]);
                  setSelectedPlace(null);
                  setFocusedPlace(null);
                  setPendingSnapshot(null);
                }}
                viewportContext={viewportContext}
                onFocusPlace={handleFocusPlace}
                activeRole={activeRole}
                onChangeRole={setActiveRole}
                activeModel={activeModel}
                onChangeModel={setActiveModel}
                inputPrefill={inputPrefill}
                onTakeSnapshot={() => handleTakeSnapshot(true)}
                onRequestAttachSnapshot={() => handleTakeSnapshot(false)}
                pendingSnapshot={pendingSnapshot}
                onClearPendingSnapshot={() => setPendingSnapshot(null)}
                onRestoreView={handleRestoreView}
                onToggleItineraryItem={handleToggleItineraryItem}
                isPlaceInItinerary={isPlaceInItinerary}
              />
            ) : (
              <TripPlanner
                itinerary={itinerary}
                onReorderItinerary={setItinerary}
                onRemoveItem={(id) => setItinerary((prev) => prev.filter((item) => item.id !== id))}
                onFocusPlace={handleFocusPlace}
                onClearItinerary={() => setItinerary([])}
                onOptimizeRoute={handleOptimizeRoute}
                onAddAllPinnedPlaces={handleAddAllPinnedPlaces}
                pinnedPlacesCount={places.length}
                onAddCustomStop={(item) =>
                  setItinerary((prev) => [
                    ...prev,
                    { id: `custom-${Date.now()}`, ...item },
                  ])
                }
                showRouteOnMap={showRouteOnMap}
                onToggleRouteOnMap={setShowRouteOnMap}
                travelMode={travelMode}
                onChangeTravelMode={setTravelMode}
              />
            )}
          </div>
        </div>

        {/* Desktop Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex absolute top-4 z-40 p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-r-xl shadow-xl backdrop-blur-md transition-all items-center justify-center"
          style={{ left: isSidebarOpen ? (window.innerWidth >= 1280 ? '480px' : '440px') : '0px' }}
          title={isSidebarOpen ? 'Collapse Sidebar' : 'Open Sidebar'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-slate-300" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Map Container (Desktop: Right side; Mobile: Tab view) */}
        <div
          className={`flex-1 h-full relative ${
            mobileTab === 'map' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <MapContainer
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            onAskAboutPlace={handleAskAboutPlace}
            onAskAboutCategory={handleAskAboutCategory}
            onViewportChanged={setViewportContext}
            onAskAboutCurrentArea={handleAskAboutCurrentArea}
            onTakeSnapshot={() => handleTakeSnapshot(true)}
            focusedPlace={focusedPlace}
            restoreTarget={restoreTarget}
            itinerary={itinerary}
            showRouteOnMap={showRouteOnMap}
            onToggleItineraryItem={handleToggleItineraryItem}
            isPlaceInItinerary={isPlaceInItinerary}
            travelMode={travelMode}
            onChangeTravelMode={setTravelMode}
          />
        </div>

        {/* Mobile Navigation Tabs (Bottom Bar) */}
        <div className="md:hidden flex items-center justify-around bg-slate-900 border-t border-slate-800 py-2.5 px-3 shrink-0 z-40">
          <button
            onClick={() => setMobileTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mobileTab === 'map'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Map</span>
            {places.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                {places.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setSidebarTab('chat');
              setMobileTab('chat');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mobileTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
            {messages.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setSidebarTab('itinerary');
              setMobileTab('itinerary');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mobileTab === 'itinerary'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Plan</span>
            {itinerary.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                {itinerary.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
