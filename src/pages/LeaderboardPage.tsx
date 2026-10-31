import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../services/quizApi';
import { LeaderboardEntry } from '../types/quiz';
import { getLastSessionId } from '../utils/helpers';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { Loading } from '../components/Loading';

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const lastSessionId = getLastSessionId();

  const fetchLeaderboard = useCallback(async (showRefreshingSpinner = false) => {
    try {
      if (showRefreshingSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      const data = await getLeaderboard(50);
      setEntries(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải bảng xếp hạng.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Bảng xếp hạng
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Thành tích người chơi hiểu Xuân Huy nhất.
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={isRefreshing || isLoading}
            className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isRefreshing ? 'Đang làm mới...' : 'Làm mới'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors cursor-pointer"
          >
            Vào thi ngay
          </button>
        </div>
      </div>

      {isLoading ? (
        <Loading message="Đang tải..." />
      ) : errorMessage ? (
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
          {errorMessage}
        </div>
      ) : (
        <LeaderboardTable
          entries={entries}
          highlightSessionId={lastSessionId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      )}
    </div>
  );
};
