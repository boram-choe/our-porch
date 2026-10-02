-- 팀원 로그인 차단 플래그. 실제 조사원이 없어서 박주민(11131101)·김북가(11131301) 계정을 차단했다 (삭제하지 않음).
-- _team_actor / team_login 이 disabled 를 확인하고, 대표만 team_set_disabled 로 차단·해제할 수 있다.
-- 적용된 정의는 운영 DB 의 마이그레이션 team_members_disabled 와 같다.
alter table public.team_members add column if not exists disabled boolean not null default false;
-- (함수 본문: _team_actor 에 'and not m.disabled', _team_public 에 'disabled', team_login 실패 조건에 'm.disabled' 추가,
--  team_set_disabled(p_token, p_member_id, p_disabled) 신설 — 대표 전용, 자기 자신 차단 불가)
update public.team_members set disabled = true where id in ('11131101', '11131301') and role = 'SURVEYOR';