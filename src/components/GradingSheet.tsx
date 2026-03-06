import React, { useState, useRef } from 'react';
import {
  VINYL_CHECKLIST,
  CD_CHECKLIST,
  scoreToGrade,
  CONDITION_GRADES,
  type ConditionGrade,
  type ConditionOption,
} from '../constants/conditionGrades';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface GradingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onGradeSelected: (grade: ConditionGrade) => void;
  format: string;
  currentGrade?: ConditionGrade;
}

const GradingSheet: React.FC<GradingSheetProps> = ({
  isOpen,
  onClose,
  onGradeSelected,
  format,
  currentGrade,
}) => {
  const [mode, setMode] = useState<'checklist' | 'guide'>('checklist');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const sheetRef = useRef<HTMLDivElement>(null);

  useFocusTrap(sheetRef, onClose);

  const isCD = format?.toLowerCase().includes('cd');
  const checklist = isCD ? CD_CHECKLIST : VINYL_CHECKLIST;
  const accentColor = isCD ? 'blue-slate' : 'burnt-peach';

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const suggestedGrade = scoreToGrade(totalScore);
  const allQuestionsAnswered = checklist.every((q) => q.id in answers);

  const handleAnswer = (questionId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  const handleApplyGrade = () => {
    onGradeSelected(suggestedGrade);
    onClose();
  };

  const getGradePillColor = (grade: ConditionGrade): string => {
    const order = CONDITION_GRADES.find((g) => g.value === grade)?.sortOrder || 8;
    if (order <= 2) return 'bg-emerald-900 text-emerald-300'; // M/NM
    if (order === 3) return 'bg-sky-800 text-sky-200'; // VG+
    if (order === 4) return 'bg-amber-700 text-amber-100'; // VG
    if (order <= 6) return 'bg-red-900 text-red-300'; // G+/G
    return 'bg-slate-800 text-slate-400'; // F/P
  };

  const getGrooveBarColors = (score: number): string[] => {
    if (score === 0) return ['#2d3a2e', '#2d3a2e', '#2d3a2e', '#2d3a2e', '#2d3a2e']; // pristine green
    if (score === 1) return ['#3d4a3e', '#4f6d7a', '#4f6d7a', '#5a6b6d', '#6a7b7d']; // mixed green/slate
    if (score === 2) return ['#8b6914', '#9a7721', '#a58735', '#b0954a', '#baa35f']; // amber/brown
    return ['#8b3a3a', '#9a4949', '#a55858', '#b06767', '#ba7676']; // red/brown
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-ink/40 z-40"
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Grade your copy"
        className="fixed bottom-0 left-0 right-0 z-50 bg-paper rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-0.5 bg-paper-dark rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 flex items-center justify-between border-b border-paper-dark">
          <h3 className="font-display text-[18px] text-ink">Grade Your Copy</h3>
          <button
            onClick={onClose}
            aria-label="Close grading sheet"
            className="w-8 h-8 rounded-full bg-paper-dark flex items-center justify-center hover:bg-ink/10 transition-colors"
          >
            <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-4">
          <div className="bg-paper-dark rounded-xl p-1 inline-flex">
            <button
              onClick={() => setMode('checklist')}
              className={`px-4 py-2 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-colors ${
                mode === 'checklist'
                  ? 'bg-ink text-pearl-beige'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Help Me Grade
            </button>
            <button
              onClick={() => setMode('guide')}
              className={`px-4 py-2 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-colors ${
                mode === 'guide'
                  ? 'bg-ink text-pearl-beige'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              Grade Guide
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {mode === 'checklist' ? (
            <div className="space-y-6">
              {checklist.map((question, qIndex) => (
                <div key={question.id}>
                  {/* Question Label */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        isCD ? 'bg-blue-slate' : 'bg-burnt-peach'
                      } text-white flex items-center justify-center font-mono text-[10px] font-bold`}
                    >
                      {qIndex + 1}
                    </div>
                    <h4 className="font-mono text-[8px] tracking-[0.3em] uppercase text-ink/60">
                      {question.question}
                    </h4>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const isSelected = answers[question.id] === option.score;
                      return (
                        <button
                          key={option.score}
                          onClick={() => handleAnswer(question.id, option.score)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? isCD
                                ? 'border-blue-slate bg-blue-slate/10'
                                : 'border-burnt-peach bg-burnt-peach/10'
                              : 'border-transparent bg-paper-dark hover:bg-paper-dark/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Radio Circle */}
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? isCD
                                    ? 'border-blue-slate'
                                    : 'border-burnt-peach'
                                  : 'border-paper-darker'
                              }`}
                            >
                              {isSelected && (
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isCD ? 'bg-blue-slate' : 'bg-burnt-peach'
                                  }`}
                                />
                              )}
                            </div>

                            {/* Option Text */}
                            <span className="font-serif text-[12px] text-ink flex-1">
                              {option.label}
                            </span>
                          </div>

                          {/* Vinyl Q1 (visual) - Groove color bars */}
                          {!isCD && question.id === 'visual' && (
                            <div className="flex gap-1 mt-2 ml-8">
                              {getGrooveBarColors(option.score).map((color, i) => (
                                <div
                                  key={i}
                                  className="h-1 flex-1 rounded"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          )}

                          {/* CD Q3 (packaging) - Component boxes */}
                          {isCD && question.id === 'packaging' && (
                            <div className="flex gap-2 mt-2 ml-8">
                              <div
                                className={`px-2 py-1 rounded text-[8px] font-mono tracking-wide ${
                                  option.score === 0
                                    ? 'bg-emerald-600 text-white'
                                    : option.score === 1
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-400 text-white'
                                }`}
                              >
                                Booklet
                              </div>
                              <div
                                className={`px-2 py-1 rounded text-[8px] font-mono tracking-wide ${
                                  option.score === 0
                                    ? 'bg-emerald-600 text-white'
                                    : option.score === 1
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-400 text-white'
                                }`}
                              >
                                Tray
                              </div>
                              <div
                                className={`px-2 py-1 rounded text-[8px] font-mono tracking-wide ${
                                  option.score === 0
                                    ? 'bg-emerald-600 text-white'
                                    : option.score === 1
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-400 text-white'
                                }`}
                              >
                                Case
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Suggested Grade Result Bar */}
              <div
                className={`sticky bottom-0 mt-6 p-4 rounded-xl border-2 ${
                  allQuestionsAnswered
                    ? 'bg-ink border-ink'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                {allQuestionsAnswered ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-[20px] text-pearl-beige mb-1">
                        {CONDITION_GRADES.find((g) => g.value === suggestedGrade)?.label}
                      </div>
                      <div className="font-serif text-[11px] text-pearl-beige/70 italic">
                        {CONDITION_GRADES.find((g) => g.value === suggestedGrade)?.description}
                      </div>
                    </div>
                    <button
                      onClick={handleApplyGrade}
                      className={`px-6 py-3 rounded-lg font-mono text-[10px] tracking-widest uppercase ${
                        isCD
                          ? 'bg-blue-slate text-white hover:bg-blue-slate/90'
                          : 'bg-burnt-peach text-white hover:bg-burnt-peach/90'
                      } transition-colors`}
                    >
                      Apply Grade
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="font-display text-[20px] text-slate-400 mb-1">—</div>
                    <div className="font-serif text-[11px] text-slate-400 italic">
                      Answer all questions to see suggested grade
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Grade Guide Mode */
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <p className="font-serif text-[12px] text-ink/60 italic mb-4">
                Grades follow the Goldmine/Discogs standard — used by collectors worldwide.
              </p>

              {CONDITION_GRADES.map((grade) => (
                <div
                  key={grade.value}
                  className="flex items-start gap-3 p-3 rounded-lg bg-paper-dark/50"
                >
                  {/* Grade Pill */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 ${getGradePillColor(
                      grade.value
                    )}`}
                  >
                    {grade.shortLabel}
                  </div>

                  {/* Grade Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] text-ink mb-1">{grade.label}</div>
                    <div className="font-serif text-[11px] text-ink/70 mb-2">
                      {grade.description}
                    </div>
                    <div className="font-serif text-[10px] text-ink/60">
                      {isCD ? grade.cdDetail : grade.vinylDetail}
                    </div>

                    {/* Groove bars for vinyl NM/VG+/VG */}
                    {!isCD &&
                      (grade.value === 'NM' ||
                        grade.value === 'VG+' ||
                        grade.value === 'VG') && (
                        <div className="flex gap-1 mt-2">
                          {getGrooveBarColors(
                            grade.value === 'NM' ? 0 : grade.value === 'VG+' ? 1 : 2
                          ).map((color, i) => (
                            <div
                              key={i}
                              className="h-1 w-8 rounded"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GradingSheet;
