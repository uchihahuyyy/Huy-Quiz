import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeaderboardEntry } from '../types/quiz';
import { formatDuration, formatCompletionDate, isMySession } from '../utils/helpers';
import { adminDeleteMultipleSessions } from '../services/quizApi';
import { ConfirmModal } from './ConfirmModal';
import {
  Search,
  ChevronRight,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightSessionId?: string | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
}

interface DeleteTarget {
  id: string;
  username: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  highlightSessionId,
  searchTerm,
  onSearchChange,
  onRefresh,
}) => {
  const navigate = useNavigate();

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal confirm state
  const [modalTargets, setModalTargets] = useState<DeleteTarget[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isAdminMode = searchTerm.trim().toLowerCase() === 'huyadmin';

  // Clear selections when exiting admin mode
  useEffect(() => {
    if (!isAdminMode) {
      setSelectedIds([]);
    }
  }, [isAdminMode]);

  // Auto hide toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const filtered = entries.filter((e) =>
    isAdminMode
      ? true
      : e.username.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  // Toggle selection for a single row
  const toggleSelect = (sessionId: string) => {
    setSelectedIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  // Toggle select all
  const isAllSelected =
    filtered.length > 0 && selectedIds.length === filtered.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((e) => e.session_id));
    }
  };

  // Request single delete
  const requestDeleteSingle = (sessionId: string, username: string) => {
    setModalError(null);
    setModalTargets([{ id: sessionId, username }]);
  };

  // Request batch delete
  const requestDeleteBatch = () => {
    if (selectedIds.length === 0) return;
    setModalError(null);
    const targets = filtered
      .filter((e) => selectedIds.includes(e.session_id))
      .map((e) => ({ id: e.session_id, username: e.username }));
    setModalTargets(targets);
  };

  // Execute deletion
  const handleConfirmDelete = async () => {
    if (!modalTargets || modalTargets.length === 0) return;

    try {
      setIsDeleting(true);
      setModalError(null);

      const targetIds = modalTargets.map((t) => t.id);
      await adminDeleteMultipleSessions(targetIds, 'huyadmin');

      // Success
      const count = modalTargets.length;
      setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      setModalTargets(null);
      setToastMessage({
        type: 'success',
        text:
          count === 1
            ? `Đã xóa lượt thi của "${modalTargets[0].username}" thành công!`
            : `Đã xóa thành công ${count} lượt thi đã chọn!`,
      });
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa lượt thi này.';
      setModalError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-3 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 shadow-xl border animate-slide-down ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Search Input */}
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

      {/* Admin Mode Bar */}
      {isAdminMode && (
        <div className="p-3 rounded-lg bg-zinc-900 border border-amber-500/30 text-xs max-w-lg mx-auto animate-fade-in space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Chế độ Admin</span>
            </div>
            <span className="text-[11px] text-zinc-400">
              {filtered.length} lượt thi
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 text-left">
            Tích vào ô vuông để chọn nhiều nick spam, hoặc bấm nút <strong>Xóa</strong> ở từng dòng.
          </p>

          {/* Batch Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2 animate-fade-in">
              <span className="text-zinc-200 font-medium text-xs">
                Đã chọn: <strong className="text-rose-400">{selectedIds.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer transition-colors"
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  onClick={requestDeleteBatch}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa {selectedIds.length} mục đã chọn</span>
                </button>
              </div>
            </div>
          )}
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
                {isAdminMode && (
                  <th scope="col" className="px-3 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-0 cursor-pointer accent-rose-600"
                      title="Chọn tất cả"
                    />
                  </th>
                )}
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
                  <td
                    colSpan={isAdminMode ? 7 : 6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    {searchTerm && !isAdminMode
                      ? `Không có kết quả cho "${searchTerm}".`
                      : 'Chưa có lượt thi nào hoàn thành.'}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const isCurrent =
                    isMySession(entry.session_id) || entry.session_id === highlightSessionId;
                  const isSelected = selectedIds.includes(entry.session_id);

                  return (
                    <tr
                      key={entry.session_id}
                      onClick={() => navigate(`/result/${entry.session_id}`)}
                      title={`Bấm để xem chi tiết bài thi của ${entry.username}`}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? 'bg-rose-950/30 text-white'
                          : isCurrent
                          ? 'bg-zinc-800/90 text-white font-medium hover:bg-zinc-700/80'
                          : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      {/* Checkbox column in admin mode */}
                      {isAdminMode && (
                        <td
                          className="px-3 py-2.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(entry.session_id)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-0 cursor-pointer accent-rose-600"
                          />
                        </td>
                      )}

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
                                requestDeleteSingle(entry.session_id, entry.username);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Xóa lượt thi này"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
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

      {/* Sleek Custom Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(modalTargets && modalTargets.length > 0)}
        title={
          modalTargets && modalTargets.length === 1
            ? 'Xác nhận xóa lượt thi'
            : `Xác nhận xóa ${modalTargets?.length || 0} lượt thi`
        }
        description={
          <div className="space-y-2">
            {modalError && (
              <div className="p-2 rounded bg-rose-950/80 border border-rose-700 text-rose-200 text-xs">
                {modalError}
              </div>
            )}
            {modalTargets && modalTargets.length === 1 ? (
              <p>
                Bạn có chắc chắn muốn xóa lượt thi của người chơi{' '}
                <strong className="text-zinc-100">
                  &ldquo;{modalTargets[0].username}&rdquo;
                </strong>{' '}
                khỏi Bảng xếp hạng không?
              </p>
            ) : (
              <p>
                Bạn có chắc chắn muốn xóa vĩnh viễn{' '}
                <strong className="text-rose-400">
                  {modalTargets?.length} lượt thi đã chọn
                </strong>{' '}
                khỏi Bảng xếp hạng không?
              </p>
            )}
            <p className="text-[11px] text-zinc-500">
              Dữ liệu sau khi xóa sẽ không thể phục hồi.
            </p>
          </div>
        }
        confirmText={
          isDeleting
            ? 'Đang xóa...'
            : modalTargets && modalTargets.length > 1
            ? `Xóa ${modalTargets.length} mục`
            : 'Xác nhận xóa'
        }
        cancelText="Hủy bỏ"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) {
            setModalTargets(null);
            setModalError(null);
          }
        }}
      />
    </div>
  );
};
