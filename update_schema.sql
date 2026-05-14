
-- display_id 및 기타 관리용 컬럼 추가
ALTER TABLE public.vacancies ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE public.vacancies ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
ALTER TABLE public.vacancies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_vacancies_display_id ON public.vacancies(display_id);
