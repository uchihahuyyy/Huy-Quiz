import { supabase, isSupabaseConfigured } from './supabase';
import {
  StartQuizResponse,
  AnswerSubmissionResult,
  SessionStateResponse,
  LeaderboardEntry,
  QuizSession,
} from '../types/quiz';

function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Chưa cấu hình Supabase! Vui lòng tạo file .env với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.'
    );
  }
}

/**
 * 1. Khởi tạo một phiên chơi mới
 */
export async function startQuiz(username: string): Promise<StartQuizResponse> {
  ensureConfigured();

  const { data, error } = await supabase.rpc('start_quiz', {
    p_username: username,
  });

  if (error) {
    throw new Error(error.message || 'Không thể tạo phiên làm bài.');
  }

  return data as StartQuizResponse;
}

/**
 * 2. Gửi đáp án cho một câu hỏi và nhận kết quả chấm điểm tức thì
 */
export async function submitAnswer(
  sessionId: string,
  questionId: number,
  selectedOption: string
): Promise<AnswerSubmissionResult> {
  ensureConfigured();

  const { data, error } = await supabase.rpc('submit_answer', {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_selected_option: selectedOption,
  });

  if (error) {
    throw new Error(error.message || 'Không thể chấm điểm câu trả lời.');
  }

  return data as AnswerSubmissionResult;
}

/**
 * 3. Đánh dấu hoàn thành bài thi
 */
export async function completeQuiz(sessionId: string): Promise<QuizSession> {
  ensureConfigured();

  const { data, error } = await supabase.rpc('complete_quiz', {
    p_session_id: sessionId,
  });

  if (error) {
    throw new Error(error.message || 'Không thể kết thúc bài thi.');
  }

  return data as QuizSession;
}

/**
 * 4. Lấy toàn bộ trạng thái phiên chơi (phục vụ F5 và chia sẻ link)
 */
export async function getSessionState(sessionId: string): Promise<SessionStateResponse> {
  ensureConfigured();

  const { data, error } = await supabase.rpc('get_session_state', {
    p_session_id: sessionId,
  });

  if (error) {
    throw new Error(error.message || 'Không tìm thấy thông tin lượt chơi.');
  }

  return data as SessionStateResponse;
}

/**
 * 5. Lấy danh sách bảng xếp hạng những người điểm cao nhất
 */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  ensureConfigured();

  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message || 'Không thể tải bảng xếp hạng.');
  }

  return (data || []) as LeaderboardEntry[];
}

