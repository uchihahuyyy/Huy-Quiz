-- ==============================================================================
-- HUY QUIZ: MIGRATION & BACKEND RPC SCRIPT (ALL-IN-ONE)
-- Dự án: "Bạn hiểu Phan Trần Xuân Huy đến mức nào?"
-- Chạy file này trực tiếp trên Supabase SQL Editor.
-- ==============================================================================

-- 1. BẢNG DỮ LIỆU (TABLES)
-- ------------------------------------------------------------------------------

-- Bảng câu hỏi
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option TEXT NOT NULL,
    explanation TEXT NOT NULL,
    fun_fact TEXT NULL,
    sort_order INTEGER NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bảng phiên chơi (Quiz Sessions)
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL CHECK (char_length(trim(username)) BETWEEN 2 AND 24),
    normalized_username TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
    total_questions INTEGER NOT NULL DEFAULT 6,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NULL,
    duration_seconds INTEGER NULL CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- Bảng lưu câu trả lời của từng phiên (Quiz Answers)
CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_session_question UNIQUE (session_id, question_id)
);

-- 2. TẠO INDEXES TỐI ƯU TRUY VẤN
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_leaderboard 
    ON quiz_sessions(status, normalized_username, score DESC, duration_seconds ASC, completed_at ASC);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status_score 
    ON quiz_sessions(status, score DESC, duration_seconds ASC);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_id 
    ON quiz_answers(session_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_active_order 
    ON quiz_questions(is_active, sort_order ASC);


-- 3. BẢO MẬT ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Thu hồi mọi quyền đọc/ghi trực tiếp của anon và authenticated trên 3 bảng.
-- Người dùng frontend chỉ được tương tác qua các hàm RPC SECURITY DEFINER bên dưới.
REVOKE ALL ON quiz_questions FROM anon, authenticated;
REVOKE ALL ON quiz_sessions FROM anon, authenticated;
REVOKE ALL ON quiz_answers FROM anon, authenticated;


-- 4. HỆ THỐNG 5 HÀM BACKEND RPC (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- HÀM 1: start_quiz(p_username TEXT)
-- Bắt đầu một phiên thi mới, trả về danh sách câu hỏi KHÔNG có đáp án đúng
CREATE OR REPLACE FUNCTION start_quiz(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trimmed_username TEXT;
    v_normalized_username TEXT;
    v_session_id UUID;
    v_started_at TIMESTAMPTZ;
    v_total_questions INTEGER;
    v_questions JSONB;
BEGIN
    v_trimmed_username := trim(p_username);
    IF v_trimmed_username IS NULL OR char_length(v_trimmed_username) < 2 OR char_length(v_trimmed_username) > 24 THEN
        RAISE EXCEPTION 'Tên người chơi không hợp lệ. Vui lòng nhập từ 2 đến 24 ký tự.';
    END IF;

    -- Chuẩn hóa tên để xếp hạng công bằng: chữ thường, gộp nhiều khoảng trắng thành 1
    v_normalized_username := lower(regexp_replace(v_trimmed_username, '\s+', ' ', 'g'));

    -- Lấy danh sách các câu hỏi đang active (CHỈ lấy id, question_text, options, sort_order)
    -- Tuyệt đối KHÔNG trả về correct_option, explanation, fun_fact
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', q.id,
            'question_text', q.question_text,
            'options', q.options,
            'sort_order', q.sort_order
        ) ORDER BY q.sort_order ASC
    )
    INTO v_questions
    FROM quiz_questions q
    WHERE q.is_active = true;

    IF v_questions IS NULL OR jsonb_array_length(v_questions) = 0 THEN
        RAISE EXCEPTION 'Hệ thống hiện chưa có câu hỏi nào đang hoạt động.';
    END IF;

    v_total_questions := jsonb_array_length(v_questions);
    v_started_at := now();

    -- Tạo phiên làm bài mới
    INSERT INTO quiz_sessions (
        username,
        normalized_username,
        score,
        total_questions,
        status,
        started_at
    ) VALUES (
        v_trimmed_username,
        v_normalized_username,
        0,
        v_total_questions,
        'in_progress',
        v_started_at
    )
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object(
        'session_id', v_session_id,
        'username', v_trimmed_username,
        'total_questions', v_total_questions,
        'started_at', v_started_at,
        'questions', v_questions
    );
END;
$$;


-- HÀM 2: submit_answer(p_session_id UUID, p_question_id INTEGER, p_selected_option TEXT)
-- Chấm điểm atomic từng câu trả lời, trả về kết quả kèm giải thích
CREATE OR REPLACE FUNCTION submit_answer(
    p_session_id UUID,
    p_question_id INTEGER,
    p_selected_option TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session quiz_sessions%ROWTYPE;
    v_question quiz_questions%ROWTYPE;
    v_selected_key TEXT;
    v_is_valid_option BOOLEAN := false;
    v_correct_option_text TEXT := '';
    v_is_correct BOOLEAN := false;
    v_current_score INTEGER := 0;
    v_answered_count INTEGER := 0;
    v_is_completed BOOLEAN := false;
    v_opt JSONB;
BEGIN
    -- Khóa hàng session để đảm bảo tính nguyên tử (atomic), chống spam double click
    SELECT * INTO v_session
    FROM quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Phiên chơi không tồn tại.';
    END IF;

    IF v_session.status != 'in_progress' THEN
        RAISE EXCEPTION 'Lượt chơi này đã hoàn thành hoặc không còn khả dụng.';
    END IF;

    -- Kiểm tra xem câu hỏi này đã được trả lời trong session chưa
    IF EXISTS (
        SELECT 1 FROM quiz_answers
        WHERE session_id = p_session_id AND question_id = p_question_id
    ) THEN
        RAISE EXCEPTION 'Câu hỏi này đã được trả lời.';
    END IF;

    -- Lấy thông tin câu hỏi
    SELECT * INTO v_question
    FROM quiz_questions
    WHERE id = p_question_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Câu hỏi không tồn tại hoặc đã bị vô hiệu hóa.';
    END IF;

    v_selected_key := upper(trim(p_selected_option));

    -- Kiểm tra đáp án có nằm trong danh sách lựa chọn hợp lệ không
    FOR v_opt IN SELECT * FROM jsonb_array_elements(v_question.options)
    LOOP
        IF upper(v_opt->>'key') = v_selected_key THEN
            v_is_valid_option := true;
        END IF;
        IF upper(v_opt->>'key') = upper(v_question.correct_option) THEN
            v_correct_option_text := v_opt->>'text';
        END IF;
    END LOOP;

    IF NOT v_is_valid_option THEN
        RAISE EXCEPTION 'Lựa chọn % không hợp lệ cho câu hỏi này.', p_selected_option;
    END IF;

    -- So khớp đáp án
    v_is_correct := (v_selected_key = upper(trim(v_question.correct_option)));

    -- Ghi nhận câu trả lời vào quiz_answers
    INSERT INTO quiz_answers (
        session_id,
        question_id,
        selected_option,
        is_correct,
        answered_at
    ) VALUES (
        p_session_id,
        p_question_id,
        v_selected_key,
        v_is_correct,
        now()
    );

    -- Cập nhật điểm nếu đúng
    IF v_is_correct THEN
        UPDATE quiz_sessions
        SET score = score + 1
        WHERE id = p_session_id
        RETURNING score INTO v_current_score;
    ELSE
        v_current_score := v_session.score;
    END IF;

    -- Đếm tổng số câu đã trả lời
    SELECT count(*)::INTEGER INTO v_answered_count
    FROM quiz_answers
    WHERE session_id = p_session_id;

    -- Nếu đã trả lời đủ số câu hỏi, tự động đánh dấu completed để bảo vệ điểm
    IF v_answered_count >= v_session.total_questions THEN
        UPDATE quiz_sessions
        SET status = 'completed',
            completed_at = now(),
            duration_seconds = GREATEST(1, EXTRACT(EPOCH FROM (now() - started_at))::INTEGER)
        WHERE id = p_session_id;
        v_is_completed := true;
    ELSE
        v_is_completed := false;
    END IF;

    RETURN jsonb_build_object(
        'is_correct', v_is_correct,
        'selected_option', v_selected_key,
        'correct_option', v_question.correct_option,
        'correct_option_text', v_correct_option_text,
        'explanation', v_question.explanation,
        'fun_fact', v_question.fun_fact,
        'current_score', v_current_score,
        'answered_count', v_answered_count,
        'is_completed', v_is_completed
    );
END;
$$;


-- HÀM 3: complete_quiz(p_session_id UUID)
-- Kết thúc bài thi và tính tổng thời gian (idempotent nếu đã auto-completed)
CREATE OR REPLACE FUNCTION complete_quiz(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session quiz_sessions%ROWTYPE;
    v_answered_count INTEGER := 0;
BEGIN
    SELECT * INTO v_session
    FROM quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Phiên chơi không tồn tại.';
    END IF;

    SELECT count(*)::INTEGER INTO v_answered_count
    FROM quiz_answers
    WHERE session_id = p_session_id;

    IF v_answered_count < v_session.total_questions THEN
        RAISE EXCEPTION 'Bạn chưa hoàn thành tất cả câu hỏi (% / %).', v_answered_count, v_session.total_questions;
    END IF;

    IF v_session.status = 'in_progress' THEN
        UPDATE quiz_sessions
        SET status = 'completed',
            completed_at = now(),
            duration_seconds = GREATEST(1, EXTRACT(EPOCH FROM (now() - started_at))::INTEGER)
        WHERE id = p_session_id
        RETURNING * INTO v_session;
    END IF;

    RETURN jsonb_build_object(
        'session_id', v_session.id,
        'username', v_session.username,
        'score', v_session.score,
        'total_questions', v_session.total_questions,
        'status', v_session.status,
        'started_at', v_session.started_at,
        'completed_at', v_session.completed_at,
        'duration_seconds', v_session.duration_seconds
    );
END;
$$;


-- HÀM 4: get_session_state(p_session_id UUID)
-- Khôi phục trạng thái khi người chơi F5 tải lại trang hoặc chia sẻ link kết quả
CREATE OR REPLACE FUNCTION get_session_state(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session quiz_sessions%ROWTYPE;
    v_questions JSONB;
    v_answers JSONB;
BEGIN
    SELECT * INTO v_session
    FROM quiz_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Phiên chơi không tồn tại.';
    END IF;

    -- Danh sách câu hỏi (chỉ các trường an toàn)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', q.id,
            'question_text', q.question_text,
            'options', q.options,
            'sort_order', q.sort_order
        ) ORDER BY q.sort_order ASC
    )
    INTO v_questions
    FROM quiz_questions q
    WHERE q.is_active = true;

    -- Lịch sử các câu ĐÃ trả lời trong session này (kèm giải thích & đáp án đúng của câu đó)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'question_id', a.question_id,
                'selected_option', a.selected_option,
                'is_correct', a.is_correct,
                'correct_option', q.correct_option,
                'correct_option_text', (
                    SELECT opt->>'text'
                    FROM jsonb_array_elements(q.options) AS opt
                    WHERE upper(opt->>'key') = upper(q.correct_option)
                    LIMIT 1
                ),
                'explanation', q.explanation,
                'fun_fact', q.fun_fact,
                'answered_at', a.answered_at
            ) ORDER BY q.sort_order ASC
        ),
        '[]'::jsonb
    )
    INTO v_answers
    FROM quiz_answers a
    JOIN quiz_questions q ON q.id = a.question_id
    WHERE a.session_id = p_session_id;

    RETURN jsonb_build_object(
        'session', jsonb_build_object(
            'id', v_session.id,
            'username', v_session.username,
            'score', v_session.score,
            'total_questions', v_session.total_questions,
            'status', v_session.status,
            'started_at', v_session.started_at,
            'completed_at', v_session.completed_at,
            'duration_seconds', v_session.duration_seconds
        ),
        'questions', COALESCE(v_questions, '[]'::jsonb),
        'answers', v_answers
    );
END;
$$;


-- HÀM 5: get_leaderboard(p_limit INTEGER DEFAULT 50)
-- Bảng xếp hạng: Mỗi người chơi chỉ lấy thành tích cao nhất (DISTINCT ON normalized_username)
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actual_limit INTEGER;
    v_result JSONB;
BEGIN
    v_actual_limit := LEAST(COALESCE(p_limit, 50), 50);

    WITH best_runs AS (
        SELECT DISTINCT ON (normalized_username)
            id AS session_id,
            username,
            score,
            total_questions,
            duration_seconds,
            completed_at
        FROM quiz_sessions
        WHERE status = 'completed'
        ORDER BY
            normalized_username,
            score DESC,
            duration_seconds ASC NULLS LAST,
            completed_at ASC
    ),
    ranked AS (
        SELECT
            row_number() OVER (
                ORDER BY
                    score DESC,
                    duration_seconds ASC NULLS LAST,
                    completed_at ASC
            )::INTEGER AS rank,
            session_id,
            username,
            score,
            total_questions,
            duration_seconds,
            completed_at
        FROM best_runs
        ORDER BY
            score DESC,
            duration_seconds ASC NULLS LAST,
            completed_at ASC
        LIMIT v_actual_limit
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'rank', rank,
                'session_id', session_id,
                'username', username,
                'score', score,
                'total_questions', total_questions,
                'duration_seconds', duration_seconds,
                'completed_at', completed_at
            ) ORDER BY rank ASC
        ),
        '[]'::jsonb
    )
    INTO v_result
    FROM ranked;

    RETURN v_result;
END;
$$;


-- 5. PHÂN QUYỀN THỰC THI (GRANT EXECUTE TO ANON & AUTHENTICATED)
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION start_quiz(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_answer(UUID, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_quiz(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_session_state(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(INTEGER) TO anon, authenticated;


-- 6. SEED DATA: 6 CÂU HỎI BẮT BUỘC (GIỮ NGUYÊN NỘI DUNG 100%)
-- ------------------------------------------------------------------------------
INSERT INTO quiz_questions (sort_order, question_text, options, correct_option, explanation, fun_fact)
VALUES
(
    1,
    'Username Discord đầu tiên của Huy là gì?',
    '[
        {"key": "A", "text": "Xuân Huy - Chan."},
        {"key": "B", "text": "Uchihahuyy."},
        {"key": "C", "text": "Pathetic."},
        {"key": "D", "text": "Cpt.ace_."}
    ]'::jsonb,
    'A',
    'Huy lần đầu dùng Discord vào năm 2017 với Username là Xuân Huy - Chan. Sau đó vì một số lý do mà Huy không dùng tài khoản này nữa.',
    'Huy từng hỏi mấy câu óc cặc bằng tài khoản này trong chat ACN những ngày đầu tạo tài khoản.'
),
(
    2,
    'Edater Discord đầu tiên của Huy là ai?',
    '[
        {"key": "A", "text": "Trúc."},
        {"key": "B", "text": "Phương Anh."}
    ]'::jsonb,
    'B',
    'Sau khi có server riêng tên là QNC thì những người quen Huy qua Discord thường biết Huy có edater Discord tên là Trúc nhưng thực chất trước khi tồn tại QNC thì Huy có một edater trong server ACN.',
    'Edate được 1 tuần thì hết edate.'
),
(
    3,
    'Lý do ngày xưa Huy và Khoa Võ var nhau là vì gì?',
    '[
        {"key": "A", "text": "Vì gái."},
        {"key": "B", "text": "Vì bất đồng quan điểm."},
        {"key": "C", "text": "Vì Khoa đối xử tệ với Huy."},
        {"key": "D", "text": "Vì Huy đối xử tệ với Khoa."}
    ]'::jsonb,
    'D',
    'Vì một số bức xúc cá nhân mà Huy đã chửi Khoa Võ là mồ côi cha và bị Soragaton bắt gặp. Sau đó Soragaton đi nói cho Khoa Võ biết cũng như rêu rao trên chat ACN, điều đó càng khiến cho nỗi bất hòa của hai người đạt đến đỉnh điểm.',
    NULL
),
(
    4,
    'Vậy nguyên nhân chính khiến Huy đối xử tệ với Khoa là gì?',
    '[
        {"key": "A", "text": "Vì gái."},
        {"key": "B", "text": "Vì bất đồng quan điểm."}
    ]'::jsonb,
    'A',
    '=)))) Đéo biết giải thích sao.',
    NULL
),
(
    5,
    'F4 đầu tiên của Huy trên Discord gồm những ai?',
    '[
        {"key": "A", "text": "Châu, Toàn, Khánh, Huy."},
        {"key": "B", "text": "Vũ, Khánh, Nganh, Huy."},
        {"key": "C", "text": "Khang, Huy, Huân, Dyy."},
        {"key": "D", "text": "Thành, Tiến, Tommy, Huy."}
    ]'::jsonb,
    'A',
    'Hầu hết mọi người đều quen Huy qua QNC nên sẽ nghĩ đáp án là C, nhưng thực ra đáp án là A vì F4 này đã có từ thời ACN khi Huy mới vào.',
    'F4 này giải tán mẹ rồi.'
),
(
    6,
    'Sau khi Huy và Khoa var nhau, Khoa và Hà edating thì Huy inactive ACN. Sau khi active lại ACN thì người đầu tiên Huy nói chuyện trong ACN là ai?',
    '[
        {"key": "A", "text": "Châu."},
        {"key": "B", "text": "Khánh."},
        {"key": "C", "text": "Toàn."},
        {"key": "D", "text": "Tiến."}
    ]'::jsonb,
    'D',
    'Trong thời gian inactive cũng như trong thời gian Huy và Khoa cãi nhau, Huy không nói chuyện với Châu, Khánh, Toàn. Tự dưng lúc vào ACN thì thằng Tiến lại bảo Huy là idol Discord ACN, mới hài cơ.',
    NULL
)
ON CONFLICT (sort_order) DO UPDATE
SET question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_option = EXCLUDED.correct_option,
    explanation = EXCLUDED.explanation,
    fun_fact = EXCLUDED.fun_fact;

-- HOÀN TẤT SETUP: Đã sẵn sàng phục vụ bài thi!

