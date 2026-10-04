-- 인허가 자동 후보: 출처 'permit' 허용, 같은 출처·참조 중복 방지, 점수 컬럼.
-- (운영 DB 마이그레이션 listing_candidates_permit_source / staff_candidate_add_duplicate / listing_candidates_score 와 같다.)
alter table public.listing_candidates drop constraint if exists listing_candidates_source_check;
alter table public.listing_candidates add constraint listing_candidates_source_check check (source in ('naver', 'other', 'permit'));
create unique index if not exists listing_candidates_source_ref_uniq on public.listing_candidates (source, source_ref) where source_ref is not null;
alter table public.listing_candidates drop constraint if exists listing_candidates_note_check;
alter table public.listing_candidates add constraint listing_candidates_note_check check (note is null or char_length(note) <= 1000);
alter table public.listing_candidates add column if not exists score int;
-- staff_candidate_add 는 duplicate 오류 반환과 score 저장을, staff_candidates_list 는 score 반환을 추가하도록 교체했다.