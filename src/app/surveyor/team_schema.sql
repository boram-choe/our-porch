-- 7. 팀원(조사원) 관리 테이블
CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY,               -- 8자리 숫자 ID (2-2-2-2)
  password TEXT NOT NULL,            -- 로그인 비밀번호
  real_name TEXT NOT NULL,           -- 실명
  role TEXT NOT NULL CHECK (role IN ('CEO', 'OPS', 'SURVEYOR')),
  city TEXT NOT NULL DEFAULT '서울시',
  gu TEXT NOT NULL DEFAULT '서대문구',
  dong TEXT NOT NULL,                -- 담당 행정동
  phone TEXT,                        -- 연락처
  hire_date DATE DEFAULT CURRENT_DATE, -- 입사일
  base_salary INTEGER DEFAULT 0,     -- 기본급
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 읽기 가능
CREATE POLICY "Anyone can read team members" ON public.team_members FOR SELECT USING (TRUE);

-- 정책: 누구나 삽입/수정 가능 (MVP 단계, 추후 CEO/OPS 권한 강화 필요)
CREATE POLICY "Anyone can insert team members" ON public.team_members FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update team members" ON public.team_members FOR UPDATE USING (TRUE);
