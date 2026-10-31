import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionState, submitAnswer, completeQuiz } from '../services/quizApi';
import { PublicQuestion, AnswerSubmissionResult, QuizSession } from '../types/quiz';
import { formatDuration } from '../utils/helpers';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerModal } from '../components/AnswerModal';
import { Loading } from '../components/Loading';

export const QuizPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalResult, setModalResult] = useState<AnswerSubmissionResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setErrorMessage('Không tìm thấy mã phiên thi.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadState() {
      try {
        setIsLoading(true);
        const data = await getSessionState(sessionId!);
        if (!isMounted) return;

        if (data.session.status === 'completed') {
          navigate(`/result/${sessionId}`, { replace: true });
          return;
        }

        setSession(data.session);
        setQuestions(data.questions);
        setCurrentScore(data.session.score);

        const startMs = new Date(data.session.started_at).getTime();
        const nowMs = Date.now();
        const initialSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        setElapsedSeconds(initialSeconds);

        const answeredIds = new Set(data.answers.map((a) => a.question_id));
        const firstUnansweredIndex = data.questions.findIndex(
          (q) => !answeredIds.has(q.id)
        );

        if (firstUnansweredIndex !== -1) {
          setCurrentIndex(firstUnansweredIndex);
        } else {
          navigate(`/result/${sessionId}`, { replace: true });
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải câu hỏi.';
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadState();

    return () => {
      isMounted = false;
    };
  }, [sessionId, navigate]);

  useEffect(() => {
    if (isLoading || isModalOpen || !session || session.status === 'completed') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, isModalOpen, session]);

  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

  const isLastQuestion = useMemo(() => {
    return currentIndex >= questions.length - 1;
  }, [currentIndex, questions.length]);

  const handleSelectOption = useCallback(
    async (optionKey: string) => {
      if (isSubmitting || isModalOpen || !currentQuestion || !sessionId) return;

      setSelectedOption(optionKey);
      setIsSubmitting(true);

      try {
        const result = await submitAnswer(sessionId, currentQuestion.id, optionKey);
        setCurrentScore(result.current_score);
        setModalResult(result);
        setIsModalOpen(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Đã có lỗi khi nộp câu trả lời.';
        alert(msg);
        setSelectedOption(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, isModalOpen, currentQuestion, sessionId]
  );

  useEffect(() => {
    if (isLoading || isModalOpen || isSubmitting || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toUpperCase();
      const num = parseInt(e.key, 10);

      const optByLetter = currentQuestion.options.find(
        (opt) => opt.key.toUpperCase() === key
      );
      if (optByLetter) {
        e.preventDefault();
        handleSelectOption(optByLetter.key);
        return;
      }

      if (!isNaN(num) && num >= 1 && num <= currentQuestion.options.length) {
        e.preventDefault();
        const optByNum = currentQuestion.options[num - 1];
        if (optByNum) {
          handleSelectOption(optByNum.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, isModalOpen, isSubmitting, currentQuestion, handleSelectOption]);

  const handleNextAction = async () => {
    setIsModalOpen(false);
    setSelectedOption(null);
    setModalResult(null);

    if (isLastQuestion) {
      try {
        if (sessionId) {
          await completeQuiz(sessionId);
        }
      } catch {
        // Completed
      }
      navigate(`/result/${sessionId}`);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return <Loading message="Đang tải..." />;
  }

  if (errorMessage || !currentQuestion) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">Đã xảy ra sự cố</h2>
        <p className="text-zinc-400 text-sm mb-4">{errorMessage}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs"
        >
          Quay về Trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Top Bar */}
      <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
        <span>Người chơi: <strong className="text-zinc-200">{session?.username}</strong></span>
        <div className="flex items-center gap-3">
          <span>Thời gian: <strong className="text-zinc-200 font-mono">{formatDuration(elapsedSeconds)}</strong></span>
          <span>Điểm: <strong className="text-zinc-200 font-mono">{currentScore}</strong></span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <ProgressBar current={currentIndex + 1} total={questions.length} />
      </div>

      {/* Question Card */}
      <QuestionCard
        question={currentQuestion}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        selectedOption={selectedOption}
        isSubmitting={isSubmitting}
        onSelectOption={handleSelectOption}
      />

      <AnswerModal
        isOpen={isModalOpen}
        result={modalResult}
        isLastQuestion={isLastQuestion}
        onNext={handleNextAction}
      />
    </div>
  );
};
