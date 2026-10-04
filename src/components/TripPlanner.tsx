import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  Trash2,
  MapPin,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Navigation,
  Clock,
  Share2,
  Plus,
  Compass,
  Check,
  Coffee,
  Utensils,
  Landmark,
  Trees,
  Hotel,
  ShoppingBag,
  Bus,
  Star,
  Layers,
  ArrowRight,
  Download,
  FileText,
  FileCode,
  CheckCheck,
  Car,
  Footprints,
  Train,
  FileJson,
  Upload,
} from 'lucide-react';
import { ItineraryItem, PlaceCategory, PlaceMarker, RouteTravelMode } from '../types';

interface TripPlannerProps {
  itinerary: ItineraryItem[];
  onReorderItinerary: (newItinerary: ItineraryItem[]) => void;
  onRemoveItem: (id: string) => void;
  onFocusPlace: (place: PlaceMarker) => void;
  onClearItinerary: () => void;
  onOptimizeRoute: (mode?: RouteTravelMode) => void;
  onAddAllPinnedPlaces: () => void;
  pinnedPlacesCount: number;
  onAddCustomStop: (item: Omit<ItineraryItem, 'id'>) => void;
  showRouteOnMap: boolean;
  onToggleRouteOnMap: (show: boolean) => void;
  travelMode: RouteTravelMode;
  onChangeTravelMode: (mode: RouteTravelMode) => void;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({
  itinerary,
  onReorderItinerary,
  onRemoveItem,
  onFocusPlace,
  onClearItinerary,
  onOptimizeRoute,
  onAddAllPinnedPlaces,
  pinnedPlacesCount,
  onAddCustomStop,
  showRouteOnMap,
  onToggleRouteOnMap,
  travelMode,
  onChangeTravelMode,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customCategory, setCustomCategory] = useState<PlaceCategory>('landmark');
  const [customNote, setCustomNote] = useState('');

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const items = [...itinerary];
    const [moved] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, moved);

    onReorderItinerary(items);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= itinerary.length) return;

    const items = [...itinerary];
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    onReorderItinerary(items);
  };

  // Content generators for export
  const generateMarkdownContent = (items: ItineraryItem[]): string => {
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let md = `# 🗺️ Trip Itinerary Plan\n\n`;
    md += `*Generated on ${dateStr} with GeoChat Maps & Trip Planner*\n`;
    md += `*Total Planned Stops: ${items.length}*  \n`;
    md += `*Route Travel Mode: ${travelMode.toUpperCase()}*\n\n`;
    md += `---\n\n`;

    md += `## 📋 Quick Stop Checklist\n\n`;
    items.forEach((item, idx) => {
      md += `- [ ] **Stop ${idx + 1}:** ${item.name} *(${item.category})*${
        item.notes ? ` — _${item.notes}_` : ''
      }\n`;
    });
    md += `\n---\n\n`;

    md += `## 🧭 Detailed Daily Schedule\n\n`;

    items.forEach((item, idx) => {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${item.name} ${item.address || ''}`
      )}`;

      md += `### ${idx + 1}. ${item.name}\n\n`;
      md += `- **Category:** ${item.category.toUpperCase()}\n`;
      if (item.address) {
        md += `- **Address:** ${item.address}\n`;
      }
      md += `- **Coordinates:** \`${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}\`\n`;
      if (item.rating) {
        md += `- **Rating:** ⭐ ${item.rating} / 5\n`;
      }
      if (item.notes) {
        md += `- **Planned Schedule / Timing:** ${item.notes}\n`;
      }
      md += `- **Google Maps Link:** [Open in Google Maps](${mapsUrl})\n`;
      if (item.description) {
        md += `- **Highlights & Description:** ${item.description}\n`;
      }
      md += `\n---\n\n`;
    });

    md += `*Safe travels! Have an amazing journey.* ✨\n`;
    return md;
  };

  const generateTextContent = (items: ItineraryItem[]): string => {
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let txt = `====================================================\n`;
    txt += `              TRIP ITINERARY PLAN                   \n`;
    txt += `====================================================\n`;
    txt += `Date: ${dateStr}\n`;
    txt += `Total Stops: ${items.length}\n`;
    txt += `Travel Mode: ${travelMode.toUpperCase()}\n`;
    txt += `====================================================\n\n`;

    txt += `STOPS OVERVIEW:\n`;
    items.forEach((item, idx) => {
      txt += `  [ ] Stop ${idx + 1}: ${item.name} (${item.category})\n`;
    });
    txt += `\n----------------------------------------------------\n\n`;

    items.forEach((item, idx) => {
      txt += `STOP ${idx + 1}: ${item.name.toUpperCase()}\n`;
      txt += `Category: ${item.category}\n`;
      if (item.address) txt += `Address: ${item.address}\n`;
      txt += `Coordinates: ${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}\n`;
      if (item.rating) txt += `Rating: ${item.rating} / 5\n`;
      if (item.notes) txt += `Notes / Time: ${item.notes}\n`;
      if (item.description) txt += `Highlights: ${item.description}\n`;
      txt += `Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${item.name} ${item.address || ''}`
      )}\n`;
      txt += `----------------------------------------------------\n`;
    });

    txt += `\nSafe travels!\n`;
    return txt;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    if (itinerary.length === 0) return;
    const content = generateMarkdownContent(itinerary);
    downloadFile(content, `trip-itinerary-${Date.now()}.md`, 'text/markdown');
    setShowExportMenu(false);
    showToast('Downloaded trip-itinerary.md!');
  };

  const handleDownloadText = () => {
    if (itinerary.length === 0) return;
    const content = generateTextContent(itinerary);
    downloadFile(content, `trip-itinerary-${Date.now()}.txt`, 'text/plain');
    setShowExportMenu(false);
    showToast('Downloaded trip-itinerary.txt!');
  };

  const handleDownloadJson = () => {
    if (itinerary.length === 0) return;
    const payload = {
      version: '1.0',
      app: 'GeoChat Maps Trip Planner',
      exportedAt: new Date().toISOString(),
      travelMode,
      stopsCount: itinerary.length,
      itinerary,
    };
    const jsonString = JSON.stringify(payload, null, 2);
    downloadFile(jsonString, `trip-itinerary-${Date.now()}.json`, 'application/json');
    setShowExportMenu(false);
    showToast('Downloaded trip itinerary JSON backup!');
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Support either an object with { itinerary: [...] } or a direct array [...]
        const items: ItineraryItem[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.itinerary)
          ? parsed.itinerary
          : null;

        if (!items || !Array.isArray(items)) {
          throw new Error('Invalid file format. Expected a trip itinerary JSON file.');
        }

        const validItems: ItineraryItem[] = items
          .filter(
            (item) =>
              item &&
              typeof item.lat === 'number' &&
              !isNaN(item.lat) &&
              typeof item.lng === 'number' &&
              !isNaN(item.lng)
          )
          .map((item, idx) => ({
            id: item.id || `imported-${Date.now()}-${idx}`,
            placeId: item.placeId,
            name: item.name || `Stop ${idx + 1}`,
            category: item.category || 'landmark',
            lat: Number(item.lat),
            lng: Number(item.lng),
            address: item.address,
            description: item.description,
            rating: item.rating ? Number(item.rating) : undefined,
            notes: item.notes,
            timeSlot: item.timeSlot,
          }));

        if (validItems.length === 0) {
          throw new Error('No valid location coordinates found in this file.');
        }

        if (
          parsed.travelMode &&
          (parsed.travelMode === 'driving' ||
            parsed.travelMode === 'walking' ||
            parsed.travelMode === 'transit')
        ) {
          onChangeTravelMode(parsed.travelMode);
        }

        onReorderItinerary(validItems);
        showToast(`Successfully imported ${validItems.length} stops from JSON!`);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Import error:', error);
        showToast(`⚠️ Import failed: ${error.message || 'Invalid JSON file'}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleCopyMarkdown = () => {
    if (itinerary.length === 0) return;
    const content = generateMarkdownContent(itinerary);
    navigator.clipboard.writeText(content);
    setShowExportMenu(false);
    showToast('Copied Markdown itinerary to clipboard!');
  };

  const handleCreateCustomStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    onAddCustomStop({
      name: customName.trim(),
      category: customCategory,
      lat: 37.7749,
      lng: -122.4194,
      address: customAddress.trim() || undefined,
      notes: customNote.trim() || undefined,
    });

    setCustomName('');
    setCustomAddress('');
    setCustomNote('');
    setIsAddingCustom(false);
  };

  const getCategoryIcon = (category: PlaceCategory) => {
    switch (category) {
      case 'cafe':
        return <Coffee className="w-3.5 h-3.5 text-amber-400" />;
      case 'restaurant':
        return <Utensils className="w-3.5 h-3.5 text-rose-400" />;
      case 'museum':
        return <Landmark className="w-3.5 h-3.5 text-indigo-400" />;
      case 'park':
        return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
      case 'hotel':
        return <Hotel className="w-3.5 h-3.5 text-blue-400" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />;
      case 'transit':
        return <Bus className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Compass className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-4 right-4 z-40 p-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xl flex items-center justify-between border border-indigo-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-indigo-200 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Top Header / Actions Bar */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-white">Trip Itinerary</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300">
              {itinerary.length} {itinerary.length === 1 ? 'Stop' : 'Stops'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Drag &amp; drop to reorder your day plan</p>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {/* Always accessible Import JSON button */}
          <button
            onClick={handleTriggerImport}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
            title="Import saved JSON itinerary"
          >
            <Upload className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline text-[11px]">Import</span>
          </button>

          {/* Hidden File Input for JSON import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json,application/json"
            className="hidden"
          />

          {itinerary.length > 0 && (
            <>
              {/* Export Dropdown Menu */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Export itinerary as JSON, Markdown, or text"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl z-50 p-1.5 text-xs animate-in fade-in duration-150">
                    <div className="px-2.5 py-1.5 font-semibold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-700/70 mb-1">
                      Export Itinerary
                    </div>

                    <button
                      onClick={handleDownloadJson}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-750 text-slate-200 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <FileJson className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Save Trip JSON (.json)</div>
                        <div className="text-[10px] text-slate-400">Save progress &amp; restore later</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-750 text-slate-200 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Download Markdown (.md)</div>
                        <div className="text-[10px] text-slate-400">Formatted headings &amp; map links</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadText}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-750 text-slate-200 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Download Plain Text (.txt)</div>
                        <div className="text-[10px] text-slate-400">Clean portable text file</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-700/70" />

                    <button
                      onClick={handleCopyMarkdown}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-750 text-slate-200 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">Copy Markdown to Clipboard</div>
                        <div className="text-[10px] text-slate-400">Paste in Notion or Notes</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onClearItinerary}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Clear all stops"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Route Connect Map Toggle & AI Optimize Bar */}
      <div className="px-3.5 py-2.5 bg-slate-850/80 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs shrink-0">
        <button
          onClick={() => onToggleRouteOnMap(!showRouteOnMap)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showRouteOnMap
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
          title="Connect itinerary stops with an interactive route path on Google Maps"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{showRouteOnMap ? 'Route Path ON' : 'Route Path OFF'}</span>
        </button>

        {itinerary.length >= 2 && (
          <button
            onClick={() => onOptimizeRoute(travelMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            title={`Ask GeoChat to calculate the optimal ${travelMode} sequence and timing`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Optimize Route</span>
          </button>
        )}
      </div>

      {/* Route Mode Toggle Section */}
      <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Travel Route Mode:
          </span>
          <span className="text-[10px] font-medium text-indigo-300">
            {travelMode === 'driving'
              ? '🚗 Road & Parking'
              : travelMode === 'walking'
              ? '🚶 Pedestrian & Scenic'
              : '🚆 Metro & Transit Lines'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeTravelMode('driving')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              travelMode === 'driving'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Driving Route Mode (Car)"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Driving</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTravelMode('walking')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              travelMode === 'walking'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Walking Route Mode (Pedestrian)"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walking</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTravelMode('transit')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              travelMode === 'transit'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Transit Route Mode (Public Transport)"
          >
            <Train className="w-3.5 h-3.5" />
            <span>Transit</span>
          </button>
        </div>
      </div>

      {/* Main List of Stops with Drag & Drop */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {itinerary.length === 0 ? (
          <div className="py-10 px-4 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-1">Your itinerary is empty</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              Save places by clicking &quot;+ Plan&quot; on map markers or in GeoChat recommendations.
            </p>

            {pinnedPlacesCount > 0 && (
              <button
                onClick={onAddAllPinnedPlaces}
                className="w-full max-w-xs py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all mb-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add All {pinnedPlacesCount} Pinned Places</span>
              </button>
            )}

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setIsAddingCustom(true)}
                className="py-2 px-3 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stop</span>
              </button>

              <button
                onClick={handleTriggerImport}
                className="py-2 px-3 text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/60 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {itinerary.map((item, index) => {
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative rounded-xl border p-3 transition-all cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? 'opacity-40 border-dashed border-indigo-400 bg-slate-800'
                      : isOver
                      ? 'border-indigo-400 bg-indigo-950/40 shadow-lg translate-y-0.5'
                      : 'border-slate-800 bg-slate-850 hover:border-slate-700 hover:bg-slate-800/90'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Drag Grip & Stop Sequence Pill */}
                    <div className="flex flex-col items-center justify-center shrink-0 pt-0.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                        {index + 1}
                      </div>
                      <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-slate-300 mt-1 cursor-grab" />
                    </div>

                    {/* Stop Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded bg-slate-800 shrink-0">
                          {getCategoryIcon(item.category)}
                        </div>
                        <h4 className="font-semibold text-xs text-white truncate">
                          {item.name}
                        </h4>
                        {item.rating && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1 py-0.2 rounded">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {item.rating}
                          </span>
                        )}
                      </div>

                      {item.address && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.address}
                        </p>
                      )}

                      {item.notes && (
                        <div className="mt-1.5 px-2 py-1 rounded bg-slate-900/60 border border-slate-800 text-[10px] text-indigo-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate">{item.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Reorder and Delete Controls */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-20 hover:bg-slate-800 rounded transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === itinerary.length - 1}
                        className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-20 hover:bg-slate-800 rounded transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors mt-0.5"
                        title="Remove Stop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Quick Action: Locate on Map */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() =>
                        onFocusPlace({
                          id: item.id,
                          name: item.name,
                          category: item.category,
                          lat: item.lat,
                          lng: item.lng,
                          description: item.description || '',
                          address: item.address,
                        })
                      }
                      className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Focus on Map</span>
                    </button>

                    {index < itinerary.length - 1 && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>Next Stop</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick Actions Footer */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setIsAddingCustom(true)}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stop</span>
              </button>

              <div className="flex items-center gap-1.5">
                {pinnedPlacesCount > itinerary.length && (
                  <button
                    onClick={onAddAllPinnedPlaces}
                    className="py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add All Pins</span>
                  </button>
                )}

                <button
                  onClick={handleDownloadJson}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Save Trip Progress as structured JSON"
                >
                  <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Save JSON</span>
                </button>

                <button
                  onClick={handleDownloadMarkdown}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Quick download as Markdown file"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>.md</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom Stop Modal */}
      {isAddingCustom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>Add Custom Stop</span>
            </h3>

            <form onSubmit={handleCreateCustomStop} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Place Name *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Ferry Building Marketplace"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as PlaceCategory)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="landmark">Landmark / Attraction</option>
                  <option value="cafe">Cafe / Coffee</option>
                  <option value="restaurant">Restaurant / Dining</option>
                  <option value="museum">Museum / Culture</option>
                  <option value="park">Park / Nature</option>
                  <option value="hotel">Hotel / Lodging</option>
                  <option value="shopping">Shopping / Retail</option>
                  <option value="transit">Transit Station</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Address or Area
                </label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="e.g. 1 Ferry Building, The Embarcadero"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Visit Time or Note
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. 10:00 AM &bull; Coffee &amp; Farmers market"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  Add to Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
