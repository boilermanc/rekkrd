import React, { useState, useRef } from 'react';
import {
  VINYL_CHECKLIST,
  CD_CHECKLIST,
  scoreToGrade,
  CONDITION_GRADES,
  type ConditionGrade,
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
    if (order === 1) return 'bg-ink text-pearl-beige';
    if (order === 2) return 'bg-[#2d3a2e] text-[#a8c5a8]';
    if (order === 3) return 'bg-blue-slate text-pale-sky';
    if (order === 4) return 'bg-[#5a4a2a] text-[#d4b87a]';
    if (order === 5) return 'bg-[#6a3a2a] text-[#d4987a]';
    if (order === 6) return 'bg-[#6a2a2a] text-[#d47a7a]';
    if (order === 7) return 'bg-[#4a2a2a] text-[#a06060]';
    return 'bg-[#2a2020] text-[#705050]';
  };

  const getGrooveBarColors = (score: number): string[] => {
    if (score === 0) return ['#2d3a2e', '#2d3a2e', '#2d3a2e', '#2d3a2e', '#2d3a2e'];
    if (score === 1) return ['#2d3a2e', '#4f6d7a', '#4f6d7a', '#2d3a2e', '#4f6d7a'];
    if (score === 2) return ['#7a6030', '#5a4020', '#7a6030', '#5a4020', '#7a6030'];
    return ['#7a3020', '#5a2010', '#7a3020', '#5a2010', '#7a3020'];
  };

  const getPackagingStatus = (score: number): Array<{ label: string; status: 'good' | 'worn' | 'missing' }> => {
    if (score === 0) return [
      { label: 'Booklet', status: 'good' },
      { label: 'Tray', status: 'good' },
      { label: 'Case', status: 'good' },
    ];
    if (score === 1) return [
      { label: 'Booklet', status: 'good' },
      { label: 'Tray', status: 'worn' },
      { label: 'Case', status: 'worn' },
    ];
    if (score === 2) return [
      { label: 'Booklet', status: 'worn' },
      { label: 'Tray', status: 'worn' },
      { label: 'Case', status: 'worn' },
    ];
    return [
      { label: 'Booklet', status: 'missing' },
      { label: 'Tray', status: 'worn' },
      { label: 'Case', status: 'missing' },
    ];
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-paper-warm rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 bg-paper-darker rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <h3 className="font-display text-[18px] text-ink">Grade Your Copy</h3>
          <button
            onClick={onClose}
            aria-label="Close grading sheet"
            className="w-7 h-7 rounded-full bg-paper-dark border border-paper-darker text-ink-soft flex items-center justify-center hover:bg-paper-darker transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-paper-dark rounded-xl p-1 gap-1 mx-5 mt-3">
          <button
            onClick={() => setMode('checklist')}
            className={`flex-1 text-center py-2 rounded-lg font-mono text-[8px] tracking-widest uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-1 ${
              mode === 'checklist'
                ? 'bg-ink text-pearl-beige'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Help Me Grade
          </button>
          <button
            onClick={() => setMode('guide')}
            className={`flex-1 text-center py-2 rounded-lg font-mono text-[8px] tracking-widest uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-1 ${
              mode === 'guide'
                ? 'bg-ink text-pearl-beige'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Grade Guide
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {mode === 'checklist' ? (
            <div className="space-y-6">
              {checklist.map((question, qIndex) => (
                <div key={question.id}>
                  {/* Question Label */}
                  <div className="font-mono text-[8px] tracking-[2.5px] uppercase text-ink-soft flex items-center gap-2 mb-2">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        isCD ? 'bg-blue-slate' : 'bg-burnt-peach'
                      } text-white flex items-center justify-center text-[8px]`}
                    >
                      {qIndex + 1}
                    </div>
                    {question.question}
                  </div>

                  {/* Options */}
                  <div className="space-y-2" role="radiogroup" aria-label={question.question}>
                    {question.options.map((option) => {
                      const isSelected = answers[question.id] === option.score;
                      return (
                        <button
                          key={option.score}
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleAnswer(question.id, option.score)}
                          className={`w-full text-left bg-paper-dark rounded-xl border-2 p-3 flex items-start gap-3 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2 ${
                            isSelected
                              ? isCD
                                ? 'border-blue-slate bg-blue-slate/10'
                                : 'border-burnt-peach bg-burnt-peach/10'
                              : 'border-transparent'
                          }`}
                        >
                          {/* Radio Circle */}
                          <div
                            className={`w-4 h-4 rounded-full border-[1.5px] mt-0.5 flex-shrink-0 flex items-center justify-center ${
                              isSelected
                                ? isCD
                                  ? 'border-blue-slate bg-blue-slate'
                                  : 'border-burnt-peach bg-burnt-peach'
                                : 'border-paper-darker'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>

                          {/* Option content */}
                          <div className="flex-1">
                            <span className="font-serif text-[12px] text-ink leading-snug">
                              {option.label}
                            </span>

                            {/* Vinyl Q1 (visual) - Groove color bars */}
                            {!isCD && question.id === 'visual' && (
                              <div className="flex gap-0.5 mt-1.5">
                                {getGrooveBarColors(option.score).map((color, i) => (
                                  <div
                                    key={i}
                                    className="h-1 flex-1 rounded-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            )}

                            {/* CD Q3 (packaging) - Component boxes */}
                            {isCD && question.id === 'packaging' && (
                              <div className="flex gap-1 mt-1.5">
                                {getPackagingStatus(option.score).map((item, i) => (
                                  <div
                                    key={i}
                                    className={`flex-1 h-4 rounded border flex items-center justify-center font-mono text-[6px] tracking-tight ${
                                      item.status === 'good'
                                        ? 'border-green-700/40 bg-green-700/10 text-green-800'
                                        : item.status === 'worn'
                                        ? 'border-amber-600/40 bg-amber-600/10 text-amber-700'
                                        : 'border-gray-300 bg-gray-50 text-gray-400'
                                    }`}
                                  >
                                    {item.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Suggested Grade Result Bar — stays dark when answered */}
              <div
                className={`sticky bottom-0 mt-1 rounded-xl p-4 ${
                  allQuestionsAnswered
                    ? 'bg-ink'
                    : 'bg-paper-dark'
                }`}
              >
                {allQuestionsAnswered ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[7px] tracking-widest uppercase text-white/30 mb-1">
                        Suggested Grade
                      </div>
                      <div className="font-display text-[20px] text-pearl-beige">
                        {CONDITION_GRADES.find((g) => g.value === suggestedGrade)?.label}
                      </div>
                      <div className="font-serif text-[11px] text-white/40 italic">
                        {CONDITION_GRADES.find((g) => g.value === suggestedGrade)?.description}
                      </div>
                    </div>
                    <button
                      onClick={handleApplyGrade}
                      className={`px-4 py-2.5 rounded-xl font-mono text-[9px] tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-burnt-peach focus:ring-offset-2 ${
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
                    <div className="font-display text-[20px] text-ink-soft mb-1">—</div>
                    <div className="font-serif text-[11px] text-ink-soft italic">
                      Answer all questions to see suggested grade
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Grade Guide Mode */
            <div className="overflow-y-auto">
              <p className="font-serif text-[11px] text-ink-soft italic mb-4 leading-relaxed">
                Grades follow the Goldmine/Discogs standard — used by collectors worldwide.
              </p>

              {CONDITION_GRADES.map((grade) => (
                <div
                  key={grade.value}
                  className="flex items-start gap-3 py-3 border-b border-paper-darker last:border-0"
                >
                  {/* Grade Pill */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 ${getGradePillColor(
                      grade.value
                    )}`}
                  >
                    {grade.shortLabel}
                  </div>

                  {/* Grade Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[9px] tracking-widest uppercase text-ink-mid mb-0.5">
                      {grade.label}
                    </div>
                    <div className="font-serif text-[11px] text-ink-soft leading-relaxed">
                      {grade.description}
                    </div>
                    <div className="font-serif text-[10px] text-ink-soft/70 mt-1">
                      {isCD ? grade.cdDetail : grade.vinylDetail}
                    </div>

                    {/* Groove bars for vinyl NM/VG+/VG */}
                    {!isCD &&
                      (grade.value === 'NM' ||
                        grade.value === 'VG+' ||
                        grade.value === 'VG') && (
                        <div className="flex gap-0.5 mt-1.5">
                          {getGrooveBarColors(
                            grade.value === 'NM' ? 0 : grade.value === 'VG+' ? 1 : 2
                          ).map((color, i) => (
                            <div
                              key={i}
                              className="h-1 w-8 rounded-sm"
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
