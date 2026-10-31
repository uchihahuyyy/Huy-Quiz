import React from 'react';
import { PublicQuestion } from '../types/quiz';
import { AnswerOption } from './AnswerOption';

interface QuestionCardProps {
  question: PublicQuestion;
  currentIndex: number;
  totalQuestions: number;
  selectedOption: string | null;
  isSubmitting: boolean;
  onSelectOption: (key: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedOption,
  isSubmitting,
  onSelectOption,
}) => {
  return (
    <div className="w-full bg-zinc-900/60 rounded-xl border border-zinc-800 p-6 text-left">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
        <span>Câu {currentIndex + 1} / {totalQuestions}</span>
        <span className="text-zinc-500 hidden sm:inline">Phím tắt: A-D hoặc 1-4</span>
      </div>

      <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 leading-snug mb-6">
        {question.question_text}
      </h2>

      <div className="grid grid-cols-1 gap-2.5">
        {question.options.map((opt, idx) => (
          <AnswerOption
            key={opt.key}
            optionKey={opt.key}
            text={opt.text}
            index={idx}
            isSelected={selectedOption === opt.key}
            isDisabled={isSubmitting}
            isSubmitting={isSubmitting}
            onSelect={onSelectOption}
          />
        ))}
      </div>
    </div>
  );
};
