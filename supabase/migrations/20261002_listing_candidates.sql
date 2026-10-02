-- 네이버부동산 등 온라인에서 찾은 "매물로 나온 상가" 후보 목록.
-- 책상에서 후보를 모으고, 현장에서 공실 여부를 확인한 뒤 공실로 등록한다.
-- 매물 사진·설명은 복사하지 않고 사실 정보(주소, 층, 면적, 가격, 중개사)만 직접 입력한다.
-- 테이블은 RLS 만 켜고 정책을 두지 않는다. 조사원 토큰 RPC 로만 읽고 쓴다.

create table if not exists public.listing_candidates (
  id             uuid primary key default gen_random_uuid(),
  source         text not null default 'naver' check (source in ('naver', 'other')),
  source_ref     text check (source_ref is null or char_length(source_ref) <= 300),
  label          text not null check (char_length(label) between 1 and 120),
  address        text check (address is null or char_length(address) <= 200),
  neighborhood   text check (neighborhood is null or char_length(neighborhood) <= 40),
  floor          text check (floor is null or char_length(floor) <= 20),
  area           text check (area is null or char_length(area) <= 40),
  deposit        bigint check (deposit is null or deposit between 0 and 100000000),
  monthly_rent   bigint check (monthly_rent is null or monthly_rent between 0 and 100000000),
  management_fee bigint check (management_fee is null or management_fee between 0 and 100000000),
  realtor_name   text check (realtor_name is null or char_length(realtor_name) <= 80),
  realtor_phone  text check (realtor_phone is null or char_length(realtor_phone) <= 40),
  lat            double precision not null check (lat between 33 and 39),
  lng            double precision not null check (lng between 124 and 132),
  status         text not null default 'todo' check (status in ('todo', 'verified', 'invalid', 'registered')),
  note           text check (note is null or char_length(note) <= 500),
  vacancy_id     uuid references public.vacancies(id) on delete set null,
  created_by     text references public.team_members(id) on delete set null,
  created_at     timestamptz not null default now(),
  checked_by     text references public.team_members(id) on delete set null,
  checked_at     timestamptz
);
create index if not exists listing_candidates_status_idx on public.listing_candidates (status, created_at desc);
alter table public.listing_candidates enable row level security;

create or replace function public.staff_candidates_list(p_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', c.id, 'source', c.source, 'source_ref', c.source_ref, 'label', c.label, 'address', c.address,
        'neighborhood', c.neighborhood, 'floor', c.floor, 'area', c.area,
        'deposit', c.deposit, 'monthly_rent', c.monthly_rent, 'management_fee', c.management_fee,
        'realtor_name', c.realtor_name, 'realtor_phone', c.realtor_phone,
        'lat', c.lat, 'lng', c.lng, 'status', c.status, 'note', c.note, 'vacancy_id', c.vacancy_id,
        'created_at', c.created_at, 'checked_at', c.checked_at,
        'created_by_name', (select real_name from public.team_members where id = c.created_by),
        'checked_by_name', (select real_name from public.team_members where id = c.checked_by)
      ) order by c.created_at desc)
    from public.listing_candidates c
  ), '[]'::jsonb));
end;
$$;

create or replace function public.staff_candidate_add(p_token text, p jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members; v_id uuid;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if nullif(btrim(coalesce(p->>'label', '')), '') is null
     or (p->>'lat') is null or (p->>'lng') is null then
    return jsonb_build_object('error', 'invalid_input');
  end if;
  begin
    insert into public.listing_candidates
      (source, source_ref, label, address, neighborhood, floor, area, deposit, monthly_rent, management_fee,
       realtor_name, realtor_phone, lat, lng, note, created_by)
    values
      (coalesce(nullif(p->>'source', ''), 'naver'), nullif(btrim(p->>'source_ref'), ''), btrim(p->>'label'),
       nullif(btrim(p->>'address'), ''), nullif(btrim(p->>'neighborhood'), ''), nullif(btrim(p->>'floor'), ''),
       nullif(btrim(p->>'area'), ''), (nullif(p->>'deposit', ''))::bigint, (nullif(p->>'monthly_rent', ''))::bigint,
       (nullif(p->>'management_fee', ''))::bigint, nullif(btrim(p->>'realtor_name'), ''),
       nullif(btrim(p->>'realtor_phone'), ''), (p->>'lat')::float8, (p->>'lng')::float8,
       nullif(btrim(p->>'note'), ''), a.id)
    returning id into v_id;
  exception when check_violation or invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('error', 'invalid_input');
  end;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.staff_candidate_set_status(p_token text, p_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if p_status not in ('todo', 'verified', 'invalid') then return jsonb_build_object('error', 'invalid_status'); end if;
  update public.listing_candidates
     set status = p_status,
         note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), note),
         checked_by = case when p_status = 'todo' then null else a.id end,
         checked_at = case when p_status = 'todo' then null else now() end
   where id = p_id and status <> 'registered';
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.staff_candidate_link(p_token text, p_id uuid, p_vacancy_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if not exists (select 1 from public.vacancies where id = p_vacancy_id) then
    return jsonb_build_object('error', 'vacancy_not_found');
  end if;
  update public.listing_candidates
     set status = 'registered', vacancy_id = p_vacancy_id, checked_by = a.id, checked_at = now()
   where id = p_id;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.staff_candidates_list(text) from public;
revoke all on function public.staff_candidate_add(text, jsonb) from public;
revoke all on function public.staff_candidate_set_status(text, uuid, text, text) from public;
revoke all on function public.staff_candidate_link(text, uuid, uuid) from public;
grant execute on function public.staff_candidates_list(text) to anon, authenticated;
grant execute on function public.staff_candidate_add(text, jsonb) to anon, authenticated;
grant execute on function public.staff_candidate_set_status(text, uuid, text, text) to anon, authenticated;
grant execute on function public.staff_candidate_link(text, uuid, uuid) to anon, authenticated;
