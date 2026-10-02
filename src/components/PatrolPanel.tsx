"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTeamToken } from "@/lib/db";

type Stop = {
  id: string; route: "namgajwa" | "bukgajwa"; seq: number; label: string; road: string;
  landmarks: string[]; lat: number; lng: number; poi_count: number; mix: Record<string, number>;
  visit_count: number; found_total: number;
  last_visited_at: string | null; last_by: string | null; last_result: "found" | "none" | "skipped" | null; last_note: string | null;
};

const ROUTES = [
  { key: "namgajwa" as const, label: "남가좌동", start: { name: "가좌역 경의중앙선", lat: 37.56874, lng: 126.91482 } },
  { key: "bukgajwa" as const, label: "북가좌동", start: { name: "가좌역 경의중앙선", lat: 37.56874, lng: 126.91482 } },
];

const RESULT_LABEL = { found: "공실 발견", none: "공실 없음", skipped: "건너뜀" } as const;
const FRESH_DAYS = 14; // 이 기간 안에 다녀온 곳은 "이번 순회 완료"로 센다

const hav = (a: [number, number], b: [number, number]) => {
  const R = 6371000, r = Math.PI / 180;
  const dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const daysAgo = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);
const agoText = (d: number | null) => (d === null ? "" : d <= 0 ? "오늘" : `${d}일 전`);

const CHECKLIST: { title: string; items: string[] }[] = [
  { title: "출발 전", items: [
    "휴대폰 충전, 이 페이지에 로그인되어 있는지 확인",
    "카메라 권한과 위치 권한 허용",
    "마지막 방문이 오래된 정거장부터 도는 게 효율적입니다 (아래 목록의 '다음 순서' 표시)",
  ]},
  { title: "공실로 볼 수 있는 신호 (2개 이상이면 등록)", items: [
    "간판이 철거됐거나 가려져 있다",
    "셔터가 내려져 있고 영업 안내가 없다",
    "'임대 문의' 현수막이나 중개사 번호가 붙어 있다",
    "유리창 안이 비어 있거나 인테리어가 철거된 상태다",
    "우편물, 전단지, 먼지가 오래 쌓여 있다",
  ]},
  { title: "등록하지 않는 경우", items: [
    "영업 중이거나 점심·휴무로 잠시 닫은 가게",
    "인테리어 공사 중이며 새 업종 간판이 이미 붙은 곳",
    "건물주가 사용 중인 창고나 주거 공간",
    "이미 등록된 공실 (지도에서 같은 위치에 핀이 있으면 정보를 보완합니다)",
  ]},
  { title: "등록할 때 꼭 남길 것", items: [
    "'신규 공실 조사하기'로 위치를 확정하고 사진 3장 이상 (전면, 간판 자리, 건물 전체)",
    "층수와 대략적인 면적",
    "현수막에 적힌 중개사 이름과 연락처 (공실 페이지에 노출됩니다)",
    "보증금·월세·관리비를 알 수 있으면 기록",
    "이전에 무슨 가게였는지, 얼마나 비어 있었는지",
  ]},
  { title: "지켜야 할 것", items: [
    "사진에 사람 얼굴과 차량 번호판이 나오지 않게 찍는다",
    "영업 중인 가게 안은 찍지 않는다. 건물 안으로 들어가지 않는다",
    "주민이나 상인이 물으면 '동네 빈 상가 조사 중'이라고 설명하고 명함 또는 앱 주소를 안내한다",
    "정거장을 다 돌았으면 꼭 '방문 기록'을 남긴다 (공실이 없어도 기록해야 다음 사람이 헛걸음하지 않습니다)",
  ]},
];

export default function PatrolPanel() {
  const [stops, setStops] = useState<Stop[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<"namgajwa" | "bukgajwa">("namgajwa");
  const [open, setOpen] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [form, setForm] = useState<{ result: "found" | "none" | "skipped"; count: number; note: string }>({ result: "none", count: 1, note: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getTeamToken();
    if (!token) return;
    const { data, error: e } = await supabase.rpc("staff_patrol_overview", { p_token: token });
    if (e || !data || data.error) { setError("순회 경로를 불러오지 못했습니다. 다시 로그인해 주세요."); return; }
    setError(null);
    setStops(data.stops as Stop[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (stops ?? []).filter((s) => s.route === route).sort((a, b) => a.seq - b.seq), [stops, route]);
  const meta = ROUTES.find((r) => r.key === route)!;

  const summary = useMemo(() => {
    if (list.length === 0) return null;
    let m = hav([meta.start.lat, meta.start.lng], [list[0].lat, list[0].lng]);
    for (let i = 1; i < list.length; i++) m += hav([list[i - 1].lat, list[i - 1].lng], [list[i].lat, list[i].lng]);
    const km = (m * 1.3) / 1000; // 직선거리 → 실제 보행거리 보정
    const minutes = Math.round((km / 4.5) * 60 + list.length * 10);
    const fresh = list.filter((s) => { const d = daysAgo(s.last_visited_at); return d !== null && d <= FRESH_DAYS; }).length;
    const found = list.reduce((n, s) => n + (s.found_total || 0), 0);
    return { km, minutes, fresh, found };
  }, [list, meta]);

  const nextSeq = useMemo(() => {
    const todo = list.filter((s) => { const d = daysAgo(s.last_visited_at); return d === null || d > FRESH_DAYS; });
    return todo.length ? todo[0].seq : null;
  }, [list]);

  const startRecord = (s: Stop) => {
    setOpen(s.id);
    setForm({ result: "none", count: 1, note: "" });
  };

  const save = async (s: Stop) => {
    const token = getTeamToken();
    if (!token) return;
    setSaving(true);
    const { data, error: e } = await supabase.rpc("staff_patrol_log", {
      p_token: token, p_stop_id: s.id, p_result: form.result,
      p_found_count: form.result === "found" ? form.count : 0, p_note: form.note,
    });
    setSaving(false);
    if (e || !data || data.error) { setError("기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."); return; }
    setOpen(null);
    await load();
  };

  const kakaoTo = (s: Stop) => `https://map.kakao.com/link/to/${encodeURIComponent(s.label)},${s.lat},${s.lng}`;
  const kakaoMap = (s: Stop) => `https://map.kakao.com/link/map/${encodeURIComponent(s.label)},${s.lat},${s.lng}`;

  return (
    <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 space-y-5">
      <div>
        <h3 className="font-black text-base text-slate-950">공실 순회 경로</h3>
        <p className="text-[11px] font-bold text-slate-400 mt-1 leading-relaxed">
          점포가 몰린 구역 8곳을 가좌역에서 시작하는 순서로 골랐습니다. 순서대로 걸으며 빈 상가를 찾아 등록하고, 정거장마다 방문 기록을 남기세요.
        </p>
      </div>

      <div className="flex gap-2">
        {ROUTES.map((r) => (
          <button key={r.key} type="button" onClick={() => { setRoute(r.key); setOpen(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 ${route === r.key ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-500 border-slate-100"}`}>
            {r.label} 경로
          </button>
        ))}
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-lg font-black tabular-nums">{summary.fresh}/{list.length}</div>
            <div className="text-[10px] font-bold text-slate-400">최근 {FRESH_DAYS}일 방문</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-lg font-black tabular-nums">약 {summary.km.toFixed(1)}km</div>
            <div className="text-[10px] font-bold text-slate-400">걷는 거리</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-lg font-black tabular-nums">약 {Math.floor(summary.minutes / 60)}시간 {summary.minutes % 60}분</div>
            <div className="text-[10px] font-bold text-slate-400">정거장당 10분 점검 포함</div>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
      {!stops && !error && <p className="text-xs font-bold text-slate-400">불러오는 중</p>}

      <p className="text-[11px] font-bold text-slate-500">
        출발: {meta.start.name} 앞 →{" "}
        <a className="text-blue-600 underline underline-offset-2" target="_blank" rel="noopener noreferrer"
          href={`https://map.kakao.com/link/map/${encodeURIComponent(meta.start.name)},${meta.start.lat},${meta.start.lng}`}>지도로 보기</a>
      </p>

      <ol className="space-y-3">
        {list.map((s) => {
          const d = daysAgo(s.last_visited_at);
          const stale = d === null || d > FRESH_DAYS;
          const isNext = s.seq === nextSeq;
          const mixText = Object.entries(s.mix).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(" · ");
          return (
            <li key={s.id} className={`rounded-2xl border-2 p-4 ${isNext ? "border-amber-400 bg-amber-50/40" : "border-slate-100"}`}>
              <div className="flex gap-3 items-start">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${stale ? "bg-slate-950 text-white" : "bg-emerald-500 text-white"}`}>{s.seq}</div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-black text-slate-950 break-keep">{s.label}</h4>
                    {isNext && <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">다음 순서</span>}
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 break-keep">
                    {s.road ? `${s.road} · ` : ""}근처: {s.landmarks.join(", ")}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500">점포 {s.poi_count}곳 ({mixText})</p>
                  <p className={`text-[11px] font-bold ${stale ? "text-slate-400" : "text-emerald-600"}`}>
                    {s.last_visited_at
                      ? `${agoText(d)} ${s.last_by} · ${s.last_result ? RESULT_LABEL[s.last_result] : ""}${s.found_total ? ` (누적 발견 ${s.found_total}건)` : ""}`
                      : "아직 방문 기록이 없습니다"}
                  </p>
                  {s.last_note && <p className="text-[11px] text-slate-500 break-keep">메모: {s.last_note}</p>}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a href={kakaoTo(s)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-950 text-white text-[11px] font-black">길찾기</a>
                    <a href={kakaoMap(s)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-black">지도 보기</a>
                    <button type="button" onClick={() => (open === s.id ? setOpen(null) : startRecord(s))} className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black">
                      {open === s.id ? "닫기" : "방문 기록"}
                    </button>
                  </div>

                  {open === s.id && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 space-y-3">
                      <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="방문 결과">
                        {(Object.keys(RESULT_LABEL) as (keyof typeof RESULT_LABEL)[]).map((k) => (
                          <button key={k} type="button" role="radio" aria-checked={form.result === k} onClick={() => setForm({ ...form, result: k })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 ${form.result === k ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-600 border-slate-200"}`}>
                            {RESULT_LABEL[k]}
                          </button>
                        ))}
                      </div>
                      {form.result === "found" && (
                        <label className="flex items-center gap-3 text-xs font-black text-slate-600">
                          발견한 공실 수
                          <input type="number" min={1} max={50} value={form.count}
                            onChange={(e) => setForm({ ...form, count: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                            className="w-20 border-2 border-slate-200 rounded-lg px-2 py-1 text-sm font-black text-slate-900" />
                          <span className="text-[10px] font-bold text-slate-400">등록은 지도에서 '신규 공실 조사하기'로 따로 해주세요</span>
                        </label>
                      )}
                      <label className="block text-xs font-black text-slate-600">
                        메모 (선택)
                        <textarea value={form.note} maxLength={500} rows={2} onChange={(e) => setForm({ ...form, note: e.target.value })}
                          placeholder="예: 2층 미용실 폐업, 1층 모퉁이 가게 공사 중"
                          className="mt-1 w-full border-2 border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-900" />
                      </label>
                      <button type="button" disabled={saving} onClick={() => save(s)}
                        className="w-full py-2.5 rounded-xl bg-slate-950 text-white text-sm font-black disabled:opacity-50">
                        {saving ? "저장 중" : "방문 기록 저장"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-slate-100 pt-4">
        <button type="button" onClick={() => setShowList(!showList)} className="text-sm font-black text-slate-950">
          {showList ? "▾" : "▸"} 현장 체크리스트
        </button>
        {showList && (
          <div className="mt-3 space-y-4">
            {CHECKLIST.map((g) => (
              <div key={g.title}>
                <h5 className="text-xs font-black text-slate-950 mb-1.5">{g.title}</h5>
                <ul className="space-y-1.5">
                  {g.items.map((it) => (
                    <li key={it} className="text-xs font-bold text-slate-600 leading-relaxed pl-4 relative break-keep">
                      <span className="absolute left-0 text-slate-300">□</span>{it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] font-bold text-slate-300 leading-relaxed">
        정거장은 카카오 지도의 점포 정보(2026-10 기준)에서 밀집 구역을 고른 것입니다. 걷는 거리는 직선거리에 1.3을 곱한 추정치입니다.
      </p>
    </div>
  );
}
