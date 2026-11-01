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
    duration_seconds INTEGER NULL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    session_data JSONB NULL
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

REVOKE ALL ON quiz_questions FROM anon, authenticated;
REVOKE ALL ON quiz_sessions FROM anon, authenticated;
REVOKE ALL ON quiz_answers FROM anon, authenticated;


-- 4. HỆ THỐNG CÁC HÀM BACKEND RPC (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- HÀM 1: start_quiz(p_username TEXT)
-- Xáo trộn ngẫu nhiên đáp án A, B, C, D cho từng phiên chơi để chống học vẹt và chống spam
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
    v_public_questions JSONB := '[]'::jsonb;
    v_session_data JSONB := '[]'::jsonb;
    v_q RECORD;
    v_shuffled_options JSONB;
    v_correct_text TEXT;
    v_correct_new_key TEXT;
    v_opt RECORD;
    v_idx INTEGER;
    v_new_key TEXT;
    v_keys TEXT[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F'];
BEGIN
    v_trimmed_username := trim(p_username);
    IF v_trimmed_username IS NULL OR char_length(v_trimmed_username) < 2 OR char_length(v_trimmed_username) > 24 THEN
        RAISE EXCEPTION 'Tên người chơi không hợp lệ. Vui lòng nhập từ 2 đến 24 ký tự.';
    END IF;

    -- Chặn tên chỉ toàn chữ số (chống spam bot)
    IF v_trimmed_username ~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'Tên người chơi không được chỉ chứa toàn số.';
    END IF;

    v_normalized_username := lower(regexp_replace(v_trimmed_username, '\s+', ' ', 'g'));

    -- Lặp qua từng câu hỏi đang active theo thứ tự sort_order
    FOR v_q IN
        SELECT id, question_text, options, correct_option, sort_order
        FROM quiz_questions
        WHERE is_active = true
        ORDER BY sort_order ASC
    LOOP
        -- Tìm nội dung chữ của đáp án đúng gốc
        v_correct_text := NULL;
        FOR v_opt IN SELECT * FROM jsonb_to_recordset(v_q.options) AS (key TEXT, text TEXT)
        LOOP
            IF upper(v_opt.key) = upper(v_q.correct_option) THEN
                v_correct_text := v_opt.text;
            END IF;
        END LOOP;

        -- Xáo trộn các option bằng random()
        v_shuffled_options := '[]'::jsonb;
        v_correct_new_key := NULL;
        v_idx := 1;

        FOR v_opt IN
            SELECT key, text
            FROM jsonb_to_recordset(v_q.options) AS (key TEXT, text TEXT)
            ORDER BY random()
        LOOP
            v_new_key := v_keys[v_idx];
            v_shuffled_options := v_shuffled_options || jsonb_build_object('key', v_new_key, 'text', v_opt.text);
            
            IF v_opt.text = v_correct_text THEN
                v_correct_new_key := v_new_key;
            END IF;

            v_idx := v_idx + 1;
        END LOOP;

        v_public_questions := v_public_questions || jsonb_build_object(
            'id', v_q.id,
            'question_text', v_q.question_text,
            'options', v_shuffled_options,
            'sort_order', v_q.sort_order
        );

        v_session_data := v_session_data || jsonb_build_object(
            'question_id', v_q.id,
            'options', v_shuffled_options,
            'correct_option', v_correct_new_key,
            'correct_option_text', v_correct_text
        );
    END LOOP;

    v_total_questions := jsonb_array_length(v_public_questions);
    IF v_total_questions = 0 THEN
        RAISE EXCEPTION 'Hệ thống hiện chưa có câu hỏi nào đang hoạt động.';
    END IF;

    v_started_at := now();

    INSERT INTO quiz_sessions (
        username,
        normalized_username,
        score,
        total_questions,
        status,
        started_at,
        session_data
    ) VALUES (
        v_trimmed_username,
        v_normalized_username,
        0,
        v_total_questions,
        'in_progress',
        v_started_at,
        v_session_data
    )
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object(
        'session_id', v_session_id,
        'username', v_trimmed_username,
        'total_questions', v_total_questions,
        'started_at', v_started_at,
        'questions', v_public_questions
    );
END;
$$;


-- HÀM 2: submit_answer(p_session_id UUID, p_question_id INTEGER, p_selected_option TEXT)
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
    v_correct_option_key TEXT := '';
    v_correct_option_text TEXT := '';
    v_is_correct BOOLEAN := false;
    v_current_score INTEGER := 0;
    v_answered_count INTEGER := 0;
    v_is_completed BOOLEAN := false;
    v_session_q JSONB;
    v_opt JSONB;
BEGIN
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

    IF EXISTS (
        SELECT 1 FROM quiz_answers
        WHERE session_id = p_session_id AND question_id = p_question_id
    ) THEN
        RAISE EXCEPTION 'Câu hỏi này đã được trả lời.';
    END IF;

    SELECT * INTO v_question
    FROM quiz_questions
    WHERE id = p_question_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Câu hỏi không tồn tại hoặc đã bị vô hiệu hóa.';
    END IF;

    v_selected_key := upper(trim(p_selected_option));

    -- Kiểm tra session_data nếu có shuffled options
    IF v_session.session_data IS NOT NULL THEN
        FOR v_session_q IN SELECT * FROM jsonb_array_elements(v_session.session_data)
        LOOP
            IF (v_session_q->>'question_id')::INTEGER = p_question_id THEN
                v_correct_option_key := v_session_q->>'correct_option';
                v_correct_option_text := v_session_q->>'correct_option_text';
                
                FOR v_opt IN SELECT * FROM jsonb_array_elements(v_session_q->'options')
                LOOP
                    IF upper(v_opt->>'key') = v_selected_key THEN
                        v_is_valid_option := true;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    ELSE
        -- Fallback cho session cũ
        v_correct_option_key := v_question.correct_option;
        FOR v_opt IN SELECT * FROM jsonb_array_elements(v_question.options)
        LOOP
            IF upper(v_opt->>'key') = v_selected_key THEN
                v_is_valid_option := true;
            END IF;
            IF upper(v_opt->>'key') = upper(v_question.correct_option) THEN
                v_correct_option_text := v_opt->>'text';
            END IF;
        END LOOP;
    END IF;

    IF NOT v_is_valid_option THEN
        RAISE EXCEPTION 'Lựa chọn % không hợp lệ cho câu hỏi này.', p_selected_option;
    END IF;

    v_is_correct := (v_selected_key = upper(trim(v_correct_option_key)));

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

    IF v_is_correct THEN
        UPDATE quiz_sessions
        SET score = score + 1
        WHERE id = p_session_id
        RETURNING score INTO v_current_score;
    ELSE
        v_current_score := v_session.score;
    END IF;

    SELECT count(*)::INTEGER INTO v_answered_count
    FROM quiz_answers
    WHERE session_id = p_session_id;

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
        'correct_option', v_correct_option_key,
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
CREATE OR REPLACE FUNCTION get_session_state(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session quiz_sessions%ROWTYPE;
    v_questions JSONB := '[]'::jsonb;
    v_answers JSONB;
    v_session_q JSONB;
    v_q quiz_questions%ROWTYPE;
BEGIN
    SELECT * INTO v_session
    FROM quiz_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Phiên chơi không tồn tại.';
    END IF;

    IF v_session.session_data IS NOT NULL THEN
        FOR v_session_q IN SELECT * FROM jsonb_array_elements(v_session.session_data)
        LOOP
            SELECT * INTO v_q FROM quiz_questions WHERE id = (v_session_q->>'question_id')::INTEGER;
            IF FOUND THEN
                v_questions := v_questions || jsonb_build_object(
                    'id', v_q.id,
                    'question_text', v_q.question_text,
                    'options', v_session_q->'options',
                    'sort_order', v_q.sort_order
                );
            END IF;
        END LOOP;
    ELSE
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
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'question_id', a.question_id,
                'selected_option', a.selected_option,
                'is_correct', a.is_correct,
                'correct_option', CASE 
                    WHEN v_session.session_data IS NOT NULL THEN (
                        SELECT sq->>'correct_option'
                        FROM jsonb_array_elements(v_session.session_data) AS sq
                        WHERE (sq->>'question_id')::INTEGER = a.question_id
                        LIMIT 1
                    )
                    ELSE q.correct_option
                END,
                'correct_option_text', CASE 
                    WHEN v_session.session_data IS NOT NULL THEN (
                        SELECT sq->>'correct_option_text'
                        FROM jsonb_array_elements(v_session.session_data) AS sq
                        WHERE (sq->>'question_id')::INTEGER = a.question_id
                        LIMIT 1
                    )
                    ELSE (
                        SELECT opt->>'text'
                        FROM jsonb_array_elements(q.options) AS opt
                        WHERE upper(opt->>'key') = upper(q.correct_option)
                        LIMIT 1
                    )
                END,
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
-- Tự động lọc bỏ các lượt thi thần tốc dưới 12 giây (chống tool spam)
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


-- HÀM 6: admin_delete_session (Xóa trực tiếp lượt thi bằng mã PIN 'huyadmin')
CREATE OR REPLACE FUNCTION admin_delete_session(p_session_id TEXT, p_admin_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF trim(p_admin_pin) != 'huyadmin' THEN
        RAISE EXCEPTION 'Mã PIN Admin không chính xác.';
    END IF;

    DELETE FROM quiz_sessions WHERE id = p_session_id::UUID;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_session(p_session_id UUID, p_admin_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF trim(p_admin_pin) != 'huyadmin' THEN
        RAISE EXCEPTION 'Mã PIN Admin không chính xác.';
    END IF;

    DELETE FROM quiz_sessions WHERE id = p_session_id;

    RETURN true;
END;
$$;


-- 5. PHÂN QUYỀN THỰC THI (GRANT EXECUTE TO ANON & AUTHENTICATED)
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION start_quiz(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_answer(UUID, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_quiz(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_session_state(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_session(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_delete_session(UUID, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';


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
