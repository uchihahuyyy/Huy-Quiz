# 🎮 BẠN HIỂU PHAN TRẦN XUÂN HUY ĐẾN MỨC NÀO?

> **Trắc nghiệm Discord Lore: ACN & QNC Era**  
> Dự án web trắc nghiệm cá nhân với kiến trúc **Server-side Anti-Cheat** bằng **Supabase PostgreSQL RPC (`SECURITY DEFINER`)**, giao diện hiện đại phong cách Discord / Dark Gaming UI.

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Chống gian lận tuyệt đối (Zero Frontend Leaks):**
   - Đáp án đúng KHÔNG bao giờ được gửi về trình duyệt khi bắt đầu bài thi.
   - Toàn bộ logic chấm điểm, tính thời gian và bảo vệ điểm số được thực hiện trực tiếp trong Database PostgreSQL thông qua các hàm RPC có gắn `SECURITY DEFINER`.
   - Bảng câu hỏi được bật Row Level Security (RLS) và thu hồi toàn bộ quyền đọc/ghi trực tiếp từ client (`anon`, `authenticated`).

2. **Khôi phục trạng thái hoàn hảo khi F5 (Reload Safe):**
   - Người chơi có thể F5 ở bất kỳ câu nào hoặc chia sẻ link kết quả `/result/:sessionId` qua Discord mà không sợ mất dữ liệu hay lỗi 404 (đã có sẵn file cấu hình `vercel.json` rewrite SPA).

3. **Bảng xếp hạng công bằng (Fair Leaderboard):**
   - Mỗi người chơi (dựa trên tên đã chuẩn hóa) chỉ lấy thành tích tốt nhất một lần duy nhất (`DISTINCT ON`).
   - Xếp hạng theo tiêu chí: Điểm cao nhất &rarr; Thời gian làm bài nhanh nhất &rarr; Hoàn thành sớm nhất.
   - Vinh danh Top 3 Podium (Hạng 1 Hoàng kim, Hạng 2 Bạc, Hạng 3 Đồng).

4. **Trải nghiệm UI/UX Discord Vibe đỉnh cao:**
   - Dark theme `#0B0F19` với điểm nhấn Blurple `#5865F2` và Violet.
   - Hỗ trợ phím tắt bàn phím: Bấm `1/2/3/4` hoặc `A/B/C/D` để chọn đáp án tức thì, phím `Enter` để chuyển câu tiếp theo.
   - Popup giải thích chi tiết kèm mục "💡 Fun Fact" độc quyền.
   - Hiệu ứng pháo giấy ăn mừng `canvas-confetti` khi đạt điểm tuyệt đối 6/6.

---

## 🛠 TECH STACK

- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, Lucide React Icons, Canvas Confetti
- **Routing:** React Router v6 (SPA with `vercel.json`)
- **Backend & Database:** Supabase (PostgreSQL 15+, PL/pgSQL RPC Functions, Row Level Security)

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN (3 BƯỚC)

### BƯỚC 1: Cấu hình Backend trên Supabase Cloud (Mất đúng 1 phút)

1. Truy cập [https://supabase.com](https://supabase.com) và đăng ký tài khoản miễn phí (Free Tier).
2. Nhấn **New Project**, nhập tên dự án (ví dụ: `huy-quiz`) và mật khẩu database, chọn khu vực gần bạn nhất (ví dụ: `Singapore (ap-southeast-1)`).
3. Sau khi dự án khởi tạo xong, nhìn sang thanh menu bên trái, chọn **SQL Editor**.
4. Mở file [001_init_quiz.sql](file:///e:/ProjectHuyQuiz/supabase/migrations/001_init_quiz.sql) trong thư mục dự án `supabase/migrations/001_init_quiz.sql`.
5. **Copy toàn bộ nội dung file SQL này**, dán vào khung soạn thảo của Supabase SQL Editor và nhấn nút **Run** (màu xanh lá).
   
> 🎉 **Chúc mừng:** Chỉ với 1 lần bấm Run duy nhất, bạn đã có đầy đủ:
> - 3 bảng dữ liệu (`quiz_questions`, `quiz_sessions`, `quiz_answers`)
> - RLS bảo mật khóa sạch quyền đọc lén đáp án
> - 5 hàm Backend RPC chấm điểm nguyên tử (atomic)
> - Toàn bộ dữ liệu 6 câu hỏi chuẩn của Phan Trần Xuân Huy!

---

### BƯỚC 2: Kết nối Frontend dưới Localhost

1. Trên Supabase Dashboard, vào mục **Project Settings** (biểu tượng bánh răng ở góc dưới bên trái) &rarr; chọn mục **API**.
2. Tìm 2 thông số:
   - **Project URL** (dạng `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`)
   - **Project API keys** &rarr; copy khóa `anon` `public`
3. Tại thư mục gốc của dự án, tạo file `.env` (hoặc copy từ `.env.example`):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Cài đặt dependencies và chạy thử nghiệm:

```bash
# Cài đặt gói thư viện
npm install

# Khởi chạy máy chủ phát triển
npm run dev
```

5. Mở trình duyệt tại địa chỉ: `http://localhost:5173`. Bạn đã có thể trải nghiệm toàn bộ quiz!

---

### BƯỚC 3: Triển khai lên Vercel để lấy link HTTPS gửi vào Discord

1. Đẩy toàn bộ source code lên một repository mới trên GitHub của bạn:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Huy Quiz Discord lore project"
   git branch -M main
   git remote add origin https://github.com/<username>/huy-quiz.git
   git push -u origin main
   ```
2. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
3. Nhấn **Add New Project** &rarr; chọn repository `huy-quiz` vừa tạo.
4. Mở mục **Environment Variables** trên giao diện Vercel và thêm 2 biến:
   - `VITE_SUPABASE_URL`: (Dán Project URL từ Supabase)
   - `VITE_SUPABASE_ANON_KEY`: (Dán Anon Key từ Supabase)
5. Nhấn nút **Deploy**.
6. Sau khoảng 30 giây, Vercel sẽ cấp cho bạn một tên miền HTTPS vĩnh viễn (ví dụ: `https://huy-quiz.vercel.app`).
   - File `vercel.json` đã được cấu hình sẵn để người chơi F5 tải lại trang ở bất kỳ URL nào (`/quiz/...`, `/result/...`, `/leaderboard`) mà không bao giờ gặp lỗi 404!

---

## 🔒 LƯU Ý VỀ PHIÊN BẢN VUI VẺ (CASUAL QUIZ)

- Dự án này được thiết kế theo dạng **Casual Social Quiz** để bạn bè vào chơi nhanh mà không cần đăng ký tài khoản hay mật khẩu phiền phức.
- Mỗi người chơi chỉ cần nhập Username hoặc Discord Nickname để bắt đầu bài thi.
- Để chống spam tên giả trên Bảng xếp hạng, thuật toán RPC `get_leaderboard` tự động chuẩn hóa chữ thường và gộp khoảng trắng thừa (`lower(regexp_replace(username, '\s+', ' ', 'g'))`), đồng thời mỗi người chỉ hiển thị **1 lần duy nhất** với điểm số cao nhất và thời gian nhanh nhất của họ.

---

Chúc bạn có những phút giây hoài niệm thật vui về thời ACN & QNC! 🚀

