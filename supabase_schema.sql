-- =====================================================
-- 여긴뭐가 (Yeogin Mwoga) - Supabase DB 테이블 생성 SQL
-- Supabase > SQL Editor 에 복사 후 Run 하세요
-- =====================================================

-- 1. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  age_range TEXT,
  activity_times TEXT[],  -- ['평일 낮', '평일 저녁', '주말']
  persona_ids TEXT[],
  persona_label TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 공실(빈 공간) 테이블
CREATE TABLE IF NOT EXISTS public.vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landmark TEXT NOT NULL,          -- "서대문우체국 앞 1층"
  address TEXT,
  floor TEXT,                      -- "1층", "지하 1층", "2층"
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  registered_by UUID REFERENCES public.user_profiles(id),
  neighborhood TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 업종 투표 테이블
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  category TEXT NOT NULL,          -- "카페", "베이커리", "병원" 등
  category_icon TEXT,              -- 이모지
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vacancy_id, user_id, category)  -- 동일 공실에 동일 업종 중복 투표 방지
);

-- 4. 댓글 테이블
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 댓글 좋아요 테이블
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- =====================================================
-- 인덱스: 빠른 조회를 위해
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vacancies_neighborhood ON public.vacancies(neighborhood);
CREATE INDEX IF NOT EXISTS idx_votes_vacancy_id ON public.votes(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_neighborhood ON public.user_profiles(neighborhood);
CREATE INDEX IF NOT EXISTS idx_comments_vacancy_id ON public.comments(vacancy_id);

-- =====================================================
-- RLS (Row Level Security): 보안 정책
-- =====================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (공개 데이터)
CREATE POLICY "Anyone can read profiles" ON public.user_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can read vacancies" ON public.vacancies FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can read votes" ON public.votes FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can read comment_likes" ON public.comment_likes FOR SELECT USING (TRUE);

-- 쓰기는 anon 포함 누구나 허용 (MVP 단계)
CREATE POLICY "Anyone can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can insert vacancies" ON public.vacancies FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can insert votes" ON public.votes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can update votes" ON public.votes FOR UPDATE USING (TRUE);
CREATE POLICY "Anyone can delete votes" ON public.votes FOR DELETE USING (TRUE);
CREATE POLICY "Anyone can insert comments" ON public.comments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can delete comments" ON public.comments FOR DELETE USING (TRUE);
CREATE POLICY "Anyone can insert comment_likes" ON public.comment_likes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can delete comment_likes" ON public.comment_likes FOR DELETE USING (TRUE);
