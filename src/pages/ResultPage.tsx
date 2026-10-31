import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { getSessionState, completeQuiz } from '../services/quizApi';
import { SessionStateResponse } from '../types/quiz';
import { formatDuration, getScoreTier, saveLastSessionId } from '../utils/helpers';
import { Loading } from '../components/Loading';
import { Check, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const ResultPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<SessionStateResponse | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setErrorMessage('Không tìm thấy mã phiên thi.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchResult() {
      try {
        setIsLoading(true);
        saveLastSessionId(sessionId!);

        let state = await getSessionState(sessionId!);

        if (state.session.status === 'in_progress') {
          try {
            await completeQuiz(sessionId!);
            state = await getSessionState(sessionId!);
          } catch {
            // Completed
          }
        }

        if (!isMounted) return;
        setData(state);

        if (state.session.score >= state.session.total_questions) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải kết quả.';
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchResult();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <Loading message="Đang tải kết quả..." />;
  }

  if (errorMessage || !data) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">Không tìm thấy kết quả</h2>
        <p className="text-zinc-400 text-sm mb-4">{errorMessage}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-xs"
        >
          Quay về Trang chủ
        </button>
      </div>
    );
  }

  const { session, answers, questions } = data;
  const score = session.score;
  const total = session.total_questions || 6;
  const tier = getScoreTier(score);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* Result Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center mb-8">
        <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium mb-2">
          Kết quả của {session.username}
        </div>

        <div className="text-4xl sm:text-5xl font-black text-white font-mono mb-2">
          {score} / {total}
        </div>

        <div className="text-base font-semibold text-zinc-200 mb-1">
          {tier.title}
        </div>
        <p className="text-xs text-zinc-400 italic mb-6">
          &ldquo;{tier.description}&rdquo;
        </p>

        <div className="text-xs text-zinc-500 mb-6">
          Thời gian hoàn thành: <span className="font-mono text-zinc-300">{formatDuration(session.duration_seconds)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="py-2 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã sao chép link</span>
              </>
            ) : (
              <span>Sao chép link kết quả</span>
            )}
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            className="py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer"
          >
            Bảng xếp hạng
          </button>

          <button
            onClick={() => navigate('/')}
            className="py-2 px-4 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/40 text-xs transition-colors cursor-pointer"
          >
            Làm lại
          </button>
        </div>
      </div>

      {/* Answer History */}
      <div className="text-left space-y-2">
        <div className="text-xs font-semibold text-zinc-400 mb-3">
          Chi tiết 6 câu hỏi:
        </div>

        {questions.map((q, idx) => {
          const answer = answers.find((a) => a.question_id === q.id);
          const isCorrect = answer?.is_correct ?? false;
          const isExpanded = expandedQuestionId === q.id;

          return (
            <div
              key={q.id}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-zinc-300 truncate">
                    Câu {idx + 1}: {q.question_text}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-mono text-zinc-400">
                    {answer ? `Chọn ${answer.selected_option}` : 'Chưa'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 pt-1 border-t border-zinc-800 text-xs space-y-2 bg-zinc-950/40">
                  {!isCorrect && answer && (
                    <div className="text-zinc-300">
                      <span className="text-rose-400 font-medium">Đáp án đúng: </span>
                      {answer.correct_option}. {answer.correct_option_text}
                    </div>
                  )}

                  {answer?.explanation && (
                    <div className="text-zinc-400 leading-relaxed">
                      <span className="text-zinc-300 font-medium">Giải thích: </span>
                      {answer.explanation}
                    </div>
                  )}

                  {answer?.fun_fact && (
                    <div className="text-zinc-400 italic">
                      <span className="text-zinc-300 not-italic font-medium">Fun Fact: </span>
                      &ldquo;{answer.fun_fact}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
