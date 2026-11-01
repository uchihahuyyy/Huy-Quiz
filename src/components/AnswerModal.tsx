import React, { useEffect, useState } from 'react';
import { AnswerSubmissionResult } from '../types/quiz';

interface AnswerModalProps {
  isOpen: boolean;
  result: AnswerSubmissionResult | null;
  isLastQuestion: boolean;
  onNext: () => void;
}

export const AnswerModal: React.FC<AnswerModalProps> = ({
  isOpen,
  result,
  isLastQuestion,
  onNext,
}) => {
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCanProceed(false);
      return;
    }

    setCanProceed(false);

    const timer = setTimeout(() => {
      setCanProceed(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canProceed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canProceed, onNext]);

  if (!isOpen || !result) return null;

  const isCorrect = result.is_correct;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-6 text-left shadow-2xl">
        {/* Title */}
        <div className="mb-4">
          <span
            className={`text-lg font-bold ${
              isCorrect ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isCorrect ? 'Chính xác' : 'Sai rồi'}
          </span>
        </div>

        {/* Incorrect Answer detail */}
        {!isCorrect && (
          <div className="mb-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
            <span className="text-zinc-400 block mb-1">Đáp án đúng:</span>
            <span className="text-zinc-100 font-medium">
              {result.correct_option}. {result.correct_option_text}
            </span>
          </div>
        )}

        {/* Explanation */}
        <div className="mb-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
          <span className="text-zinc-500 font-medium block mb-1">Giải thích:</span>
          {result.explanation}
        </div>

        {/* Fun Fact */}
        {result.fun_fact && (
          <div className="mb-5 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 italic">
            <span className="text-zinc-500 not-italic font-medium block mb-1">
              Fun Fact:
            </span>
            &ldquo;{result.fun_fact}&rdquo;
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={canProceed ? onNext : undefined}
          disabled={!canProceed}
          autoFocus={canProceed}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all cursor-pointer ${
            canProceed
              ? 'bg-zinc-100 hover:bg-white text-zinc-950'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
          }`}
        >
          {canProceed ? (
            <span>{isLastQuestion ? 'Xem kết quả' : 'Câu tiếp theo'}</span>
          ) : (
            <span className="text-xs">Đang nạp giải thích...</span>
          )}
        </button>
      </div>
    </div>
  );
};
