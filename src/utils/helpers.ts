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
      colorClass: 'text-amber-400',
      badgeBorder: 'border-amber-500/50',
      emoji: '👑',
    };
  }
  if (score >= 4) {
    return {
      title: 'Bạn thân lâu năm',
      description: 'Có vẻ bạn biết kha khá chuyện đấy.',
      colorClass: 'text-indigo-400',
      badgeBorder: 'border-indigo-500/50',
      emoji: '🔥',
    };
  }
  if (score >= 2) {
    return {
      title: 'Người quen sơ sơ',
      description: 'Biết Huy nhưng chưa chắc hiểu Huy.',
      colorClass: 'text-zinc-300',
      badgeBorder: 'border-zinc-500/50',
      emoji: '👀',
    };
  }
  return {
    title: 'Người lạ từng lướt qua',
    description: 'Hình như chúng ta chưa từng nói chuyện?',
    colorClass: 'text-zinc-500',
    badgeBorder: 'border-zinc-700/50',
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
  if (/^[0-9]+$/.test(cleanUsername)) {
    return { isValid: false, error: 'Tên người chơi không được chỉ chứa toàn số.', cleanUsername };
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

const LOCAL_STORAGE_MY_SESSIONS = 'huy_quiz_my_sessions';

/**
 * Lưu một session do chính trình duyệt này bấm bắt đầu thi
 */
export function saveMySession(sessionId: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MY_SESSIONS);
    const sessions: string[] = raw ? JSON.parse(raw) : [];
    if (!sessions.includes(sessionId)) {
      sessions.push(sessionId);
      localStorage.setItem(LOCAL_STORAGE_MY_SESSIONS, JSON.stringify(sessions));
    }
  } catch {
    // Ignore storage errors in private browsing
  }
}

/**
 * Kiểm tra xem session này có phải do chính trình duyệt này thi không
 */
export function isMySession(sessionId: string): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MY_SESSIONS);
    if (!raw) return false;
    const sessions: string[] = JSON.parse(raw);
    return sessions.includes(sessionId);
  } catch {
    return false;
  }
}

export function saveLastSessionId(sessionId: string): void {
  saveMySession(sessionId);
}

export function getLastSessionId(): string | null {
  return null;
}
