import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startQuiz } from '../services/quizApi';
import { isSupabaseConfigured } from '../services/supabase';
import { validateUsername, saveLastSessionId } from '../utils/helpers';
import { ConfigBanner } from '../components/ConfigBanner';
import { Loader2 } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateUsername(username);
    if (!validation.isValid) {
      setError(validation.error || 'Tên người chơi không hợp lệ.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await startQuiz(validation.cleanUsername);
      saveLastSessionId(res.session_id);
      navigate(`/quiz/${res.session_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi bắt đầu.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
      {!isSupabaseConfigured && <ConfigBanner />}

      <div className="w-full max-w-md mx-auto text-center">
        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
          Bạn hiểu Phan Trần Xuân Huy đến mức nào?
        </h1>


        {/* Card */}
        <div className="mt-8 p-6 rounded-xl border border-zinc-800 bg-zinc-900/60 text-left">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Tên hoặc nickname Discord của bạn
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                maxLength={24}
                placeholder="Nhập nickname..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Tên này sẽ hiển thị trên bảng xếp hạng.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-red-300 text-xs">
                {error}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang vào...</span>
                  </>
                ) : (
                  <span>Bắt đầu</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/leaderboard')}
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 text-xs transition-colors cursor-pointer"
              >
                Xem bảng xếp hạng
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
