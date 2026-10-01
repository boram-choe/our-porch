-- ============================================================
-- 보안 강화 1단계 (추가만 수행, 기존 클라이언트 동작에 영향 없음)
--  - team_members 비밀번호 해시화 + 세션 토큰 기반 인증 RPC
--  - 조사원 전용 공실 저장 / 제보 조회·회신 RPC
-- 2단계(20261002_security_stage2_lockdown.sql)에서 기존 공개 정책을 제거한다.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) 비밀번호 해시 (기존 평문은 2단계에서 컬럼째 삭제)
alter table public.team_members add column if not exists password_hash text;
update public.team_members
   set password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
 where password_hash is null;

-- 2) 세션 / 로그인 시도 (RLS 켜고 정책 없음 = 클라이언트 직접 접근 불가)
create table if not exists public.team_sessions (
  token_hash text primary key,
  member_id  text not null references public.team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists public.team_login_attempts (
  member_id    text primary key,
  fail_count   int not null default 0,
  locked_until timestamptz
);
alter table public.team_sessions enable row level security;
alter table public.team_login_attempts enable row level security;

-- 3) 내부 헬퍼 (외부 호출 불가)
create or replace function public._team_actor(p_token text)
returns public.team_members
language sql stable security definer
set search_path = public, extensions
as $$
  select m.*
    from public.team_sessions s
    join public.team_members m on m.id = s.member_id
   where s.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and s.expires_at > now()
   limit 1;
$$;

create or replace function public._team_public(m public.team_members, p_private boolean)
returns jsonb
language sql immutable
set search_path = public
as $$
  select jsonb_build_object(
    'id', m.id, 'real_name', m.real_name, 'role', m.role,
    'city', m.city, 'gu', m.gu, 'dong', m.dong,
    'phone', case when p_private then m.phone else null end,
    'hire_date', m.hire_date,
    'base_salary', case when p_private then m.base_salary else null end,
    'created_at', m.created_at
  );
$$;

revoke all on function public._team_actor(text) from public, anon, authenticated;
revoke all on function public._team_public(public.team_members, boolean) from public, anon, authenticated;

-- 4) 로그인 (5회 실패 시 15분 잠금)
create or replace function public.team_login(p_id text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  m public.team_members;
  att public.team_login_attempts;
  tok text;
begin
  p_id := btrim(coalesce(p_id, ''));
  p_password := btrim(coalesce(p_password, ''));

  select * into att from public.team_login_attempts where member_id = p_id;
  if found and att.locked_until is not null and att.locked_until > now() then
    return jsonb_build_object('error', 'locked');
  end if;

  select * into m from public.team_members where id = p_id;
  if m.id is null or m.password_hash is null
     or m.password_hash <> extensions.crypt(p_password, m.password_hash) then
    insert into public.team_login_attempts(member_id, fail_count) values (p_id, 1)
    on conflict (member_id) do update
       set fail_count = case when public.team_login_attempts.locked_until is not null
                                  and public.team_login_attempts.locked_until <= now()
                             then 1 else public.team_login_attempts.fail_count + 1 end,
           locked_until = null;
    update public.team_login_attempts
       set locked_until = now() + interval '15 minutes', fail_count = 0
     where member_id = p_id and fail_count >= 5;
    return jsonb_build_object('error', 'invalid');
  end if;

  delete from public.team_login_attempts where member_id = p_id;
  delete from public.team_sessions where expires_at < now();

  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.team_sessions(token_hash, member_id, expires_at)
  values (encode(extensions.digest(tok, 'sha256'), 'hex'), m.id, now() + interval '14 days');

  return jsonb_build_object('token', tok, 'member', public._team_public(m, true));
end;
$$;

create or replace function public.team_me(p_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare m public.team_members;
begin
  select * into m from public._team_actor(p_token);
  if m.id is null then return null; end if;
  return public._team_public(m, true);
end;
$$;

create or replace function public.team_logout(p_token text)
returns void
language sql security definer
set search_path = public, extensions
as $$
  delete from public.team_sessions
   where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- 5) 팀원 목록 (연락처/급여는 권한자만)
create or replace function public.team_list(p_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members; r jsonb;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(
           public._team_public(t, a.role in ('CEO', 'OPS'))
           || case when a.role = 'CEO' then '{}'::jsonb
                   else jsonb_build_object('base_salary', null) end
           order by t.created_at), '[]'::jsonb)
    into r from public.team_members t;
  return r;
end;
$$;

-- 6) 팀원 생성 (CEO: 모든 역할, OPS: SURVEYOR만). ID 중복 시 덮어쓰지 않고 오류 반환
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
      (id, password, password_hash, real_name, role, city, gu, dong, phone, hire_date, base_salary)
    values
      (v_id, '', extensions.crypt(v_pw, extensions.gen_salt('bf')),
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

-- 7) 비밀번호 변경 (본인) / 재설정 (CEO)
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
     set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')), password = ''
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
     set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')), password = ''
   where id = p_member_id;
  delete from public.team_sessions where member_id = p_member_id;
  delete from public.team_login_attempts where member_id = p_member_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- 8) 조사원용 공실 저장 (신규/수정). 통합 시 투표·댓글 이관, 입점 확정 전환 시 투표자 알림
create or replace function public.staff_save_vacancy(p_token text, p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  a public.team_members;
  old public.vacancies;
  v_merge uuid;
  v_merge_raw text := nullif(btrim(coalesce(p->>'merged_into_id', '')), '');
  v_id uuid;
  v_name text;
  v_store text;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;

  if v_merge_raw is not null then
    if v_merge_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_merge := v_merge_raw::uuid;
    else
      select id into v_merge from public.vacancies where display_id = v_merge_raw limit 1;
    end if;
  end if;

  if p_id is null then
    insert into public.vacancies
      (landmark, address, floor, lat, lng, neighborhood, registered_by, vacancy_period,
       image_url, deposit, monthly_rent, management_fee, survey_remarks, realtor_name,
       realtor_phone, area, images, status, hidden_reason, hidden_comment, merged_into_id,
       rejection_reason, last_modified_by, display_id, updated_at)
    values
      (p->>'landmark', p->>'address', p->>'floor', (p->>'lat')::float8, (p->>'lng')::float8,
       p->>'neighborhood', a.id, p->>'vacancy_period', p->>'image_url',
       (p->>'deposit')::bigint, (p->>'monthly_rent')::bigint, (p->>'management_fee')::bigint,
       p->>'survey_remarks', p->>'realtor_name', p->>'realtor_phone', p->>'area', p->>'images',
       coalesce(p->>'status', 'pending'), p->>'hidden_reason', p->>'hidden_comment', v_merge,
       p->>'rejection_reason', a.real_name, p->>'display_id', now())
    returning id into v_id;
    return jsonb_build_object('id', v_id);
  end if;

  select * into old from public.vacancies where id = p_id;
  if old.id is null then return jsonb_build_object('error', 'not_found'); end if;

  update public.vacancies set
    landmark = coalesce(p->>'landmark', landmark),
    address = coalesce(p->>'address', address),
    floor = coalesce(p->>'floor', floor),
    lat = coalesce((p->>'lat')::float8, lat),
    lng = coalesce((p->>'lng')::float8, lng),
    neighborhood = coalesce(p->>'neighborhood', neighborhood),
    vacancy_period = p->>'vacancy_period',
    image_url = p->>'image_url',
    deposit = (p->>'deposit')::bigint,
    monthly_rent = (p->>'monthly_rent')::bigint,
    management_fee = (p->>'management_fee')::bigint,
    survey_remarks = p->>'survey_remarks',
    realtor_name = p->>'realtor_name',
    realtor_phone = p->>'realtor_phone',
    area = p->>'area',
    images = p->>'images',
    status = coalesce(p->>'status', status),
    hidden_reason = p->>'hidden_reason',
    hidden_comment = p->>'hidden_comment',
    merged_into_id = v_merge,
    rejection_reason = p->>'rejection_reason',
    last_modified_by = a.real_name,
    display_id = coalesce(p->>'display_id', display_id),
    updated_at = now()
  where id = p_id;

  if p->>'status' = 'merged' and v_merge is not null then
    begin
      update public.votes set vacancy_id = v_merge where vacancy_id = p_id;
    exception when others then null;
    end;
    begin
      update public.comments set vacancy_id = v_merge where vacancy_id = p_id;
    exception when others then null;
    end;
  end if;

  -- 입점 확정으로 "처음" 전환될 때만 투표자 전원에게 알림
  if p->>'status' = 'completed' and old.status is distinct from 'completed' then
    v_name := coalesce(nullif(p->>'landmark', ''), nullif(p->>'address', ''), '이 공간');
    v_store := replace(coalesce(p->>'survey_remarks', ''), '[입점 확정] ', '');
    insert into public.notifications(user_id, type, title, body, vacancy_id)
    select distinct vt.user_id, 'movein',
           case when v_store <> '' then '✨ ' || v_name || '에 ''' || v_store || '''이(가) 입점했어요!'
                else '✨ ' || v_name || '에 새 가게가 입점했어요!' end,
           case when v_store <> '' then '당신이 상상했던 공간에 실제로 가게가 생겼어요. 동네에 새 명소를 함께 응원해봐요! 🎉'
                else '당신이 투표했던 공실에 드디어 입점이 확정되었습니다. 동네 변화를 지켜봐요! 🏠' end,
           p_id
      from public.votes vt where vt.vacancy_id = p_id;
  end if;

  return jsonb_build_object('id', p_id);
end;
$$;

-- 9) 조사원용 제보 조회 / 회신
create or replace function public.staff_vacancy_reports(p_token text, p_vacancy_id text)
returns setof public.reports
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return; end if;
  return query select * from public.reports
                where vacancy_id = p_vacancy_id order by created_at desc;
end;
$$;

create or replace function public.staff_reply_report(p_token text, p_report_id uuid, p_reply text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  update public.reports
     set reply_content = p_reply, status = 'resolved', updated_at = now()
   where id = p_report_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- 10) 공개 RPC 실행 권한: anon/authenticated 에 명시 부여 (기본 PUBLIC 권한 제거)
do $$
declare f text;
begin
  foreach f in array array[
    'team_login(text,text)', 'team_me(text)', 'team_logout(text)', 'team_list(text)',
    'team_create_member(text,jsonb)', 'team_change_password(text,text)',
    'team_reset_password(text,text,text)', 'staff_save_vacancy(text,uuid,jsonb)',
    'staff_vacancy_reports(text,text)', 'staff_reply_report(text,uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
