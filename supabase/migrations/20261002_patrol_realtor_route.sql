-- 중개업소 순회 경로: 부동산에 매물로 나온 상가를 먼저 확인하고, 중개사·임대인과 접점을 만드는 경로.
-- 정거장은 카카오 지도의 중개업소(AG2) 184곳 중 밀집 구역 10곳(140곳 포함)을 가좌역 기준 최단 순서로 정렬한 값 (2026-10-02).

alter table public.patrol_stops drop constraint if exists patrol_stops_route_check;
alter table public.patrol_stops add constraint patrol_stops_route_check
  check (route in ('namgajwa', 'bukgajwa', 'realtor'));

alter table public.patrol_stops add column if not exists agent_names text[] not null default '{}';

insert into public.patrol_stops (route, seq, label, road, landmarks, lat, lng, poi_count, mix, agent_names) values
('realtor', 1, '가재울시장·가좌역 중개업소 거리', '', '{"가재울시장","신재래시장","래미안남가좌2아파트 상가동"}'::text[], 37.570916, 126.91474, 18, '{"중개업소": 18}'::jsonb, '{"아이파크공인중개사사무소","알찬공인중개사사무소","우리공인중개사사무소"}'::text[]),
('realtor', 2, '가재울사거리·별동상가 중개업소', '', '{"별동상가","가재울사거리","서울가재울초등학교"}'::text[], 37.574235, 126.916612, 29, '{"중개업소": 29}'::jsonb, '{"정공인중개사사무소","신한부동산","가재울다올공인중개사사무소"}'::text[]),
('realtor', 3, '삼호아파트 상가동 중개업소', '', '{"삼호아파트 상가동","일신건영 휴먼아파트 상가","별동상가"}'::text[], 37.575985, 126.913006, 10, '{"중개업소": 10}'::jsonb, '{"알림공인중개사사무소","25시공인중개사","부동산랜드 공인중개사사무소"}'::text[]),
('realtor', 4, 'DMC래미안e편한세상 일대', '', '{"북가좌1동주민센터","DMC래미안e편한세상 상가동","가재울중학교"}'::text[], 37.573573, 126.910914, 9, '{"중개업소": 9}'::jsonb, '{"명가공인중개사사무소","래미안공인중개사사무소","고려공인중개사사무소"}'::text[]),
('realtor', 5, '연희한양상가 일대 중개업소', '', '{"연희한양상가","서울북가좌초등학교","가재울중학교"}'::text[], 37.575781, 126.906807, 11, '{"중개업소": 11}'::jsonb, '{"디지털 공인중개사사무소","미래부동산","제일공인중개사사무소"}'::text[]),
('realtor', 6, '북가좌초교사거리 중개업소', '', '{"일신건영 휴먼아파트 상가","북가좌사거리","북가좌초교사거리"}'::text[], 37.580193, 126.911539, 14, '{"중개업소": 14}'::jsonb, '{"삼성뉴타운공인중개사사무소","대성부동산중개사무소","명성부동산"}'::text[]),
('realtor', 7, '서울연가초·북가좌사거리 중개업소', '', '{"서울연가초등학교","북가좌사거리","연희중학교"}'::text[], 37.580945, 126.915234, 12, '{"중개업소": 12}'::jsonb, '{"희망공인중개사사무소","재영공인중개사사무소","주연공인중개사사무소"}'::text[]),
('realtor', 8, '명지대 인문캠퍼스 일대 중개업소', '', '{"명지대학교 인문캠퍼스"}'::text[], 37.582268, 126.921924, 9, '{"중개업소": 9}'::jsonb, '{"마이하임공인중개사사무소","플라워부동산","에이스공인중개사사무소"}'::text[]),
('realtor', 9, '백련시장·남가좌2동주민센터 중개업소', '', '{"남가좌2동주민센터","백련시장 상인회","백련시장"}'::text[], 37.578124, 126.924713, 13, '{"중개업소": 13}'::jsonb, '{"조박사부동산중개사무소","스마일공인중개사사무소","원탑공인중개사사무소"}'::text[]),
('realtor', 10, '현대아파트 상가·백련시장 서쪽 중개업소', '', '{"현대아파트 상가","백련시장","백련시장 상인회"}'::text[], 37.575689, 126.920668, 15, '{"중개업소": 15}'::jsonb, '{"가재울부동산 공인중개사사무소","부동산가이드공인중개사사무소","하나공인중개사사무소"}'::text[])
on conflict (route, seq) do nothing;

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
        'landmarks', s.landmarks, 'agent_names', s.agent_names, 'lat', s.lat, 'lng', s.lng,
        'poi_count', s.poi_count, 'mix', s.mix,
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
