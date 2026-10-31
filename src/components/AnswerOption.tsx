import React from 'react';
import { Loader2 } from 'lucide-react';

interface AnswerOptionProps {
  optionKey: string;
  text: string;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  isSubmitting: boolean;
  onSelect: (key: string) => void;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  optionKey,
  text,
  isSelected,
  isDisabled,
  isSubmitting,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(optionKey)}
      disabled={isDisabled}
      className={`w-full p-4 rounded-lg text-left transition-colors border flex items-center gap-3 ${
        isSelected
          ? 'bg-zinc-800 border-zinc-600 text-white'
          : isDisabled
          ? 'bg-zinc-950/40 border-zinc-900 opacity-50 cursor-not-allowed text-zinc-500'
          : 'bg-zinc-900/60 hover:bg-zinc-800/60 border-zinc-800 hover:border-zinc-700 text-zinc-200 cursor-pointer'
      }`}
    >
      <div
        className={`w-7 h-7 rounded flex items-center justify-center font-semibold text-xs flex-shrink-0 ${
          isSelected
            ? 'bg-white text-zinc-950'
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
        }`}
      >
        {isSubmitting && isSelected ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          optionKey
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium leading-relaxed block">
          {text}
        </span>
      </div>
    </button>
  );
};
