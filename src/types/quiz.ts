export interface QuestionOption {
  key: string;
  text: string;
}

export interface PublicQuestion {
  id: number;
  question_text: string;
  options: QuestionOption[];
  sort_order: number;
}

export interface QuizSession {
  id: string;
  username: string;
  score: number;
  total_questions: number;
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface AnswerSubmissionResult {
  is_correct: boolean;
  selected_option: string;
  correct_option: string;
  correct_option_text: string;
  explanation: string;
  fun_fact: string | null;
  current_score: number;
  answered_count: number;
  is_completed: boolean;
}

export interface AnswerHistoryItem {
  question_id: number;
  selected_option: string;
  is_correct: boolean;
  correct_option: string;
  correct_option_text: string;
  explanation: string;
  fun_fact: string | null;
  answered_at: string;
}

export interface SessionStateResponse {
  session: QuizSession;
  questions: PublicQuestion[];
  answers: AnswerHistoryItem[];
}

export interface StartQuizResponse {
  session_id: string;
  username: string;
  total_questions: number;
  started_at: string;
  questions: PublicQuestion[];
}

export interface LeaderboardEntry {
  rank: number;
  session_id: string;
  username: string;
  score: number;
  total_questions: number;
  duration_seconds: number;
  completed_at: string;
}

export interface ScoreTier {
  title: string;
  description: string;
  colorClass: string;
  badgeBorder: string;
  emoji: string;
}

