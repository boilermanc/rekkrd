import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Zap, Search, Info, ScanLine } from 'lucide-react';
import { supabase } from '../../services/supabaseService';
import { DiscogsRelease, LabelValidation, MatrixResult, PriceData, EbayData } from '../../types/spennd';
import type { LabelScanResult } from '../../types';
import { ConditionGrade, VINYL_CHECKLIST, CD_CHECKLIST, CONDITION_BY_VALUE, scoreToGrade } from '../../constants/conditionGrades';
import LabelScanResultModal from '../LabelScanResultModal';

type Step = 'search' | 'path' | 'label' | 'matrix' | 'grading' | 'results';

const FieldTip = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-4 h-4 rounded-full bg-[#5a8a6e]/20 text-[#5a8a6e]
          text-[12px] font-mono font-bold flex items-center justify-center
          hover:bg-[#5a8a6e]/30 transition-colors focus:outline-none
          focus:ring-1 focus:ring-[#5a8a6e]"
        aria-label="Help"
      >?</button>
      {open && (
        <div className="absolute left-0 top-6 z-50 w-64 bg-white
          border border-paper-dark rounded-xl shadow-lg p-3
          text-sm text-ink font-['Lora'] leading-relaxed">
          {children}
        </div>
      )}
    </span>
  );
};

const SpenndTool: React.FC = () => {
  // State
  const [step, setStep] = useState<Step>('search');
  const [exampleOpen, setExampleOpen] = useState(false);
  const [recordsChecked, setRecordsChecked] = useState(0);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [mode, setMode] = useState<'quick' | 'deep' | null>(null);
  const matrixSkipped = mode === 'quick';

  // Search state
  const [artistQuery, setArtistQuery] = useState('');
  const [titleQuery, setTitleQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscogsRelease[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<DiscogsRelease | null>(null);

  // Label scan state
  const [labelScanning, setLabelScanning] = useState(false);
  const [labelScanError, setLabelScanError] = useState<string | null>(null);
  const [lastLabelScan, setLastLabelScan] = useState<LabelScanResult | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingLabelResult, setPendingLabelResult] = useState<LabelScanResult | null>(null);
  const labelFileRef = useRef<HTMLInputElement>(null);

  // Label state
  const [labelInputs, setLabelInputs] = useState({
    labelName: '',
    catalog: '',
    year: '',
    yearUnknown: false,
    country: '',
    countryUnknown: false
  });
  const [labelValidation, setLabelValidation] = useState<LabelValidation | null>(null);

  // Matrix state
  const [matrixInputs, setMatrixInputs] = useState<Record<string, string>>({});
  const [sideSkipped, setSideSkipped] = useState<Record<string, boolean>>({});
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixResult, setMatrixResult] = useState<MatrixResult | null>(null);

  // Grading state
  const [selectedFormat, setSelectedFormat] = useState<'vinyl' | 'cd' | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grade, setGrade] = useState<ConditionGrade | null>(null);
  const [conflictNote, setConflictNote] = useState<string | null>(null);

  // Release notes state
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  // Results state (placeholders for now)
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [ebayData, setEbayData] = useState<EbayData | null>(null);

  // Reset notesExpanded when release changes
  useEffect(() => {
    setNotesExpanded(false);
  }, [selectedRelease]);

  // Label scan handler
  const handleLabelScan = async (file: File) => {
    setLabelScanning(true);
    setLabelScanError(null);

    try {
      const base64DataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const [header, base64Data] = base64DataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch('/api/identify-label', {
        method: 'POST',
        headers,
        body: JSON.stringify({ base64Data, mimeType }),
      });

      if (!res.ok) throw new Error('Label scan failed');

      const result = await res.json();

      if (!result) {
        setLabelScanError('Could not read the label — try again');
        return;
      }

      if (typeof result.confidence_score === 'number' && result.confidence_score < 0.55) {
        setLabelScanError('Label image too unclear — try better lighting');
        return;
      }

      // Show the label result modal for user to confirm
      setPendingLabelResult(result as LabelScanResult);
      setShowLabelModal(true);
    } catch {
      setLabelScanError('Could not read the label — try again');
    } finally {
      setLabelScanning(false);
    }
  };

  // Label modal handlers
  const handleLabelModalConfirm = async (_matrix: string) => {
    if (!pendingLabelResult) return;
    setShowLabelModal(false);

    const result = pendingLabelResult;
    setLastLabelScan(result);

    if (result.artist) setArtistQuery(result.artist);
    if (result.album_title) setTitleQuery(result.album_title);

    // Trigger search with label data
    if (result.artist || result.album_title) {
      const query = `${result.artist || ''} ${result.album_title || ''}`.trim();
      if (query) {
        setSearchLoading(true);
        setSearchError(null);
        setSearchResults([]);
        setSelectedRelease(null);
        setReleaseNotes(null);
        setMatrixResult(null);
        setShowAllVersions(false);

        try {
          const params = new URLSearchParams({ q: query });
          if (result.catalog_number) params.set('catno', result.catalog_number);
          const response = await fetch(`/api/spennd/search?${params}`);
          if (!response.ok) throw new Error('Search failed');
          const data = await response.json();
          setSearchResults(data);
          if (data.length > 0) handleSelectRelease(data[0]);
        } catch {
          setSearchError("We're having trouble reaching the database. Try again in a moment.");
        } finally {
          setSearchLoading(false);
        }
      }
    }

    setPendingLabelResult(null);
  };

  const handleLabelModalRetry = () => {
    setShowLabelModal(false);
    setPendingLabelResult(null);
    labelFileRef.current?.click();
  };

  const handleLabelModalCancel = () => {
    setShowLabelModal(false);
    setPendingLabelResult(null);
  };

  // Step 1: Search
  const combinedQuery = `${artistQuery} ${titleQuery}`.trim();

  const handleSearch = async () => {
    if (!combinedQuery) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedRelease(null);
    setReleaseNotes(null);
    setMatrixResult(null);
    setShowAllVersions(false);

    try {
      const response = await fetch(`/api/spennd/search?q=${encodeURIComponent(combinedQuery)}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data);

      // Auto-select the top result (most relevant pressing)
      if (data.length > 0) {
        handleSelectRelease(data[0]);
      }
    } catch (error) {
      setSearchError("We're having trouble reaching the database. Try again in a moment.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectRelease = (release: DiscogsRelease) => {
    setSelectedRelease(release);
    setReleaseNotes(null);
    setShowAllVersions(false);

    // Fetch notes early via matrix endpoint
    const params = new URLSearchParams({
      release_id: release.id.toString(),
      matrix_a: '',
      matrix_b: ''
    });
    fetch(`/api/spennd/matrix?${params}`)
      .then(r => r.json())
      .then((data: MatrixResult) => {
        setReleaseNotes(data.notes ?? null);
        setMatrixResult(data);
      })
      .catch(() => {});
  };

  // Step 2a: Label
  const handleLabelSubmit = async () => {
    if (!selectedRelease) return;

    try {
      const params = new URLSearchParams({
        release_id: selectedRelease.id.toString(),
        catalog: labelInputs.catalog,
        country: labelInputs.country
      });

      const response = await fetch(`/api/spennd/label-validate?${params}`);
      const data: LabelValidation = await response.json();

      setLabelValidation(data);

      // Show validation result briefly, then advance
      setTimeout(() => {
        setStep('matrix');
      }, 1500);
    } catch (error) {
      console.error('Label validation error:', error);
      setStep('matrix');
    }
  };

  // Detect promo/white label
  const hasPromoKeyword = [labelInputs.labelName, labelInputs.catalog].some(val =>
    /promo|not for sale|promotional/i.test(val)
  );
  const hasWhiteLabelKeyword = /white label|white/i.test(labelInputs.labelName);

  // Step 2b: Matrix - useEffect to pre-load matrix data
  useEffect(() => {
    if (step === 'matrix' && selectedRelease && !matrixResult) {
      const fetchMatrixData = async () => {
        try {
          const params = new URLSearchParams({
            release_id: selectedRelease.id.toString(),
            matrix_a: '',
            matrix_b: ''
          });
          const response = await fetch(`/api/spennd/matrix?${params}`);
          const data: MatrixResult = await response.json();
          setMatrixResult(data);
          setReleaseNotes(data.notes ?? null);
        } catch (error) {
          console.error('Matrix pre-load error:', error);
        }
      };
      fetchMatrixData();
    }
  }, [step, selectedRelease, matrixResult]);

  const handleMatrixSubmit = async () => {
    if (!selectedRelease) return;

    setMatrixLoading(true);

    try {
      const params = new URLSearchParams({
        release_id: selectedRelease.id.toString(),
        matrix_a: matrixInputs['A'] || '',
        matrix_b: matrixInputs['B'] || ''
      });

      const response = await fetch(`/api/spennd/matrix?${params}`);
      const data: MatrixResult = await response.json();
      setMatrixResult(data);
      setReleaseNotes(data.notes ?? null);

      // Show result briefly, then advance
      setTimeout(() => {
        setStep('grading');
      }, 2000);
    } catch (error) {
      console.error('Matrix lookup error:', error);
      setStep('grading');
    } finally {
      setMatrixLoading(false);
    }
  };

  const handleMatrixSkip = () => {
    setMatrixResult(null);
    setStep('grading');
  };

  // Step 3: Grading
  const computeAndAdvance = () => {
    const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0);
    let computedGrade = scoreToGrade(totalScore);

    // Conflict check for vinyl
    if (selectedFormat === 'vinyl' && answers.visual <= 1 && answers.playback === 3) {
      const grades: ConditionGrade[] = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'];
      const idx = grades.indexOf(computedGrade);
      if (idx < grades.length - 1) {
        computedGrade = grades[idx + 1];
      }
      setConflictNote("Your record looks better than it sounds. We adjusted the grade down — condition is based on the worst factor, not the average.");
    }

    setGrade(computedGrade);
    setRecordsChecked(prev => prev + 1);

    // Fire price fetches
    if (selectedRelease) {
      fetch(`/api/spennd/price?release_id=${selectedRelease.id}&condition=${computedGrade}`)
        .then(r => r.json())
        .then(setPriceData)
        .catch(() => setPriceData({ available: false } as PriceData));

      fetch(`/api/spennd/ebay?q=${encodeURIComponent(`${selectedRelease.artist} ${selectedRelease.title} vinyl`)}`)
        .then(r => r.json())
        .then(setEbayData)
        .catch(() => setEbayData({ available: false } as EbayData));
    }

    setStep('results');
  };

  // Render based on step
  if (step === 'search') {
    return (
      <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <h3 className="font-display text-2xl sm:text-3xl text-ink mb-2">
          What record do you have?
        </h3>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-[#5a8a6e] mb-1">
              Artist
            </label>
            <input
              type="text"
              value={artistQuery}
              onChange={(e) => setArtistQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Fleetwood Mac"
              className="w-full bg-paper-dark rounded-xl py-3 px-4 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-[#5a8a6e] mb-1 mt-1">
              Album Title
            </label>
            <input
              type="text"
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Rumours"
              className="w-full bg-paper-dark rounded-xl py-3 px-4 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e]"
            />
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#5a8a6e]/20" />
          <span className="text-xs font-mono uppercase tracking-wide text-[#5a8a6e]/60">or</span>
          <div className="flex-1 h-px bg-[#5a8a6e]/20" />
        </div>

        {/* ── Scan Label ───────────────────────────────────────── */}
        <input
          ref={labelFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLabelScan(file);
            e.target.value = '';
          }}
          className="hidden"
          aria-hidden="true"
        />

        <button
          onClick={() => labelFileRef.current?.click()}
          disabled={labelScanning}
          className="w-full flex items-center justify-center gap-2 border border-[#5a8a6e] text-[#5a8a6e] rounded-full py-3 px-6 font-serif hover:bg-[#5a8a6e]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {labelScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading label...
            </>
          ) : (
            <>
              <ScanLine className="w-4 h-4" />
              Scan Label
            </>
          )}
        </button>

        {labelScanError && (
          <p className="mt-2 font-serif text-sm text-red-600">{labelScanError}</p>
        )}

        <button
          onClick={handleSearch}
          disabled={searchLoading || !combinedQuery}
          className="mt-3 w-full sm:w-auto bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Search →
        </button>

        <p className="font-serif text-sm italic text-[#5a8a6e] mt-2">
          Enter the artist name and album title separately for best results.
        </p>

        {searchLoading && (
          <div className="flex justify-center mt-4">
            <Loader2 className="animate-spin text-[#5a8a6e]" size={24} />
          </div>
        )}

        {searchError && (
          <div className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-200">
            <p className="text-amber-800 font-serif text-sm">{searchError}</p>
            <button
              onClick={handleSearch}
              className="mt-2 text-[#5a8a6e] font-serif text-sm underline"
            >
              Retry
            </button>
          </div>
        )}

        {!selectedRelease && searchResults.length > 0 && (
          <>
            <div className="mt-4 flex flex-col gap-2">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectRelease(result)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-dark transition-colors text-left"
                >
                  <img
                    src={result.thumb || '/placeholder-vinyl.png'}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover bg-paper-dark"
                  />
                  <div className="flex-1">
                    <div className="font-serif text-base text-ink font-medium">
                      {result.artist} — {result.title}
                    </div>
                    <div className="font-mono text-[13px] text-ink/80">
                      {result.year} · {result.label} · {result.country}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-3 font-serif text-sm italic text-ink/80">
              Seeing multiple versions? That's normal. The same album was often pressed in different countries and years — each pressing has a different value. We'll help you figure out which one you have next.
            </p>
          </>
        )}

        {selectedRelease && (
          <div className="mt-4">
            <p className="font-serif text-sm text-ink/80 mb-3">
              We found this pressing — does it look right?
            </p>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-dark">
              <img
                src={selectedRelease.thumb || '/placeholder-vinyl.png'}
                alt=""
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="font-serif text-base text-ink font-medium">
                  {selectedRelease.artist} — {selectedRelease.title}
                </div>
                <div className="font-mono text-[13px] text-ink/80">
                  {selectedRelease.year} · {selectedRelease.label} · {selectedRelease.country}
                </div>
              </div>
            </div>

            {releaseNotes && (
              <div className="mt-3 bg-white border border-paper-dark rounded-xl
                p-4 text-sm font-['Lora'] text-ink leading-relaxed">
                <p className="font-mono text-[12px] uppercase tracking-wide
                  text-[#5a8a6e] mb-1.5">Discogs Notes</p>
                <p className={`text-ink-soft ${notesExpanded ? '' : 'line-clamp-4'}`}>
                  {releaseNotes}
                </p>
                {!notesExpanded && (
                  <button
                    onClick={() => setNotesExpanded(true)}
                    className="text-xs text-[#5a8a6e] underline underline-offset-2
                      mt-1 font-mono"
                  >
                    Read more
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setStep('path')}
              className="mt-4 w-full bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors"
            >
              Continue →
            </button>

            {searchResults.length > 1 && (
              <>
                <button
                  onClick={() => setShowAllVersions(v => !v)}
                  className="mt-2 w-full text-sm text-ink/80 underline"
                >
                  {showAllVersions ? '▾' : '▸'} See other versions ({searchResults.length - 1})
                </button>

                {showAllVersions && (
                  <div className="mt-2 flex flex-col gap-1">
                    {searchResults
                      .filter(r => r.id !== selectedRelease.id)
                      .map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectRelease(result)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-paper-dark transition-colors text-left"
                        >
                          <img
                            src={result.thumb || '/placeholder-vinyl.png'}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-paper-dark"
                          />
                          <div className="flex-1">
                            <div className="font-serif text-base text-ink font-medium">
                              {result.artist} — {result.title}
                            </div>
                            <div className="font-mono text-[13px] text-ink/80">
                              {result.year} · {result.label} · {result.country}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedRelease && !searchLoading && searchResults.length === 0 && combinedQuery && !searchError && (
          <p className="mt-3 font-serif text-sm italic text-ink/80">
            Nothing found for '{artistQuery}{titleQuery ? ` — ${titleQuery}` : ''}'. Try checking the spelling, or search with just the artist name.
          </p>
        )}

        <LabelScanResultModal
          isOpen={showLabelModal}
          brand="spennd"
          catalogNumber={pendingLabelResult?.catalog_number ?? null}
          labelName={pendingLabelResult?.label_name ?? null}
          artist={pendingLabelResult?.artist ?? null}
          title={pendingLabelResult?.album_title ?? null}
          year={pendingLabelResult?.year ?? null}
          side={pendingLabelResult?.side ?? null}
          confidenceScore={pendingLabelResult?.confidence_score ?? 0}
          discogsMatch={null}
          confirmLabel="Continue to Grading"
          onConfirm={handleLabelModalConfirm}
          onRetry={handleLabelModalRetry}
          onCancel={handleLabelModalCancel}
        />
      </div>
    );
  }

  if (step === 'path') {
    return (
      <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <button
          onClick={() => setStep('search')}
          className="text-sm text-ink/80 underline mb-4"
        >
          ← Change record
        </button>

        {selectedRelease && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-dark mb-6">
            <img
              src={selectedRelease.thumb || '/placeholder-vinyl.png'}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="font-serif text-base text-ink font-medium">
                {selectedRelease.artist} — {selectedRelease.title}
              </div>
              <div className="font-mono text-[13px] text-ink/80">
                {selectedRelease.year} · {selectedRelease.label} · {selectedRelease.country}
              </div>
            </div>
          </div>
        )}

        <h3 className="font-display text-2xl sm:text-3xl text-ink mb-2">
          How thorough do you want to be?
        </h3>
        <p className="font-serif text-base text-ink/80 mb-6">
          Choose your path based on how much time you have.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quick Check */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col">
            <Zap className="text-[#5a8a6e] mb-3" size={28} />
            <h4 className="font-display text-xl text-ink mb-2">Quick Check</h4>
            <p className="font-serif text-sm text-ink/80 mb-4 flex-1">
              Skip straight to grading. Get a price in under a minute.
            </p>
            <button
              onClick={() => {
                setMode('quick');
                setMatrixResult(null);
                setStep('grading');
              }}
              className="w-full bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors"
            >
              Get Price Fast
            </button>
          </div>

          {/* Deep Dive */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col">
            <Search className="text-[#5a8a6e] mb-3" size={28} />
            <h4 className="font-display text-xl text-ink mb-2">Deep Dive</h4>
            <p className="font-serif text-sm text-ink/80 mb-4 flex-1">
              Verify your pressing with label and matrix identification for maximum confidence.
            </p>
            <button
              onClick={() => {
                setMode('deep');
                setStep('label');
              }}
              className="w-full border border-[#5a8a6e] text-[#5a8a6e] rounded-full py-3 px-6 font-serif hover:bg-[#5a8a6e]/5 transition-colors"
            >
              Identify My Pressing
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'deep' && step === 'label') {
    return (
      <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <button
          onClick={() => {
            setSelectedRelease(null);
            setReleaseNotes(null);
            setMatrixResult(null);
            setStep('search');
          }}
          className="text-sm text-ink/80 underline mb-4"
        >
          ← Change record
        </button>

        <h3 className="font-display text-2xl sm:text-3xl text-ink mt-4 mb-2">
          Let's read your label first
        </h3>

        <p className="font-serif text-base text-ink mb-4 max-w-prose">
          Before we look at the matrix, the label on your record already tells us a lot. Pick up the record, look at the center paper label, and answer these questions.
        </p>

        {releaseNotes && (
          <div className="bg-white border border-paper-dark rounded-xl
            p-4 mb-4 text-sm font-['Lora'] text-ink leading-relaxed">
            <p className="font-mono text-[12px] uppercase tracking-wide
              text-[#5a8a6e] mb-1.5">About This Pressing</p>
            <p className={`text-ink-soft ${notesExpanded ? '' : 'line-clamp-4'}`}>
              {releaseNotes}
            </p>
            {!notesExpanded && (
              <button
                onClick={() => setNotesExpanded(true)}
                className="text-xs text-[#5a8a6e] underline underline-offset-2
                  mt-1 font-mono"
              >
                Read more
              </button>
            )}
          </div>
        )}

        <div className="bg-pearl-beige rounded-xl p-3 mb-5">
          <p className="font-serif text-sm text-ink">
            📌 Make sure you're reading the label on the actual vinyl record — not the cardboard sleeve or cover.
          </p>
        </div>

        <button
          onClick={() => setExampleOpen(o => !o)}
          className="flex items-center gap-2 text-sm text-[#5a8a6e]
            font-mono underline underline-offset-2 mb-4"
        >
          {exampleOpen ? '▾' : '▸'} See a real label example
        </button>

        {exampleOpen && (
          <div className="bg-white border border-paper-dark rounded-xl
            p-4 mb-5 text-sm font-['Lora'] text-ink leading-relaxed">
            <p className="font-semibold mb-2">
              Elvis Costello — Armed Forces (US, 1979)
            </p>
            <ul className="flex flex-col gap-1.5 text-ink-soft">
              <li><span className="font-mono text-[#5a8a6e] text-xs">
                LABEL NAME</span> — Columbia (red label)</li>
              <li><span className="font-mono text-[#5a8a6e] text-xs">
                CATALOG NUMBER</span> — JC 35709 (left side of label)</li>
              <li><span className="font-mono text-[#5a8a6e] text-xs">
                YEAR</span> — ℗ 1978 (right side near center)</li>
              <li><span className="font-mono text-[#5a8a6e] text-xs">
                COUNTRY</span> — Made in USA</li>
              <li><span className="font-mono text-[#5a8a6e] text-xs">
                NOTE</span> — "AL 35709" on the right side is NOT the catalog
                number — that's the matrix identifier. You'll enter that in
                the next step.</li>
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Label Name */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-[#5a8a6e] mb-1">
              Label Name
              <FieldTip>
                Look at the color and name of the center paper circle on the record
                itself — not the sleeve. The label name is usually printed at the top
                in large text. Common examples: Columbia (red label), Parlophone
                (red/black), Warner Bros. (tan/gold), Harvest (green), RCA (orange).
                The color alone can tell you a lot.
              </FieldTip>
            </label>
            <input
              type="text"
              value={labelInputs.labelName}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, labelName: e.target.value }))}
              placeholder="e.g. Columbia, Parlophone, Warner Bros."
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e]"
            />
            <p className="mt-1 font-serif text-sm text-ink-soft">
              The company name printed on the center label — usually at the top.
            </p>
          </div>

          {/* Catalog Number */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-[#5a8a6e] mb-1">
              Catalog Number
              <FieldTip>
                The catalog number is printed on the left or right side of the center
                label — usually a mix of letters and numbers like "JC 35709" or
                "BSK 3010". On the Elvis Costello Armed Forces label for example,
                "JC 35709" appears on the left side. Don't confuse it with "AL 35709"
                which appears on the right — that's the matrix identifier, not the
                catalog number.
              </FieldTip>
            </label>
            <input
              type="text"
              value={labelInputs.catalog}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, catalog: e.target.value }))}
              placeholder="e.g. JC 35709 or BSK 3010"
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e]"
            />
            <p className="mt-1 font-serif text-sm text-ink-soft">
              Usually on the left or right side of the label. Includes letters and numbers.
            </p>
          </div>

          {/* Year */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-[#5a8a6e] mb-1">
              Year
              <FieldTip>
                Look for a ℗ symbol (phonogram copyright) followed by a year — e.g.
                "℗ 1978". This is the year the recording was copyrighted, which is
                often (but not always) the original release year. It's usually in
                small print on the right side of the label near the center hole.
                Some labels print "© 1978" instead — either counts.
              </FieldTip>
            </label>
            <input
              type="text"
              value={labelInputs.year}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, year: e.target.value }))}
              disabled={labelInputs.yearUnknown}
              placeholder="e.g. 1979"
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e] disabled:opacity-50"
            />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={labelInputs.yearUnknown}
                onChange={(e) => setLabelInputs(prev => ({ ...prev, yearUnknown: e.target.checked, year: '' }))}
                className="rounded"
              />
              <span className="font-serif text-sm text-ink">Can't find a year</span>
            </label>
          </div>

          {/* Country */}
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-[#5a8a6e] mb-1">
              Country
              <FieldTip>
                Look for text saying "Made in USA", "Printed in UK", "Fabricado en
                México" or similar — usually in very small print near the edge of the
                label or around the center hole. Some labels don't print this at all,
                especially older pressings. If you can't find it, check the sleeve
                — it's sometimes printed on the back cover or inner sleeve instead.
              </FieldTip>
            </label>
            <input
              type="text"
              value={labelInputs.country}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, country: e.target.value }))}
              disabled={labelInputs.countryUnknown}
              placeholder="e.g. Made in USA"
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e] disabled:opacity-50"
            />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={labelInputs.countryUnknown}
                onChange={(e) => setLabelInputs(prev => ({ ...prev, countryUnknown: e.target.checked, country: '' }))}
                className="rounded"
              />
              <span className="font-serif text-sm text-ink">Doesn't say</span>
            </label>
          </div>
        </div>

        {/* Special detection callouts */}
        {hasPromoKeyword && (
          <div className="mt-4 bg-pearl-beige rounded-xl p-3">
            <p className="font-serif text-sm text-ink">
              Promo copies were pressed for radio stations before commercial release. They can be more collectible and may have different matrix strings.
            </p>
          </div>
        )}

        {hasWhiteLabelKeyword && (
          <div className="mt-4 bg-pearl-beige rounded-xl p-3">
            <p className="font-serif text-sm text-ink">
              White labels are usually test pressings or very early promos — sometimes rare and valuable.
            </p>
          </div>
        )}

        <button
          onClick={handleLabelSubmit}
          className="mt-6 w-full bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors"
        >
          Next: Find the Matrix →
        </button>

        {labelValidation && (
          <div className={`mt-4 rounded-xl p-3 ${labelValidation.confirmed ? 'bg-green-50 border border-green-200' : 'bg-paper-dark'}`}>
            <p className={`font-serif text-sm ${labelValidation.confirmed ? 'text-green-800' : 'text-ink/80'}`}>
              {labelValidation.confirmed ? '✓ Label confirmed' : "We'll continue — the matrix may tell us more."}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'deep' && step === 'matrix') {
    const sides = matrixResult?.is_double_album ? ['A', 'B', 'C', 'D'] : ['A', 'B'];

    return (
      <div className="max-w-2xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setStep('label')}
            className="text-sm text-ink/80 underline"
          >
            ← Back to label
          </button>
          {selectedRelease && (
            <div className="font-mono text-[13px] text-ink/80 text-right">
              {selectedRelease.artist} — {selectedRelease.title}
            </div>
          )}
        </div>

        <h3 className="font-display text-2xl sm:text-3xl text-ink mb-4">
          Now let's look at the matrix
        </h3>

        {/* Education panel */}
        <div className="bg-paper-dark rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[20px]">💿</span>
            <h4 className="font-serif text-base font-bold text-ink">What's a pressing?</h4>
          </div>
          <p className="font-serif text-sm text-ink">
            The same album gets manufactured in batches called pressings. An original pressing can be worth many times more than a later reissue of the same album. The matrix is etched into the vinyl itself and tells us exactly which pressing you have.
          </p>
        </div>

        {/* Instruction panel */}
        <div className="bg-white border border-paper-dark rounded-xl p-5 mb-5">
          <div className="font-mono text-xs uppercase text-[#5a8a6e] mb-3">
            HOW TO FIND YOUR MATRIX
          </div>
          <ol className="font-serif text-sm text-ink space-y-1 mb-4">
            <li>1. Pick up your record</li>
            <li>2. Hold it at eye level, tilted toward a lamp or window</li>
            <li>3. Look at the shiny area between the last song's groove and the paper label</li>
            <li>4. You'll see hand-etched or stamped characters — letters, numbers, sometimes dashes</li>
          </ol>

          {/* SVG diagram */}
          <div className="flex justify-center mb-3">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="75" fill="#2a2016" />
              <circle cx="80" cy="80" r="35" fill="#e8dab2" />
              <circle cx="80" cy="80" r="55" fill="none" stroke="rgba(90,138,110,0.6)" strokeWidth="20" opacity="0.3" />
              <text x="80" y="85" textAnchor="middle" fontSize="9" fill="#5a8a6e" fontFamily="monospace">
                matrix lives here
              </text>
            </svg>
          </div>

          <div className="bg-paper-dark rounded px-3 py-1.5 font-mono text-sm text-ink inline-block">
            e.g.  JC 35709-1A  or  PORKY PRIME CUT
          </div>
        </div>

        {/* Known matrices panel */}
        {matrixResult && !matrixResult.no_matrix_data && matrixResult.all_known_matrices.length > 0 ? (
          <div className="bg-white border border-paper-dark rounded-xl p-4 mb-5">
            <div className="font-mono text-xs uppercase text-[#5a8a6e] mb-1">
              WHAT TO LOOK FOR
            </div>
            <p className="font-serif text-sm text-ink mb-2">
              For this pressing, collectors have documented:
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {matrixResult.all_known_matrices.map((matrix, idx) => (
                <span key={idx} className="bg-paper-dark rounded px-2 py-0.5 font-mono text-xs text-ink">
                  {matrix}
                </span>
              ))}
            </div>
            <p className="font-serif text-sm italic text-ink-soft">
              Any of these is a match. Type exactly what you see.
            </p>
          </div>
        ) : matrixResult?.no_matrix_data ? (
          <div className="bg-pearl-beige rounded-xl p-4 mb-5">
            <p className="font-serif text-sm text-ink">
              We don't have matrix data on file for this pressing yet. Type exactly what you see and we'll search for it.
            </p>
          </div>
        ) : null}

        {/* Limitations */}
        <div className="border-l-4 border-[#5a8a6e] bg-paper-dark rounded-xl p-4 mb-5">
          <div className="font-mono text-xs uppercase text-[#5a8a6e] mb-1">
            A NOTE ON MATRIX MATCHING
          </div>
          <p className="font-serif text-sm text-ink">
            Matrix data in Discogs is community-contributed. Coverage is excellent for common and collectible pressings. If we can't match yours, we'll say so and explain what it means for the price range.
          </p>
        </div>

        {/* Matrix inputs */}
        <div className="space-y-4 mb-5">
          {sides.map((side) => (
            <div key={side}>
              <div className="font-mono text-xs uppercase tracking-wide text-[#5a8a6e] mb-1">
                SIDE {side} MATRIX
                {side === 'A' && (
                  <FieldTip>
                    The matrix is hand-etched or stamped into the vinyl itself — not
                    printed on the label. Hold the record at eye level and tilt it toward
                    a light. Look at the shiny ring between where the last song ends and
                    where the center label begins. You'll see small characters scratched
                    in. For Armed Forces for example, look for something like
                    "AL 35709-1A" — the "AL" prefix, catalog number, side number, and
                    a letter indicating the stamper. Type exactly what you see including
                    any dashes or letters after the number.
                  </FieldTip>
                )}
                {side === 'B' && (
                  <FieldTip>
                    Flip the record over and repeat — look at the dead wax on the B side
                    label. The B side matrix usually has a "2" instead of "1" in the
                    sequence — e.g. "AL 35709-2A". You may also see additional markings
                    like "STERLING" or "RL" — these are mastering engineer signatures and
                    are worth noting. Type everything you see and we'll sort out what's
                    what.
                  </FieldTip>
                )}
              </div>
              <div className="font-mono text-[11px] italic text-ink/80 mb-2">
                Look near the {side} label
              </div>
              <input
                type="text"
                value={matrixInputs[side] || ''}
                onChange={(e) => setMatrixInputs(prev => ({ ...prev, [side]: e.target.value }))}
                disabled={sideSkipped[side]}
                className="w-full bg-paper-dark rounded-xl font-mono py-2 px-3 text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e] disabled:opacity-50"
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={sideSkipped[side] || false}
                  onChange={(e) => {
                    setSideSkipped(prev => ({ ...prev, [side]: e.target.checked }));
                    if (e.target.checked) {
                      setMatrixInputs(prev => ({ ...prev, [side]: '' }));
                    }
                  }}
                  className="rounded"
                />
                <span className="font-serif text-sm text-ink">I can't make this out</span>
              </label>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleMatrixSubmit}
            disabled={matrixLoading}
            className="flex-1 bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors disabled:opacity-50"
          >
            {matrixLoading ? 'Identifying...' : 'Identify My Pressing →'}
          </button>
          <button
            onClick={handleMatrixSkip}
            className="text-ink/80 underline font-serif text-sm"
          >
            Skip this step →
          </button>
        </div>

        {/* Result banner */}
        {matrixResult && matrixLoading && (
          <div className="mt-4">
            {matrixResult.matched ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="font-serif text-sm text-green-800">
                  ✓ Matrix matched — {matrixResult.pressing_label}
                </p>
              </div>
            ) : matrixResult.partial_match ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="font-serif text-sm text-amber-800">
                  Partial match — one side confirmed.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="font-serif text-sm text-amber-800">
                  Matrix not matched. We'll show pricing with a note about the uncertainty.
                </p>
              </div>
            )}

            {/* Engineer notes */}
            {matrixResult.engineer_notes.length > 0 && (
              <div className="mt-3 space-y-2">
                {matrixResult.engineer_notes.map((note, idx) => (
                  <div key={idx} className="bg-pearl-beige rounded-xl p-3">
                    <div className="font-mono text-[12px] uppercase text-[#5a8a6e] mb-1">
                      {note.mark}
                    </div>
                    <p className="font-serif text-sm text-ink">
                      {note.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (step === 'grading') {
    // Format selector first
    if (!selectedFormat) {
      return (
        <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
          <h3 className="font-display text-2xl sm:text-3xl text-ink mb-6 text-center">
            Is this a vinyl record or a CD?
          </h3>

          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <button
              onClick={() => setSelectedFormat('vinyl')}
              className="bg-white border-2 border-paper-dark hover:border-[#5a8a6e] rounded-2xl p-6 text-center transition-colors"
            >
              <div className="text-[32px] mb-2">💿</div>
              <div className="font-serif text-ink">Vinyl</div>
            </button>
            <button
              onClick={() => setSelectedFormat('cd')}
              className="bg-white border-2 border-paper-dark hover:border-[#5a8a6e] rounded-2xl p-6 text-center transition-colors"
            >
              <div className="text-[32px] mb-2">📀</div>
              <div className="font-serif text-ink">CD</div>
            </button>
          </div>
        </div>
      );
    }

    // Checklist questions
    const checklist = selectedFormat === 'vinyl' ? VINYL_CHECKLIST : CD_CHECKLIST;
    const currentQ = checklist[currentQuestionIndex];

    return (
      <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[12px] text-[#5a8a6e] uppercase tracking-wide">
            QUESTION {currentQuestionIndex + 1} OF {checklist.length}
          </div>
          <div className="inline-block bg-paper-dark text-ink font-mono text-[11px] rounded-full px-2 py-0.5 uppercase">
            {selectedFormat}
          </div>
        </div>

        {currentQuestionIndex === 0 && (
          <p className="font-serif text-base text-ink mb-6 max-w-prose">
            Condition is the other half of the value equation. A Near Mint copy can be worth 3-5x a Very Good copy of the same pressing. Answer these questions and we'll give you the standard industry grade.
          </p>
        )}

        <h4 className="font-serif text-lg text-ink font-medium mb-4">
          {currentQ.question}
        </h4>

        <div className="flex flex-col gap-1">
          {currentQ.options.map((option) => {
            const isSelected = answers[currentQ.id] === option.score;
            return (
              <button
                key={option.score}
                onClick={() => {
                  setAnswers(prev => ({ ...prev, [currentQ.id]: option.score }));
                  if (currentQuestionIndex < checklist.length - 1) {
                    setTimeout(() => setCurrentQuestionIndex(i => i + 1), 400);
                  } else {
                    setTimeout(() => computeAndAdvance(), 400);
                  }
                }}
                className={`w-full text-left py-3 px-3 rounded-xl cursor-pointer transition-colors ${
                  isSelected ? 'bg-paper-dark' : 'hover:bg-paper-dark/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 mt-0.5 flex items-center justify-center ${
                    isSelected ? 'bg-[#5a8a6e] border-[#5a8a6e]' : 'border-paper-darker'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="font-serif text-base text-ink leading-snug flex-1">
                    {option.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {currentQuestionIndex > 0 && (
          <button
            onClick={() => setCurrentQuestionIndex(i => i - 1)}
            className="mt-4 text-sm text-ink/80 underline cursor-pointer"
          >
            ← Previous question
          </button>
        )}

        {matrixSkipped && (
          <button
            onClick={() => {
              setMode('deep');
              setSelectedFormat(null);
              setCurrentQuestionIndex(0);
              setAnswers({});
              setStep('label');
            }}
            className="mt-3 text-sm text-[#5a8a6e] underline underline-offset-2 cursor-pointer font-serif"
          >
            Want pressing verification? Switch to Deep Dive
          </button>
        )}
      </div>
    );
  }

  // Step 4: Results - streamlined implementation
  if (step === 'results' && grade) {
    const gradeInfo = CONDITION_BY_VALUE[grade];
    const fmt = (n: number | null) => n ? `$${Math.round(n)}` : '--';

    return (
      <div className="max-w-2xl mx-auto space-y-4 px-4">
        {/* Session nudge */}
        {recordsChecked >= 3 && !nudgeDismissed && (
          <div className="bg-pearl-beige border border-[#5a8a6e]/30 rounded-2xl p-5">
            <div className="font-serif text-base font-bold text-ink mb-1">
              You've checked {recordsChecked} records.
            </div>
            <p className="font-serif text-sm text-ink/80 mb-4">
              Rekk<span className="text-[#c45a30]">r</span>d tracks your whole collection automatically.
            </p>
            <div className="flex gap-3">
              <a href="/signup" className="bg-[#5a8a6e] text-white rounded-full py-2 px-5 font-serif text-sm hover:bg-[#3d6b54] transition-colors">
                Start free →
              </a>
              <button onClick={() => setNudgeDismissed(true)} className="text-sm text-ink/80 underline">
                Keep going
              </button>
            </div>
          </div>
        )}

        {/* Scan summary pill */}
        {lastLabelScan?.catalog_number && lastLabelScan?.label_name && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#5a8a6e]/10 text-[#5a8a6e] rounded-full px-3 py-1 font-mono text-xs">
              <ScanLine className="w-3 h-3" />
              Scanned: {lastLabelScan.catalog_number} · {lastLabelScan.label_name}
            </span>
          </div>
        )}

        {/* Grade card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="font-display text-[64px] text-ink leading-none">{gradeInfo.shortLabel}</div>
          <div className="font-serif text-[20px] text-ink/80 mt-1">{gradeInfo.label}</div>
          <div className="font-serif text-sm italic text-ink-soft mt-1">{gradeInfo.description}</div>
        </div>

        {/* Pricing panel */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-display text-[20px] text-ink mb-4">What it's worth</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="font-mono text-[11px] uppercase text-ink/80">DISCOGS</div>
              {priceData?.available ? (
                <div className="flex gap-4 mt-2">
                  <div>
                    <div className="font-display text-[24px] text-ink">{fmt(priceData.median)}</div>
                    <div className="font-mono text-[11px] text-ink/80">MEDIAN</div>
                  </div>
                </div>
              ) : <p className="text-ink/80 text-sm mt-2">Loading...</p>}
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase text-ink/80">EBAY</div>
              {ebayData?.available ? (
                <div className="flex gap-4 mt-2">
                  <div>
                    <div className="font-display text-[24px] text-ink">{fmt(ebayData.median)}</div>
                    <div className="font-mono text-[11px] text-ink/80">MEDIAN</div>
                  </div>
                </div>
              ) : <p className="text-ink/80 text-sm mt-2">Loading...</p>}
            </div>
          </div>
        </div>

        {/* Matrix skipped banner (Quick Check path) */}
        {matrixSkipped && (
          <div className="bg-stone-100 rounded-2xl p-4 flex items-start gap-3">
            <Info className="text-stone-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-serif text-sm text-ink/80">
                Matrix not checked. Run a Deep Dive for pressing verification.
              </p>
              <button
                onClick={() => {
                  setMode('deep');
                  setGrade(null);
                  setAnswers({});
                  setSelectedFormat(null);
                  setPriceData(null);
                  setEbayData(null);
                  setConflictNote(null);
                  setCurrentQuestionIndex(0);
                  setStep('label');
                }}
                className="font-serif text-sm text-[#5a8a6e] underline underline-offset-2 mt-1"
              >
                Start Deep Dive →
              </button>
            </div>
          </div>
        )}

        {/* Check another */}
        <button
          onClick={() => {
            setStep('search');
            setSelectedRelease(null);
            setReleaseNotes(null);
            setMatrixResult(null);
            setGrade(null);
            setAnswers({});
            setSelectedFormat(null);
            setMode(null);
            setLastLabelScan(null);
          }}
          className="w-full bg-paper-dark text-ink rounded-full py-3 font-serif"
        >
          Check Another Record
        </button>

        {/* Soft sell */}
        <div className="mt-8 pt-8 border-t text-center">
          <div className="font-mono text-[13px] text-ink/80 uppercase mb-2">FROM THE MAKERS OF SPEN<span className="text-[#5a8a6e]">N</span>D</div>
          <h3 className="font-display text-[24px] text-ink mb-2">Do you have more than one?</h3>
          <p className="font-serif text-sm text-ink max-w-sm mx-auto mb-4">
            Rekk<span className="text-[#c45a30]">r</span>d tracks your whole collection — condition grading, live pricing, and gear catalog.
          </p>
          <a href="/signup" className="inline-block bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors">
            Start your collection free →
          </a>
          <p className="font-mono text-sm text-ink/80 mt-2">No credit card. Free up to 100 albums.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default SpenndTool;
