import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { DiscogsRelease, LabelValidation, MatrixResult, PriceData, EbayData } from '../../types/spennd';
import { ConditionGrade } from '../../constants/conditionGrades';

type Step = 'search' | 'label' | 'matrix' | 'grading' | 'results';

const SpenndTool: React.FC = () => {
  // State
  const [step, setStep] = useState<Step>('search');
  const [recordsChecked, setRecordsChecked] = useState(0);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscogsRelease[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<DiscogsRelease | null>(null);

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
  const [matrixSkipped, setMatrixSkipped] = useState<Record<string, boolean>>({});
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixResult, setMatrixResult] = useState<MatrixResult | null>(null);

  // Grading, results state (placeholders for now)
  const [selectedFormat, setSelectedFormat] = useState<'vinyl' | 'cd' | null>(null);
  const [grade, setGrade] = useState<ConditionGrade | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [ebayData, setEbayData] = useState<EbayData | null>(null);

  // Step 1: Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch(`/api/spennd/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      setSearchError("We're having trouble reaching the database. Try again in a moment.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectRelease = (release: DiscogsRelease) => {
    setSelectedRelease(release);
    setStep('label');
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

  // Render based on step
  if (step === 'search') {
    return (
      <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <h3 className="font-display text-[24px] text-ink mb-2">
          What record do you have?
        </h3>
        <p className="font-serif text-[14px] text-ink/60 mb-4">
          Type the artist and album title
        </p>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. Elvis Costello Armed Forces"
          className="w-full bg-paper-dark rounded-xl py-3 px-4 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-burnt-peach"
        />

        <button
          onClick={handleSearch}
          disabled={searchLoading}
          className="mt-3 bg-burnt-peach text-white rounded-full py-2 px-5 font-serif hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Search →
        </button>

        {searchLoading && (
          <div className="flex justify-center mt-4">
            <Loader2 className="animate-spin text-burnt-peach" size={24} />
          </div>
        )}

        {searchError && (
          <div className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-200">
            <p className="text-amber-800 font-serif text-[13px]">{searchError}</p>
            <button
              onClick={handleSearch}
              className="mt-2 text-burnt-peach font-serif text-[13px] underline"
            >
              Retry
            </button>
          </div>
        )}

        {searchResults.length > 0 && (
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
                    <div className="font-serif text-[14px] text-ink font-medium">
                      {result.artist} — {result.title}
                    </div>
                    <div className="font-mono text-[11px] text-ink/60">
                      {result.year} · {result.label} · {result.country}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-3 font-serif text-[13px] italic text-ink/60">
              Seeing multiple versions? That's normal. The same album was often pressed in different countries and years — each pressing has a different value. We'll help you figure out which one you have next.
            </p>
          </>
        )}

        {!searchLoading && searchResults.length === 0 && searchQuery && !searchError && (
          <p className="mt-3 font-serif text-[13px] italic text-ink/60">
            Nothing found. Try simpler — just the artist name, or just the album title. Leave out words like 'the' or 'and'.
          </p>
        )}
      </div>
    );
  }

  if (step === 'label') {
    return (
      <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <button
          onClick={() => {
            setSelectedRelease(null);
            setStep('search');
          }}
          className="text-sm text-ink/60 underline mb-4"
        >
          ← Change record
        </button>

        <h3 className="font-display text-[22px] text-ink mt-4 mb-2">
          Let's read your label first
        </h3>

        <p className="font-serif text-[14px] italic text-ink/60 mb-4">
          Before we look at the matrix, the label on your record already tells us a lot. Pick up the record, look at the center paper label, and answer these questions.
        </p>

        <div className="bg-pearl-beige rounded-xl p-3 mb-5">
          <p className="font-serif text-[13px] text-ink">
            📌 Make sure you're reading the label on the actual vinyl record — not the cardboard sleeve or cover.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Label Name */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-ink/60 mb-1">
              Label Name
            </label>
            <input
              type="text"
              value={labelInputs.labelName}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, labelName: e.target.value }))}
              placeholder="e.g. Columbia, Parlophone, Warner Bros."
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-burnt-peach"
            />
            <p className="mt-1 font-serif text-[12px] text-ink/60">
              The company name printed on the center label — usually at the top.
            </p>
          </div>

          {/* Catalog Number */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-ink/60 mb-1">
              Catalog Number
            </label>
            <input
              type="text"
              value={labelInputs.catalog}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, catalog: e.target.value }))}
              placeholder="e.g. JC 35709 or BSK 3010"
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-burnt-peach"
            />
            <p className="mt-1 font-serif text-[12px] text-ink/60">
              Usually on the left or right side of the label. Includes letters and numbers.
            </p>
          </div>

          {/* Year */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-ink/60 mb-1">
              Year
            </label>
            <input
              type="text"
              value={labelInputs.year}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, year: e.target.value }))}
              disabled={labelInputs.yearUnknown}
              placeholder="e.g. 1979"
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-burnt-peach disabled:opacity-50"
            />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={labelInputs.yearUnknown}
                onChange={(e) => setLabelInputs(prev => ({ ...prev, yearUnknown: e.target.checked, year: '' }))}
                className="rounded"
              />
              <span className="font-serif text-[12px] text-ink">Can't find a year</span>
            </label>
          </div>

          {/* Country */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wide text-ink/60 mb-1">
              Country
            </label>
            <input
              type="text"
              value={labelInputs.country}
              onChange={(e) => setLabelInputs(prev => ({ ...prev, country: e.target.value }))}
              disabled={labelInputs.countryUnknown}
              placeholder="e.g. Made in USA"
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-burnt-peach disabled:opacity-50"
            />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={labelInputs.countryUnknown}
                onChange={(e) => setLabelInputs(prev => ({ ...prev, countryUnknown: e.target.checked, country: '' }))}
                className="rounded"
              />
              <span className="font-serif text-[12px] text-ink">Doesn't say</span>
            </label>
          </div>
        </div>

        {/* Special detection callouts */}
        {hasPromoKeyword && (
          <div className="mt-4 bg-pearl-beige rounded-xl p-3">
            <p className="font-serif text-[13px] text-ink">
              Promo copies were pressed for radio stations before commercial release. They can be more collectible and may have different matrix strings.
            </p>
          </div>
        )}

        {hasWhiteLabelKeyword && (
          <div className="mt-4 bg-pearl-beige rounded-xl p-3">
            <p className="font-serif text-[13px] text-ink">
              White labels are usually test pressings or very early promos — sometimes rare and valuable.
            </p>
          </div>
        )}

        <button
          onClick={handleLabelSubmit}
          className="mt-6 w-full bg-burnt-peach text-white rounded-full py-3 px-6 font-serif hover:opacity-90 transition-opacity"
        >
          Next: Find the Matrix →
        </button>

        {labelValidation && (
          <div className={`mt-4 rounded-xl p-3 ${labelValidation.confirmed ? 'bg-green-50 border border-green-200' : 'bg-paper-dark'}`}>
            <p className={`font-serif text-[13px] ${labelValidation.confirmed ? 'text-green-800' : 'text-ink/60'}`}>
              {labelValidation.confirmed ? '✓ Label confirmed' : "We'll continue — the matrix may tell us more."}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (step === 'matrix') {
    const sides = matrixResult?.is_double_album ? ['A', 'B', 'C', 'D'] : ['A', 'B'];

    return (
      <div className="max-w-2xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setStep('label')}
            className="text-sm text-ink/60 underline"
          >
            ← Back to label
          </button>
          {selectedRelease && (
            <div className="font-mono text-[11px] text-ink/60 text-right">
              {selectedRelease.artist} — {selectedRelease.title}
            </div>
          )}
        </div>

        <h3 className="font-display text-[22px] text-ink mb-4">
          Now let's look at the matrix
        </h3>

        {/* Education panel */}
        <div className="bg-paper-dark rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[20px]">💿</span>
            <h4 className="font-serif text-[15px] font-bold text-ink">What's a pressing?</h4>
          </div>
          <p className="font-serif text-[14px] text-ink/60">
            The same album gets manufactured in batches called pressings. An original pressing can be worth many times more than a later reissue of the same album. The matrix is etched into the vinyl itself and tells us exactly which pressing you have.
          </p>
        </div>

        {/* Instruction panel */}
        <div className="bg-white border border-paper-dark rounded-xl p-5 mb-5">
          <div className="font-mono text-[10px] uppercase text-ink/60 mb-3">
            HOW TO FIND YOUR MATRIX
          </div>
          <ol className="font-serif text-[14px] text-ink space-y-1 mb-4">
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
              <circle cx="80" cy="80" r="55" fill="none" stroke="rgba(221,110,66,0.6)" strokeWidth="20" opacity="0.3" />
              <text x="80" y="85" textAnchor="middle" fontSize="9" fill="#dd6e42" fontFamily="monospace">
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
            <div className="font-mono text-[10px] uppercase text-ink/60 mb-1">
              WHAT TO LOOK FOR
            </div>
            <p className="font-serif text-[13px] text-ink/60 mb-2">
              For this pressing, collectors have documented:
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {matrixResult.all_known_matrices.map((matrix, idx) => (
                <span key={idx} className="bg-paper-dark rounded px-2 py-0.5 font-mono text-xs text-ink">
                  {matrix}
                </span>
              ))}
            </div>
            <p className="font-serif text-[12px] italic text-ink/60">
              Any of these is a match. Type exactly what you see.
            </p>
          </div>
        ) : matrixResult?.no_matrix_data ? (
          <div className="bg-pearl-beige rounded-xl p-4 mb-5">
            <p className="font-serif text-[13px] text-ink/60">
              We don't have matrix data on file for this pressing yet. Type exactly what you see and we'll search for it.
            </p>
          </div>
        ) : null}

        {/* Limitations */}
        <div className="border-l-4 border-burnt-peach bg-paper-dark rounded-xl p-4 mb-5">
          <div className="font-mono text-[10px] uppercase text-ink/60 mb-1">
            A NOTE ON MATRIX MATCHING
          </div>
          <p className="font-serif text-[13px] text-ink/60">
            Matrix data in Discogs is community-contributed. Coverage is excellent for common and collectible pressings. If we can't match yours, we'll say so and explain what it means for the price range.
          </p>
        </div>

        {/* Matrix inputs */}
        <div className="space-y-4 mb-5">
          {sides.map((side) => (
            <div key={side}>
              <div className="font-mono text-[10px] uppercase tracking-wide text-ink/60 mb-1">
                SIDE {side} MATRIX
              </div>
              <div className="font-mono text-[9px] italic text-ink/60 mb-2">
                Look near the {side} label
              </div>
              <input
                type="text"
                value={matrixInputs[side] || ''}
                onChange={(e) => setMatrixInputs(prev => ({ ...prev, [side]: e.target.value }))}
                disabled={matrixSkipped[side]}
                className="w-full bg-paper-dark rounded-xl font-mono py-2 px-3 text-ink focus:outline-none focus:ring-2 focus:ring-burnt-peach disabled:opacity-50"
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={matrixSkipped[side] || false}
                  onChange={(e) => {
                    setMatrixSkipped(prev => ({ ...prev, [side]: e.target.checked }));
                    if (e.target.checked) {
                      setMatrixInputs(prev => ({ ...prev, [side]: '' }));
                    }
                  }}
                  className="rounded"
                />
                <span className="font-serif text-[12px] text-ink">I can't make this out</span>
              </label>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleMatrixSubmit}
            disabled={matrixLoading}
            className="flex-1 bg-burnt-peach text-white rounded-full py-3 px-6 font-serif hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {matrixLoading ? 'Identifying...' : 'Identify My Pressing →'}
          </button>
          <button
            onClick={handleMatrixSkip}
            className="text-ink/60 underline font-serif text-sm"
          >
            Skip this step →
          </button>
        </div>

        {/* Result banner */}
        {matrixResult && matrixLoading && (
          <div className="mt-4">
            {matrixResult.matched ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="font-serif text-[13px] text-green-800">
                  ✓ Matrix matched — {matrixResult.pressing_label}
                </p>
              </div>
            ) : matrixResult.partial_match ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="font-serif text-[13px] text-amber-800">
                  Partial match — one side confirmed.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="font-serif text-[13px] text-amber-800">
                  Matrix not matched. We'll show pricing with a note about the uncertainty.
                </p>
              </div>
            )}

            {/* Engineer notes */}
            {matrixResult.engineer_notes.length > 0 && (
              <div className="mt-3 space-y-2">
                {matrixResult.engineer_notes.map((note, idx) => (
                  <div key={idx} className="bg-pearl-beige rounded-xl p-3">
                    <div className="font-mono text-[10px] uppercase text-burnt-peach mb-1">
                      {note.mark}
                    </div>
                    <p className="font-serif text-[12px] text-ink/60">
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

  // Placeholder for grading/results
  return (
    <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
      <p className="text-ink font-serif">Step {step} - will be implemented in next prompts</p>
    </div>
  );
};

export default SpenndTool;
