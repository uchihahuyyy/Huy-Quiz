import { ScoreTier } from '../types/quiz';

/**
 * Định dạng số giây thành chuỗi mm:ss (ví dụ: 01:25)
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Lấy danh hiệu và nhận xét dựa trên số câu trả lời đúng (0 - 6)
 */
export function getScoreTier(score: number): ScoreTier {
  if (score >= 6) {
    return {
      title: 'Xuân Huy phiên bản thứ hai',
      description: 'Thôi, bạn biết quá nhiều rồi đấy.',
      colorClass: 'from-amber-400 to-yellow-500 text-yellow-300',
      badgeBorder: 'border-yellow-500/50 shadow-yellow-500/20',
      emoji: '👑',
    };
  }
  if (score >= 4) {
    return {
      title: 'Bạn thân lâu năm',
      description: 'Có vẻ bạn biết kha khá chuyện đấy.',
      colorClass: 'from-indigo-400 to-purple-500 text-indigo-300',
      badgeBorder: 'border-indigo-500/50 shadow-indigo-500/20',
      emoji: '🔥',
    };
  }
  if (score >= 2) {
    return {
      title: 'Người quen sơ sơ',
      description: 'Biết Huy nhưng chưa chắc hiểu Huy.',
      colorClass: 'from-blue-400 to-cyan-500 text-cyan-300',
      badgeBorder: 'border-cyan-500/50 shadow-cyan-500/20',
      emoji: '👀',
    };
  }
  return {
    title: 'Người lạ từng lướt qua',
    description: 'Hình như chúng ta chưa từng nói chuyện?',
    colorClass: 'from-slate-400 to-gray-500 text-slate-300',
    badgeBorder: 'border-slate-500/50 shadow-slate-500/10',
    emoji: '🗿',
  };
}

/**
 * Kiểm tra tên người chơi hợp lệ (2 - 24 ký tự, không toàn khoảng trắng)
 */
export function validateUsername(username: string): { isValid: boolean; error?: string; cleanUsername: string } {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return { isValid: false, error: 'Vui lòng nhập nickname hoặc tên của bạn.', cleanUsername: '' };
  }
  if (cleanUsername.length < 2) {
    return { isValid: false, error: 'Tên người chơi quá ngắn (tối thiểu 2 ký tự).', cleanUsername };
  }
  if (cleanUsername.length > 24) {
    return { isValid: false, error: 'Tên người chơi quá dài (tối đa 24 ký tự).', cleanUsername };
  }
  return { isValid: true, cleanUsername };
}

/**
 * Định dạng thời gian hoàn thành (ngày giờ hoặc tương đối)
 */
export function formatCompletionDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;

    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

const LOCAL_STORAGE_LAST_SESSION = 'huy_quiz_last_session_id';

export function saveLastSessionId(sessionId: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_LAST_SESSION, sessionId);
  } catch {
    // Ignore storage errors in private browsing
  }
}

export function getLastSessionId(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_LAST_SESSION);
  } catch {
    return null;
  }
}

