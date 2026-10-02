-- 가입 경로 추적 (src 태그). 본인만 1회 INSERT, 집계는 조사원 RPC(CEO/OPS)로만 조회.
create table if not exists public.signup_sources (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  source        text not null check (source ~ '^[a-z0-9:._-]{1,60}$'),
  campaign      text check (campaign is null or campaign ~ '^[a-z0-9:._-]{1,60}$'),
  landing       text check (landing is null or char_length(landing) <= 200),
  first_seen_at timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.signup_sources enable row level security;
create policy "signup_sources_insert_own" on public.signup_sources
  for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.staff_signup_sources(p_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null or a.role not in ('CEO', 'OPS') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  return jsonb_build_object(
    'total_users', (select count(*) from public.user_profiles),
    'tracked', (select count(*) from public.signup_sources),
    'last7', (select count(*) from public.signup_sources where created_at > now() - interval '7 days'),
    'by_source', coalesce((
      select jsonb_agg(x order by x.n desc)
        from (select source, campaign, count(*) as n, max(created_at) as last_at
                from public.signup_sources group by source, campaign) x
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.staff_signup_sources(text) from public;
grant execute on function public.staff_signup_sources(text) to anon, authenticated;
