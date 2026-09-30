-- ============================================================
-- 알림(notifications) 테이블 생성
-- 실행: Supabase Dashboard > SQL Editor 에 붙여넣고 실행
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('movein', 'reply', 'system')),
  title       text NOT NULL,
  body        text NOT NULL,
  vacancy_id  uuid REFERENCES vacancies(id) ON DELETE SET NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 인덱스: 유저별 최신 알림 조회 최적화
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 알림만 조회/수정 가능
CREATE POLICY "notifications: 본인만 조회" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: 본인만 읽음처리" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 정책: INSERT는 서비스 롤(서버)만 가능 (anon/authenticated 불가)
-- 단, 개발 편의상 authenticated 허용 후 서비스 배포 시 제거 권장
CREATE POLICY "notifications: 서비스 INSERT"
  ON notifications FOR INSERT
  WITH CHECK (true); -- 추후 service_role 전용으로 제한 가능
