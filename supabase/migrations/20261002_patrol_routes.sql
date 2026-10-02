-- ============================================================
-- 조사원 순회 경로 (남가좌동·북가좌동 각 8개 정거장) + 방문 기록
--  - 정거장은 카카오 로컬 API 로 수집한 점포 1,272곳을 190m 반경으로 묶어 밀집 구역을 고르고,
--    가좌역에서 시작하는 최단 순서로 정렬한 값이다 (2026-10-02 기준).
--  - 테이블은 RLS 만 켜고 정책을 두지 않는다. 조사원 토큰 RPC 로만 읽고 쓴다.
-- ============================================================

create table if not exists public.patrol_stops (
  id         uuid primary key default gen_random_uuid(),
  route      text not null check (route in ('namgajwa', 'bukgajwa')),
  seq        int  not null,
  label      text not null,
  road       text not null default '',
  landmarks  text[] not null default '{}',
  lat        double precision not null,
  lng        double precision not null,
  poi_count  int  not null default 0,
  mix        jsonb not null default '{}'::jsonb,
  unique (route, seq)
);

create table if not exists public.patrol_visits (
  id          uuid primary key default gen_random_uuid(),
  stop_id     uuid not null references public.patrol_stops(id) on delete cascade,
  member_id   text not null references public.team_members(id) on delete cascade,
  result      text not null check (result in ('found', 'none', 'skipped')),
  found_count int  not null default 0 check (found_count between 0 and 50),
  note        text check (note is null or char_length(note) <= 500),
  visited_at  timestamptz not null default now()
);
create index if not exists patrol_visits_stop_idx on public.patrol_visits (stop_id, visited_at desc);

alter table public.patrol_stops  enable row level security;
alter table public.patrol_visits enable row level security;

insert into public.patrol_stops (route, seq, label, road, landmarks, lat, lng, poi_count, mix) values
('namgajwa', 1, '신재래시장·가좌역 앞', '수색로2길', '{"신재래시장","가재울시장","가좌역 경의중앙선"}'::text[], 37.570189, 126.915418, 148, '{"음식점": 74, "병원": 25, "학원": 23}'::jsonb),
('namgajwa', 2, '별동상가 일대', '가재울미래로', '{"별동상가","가좌사거리","래미안남가좌2아파트 상가동"}'::text[], 37.573917, 126.915232, 28, '{"음식점": 22, "병원": 3, "카페": 2}'::jsonb),
('namgajwa', 3, '가재울사거리', '가재울미래로', '{"가재울사거리","서울가재울초등학교","별동상가"}'::text[], 37.574593, 126.917811, 87, '{"음식점": 28, "학원": 28, "카페": 10}'::jsonb),
('namgajwa', 4, '현대아파트 상가 주변', '가재울로', '{"백련시장","현대아파트 상가","명지대사거리"}'::text[], 37.575901, 126.920936, 62, '{"음식점": 29, "학원": 13, "카페": 10}'::jsonb),
('namgajwa', 5, '백련시장 동쪽', '증가로', '{"백련시장","남가좌2동주민센터","명지대사거리"}'::text[], 37.576445, 126.925174, 36, '{"음식점": 20, "카페": 5, "병원": 3}'::jsonb),
('namgajwa', 6, '백련시장·명지대사거리', '거북골로', '{"백련시장","남가좌2동주민센터","명지대사거리"}'::text[], 37.577888, 126.922926, 183, '{"음식점": 89, "카페": 26, "학원": 23}'::jsonb),
('namgajwa', 7, '명지대 인문캠퍼스 앞', '거북골로', '{"명지대학교 인문캠퍼스","남가좌2동주민센터"}'::text[], 37.580367, 126.924052, 54, '{"음식점": 27, "은행": 11, "카페": 8}'::jsonb),
('namgajwa', 8, '명지대 북쪽 상가 일대', '명지대5길', '{"명지대학교 인문캠퍼스","명지중학교"}'::text[], 37.583055, 126.923192, 39, '{"음식점": 22, "카페": 12, "병원": 2}'::jsonb),
('bukgajwa', 1, '래미안남가좌2차 상가동 주변', '수색로6길', '{"래미안남가좌2아파트 상가동","가재울시장","가좌역 경의중앙선"}'::text[], 37.571, 126.912497, 50, '{"학원": 21, "병원": 13, "음식점": 4}'::jsonb),
('bukgajwa', 2, '삼호아파트 상가동', '거북골로', '{"삼호아파트 상가동","일신건영 휴먼아파트 상가","가재울중학교"}'::text[], 37.575847, 126.912822, 52, '{"학원": 18, "음식점": 17, "은행": 5}'::jsonb),
('bukgajwa', 3, '연희한양상가 일대', '', '{"연희한양상가","서울북가좌초등학교","DMC래미안e편한세상 상가동"}'::text[], 37.575518, 126.906229, 38, '{"음식점": 28, "카페": 4, "편의점": 2}'::jsonb),
('bukgajwa', 4, '북가좌초교사거리', '', '{"북가좌초교사거리","일신건영 휴먼아파트 상가","연희한양상가"}'::text[], 37.57839, 126.910332, 120, '{"학원": 48, "음식점": 38, "병원": 19}'::jsonb),
('bukgajwa', 5, '북가좌사거리 일대', '', '{"북가좌사거리","북가좌2동주민센터"}'::text[], 37.581679, 126.912669, 118, '{"음식점": 78, "카페": 12, "병원": 9}'::jsonb),
('bukgajwa', 6, '북가좌2동주민센터 앞', '', '{"북가좌2동주민센터","북가좌사거리"}'::text[], 37.584252, 126.913041, 45, '{"음식점": 31, "카페": 9, "편의점": 4}'::jsonb),
('bukgajwa', 7, '서울연가초·연희중 주변', '', '{"서울연가초등학교","연희중학교","북가좌사거리"}'::text[], 37.580491, 126.916694, 38, '{"학원": 22, "음식점": 8, "편의점": 5}'::jsonb),
('bukgajwa', 8, '서울연가초 동쪽 상가 일대', '', '{"서울연가초등학교","연희중학교"}'::text[], 37.58252, 126.919523, 28, '{"음식점": 17, "학원": 6, "카페": 3}'::jsonb)
on conflict (route, seq) do nothing;

-- 정거장 + 마지막 방문/누적 요약. 조사원 전원이 같은 현황을 본다 (역할 무관).
create or replace function public.staff_patrol_overview(p_token text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  return jsonb_build_object('me', a.id, 'stops', coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', s.id, 'route', s.route, 'seq', s.seq, 'label', s.label, 'road', s.road,
        'landmarks', s.landmarks, 'lat', s.lat, 'lng', s.lng, 'poi_count', s.poi_count, 'mix', s.mix,
        'visit_count', coalesce(v.visit_count, 0),
        'found_total', coalesce(v.found_total, 0),
        'last_visited_at', v.last_visited_at,
        'last_by', v.last_by,
        'last_result', v.last_result,
        'last_note', v.last_note
      ) order by s.route, s.seq)
    from public.patrol_stops s
    left join lateral (
      select count(*) as visit_count,
             sum(pv.found_count) as found_total,
             (array_agg(pv.visited_at order by pv.visited_at desc))[1] as last_visited_at,
             (array_agg(tm.real_name order by pv.visited_at desc))[1] as last_by,
             (array_agg(pv.result order by pv.visited_at desc))[1] as last_result,
             (array_agg(pv.note order by pv.visited_at desc))[1] as last_note
        from public.patrol_visits pv
        join public.team_members tm on tm.id = pv.member_id
       where pv.stop_id = s.id
    ) v on true
  ), '[]'::jsonb));
end;
$$;

create or replace function public.staff_patrol_log(
  p_token text, p_stop_id uuid, p_result text, p_found_count int default 0, p_note text default null)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare a public.team_members;
begin
  select * into a from public._team_actor(p_token);
  if a.id is null then return jsonb_build_object('error', 'unauthorized'); end if;
  if p_result not in ('found', 'none', 'skipped') then return jsonb_build_object('error', 'invalid_result'); end if;
  if not exists (select 1 from public.patrol_stops where id = p_stop_id) then
    return jsonb_build_object('error', 'not_found');
  end if;
  insert into public.patrol_visits(stop_id, member_id, result, found_count, note)
  values (p_stop_id, a.id, p_result,
          case when p_result = 'found' then greatest(coalesce(p_found_count, 0), 0) else 0 end,
          nullif(btrim(coalesce(p_note, '')), ''));
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.staff_patrol_overview(text) from public;
revoke all on function public.staff_patrol_log(text, uuid, text, int, text) from public;
grant execute on function public.staff_patrol_overview(text) to anon, authenticated;
grant execute on function public.staff_patrol_log(text, uuid, text, int, text) to anon, authenticated;
