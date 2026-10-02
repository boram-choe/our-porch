-- 사용자 프로필 개인정보 보호 2단계: 공개 SELECT 정책(profiles_select_public) 제거.
-- 본인과 관리자만 읽을 수 있고, 관리자 판별은 정책 재귀를 피하려고 SECURITY DEFINER 함수 is_admin_user() 로 한다.
-- (운영 DB 마이그레이션 profile_privacy_stage2_lockdown + profile_privacy_stage2_fix_recursion 과 같다.)
create or replace function public.is_admin_user()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_profiles where id = auth.uid() and is_admin); $$;
revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to anon, authenticated;
drop policy if exists "profiles_select_public" on public.user_profiles;
drop policy if exists "profiles_select_own_or_admin" on public.user_profiles;
create policy "profiles_select_own_or_admin" on public.user_profiles
  for select using (auth.uid() = id or public.is_admin_user());