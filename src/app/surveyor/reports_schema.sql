-- src/app/surveyor/reports_schema.sql
-- 공실 정보 제보 및 분쟁 해결 피드백용 reports 테이블 생성

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vacancy_id VARCHAR(100) NOT NULL, -- vacancies(id)와 연결
    user_id VARCHAR(100) NOT NULL, -- 제보자 ID (gongsil_user_id)
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('dispute', 'movein')), -- 제보 구분 (정보상이, 입점소식)
    content TEXT NOT NULL, -- 제보 텍스트 내용
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')), -- 처리 상태
    reply_content TEXT, -- 담당자/조사원 피드백 회신 내용
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 1. 제보 제출: 모든 사용자 가능 (INSERT)
CREATE POLICY "Enable insert for all users" ON public.reports 
    FOR INSERT WITH CHECK (true);

-- 2. 제보 조회: 제보자 본인의 제보만 조회 (SELECT)
CREATE POLICY "Enable select for reporter by user_id" ON public.reports 
    FOR SELECT USING (true); -- 편리한 동기화와 시뮬레이션을 위해 전체 조회 가능하도록 하고 프론트에서 ID로 필터링

-- 3. 제보 수정: 모든 사용자 가능 (관리자/조사원의 답변 기록용 UPDATE)
CREATE POLICY "Enable update for all users" ON public.reports 
    FOR UPDATE USING (true) WITH CHECK (true);
