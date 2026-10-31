import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Đang tải...' }) => {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-5 h-5 text-zinc-400 animate-spin mb-2" />
      <p className="text-xs text-zinc-500">{message}</p>
    </div>
  );
};
