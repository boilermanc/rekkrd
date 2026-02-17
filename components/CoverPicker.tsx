import React, { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { proxyImageUrl } from '../services/imageProxy';
import SpinningRecord from './SpinningRecord';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CoverResult {
  url: string;
  source: string;
  label?: string;
}

interface CoverPickerProps {
  artist: string;
  title: string;
  currentCoverUrl?: string;
  onSelectCover: (url: string) => void;
  onClose: () => void;
}

const CoverPicker: React.FC<CoverPickerProps> = ({ artist, title, currentCoverUrl, onSelectCover, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const [searchQuery, setSearchQuery] = useState(`${artist} ${title}`);
  const [covers, setCovers] = useState<CoverResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const fetchCovers = useCallback(async (query: string) => {
    setLoading(true);
    setFailedUrls(new Set());
    // Split query into artist/title parts — use original if user hasn't changed it
    const parts = query.split(' ');
    const mid = Math.ceil(parts.length / 2);
    const searchArtist = parts.slice(0, mid).join(' ');
    const searchTitle = parts.slice(mid).join(' ') || searchArtist;
    const results = await geminiService.fetchCovers(searchArtist, searchTitle);
    setCovers(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCovers(`${artist} ${title}`);
  }, [artist, title, fetchCovers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchCovers(searchQuery.trim());
    }
  };

  const handleSelect = (url: string) => {
    onSelectCover(url);
    onClose();
  };

  const handleImageError = (url: string) => {
    setFailedUrls(prev => new Set(prev).add(url));
  };

  const visibleCovers = covers.filter(c => !failedUrls.has(c.url));

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Choose cover art" className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1a2528]/95 p-4 md:p-8 backdrop-blur-xl animate-in fade-in duration-300 outline-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] glass-morphism rounded-3xl overflow-hidden border border-[#e8dab2]/[0.10] flex flex-col animate-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8dab2]/[0.06]">
          <h3 className="text-[#f0a882] text-[11px] font-label tracking-[0.3em] uppercase font-bold">
            Choose Cover Art
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1a2528]/50 text-[#e8e2d6] flex items-center justify-center hover:bg-[#e8e2d6] hover:text-[#2d3a3e] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="px-6 pt-4 pb-2">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artist + album..."
              className="flex-1 bg-[#e8dab2]/[0.04] border border-[#e8dab2]/[0.10] rounded-xl px-4 py-3 text-sm text-[#e8e2d6] placeholder:text-[#7d9199]/50 focus:outline-none focus:ring-1 focus:ring-[#dd6e42]/50"
            />
            <button
              type="submit"
              className="bg-[#dd6e42]/20 border border-[#dd6e42]/30 text-[#f0a882] text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-[#dd6e42]/30 transition-all font-label font-bold"
            >
              Search
            </button>
          </div>
        </form>

        {/* Cover Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <SpinningRecord size="w-20 h-20" />
              <p className="text-[#7d9199]/70 text-[10px] font-label tracking-widest uppercase">
                Searching covers...
              </p>
            </div>
          ) : visibleCovers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <svg className="w-12 h-12 text-[#7d9199]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[#7d9199]/70 text-sm text-center">
                No covers found — try adjusting your search
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleCovers.map((cover, i) => {
                const isActive = cover.url === currentCoverUrl;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(cover.url)}
                    className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.03] ${
                      isActive
                        ? 'border-[#dd6e42] shadow-[0_0_20px_rgba(221,110,66,0.3)]'
                        : 'border-[#e8dab2]/[0.06] hover:border-[#e8dab2]/[0.15]'
                    }`}
                  >
                    <div className="aspect-square bg-[#e8dab2]/[0.04]">
                      <img
                        src={proxyImageUrl(cover.url)}
                        alt={cover.label || 'Album cover'}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(cover.url)}
                        loading="lazy"
                      />
                    </div>
                    {/* Source Badge */}
                    <span className={`absolute top-2 left-2 text-[8px] font-label tracking-wider uppercase px-2 py-1 rounded-md ${
                      cover.source === 'iTunes'
                        ? 'bg-[#c45a30]/80 text-[#e8e2d6]'
                        : 'bg-[#4f6d7a]/80 text-[#e8e2d6]'
                    }`}>
                      {cover.source}
                    </span>
                    {/* Active Checkmark */}
                    {isActive && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#dd6e42] rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#e8e2d6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {/* Label */}
                    {cover.label && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a2528]/80 to-transparent p-2 pt-6">
                        <p className="text-[#e8e2d6]/80 text-[9px] truncate">{cover.label}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverPicker;
