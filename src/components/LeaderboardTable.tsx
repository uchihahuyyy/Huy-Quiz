import React from 'react';
import { LeaderboardEntry } from '../types/quiz';
import { formatDuration, formatCompletionDate } from '../utils/helpers';
import { Search } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightSessionId?: string | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  highlightSessionId,
  searchTerm,
  onSearchChange,
}) => {
  const filtered = entries.filter((e) =>
    e.username.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="w-full space-y-4">
      {/* Search */}
      <div className="relative max-w-xs mx-auto">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo tên..."
          className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 font-medium">
              <tr>
                <th scope="col" className="px-4 py-2.5 w-12 text-center">
                  #
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Tên
                </th>
                <th scope="col" className="px-4 py-2.5 text-center">
                  Điểm
                </th>
                <th scope="col" className="px-4 py-2.5 text-center">
                  Thời gian
                </th>
                <th scope="col" className="px-4 py-2.5 text-right hidden sm:table-cell">
                  Ngày
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    {searchTerm
                      ? `Không có kết quả cho "${searchTerm}".`
                      : 'Chưa có lượt thi nào hoàn thành.'}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const isCurrent = entry.session_id === highlightSessionId;

                  return (
                    <tr
                      key={entry.session_id}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center font-mono text-zinc-400">
                        {entry.rank}
                      </td>

                      <td className="px-4 py-2.5 font-medium text-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <span>{entry.username}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-700 text-zinc-300">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-center font-mono font-medium">
                        {entry.score} / {entry.total_questions}
                      </td>

                      <td className="px-4 py-2.5 text-center font-mono text-zinc-400">
                        {formatDuration(entry.duration_seconds)}
                      </td>

                      <td className="px-4 py-2.5 text-right text-zinc-500 hidden sm:table-cell font-mono">
                        {formatCompletionDate(entry.completed_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
