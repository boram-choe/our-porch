-- ============================================================
-- 보안 강화 2단계 (잠금). 1단계 클라이언트가 배포된 뒤에 실행한다.
--  - team_members 평문 password 컬럼 삭제 + 공개 정책 전부 제거
--  - vacancies/reports/notifications 의 "누구나 수정/조회" 정책 제거
--  - user_profiles.is_admin 을 사용자가 스스로 바꾸지 못하게 차단
--  - rls_auto_enable() 외부 실행 차단
-- ============================================================

-- 0) 롤아웃 중 구 클라이언트가 평문으로 바꾼 비밀번호가 있으면 해시에 반영
update public.team_members
   set password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
 where coalesce(password, '') <> ''
   and (password_hash is null or password_hash <> extensions.crypt(password, password_hash));

-- 1) password 컬럼을 참조하지 않도록 RPC 재정의 후 컬럼 삭제
create or replace function public.team_create_member(p_token text, p jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members; v_role text; v_id text; v_pw text;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null or a.role not in ('CEO', 'OPS') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  v_role := coalesce(nullif(p->>'role', ''), 'SURVEYOR');
  if v_role not in ('CEO', 'OPS', 'SURVEYOR') then
    return jsonb_build_object('error', 'invalid_role');
  end if;
  if a.role = 'OPS' and v_role <> 'SURVEYOR' then
    return jsonb_build_object('error', 'forbidden');
  end if;
  v_id := btrim(coalesce(p->>'id', ''));
  if v_id = '' or nullif(btrim(coalesce(p->>'real_name', '')), '') is null
     or nullif(btrim(coalesce(p->>'dong', '')), '') is null then
    return jsonb_build_object('error', 'invalid_input');
  end if;
  v_pw := coalesce(nullif(p->>'password', ''), v_id);

  begin
    insert into public.team_members
      (id, password_hash, real_name, role, city, gu, dong, phone, hire_date, base_salary)
    values
      (v_id, extensions.crypt(v_pw, extensions.gen_salt('bf')),
       btrim(p->>'real_name'), v_role,
       coalesce(nullif(p->>'city', ''), '서울시'), coalesce(nullif(p->>'gu', ''), '서대문구'),
       btrim(p->>'dong'), nullif(p->>'phone', ''),
       coalesce((nullif(p->>'hire_date', ''))::date, current_date),
       case when a.role = 'CEO' then coalesce((p->>'base_salary')::int, 0) else 0 end);
  exception when unique_violation then
    return jsonb_build_object('error', 'duplicate_id');
  end;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.team_change_password(p_token text, p_new text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if length(coalesce(p_new, '')) < 6 then return jsonb_build_object('error', 'too_short'); end if;
  update public.team_members
     set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf'))
   where id = a.id;
  delete from public.team_sessions where member_id = a.id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.team_reset_password(p_token text, p_member_id text, p_new text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null or a.role <> 'CEO' then return jsonb_build_object('error', 'forbidden'); end if;
  if length(coalesce(p_new, '')) < 6 then return jsonb_build_object('error', 'too_short'); end if;
  update public.team_members
     set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf'))
   where id = p_member_id;
  delete from public.team_sessions where member_id = p_member_id;
  delete from public.team_login_attempts where member_id = p_member_id;
  return jsonb_build_object('ok', true);
end;
$$;

alter table public.team_members drop column password;
alter table public.team_members alter column password_hash set not null;

-- 2) team_members: 정책 전부 제거 (RLS 활성 + 정책 없음 = 클라이언트 직접 접근 불가, RPC만 허용)
drop policy if exists "Anyone can read team members" on public.team_members;
drop policy if exists "Anyone can insert team members" on public.team_members;
drop policy if exists "Anyone can update team members" on public.team_members;

-- 3) vacancies: 누구나 수정 가능 정책 제거 → 비고(survey_remarks)만 수정 가능하도록 트리거로 제한
drop policy if exists "Allow anyone to update vacancies" on public.vacancies;
create policy "vacancies_update_remarks_guarded" on public.vacancies
  for update using (true) with check (true);

create or replace function public.vacancies_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare is_adm boolean;
begin
  -- SECURITY DEFINER RPC(조사원/서비스) 경로는 current_user 가 소유자이므로 통과
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  select exists (select 1 from public.user_profiles up
                  where up.id = auth.uid() and up.is_admin) into is_adm;
  if is_adm then return new; end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    return new;
  end if;

  -- UPDATE: 등록자 본인은 자유롭게, 그 외에는 비고/갱신시각만 변경 가능
  if old.registered_by is not null and old.registered_by = auth.uid()::text then
    return new;
  end if;
  if (to_jsonb(new) - 'survey_remarks' - 'updated_at')
     is distinct from (to_jsonb(old) - 'survey_remarks' - 'updated_at') then
    raise exception 'vacancies: 이 항목은 수정할 권한이 없습니다' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists vacancies_guard_trg on public.vacancies;
create trigger vacancies_guard_trg
  before insert or update on public.vacancies
  for each row execute function public.vacancies_guard();

-- 4) reports: 조회는 본인/관리자, 수정은 관리자만 (조사원은 RPC 사용). 제보 작성(INSERT)은 유지
drop policy if exists "Enable select for reporter by user_id" on public.reports;
drop policy if exists "Enable update for all users" on public.reports;
create policy "reports_select_own_or_admin" on public.reports
  for select using (
    user_id = auth.uid()::text
    or exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_admin)
  );
create policy "reports_update_admin" on public.reports
  for update using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_admin)
  ) with check (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_admin)
  );

-- 5) notifications: 직접 INSERT 는 관리자만 (조사원 알림은 RPC 내부에서 생성)
drop policy if exists "notifications: 서비스 INSERT" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert with check (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.is_admin)
  );

-- 6) user_profiles.is_admin 은 클라이언트가 스스로 바꿀 수 없다 (직접 UPDATE/INSERT 시 무시)
create or replace function public.user_profiles_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    else
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists user_profiles_guard_trg on public.user_profiles;
create trigger user_profiles_guard_trg
  before insert or update on public.user_profiles
  for each row execute function public.user_profiles_guard();

-- 7) 불필요한 외부 실행 권한 제거
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
