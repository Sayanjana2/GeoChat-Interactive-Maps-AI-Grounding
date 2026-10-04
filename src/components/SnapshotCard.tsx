import React, { useState } from 'react';
import { Camera, MapPin, ZoomIn, Download, ExternalLink, RefreshCw, X, Sparkles } from 'lucide-react';
import { MapSnapshot } from '../types';

interface SnapshotCardProps {
  snapshot: MapSnapshot;
  onRestoreView?: (center: { lat: number; lng: number }, zoom: number) => void;
  onAskAboutSnapshot?: (snapshot: MapSnapshot) => void;
}

export const SnapshotCard: React.FC<SnapshotCardProps> = ({
  snapshot,
  onRestoreView,
  onAskAboutSnapshot,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(snapshot.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `map-snapshot-${snapshot.center.lat.toFixed(4)}-${snapshot.center.lng.toFixed(4)}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(snapshot.imageUrl, '_blank');
    }
  };

  return (
    <div className="w-full my-2 rounded-xl overflow-hidden border border-indigo-500/30 bg-slate-950/80 shadow-lg group">
      {/* Top Header */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
          <Camera className="w-3.5 h-3.5 text-indigo-400" />
          <span>Map Snapshot</span>
          <span className="text-[10px] text-slate-400 font-normal">({snapshot.timestamp})</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <MapPin className="w-3 h-3 text-slate-500" />
          <span>
            {snapshot.center.lat.toFixed(3)}, {snapshot.center.lng.toFixed(3)}
          </span>
          <span className="bg-slate-800 text-[10px] px-1.5 py-0.5 rounded ml-1 font-mono">
            z{snapshot.zoom}
          </span>
        </div>
      </div>

      {/* Snapshot Image Preview */}
      <div className="relative aspect-video w-full bg-slate-900 cursor-pointer overflow-hidden" onClick={() => setIsModalOpen(true)}>
        {!imgError ? (
          <img
            src={snapshot.imageUrl}
            alt={`Map snapshot at ${snapshot.center.lat}, ${snapshot.center.lng}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <Camera className="w-8 h-8 text-slate-600 mb-1" />
            <p className="text-xs">Snapshot image preview</p>
          </div>
        )}

        {/* Hover zoom overlay */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg border border-slate-700">
            <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
            <span>Click to expand</span>
          </div>
        </div>

        {/* Pinned places count tag */}
        {snapshot.placesCount > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-semibold text-white border border-slate-700/80">
            {snapshot.placesCount} pinned locations
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-2 bg-slate-900/70 border-t border-slate-800/80 flex items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          {onRestoreView && (
            <button
              onClick={() => onRestoreView(snapshot.center, snapshot.zoom)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium flex items-center gap-1 transition-colors shadow-sm"
              title="Pan interactive map back to this snapshot location"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restore Map View</span>
            </button>
          )}

          {onAskAboutSnapshot && (
            <button
              onClick={() => onAskAboutSnapshot(snapshot)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="Ask GeoChat about this snapshot area"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Ask About Area</span>
            </button>
          )}
        </div>

        <button
          onClick={handleDownload}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Download snapshot image"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-white">Map Snapshot Full View</span>
                <span className="text-xs text-slate-400">
                  ({snapshot.center.lat.toFixed(4)}, {snapshot.center.lng.toFixed(4)} &bull; Zoom {snapshot.zoom})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image */}
            <div className="p-2 bg-slate-950 flex items-center justify-center">
              <img
                src={snapshot.imageUrl}
                alt="Full resolution map snapshot"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
