import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Trash2,
  MapPin,
  ExternalLink,
  Compass,
  Map,
  ShieldCheck,
  ChevronDown,
  Navigation,
  Loader2,
  Star,
  Coffee,
  Utensils,
  Landmark,
  Trees,
  Hotel,
  ShoppingBag,
  Bus,
  Search,
  CheckCircle2,
  Camera,
  X,
  Plus,
  Check,
  Mic,
  MicOff,
} from 'lucide-react';
import { ChatMessage, ChatRole, PlaceMarker, MapViewportContext, MapSnapshot } from '../types';
import { SnapshotCard } from './SnapshotCard';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (
    text: string,
    options?: { role?: ChatRole; model?: string; snapshot?: MapSnapshot }
  ) => void;
  onClearChat: () => void;
  viewportContext: MapViewportContext | null;
  onFocusPlace: (place: PlaceMarker) => void;
  activeRole: ChatRole;
  onChangeRole: (role: ChatRole) => void;
  activeModel: string;
  onChangeModel: (model: string) => void;
  inputPrefill?: string;
  onTakeSnapshot?: () => void;
  onRestoreView?: (center: { lat: number; lng: number }, zoom: number) => void;
  pendingSnapshot?: MapSnapshot | null;
  onClearPendingSnapshot?: () => void;
  onRequestAttachSnapshot?: () => void;
  onToggleItineraryItem?: (place: PlaceMarker) => void;
  isPlaceInItinerary?: (id: string) => boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  viewportContext,
  onFocusPlace,
  activeRole,
  onChangeRole,
  activeModel,
  onChangeModel,
  inputPrefill,
  onTakeSnapshot,
  onRestoreView,
  pendingSnapshot,
  onClearPendingSnapshot,
  onRequestAttachSnapshot,
  onToggleItineraryItem,
  isPlaceInItinerary,
}) => {
  const [inputText, setInputText] = useState('');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [expandedSourcesMsgId, setExpandedSourcesMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const speechBaseTextRef = useRef('');

  // Speech recognition cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setTimeout(() => setSpeechError(null), 3500);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      speechBaseTextRef.current = inputText;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const prefix = speechBaseTextRef.current ? `${speechBaseTextRef.current.trim()} ` : '';
        setInputText(prefix + transcript.trimStart());
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          // ignore quiet intervals
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Error starting SpeechRecognition:', err);
      setIsListening(false);
      setSpeechError('Could not access microphone.');
      setTimeout(() => setSpeechError(null), 3500);
    }
  };

  // Sync prefill from external clicks (e.g. from InfoWindow "Ask GeoChat")
  useEffect(() => {
    if (inputPrefill) {
      setInputText(inputPrefill);
      textareaRef.current?.focus();
    }
  }, [inputPrefill]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, pendingSnapshot]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !pendingSnapshot) || isLoading) return;

    const textToSend = inputText.trim() || 'Attached map snapshot of current view.';

    onSendMessage(textToSend, {
      role: activeRole,
      model: activeModel,
      snapshot: pendingSnapshot || undefined,
    });
    setInputText('');
    if (onClearPendingSnapshot) onClearPendingSnapshot();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const roleDefinitions: Record<ChatRole, { label: string; icon: React.ReactNode; desc: string }> = {
    explorer: {
      label: 'Local Explorer',
      icon: <Compass className="w-4 h-4 text-indigo-500" />,
      desc: 'Concierge for hidden gems, top culinary spots & culture',
    },
    planner: {
      label: 'Trip Planner',
      icon: <Map className="w-4 h-4 text-emerald-500" />,
      desc: 'Sequenced itineraries, travel times & walking routes',
    },
    grounding: {
      label: 'Fact Checker',
      icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
      desc: 'Real-time verified hours, events, tickets & parking',
    },
  };

  const promptSuggestions = [
    '☕ Find the best specialty coffee spots near here',
    '🏛️ Plan a 3-stop cultural walking tour of this area',
    '🍽️ Top rated dinner places with outdoor patio seating',
    '🌳 What are scenic viewpoints or tranquil parks nearby?',
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cafe':
        return <Coffee className="w-3.5 h-3.5 text-amber-600" />;
      case 'restaurant':
        return <Utensils className="w-3.5 h-3.5 text-rose-600" />;
      case 'museum':
        return <Landmark className="w-3.5 h-3.5 text-indigo-600" />;
      case 'park':
        return <Trees className="w-3.5 h-3.5 text-emerald-600" />;
      case 'hotel':
        return <Hotel className="w-3.5 h-3.5 text-blue-600" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-pink-600" />;
      case 'transit':
        return <Bus className="w-3.5 h-3.5 text-cyan-600" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-purple-600" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-r border-slate-800 shadow-2xl relative">
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-white">GeoChat AI</h1>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Grounding
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Interactive Map &amp; Search Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Clear chat thread"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role & Model Controls Strip */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/70 flex items-center justify-between gap-2 text-xs shrink-0">
        {/* Role Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-slate-200 font-medium transition-colors"
          >
            {roleDefinitions[activeRole].icon}
            <span>{roleDefinitions[activeRole].label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleDropdown && (
            <div className="absolute left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
              {(Object.keys(roleDefinitions) as ChatRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onChangeRole(r);
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-slate-700/70 transition-colors ${
                    activeRole === r ? 'bg-indigo-950/40 text-indigo-300' : 'text-slate-300'
                  }`}
                >
                  <div className="mt-0.5">{roleDefinitions[r].icon}</div>
                  <div>
                    <div className="font-semibold text-xs text-white">{roleDefinitions[r].label}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">
                      {roleDefinitions[r].desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model Selector Toggle */}
        <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 text-[11px]">
          <button
            onClick={() => onChangeModel('gemini-3.5-flash')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeModel === 'gemini-3.5-flash'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Gemini 3.5 Flash with real-time Google Search Grounding"
          >
            Gemini 3.5
          </button>
          <button
            onClick={() => onChangeModel('gemini-3.1-flash-lite')}
            className={`px-2 py-1 rounded-md font-medium transition-all ${
              activeModel === 'gemini-3.1-flash-lite'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Gemini 3.1 Flash Lite for ultra-fast responses"
          >
            Flash Lite
          </button>
        </div>
      </div>

      {/* Message List Thread */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 text-sm"
        style={{ backgroundColor: '#7686da' }}
      >
        {messages.length === 0 && (
          <div className="py-6 px-2 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <Compass className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="font-semibold text-base text-white mb-1">
              Ask GeoChat anything about this map
            </h2>
            <p
              className="text-xs text-slate-400 max-w-xs mb-6"
              style={{ backgroundColor: '#2e355f' }}
            >
              I can recommend local spots, plan walking itineraries, check real-time hours, and drop
              pins directly onto your Google Map.
            </p>

            <div className="w-full space-y-2 text-left">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Suggested questions:
              </div>
              {promptSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt, { role: activeRole, model: activeModel })}
                  className="w-full p-2.5 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-750 hover:text-white border border-slate-750 hover:border-indigo-500/50 rounded-xl transition-all text-left flex items-center justify-between group"
                >
                  <span>{prompt}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-2 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const hasSources = message.groundingSources && message.groundingSources.length > 0;
          const isExpandedSources = expandedSourcesMsgId === message.id;

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs'
                    : 'bg-slate-800/90 border border-slate-750 text-slate-200 rounded-bl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-700/60 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-indigo-400">
                      <Sparkles className="w-3 h-3" />
                      GeoChat
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {message.modelUsed || 'Gemini 3.5'}
                    </span>
                  </div>
                )}

                {/* Markdown text */}
                <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>

                {/* Search Grounding Sources Accordion */}
                {hasSources && (
                  <div className="mt-3 pt-2 border-t border-slate-700/70 text-xs">
                    <button
                      onClick={() =>
                        setExpandedSourcesMsgId(isExpandedSources ? null : message.id)
                      }
                      className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium text-[11px] transition-colors"
                    >
                      <Search className="w-3 h-3" />
                      <span>{message.groundingSources!.length} Verified Web Sources</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          isExpandedSources ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isExpandedSources && (
                      <div className="mt-2 space-y-1 pl-1">
                        {message.groundingSources!.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-[11px] text-slate-300 hover:text-white transition-colors"
                          >
                            <span className="truncate flex-1">{src.title || src.uri}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Render Map Snapshot Card if attached to this message */}
              {message.snapshot && (
                <div className="w-full max-w-[88%] mt-1">
                  <SnapshotCard
                    snapshot={message.snapshot}
                    onRestoreView={onRestoreView}
                    onAskAboutSnapshot={(snap) => {
                      onSendMessage(
                        `Tell me more about what is notable, scenic, or interesting around the area captured in this map snapshot at coordinates (${snap.center.lat.toFixed(4)}, ${snap.center.lng.toFixed(4)}).`,
                        { role: activeRole, model: activeModel }
                      );
                    }}
                  />
                </div>
              )}

              {/* Structured Interactive Places Cards from this answer */}
              {message.places && message.places.length > 0 && (
                <div className="w-full mt-2 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 px-1">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span>Mapped Recommendations ({message.places.length}):</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {message.places.map((place) => (
                      <div
                        key={place.id}
                        onClick={() => onFocusPlace(place)}
                        className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 hover:border-indigo-500/50 cursor-pointer transition-all flex items-start justify-between gap-2 shadow-sm group"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-700/80 shrink-0 mt-0.5">
                            {getCategoryIcon(place.category)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-white truncate group-hover:text-indigo-300 transition-colors">
                                {place.name}
                              </span>
                              {place.rating && (
                                <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1 py-0.2 rounded">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  {place.rating}
                                </span>
                              )}
                            </div>
                            {place.description && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {place.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onToggleItineraryItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleItineraryItem(place);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all ${
                                isPlaceInItinerary?.(place.id)
                                  ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700/60'
                                  : 'bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white'
                              }`}
                              title={
                                isPlaceInItinerary?.(place.id)
                                  ? 'Remove from Itinerary'
                                  : 'Add to Itinerary'
                              }
                            >
                              {isPlaceInItinerary?.(place.id) ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>In Plan</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>+ Plan</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFocusPlace(place);
                            }}
                            className="px-2 py-1 bg-indigo-600/30 group-hover:bg-indigo-600 text-indigo-300 group-hover:text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all"
                            title="Fly to marker on map"
                          >
                            <Navigation className="w-2.5 h-2.5" />
                            <span>Pin</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2 text-slate-300">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-750 flex items-center gap-2 shadow-md">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-xs text-slate-300 font-medium">
                Consulting real-time Google Maps &amp; Search...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div
        className="p-3 border-t border-slate-800 shrink-0"
        style={{ backgroundColor: '#606aad' }}
      >
        {/* Map Location Context Bar & Snapshot Trigger */}
        {viewportContext && (
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate">
                Map Center: ({viewportContext.center.lat.toFixed(3)},{' '}
                {viewportContext.center.lng.toFixed(3)})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(onRequestAttachSnapshot || onTakeSnapshot) && (
                <button
                  type="button"
                  onClick={onRequestAttachSnapshot || onTakeSnapshot}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                  title="Capture and attach a snapshot of current map view"
                >
                  <Camera className="w-3 h-3 text-indigo-400" />
                  <span>Snap View</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIncludeLocation(!includeLocation)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  includeLocation
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Toggle attaching current map view to questions"
              >
                <CheckCircle2
                  className={`w-2.5 h-2.5 ${includeLocation ? 'text-indigo-400' : 'text-slate-600'}`}
                />
                <span>{includeLocation ? 'Location Linked' : 'Global Mode'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Pending Attached Snapshot Preview */}
        {pendingSnapshot && (
          <div className="mb-2 p-2 rounded-xl bg-slate-900/95 border border-indigo-500/50 flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={pendingSnapshot.imageUrl}
                alt="Map snapshot preview"
                className="w-12 h-8 object-cover rounded-md border border-indigo-400/40 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-indigo-300 font-semibold text-[11px]">
                  <Camera className="w-3 h-3 text-indigo-400" />
                  <span>Map Snapshot Attached</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  ({pendingSnapshot.center.lat.toFixed(3)}, {pendingSnapshot.center.lng.toFixed(3)}) &bull; Zoom {pendingSnapshot.zoom}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearPendingSnapshot}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Remove snapshot attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Listening Status Banner */}
        {isListening && (
          <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="font-semibold text-[11px]">
                Listening to your voice... speak now
              </span>
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className="text-[10px] text-rose-300 hover:text-white font-medium underline px-1"
            >
              Done / Stop
            </button>
          </div>
        )}

        {/* Speech Error Banner */}
        {speechError && (
          <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-amber-950/90 border border-amber-800 text-amber-200 text-[11px] flex items-center justify-between shadow-lg animate-in fade-in duration-150">
            <span>{speechError}</span>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-amber-400 hover:text-white ml-2 text-xs font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Textarea Form */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-1.5 md:gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? '🎙️ Listening... speak your query now...'
                : 'Ask about places, directions, hours, or recommendations...'
            }
            rows={2}
            className={`w-full resize-none bg-slate-900 border ${
              isListening
                ? 'border-rose-500 ring-1 ring-rose-500/50'
                : 'border-slate-750 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            } rounded-xl py-2 px-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 outline-none transition-all`}
          />

          {/* Microphone SpeechRecognition Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer flex items-center justify-center ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-600/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={
              isListening
                ? 'Stop listening (Voice input active)'
                : 'Voice input: Speak query into chat'
            }
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !pendingSnapshot) || isLoading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
            title="Send Message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-slate-500" />
            <span>Voice input enabled</span>
          </span>
          <span>Press Enter to send &bull; Shift + Enter for newline</span>
        </div>
      </div>
    </div>
  );
};
