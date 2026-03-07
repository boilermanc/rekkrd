import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { DiscogsRelease, LabelValidation, MatrixResult, PriceData, EbayData } from '../../types/spennd';
import { ConditionGrade, VINYL_CHECKLIST, CD_CHECKLIST, CONDITION_BY_VALUE, scoreToGrade } from '../../constants/conditionGrades';

type Step = 'search' | 'label' | 'matrix' | 'grading' | 'results';

const SpenndTool: React.FC = () => {
  // State
  const [step, setStep] = useState<Step>('search');
  const [recordsChecked, setRecordsChecked] = useState(0);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Search state
  const [artistQuery, setArtistQuery] = useState('');
  const [titleQuery, setTitleQuery] = useState('');
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

  // Grading state
  const [selectedFormat, setSelectedFormat] = useState<'vinyl' | 'cd' | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grade, setGrade] = useState<ConditionGrade | null>(null);
  const [conflictNote, setConflictNote] = useState<string | null>(null);

  // Results state (placeholders for now)
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [ebayData, setEbayData] = useState<EbayData | null>(null);

  // Step 1: Search
  const combinedQuery = `${artistQuery} ${titleQuery}`.trim();

  const handleSearch = async () => {
    if (!combinedQuery) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch(`/api/spennd/search?q=${encodeURIComponent(combinedQuery)}`);
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
        <h3 className="font-display text-[24px] text-ink mb-2">
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

        <button
          onClick={handleSearch}
          disabled={searchLoading || !combinedQuery}
          className="mt-3 w-full sm:w-auto bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Search →
        </button>

        <p className="font-serif text-[13px] italic text-[#5a8a6e]/70 mt-2">
          Enter the artist name and album title separately for best results.
        </p>

        {searchLoading && (
          <div className="flex justify-center mt-4">
            <Loader2 className="animate-spin text-[#5a8a6e]" size={24} />
          </div>
        )}

        {searchError && (
          <div className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-200">
            <p className="text-amber-800 font-serif text-[13px]">{searchError}</p>
            <button
              onClick={handleSearch}
              className="mt-2 text-[#5a8a6e] font-serif text-[13px] underline"
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

        {!searchLoading && searchResults.length === 0 && combinedQuery && !searchError && (
          <p className="mt-3 font-serif text-[13px] italic text-ink/60">
            Nothing found for '{artistQuery}{titleQuery ? ` — ${titleQuery}` : ''}'. Try checking the spelling, or search with just the artist name.
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
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e]"
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
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e]"
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
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e] disabled:opacity-50"
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
              className="w-full bg-paper-dark rounded-xl py-2 px-3 font-serif text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e] disabled:opacity-50"
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
          className="mt-6 w-full bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors"
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
        <div className="border-l-4 border-[#5a8a6e] bg-paper-dark rounded-xl p-4 mb-5">
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
                className="w-full bg-paper-dark rounded-xl font-mono py-2 px-3 text-ink focus:outline-none focus:ring-2 focus:ring-[#5a8a6e] disabled:opacity-50"
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
            className="flex-1 bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors disabled:opacity-50"
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
                    <div className="font-mono text-[10px] uppercase text-[#5a8a6e] mb-1">
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

  if (step === 'grading') {
    // Format selector first
    if (!selectedFormat) {
      return (
        <div className="max-w-xl mx-auto bg-paper rounded-2xl p-8 shadow-sm">
          <h3 className="font-display text-[22px] text-ink mb-6 text-center">
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
          <div className="font-mono text-[10px] text-[#5a8a6e] uppercase tracking-wide">
            QUESTION {currentQuestionIndex + 1} OF {checklist.length}
          </div>
          <div className="inline-block bg-paper-dark text-ink font-mono text-[9px] rounded-full px-2 py-0.5 uppercase">
            {selectedFormat}
          </div>
        </div>

        {currentQuestionIndex === 0 && (
          <p className="font-serif text-[14px] italic text-ink/60 mb-6">
            Condition is the other half of the value equation. A Near Mint copy can be worth 3–5× a Very Good copy of the same pressing. Answer these questions and we'll give you the standard industry grade.
          </p>
        )}

        <h4 className="font-serif text-[16px] text-ink font-medium mb-4">
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
                  <span className="font-serif text-[14px] text-ink leading-snug flex-1">
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
            className="mt-4 text-sm text-ink/60 underline cursor-pointer"
          >
            ← Previous question
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
            <div className="font-serif text-[15px] font-bold text-ink mb-1">
              You've checked {recordsChecked} records.
            </div>
            <p className="font-serif text-[13px] text-ink/60 mb-4">
              Rekkrd tracks your whole collection automatically.
            </p>
            <div className="flex gap-3">
              <a href="/signup" className="bg-[#5a8a6e] text-white rounded-full py-2 px-5 font-serif text-[13px] hover:bg-[#3d6b54] transition-colors">
                Start free →
              </a>
              <button onClick={() => setNudgeDismissed(true)} className="text-sm text-ink/60 underline">
                Keep going
              </button>
            </div>
          </div>
        )}

        {/* Grade card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="font-display text-[64px] text-ink leading-none">{gradeInfo.shortLabel}</div>
          <div className="font-serif text-[20px] text-ink/60 mt-1">{gradeInfo.label}</div>
          <div className="font-serif text-[14px] italic text-ink/60 mt-1">{gradeInfo.description}</div>
        </div>

        {/* Pricing panel */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-display text-[20px] text-ink mb-4">What it's worth</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="font-mono text-[9px] uppercase text-ink/60">DISCOGS</div>
              {priceData?.available ? (
                <div className="flex gap-4 mt-2">
                  <div>
                    <div className="font-display text-[24px] text-ink">{fmt(priceData.median)}</div>
                    <div className="font-mono text-[9px] text-ink/60">MEDIAN</div>
                  </div>
                </div>
              ) : <p className="text-ink/60 text-sm mt-2">Loading...</p>}
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase text-ink/60">EBAY</div>
              {ebayData?.available ? (
                <div className="flex gap-4 mt-2">
                  <div>
                    <div className="font-display text-[24px] text-ink">{fmt(ebayData.median)}</div>
                    <div className="font-mono text-[9px] text-ink/60">MEDIAN</div>
                  </div>
                </div>
              ) : <p className="text-ink/60 text-sm mt-2">Loading...</p>}
            </div>
          </div>
        </div>

        {/* Check another */}
        <button
          onClick={() => {
            setStep('search');
            setSelectedRelease(null);
            setGrade(null);
            setAnswers({});
            setSelectedFormat(null);
          }}
          className="w-full bg-paper-dark text-ink rounded-full py-3 font-serif"
        >
          Check Another Record
        </button>

        {/* Soft sell */}
        <div className="mt-8 pt-8 border-t text-center">
          <div className="font-mono text-[9px] text-ink/60 uppercase mb-2">FROM THE MAKERS OF SPENND</div>
          <h3 className="font-display text-[24px] text-ink mb-2">Do you have more than one?</h3>
          <p className="font-serif text-[14px] text-ink/60 max-w-sm mx-auto mb-4">
            Rekkrd tracks your whole collection — condition grading, live pricing, and gear catalog.
          </p>
          <a href="/signup" className="inline-block bg-[#5a8a6e] text-white rounded-full py-3 px-6 font-serif hover:bg-[#3d6b54] transition-colors">
            Start your collection free →
          </a>
          <p className="font-mono text-[10px] text-ink/60 mt-2">No credit card. Free up to 100 albums.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default SpenndTool;
