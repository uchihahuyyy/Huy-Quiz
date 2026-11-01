import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeaderboardEntry } from '../types/quiz';
import { formatDuration, formatCompletionDate, isMySession } from '../utils/helpers';
import { adminDeleteSession } from '../services/quizApi';
import { Search, ChevronRight, Trash2, ShieldCheck, Loader2 } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightSessionId?: string | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  highlightSessionId,
  searchTerm,
  onSearchChange,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdminMode = searchTerm.trim().toLowerCase() === 'huyadmin';

  const filtered = entries.filter((e) =>
    isAdminMode
      ? true
      : e.username.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleDelete = async (sessionId: string, username: string) => {
    const ok = window.confirm(
      `Xác nhận xóa người chơi "${username}" khỏi Bảng xếp hạng?`
    );
    if (!ok) return;

    try {
      setDeletingId(sessionId);
      await adminDeleteSession(sessionId, 'huyadmin');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa lượt thi này.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-3">
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

      {/* Admin Mode Banner */}
      {isAdminMode && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs flex items-center justify-center gap-2 max-w-md mx-auto animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Chế độ Admin:</strong> Bấm nút <strong>Xóa</strong> màu đỏ để gỡ lượt thi spam ngay lập tức.
          </span>
        </div>
      )}

      <div className="text-[11px] text-zinc-500 text-center">
        💡 Bấm vào tên bất kỳ ai để xem chi tiết bài làm của họ
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
                  Tên người chơi
                </th>
                <th scope="col" className="px-4 py-2.5 text-center">
                  Điểm
                </th>
                <th scope="col" className="px-4 py-2.5 text-center">
                  Thời gian
                </th>
                <th scope="col" className="px-4 py-2.5 text-right hidden sm:table-cell">
                  Ngày thi
                </th>
                <th scope="col" className="w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    {searchTerm && !isAdminMode
                      ? `Không có kết quả cho "${searchTerm}".`
                      : 'Chưa có lượt thi nào hoàn thành.'}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const isCurrent =
                    isMySession(entry.session_id) || entry.session_id === highlightSessionId;
                  const isDeleting = deletingId === entry.session_id;

                  return (
                    <tr
                      key={entry.session_id}
                      onClick={() => navigate(`/result/${entry.session_id}`)}
                      title={`Bấm để xem chi tiết bài thi của ${entry.username}`}
                      className={`transition-colors cursor-pointer group ${
                        isCurrent
                          ? 'bg-zinc-800/90 text-white font-medium hover:bg-zinc-700/80'
                          : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center font-mono text-zinc-400">
                        {entry.rank}
                      </td>

                      <td className="px-4 py-2.5 font-medium text-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <span className="group-hover:underline">{entry.username}</span>
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

                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdminMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(entry.session_id, entry.username);
                              }}
                              disabled={isDeleting}
                              className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              title="Xóa lượt thi này"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 text-rose-400" />
                              )}
                              <span>Xóa</span>
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note about anti-spam speed threshold */}
      <div className="text-[10px] text-zinc-500 text-center">
        ⚡ Hệ thống tự động loại bỏ các lượt thi thần tốc dưới 12 giây để chống bot spam.
      </div>
    </div>
  );
};
