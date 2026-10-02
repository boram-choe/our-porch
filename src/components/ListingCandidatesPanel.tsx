"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Map as KakaoMap, CustomOverlayMap, Polyline, useKakaoLoader } from "react-kakao-maps-sdk";
import { supabase } from "@/lib/supabase";
import { getTeamToken, saveVacancy } from "@/lib/db";
import { KAKAO_APP_KEY, KAKAO_LIBRARIES } from "@/lib/kakaoConfig";
import { LAUNCH_AREA, isLaunchArea } from "@/lib/launchArea";

type Candidate = {
  id: string; source: string; source_ref: string | null; label: string; address: string | null; neighborhood: string | null;
  floor: string | null; area: string | null; deposit: number | null; monthly_rent: number | null; management_fee: number | null;
  realtor_name: string | null; realtor_phone: string | null; lat: number; lng: number;
  status: "todo" | "verified" | "invalid" | "registered"; note: string | null; vacancy_id: string | null;
  created_at: string; checked_at: string | null; created_by_name: string | null; checked_by_name: string | null;
};

type Place = { name: string; address: string; lat: number; lng: number; dong: string };

const START = { name: "가좌역 경의중앙선", lat: 37.56874, lng: 126.91482 };
const STATUS_TABS = [
  { key: "todo" as const, label: "현장 확인 대기" },
  { key: "verified" as const, label: "공실 맞음" },
  { key: "registered" as const, label: "등록 완료" },
  { key: "invalid" as const, label: "공실 아님" },
];

const hav = (a: [number, number], b: [number, number]) => {
  const R = 6371000, r = Math.PI / 180;
  const dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// 가좌역에서 시작해 가까운 곳부터 잇는 순서 (2-opt 로 한 번 다듬음)
function orderRoute<T extends { lat: number; lng: number }>(items: T[]): T[] {
  const rem = [...items];
  let cur: [number, number] = [START.lat, START.lng];
  let seq: T[] = [];
  while (rem.length) {
    let bi = 0, bd = Infinity;
    rem.forEach((c, i) => { const d = hav(cur, [c.lat, c.lng]); if (d < bd) { bd = d; bi = i; } });
    const [n] = rem.splice(bi, 1);
    seq.push(n);
    cur = [n.lat, n.lng];
  }
  const len = (s: T[]) => s.reduce((acc, c, i) => acc + hav(i === 0 ? [START.lat, START.lng] : [s[i - 1].lat, s[i - 1].lng], [c.lat, c.lng]), 0);
  let improved = seq.length > 3;
  while (improved) {
    improved = false;
    for (let i = 0; i < seq.length - 1; i++) {
      for (let j = i + 1; j < seq.length; j++) {
        const cand = [...seq.slice(0, i), ...seq.slice(i, j + 1).reverse(), ...seq.slice(j + 1)];
        if (len(cand) + 1e-6 < len(seq)) { seq = cand; improved = true; }
      }
    }
  }
  return seq;
}

const man = (n: number | null) => (n === null || n === undefined ? null : `${n.toLocaleString("ko-KR")}만`);
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[^0-9.]/g, "")));

const EMPTY_FORM = { query: "", label: "", floor: "", area: "", deposit: "", rent: "", fee: "", realtor: "", phone: "", ref: "", note: "" };

export default function ListingCandidatesPanel() {
  const [items, setItems] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("todo");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [places, setPlaces] = useState<Place[]>([]);
  const [picked, setPicked] = useState<Place | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [mapLoading, mapError] = useKakaoLoader({ appkey: KAKAO_APP_KEY, libraries: KAKAO_LIBRARIES });

  const load = useCallback(async () => {
    const token = getTeamToken();
    if (!token) return;
    const { data, error: e } = await supabase.rpc("staff_candidates_list", { p_token: token });
    if (e || !data || data.error) { setError("후보 목록을 불러오지 못했습니다. 다시 로그인해 주세요."); return; }
    setError(null);
    setItems(data.items as Candidate[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { todo: 0, verified: 0, registered: 0, invalid: 0 };
    (items ?? []).forEach((i) => { c[i.status] += 1; });
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const list = (items ?? []).filter((i) => i.status === tab);
    return tab === "todo" ? orderRoute(list) : list;
  }, [items, tab]);

  useEffect(() => {
    if (!map || tab !== "todo" || shown.length === 0) return;
    const b = new kakao.maps.LatLngBounds();
    b.extend(new kakao.maps.LatLng(START.lat, START.lng));
    shown.forEach((c) => b.extend(new kakao.maps.LatLng(c.lat, c.lng)));
    map.setBounds(b, 48, 32, 32, 32);
  }, [map, shown, tab]);

  const search = () => {
    const q = form.query.trim();
    if (!q || mapLoading || mapError || typeof kakao === "undefined") return;
    setSearching(true); setSearchMsg(null); setPlaces([]); setPicked(null);
    const geocoder = new kakao.maps.services.Geocoder();
    const dongOf = (addr: string) => addr.split(" ").find((p) => /(동|가)$/.test(p)) || "";
    geocoder.addressSearch(q, (res, status) => {
      if (status === kakao.maps.services.Status.OK && res.length > 0) {
        const found: Place[] = res.slice(0, 5).map((r) => ({
          name: r.road_address?.building_name || r.address_name,
          address: r.address_name,
          lat: Number(r.y), lng: Number(r.x),
          dong: r.address?.region_3depth_name || dongOf(r.address_name),
        }));
        setPlaces(found); setSearching(false);
        if (found.length === 1) choose(found[0]);
        return;
      }
      new kakao.maps.services.Places().keywordSearch(q, (pr, ps) => {
        setSearching(false);
        if (ps === kakao.maps.services.Status.OK && pr.length > 0) {
          setPlaces(pr.slice(0, 5).map((r) => ({ name: r.place_name, address: r.address_name, lat: Number(r.y), lng: Number(r.x), dong: dongOf(r.address_name) })));
        } else {
          setSearchMsg("위치를 찾지 못했습니다. 지번 주소나 건물 이름으로 다시 검색해 주세요.");
        }
      });
    });
  };
  const choose = (p: Place) => {
    setPicked(p);
    setForm((f) => ({ ...f, label: f.label || p.name }));
  };

  const resetForm = () => { setForm(EMPTY_FORM); setPlaces([]); setPicked(null); setSearchMsg(null); };

  const save = async () => {
    const token = getTeamToken();
    if (!token || !picked || !form.label.trim()) return;
    setSaving(true);
    const { data, error: e } = await supabase.rpc("staff_candidate_add", {
      p_token: token,
      p: {
        source: "naver", source_ref: form.ref, label: form.label, address: picked.address, neighborhood: picked.dong,
        floor: form.floor, area: form.area, deposit: num(form.deposit), monthly_rent: num(form.rent), management_fee: num(form.fee),
        realtor_name: form.realtor, realtor_phone: form.phone, lat: picked.lat, lng: picked.lng, note: form.note,
      },
    });
    setSaving(false);
    if (e || !data || data.error) { setError("저장하지 못했습니다. 입력값을 확인해 주세요."); return; }
    setError(null); resetForm(); setShowForm(false); setTab("todo");
    await load();
  };

  const setStatus = async (c: Candidate, status: "verified" | "invalid" | "todo") => {
    const token = getTeamToken();
    if (!token) return;
    setBusyId(c.id);
    const { data, error: e } = await supabase.rpc("staff_candidate_set_status", { p_token: token, p_id: c.id, p_status: status, p_note: noteDraft[c.id] || null });
    setBusyId(null);
    if (e || !data || data.error) { setError("상태를 저장하지 못했습니다."); return; }
    await load();
  };

  const register = async (c: Candidate) => {
    const token = getTeamToken();
    if (!token) return;
    setBusyId(c.id);
    const res = await saveVacancy({
      landmark: c.label, address: c.address || c.label, floor: c.floor || "1층", lat: c.lat, lng: c.lng,
      neighborhood: c.neighborhood || "기타", area: c.area, deposit: c.deposit, monthlyRent: c.monthly_rent, managementFee: c.management_fee,
      realtorName: c.realtor_name, realtorPhone: c.realtor_phone, status: "available",
      surveyRemarks: `[네이버부동산 매물 확인]${c.source_ref ? " " + c.source_ref : ""}`,
    });
    if (!res.id) { setBusyId(null); setError(res.error || "공실로 등록하지 못했습니다."); return; }
    const { data, error: e } = await supabase.rpc("staff_candidate_link", { p_token: token, p_id: c.id, p_vacancy_id: res.id });
    setBusyId(null);
    if (e || !data || data.error) { setError("공실은 등록됐지만 후보 상태를 갱신하지 못했습니다. 새로고침해 주세요."); return; }
    setError(null);
    await load();
  };

  const kakaoTo = (c: Candidate) => `https://map.kakao.com/link/to/${encodeURIComponent(c.label)},${c.lat},${c.lng}`;
  const km = useMemo(() => {
    if (tab !== "todo" || shown.length === 0) return null;
    let m = hav([START.lat, START.lng], [shown[0].lat, shown[0].lng]);
    for (let i = 1; i < shown.length; i++) m += hav([shown[i - 1].lat, shown[i - 1].lng], [shown[i].lat, shown[i].lng]);
    return (m * 1.3) / 1000;
  }, [shown, tab]);

  const field = "w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900";
  const labelCls = "text-[11px] font-black text-slate-500 flex flex-col gap-1";

  return (
    <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 space-y-5 text-slate-950">
      <div>
        <h3 className="font-black text-base text-slate-950">네이버부동산 매물 후보</h3>
        <p className="text-[11px] font-bold text-slate-400 mt-1 leading-relaxed">
          책상에서 네이버부동산의 상가 임대 매물을 찾아 입력하면, 현장 확인 순서와 지도가 만들어집니다. 사진과 소개 문구는 복사하지 말고 주소, 층, 면적, 가격, 중개사 같은 사실 정보만 직접 적어 주세요.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="https://new.land.naver.com/" target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black">네이버부동산 열기</a>
        <button type="button" onClick={() => setShowForm(!showForm)} className="px-3.5 py-2 rounded-xl bg-slate-950 text-white text-xs font-black">{showForm ? "닫기" : "후보 추가"}</button>
      </div>
      <p className="text-[10px] font-bold text-slate-400">네이버부동산에서 "{LAUNCH_AREA.dongs.join(", ")}" 상가 임대 매물을 보고, 비어 있는 곳부터 아래에 추가하세요.</p>

      {error && <p className="text-xs font-bold text-rose-500">{error}</p>}

      {showForm && (
        <div className="p-4 rounded-2xl bg-slate-50 space-y-3">
          <label className={labelCls}>주소 또는 건물 이름 검색
            <span className="flex gap-2">
              <input className={field} value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="예: 남가좌동 379-2, 래미안남가좌2차 상가" />
              <button type="button" onClick={search} disabled={searching || mapLoading} className="px-4 rounded-xl bg-slate-950 text-white text-xs font-black flex-shrink-0 disabled:opacity-50">{searching ? "검색 중" : "검색"}</button>
            </span>
          </label>
          {searchMsg && <p className="text-xs font-bold text-rose-500">{searchMsg}</p>}
          {places.length > 1 && !picked && (
            <ul className="space-y-1.5">
              {places.map((p) => (
                <li key={`${p.lat},${p.lng},${p.name}`}>
                  <button type="button" onClick={() => choose(p)} className="w-full text-left px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                    {p.name} <span className="text-slate-400">· {p.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <p className="text-xs font-bold text-emerald-700">
              위치 확인: {picked.address} ({picked.dong || "동 정보 없음"})
              <button type="button" onClick={() => { setPicked(null); setPlaces([]); }} className="ml-2 underline text-slate-400">다시 검색</button>
            </p>
          )}
          {picked && !isLaunchArea(picked.dong) && (
            <p className="text-xs font-bold text-amber-600">집중 지역({LAUNCH_AREA.label}) 밖입니다. 저장은 되지만 이번 순회에서는 제외하는 것을 권합니다.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className={`${labelCls} col-span-2`}>이름 (건물·상가명 또는 호실)
              <input className={field} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={120} />
            </label>
            <label className={labelCls}>층<input className={field} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1층" /></label>
            <label className={labelCls}>면적<input className={field} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="예: 15평" /></label>
            <label className={labelCls}>보증금 (만원)<input inputMode="numeric" className={field} value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></label>
            <label className={labelCls}>월세 (만원)<input inputMode="numeric" className={field} value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} /></label>
            <label className={labelCls}>관리비 (만원)<input inputMode="numeric" className={field} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></label>
            <label className={labelCls}>네이버 매물번호 또는 링크<input className={field} value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} maxLength={300} /></label>
            <label className={labelCls}>중개사 상호<input className={field} value={form.realtor} onChange={(e) => setForm({ ...form, realtor: e.target.value })} maxLength={80} /></label>
            <label className={labelCls}>중개사 연락처<input className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} /></label>
            <label className={`${labelCls} col-span-2`}>메모 (선택)
              <input className={field} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} placeholder="예: 모퉁이 1층, 권리금 없음" />
            </label>
          </div>
          <button type="button" onClick={save} disabled={saving || !picked || !form.label.trim()} className="w-full py-2.5 rounded-xl bg-slate-950 text-white text-sm font-black disabled:opacity-40">
            {saving ? "저장 중" : !picked ? "위치를 먼저 검색해 주세요" : "후보로 저장"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 ${tab === t.key ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-500 border-slate-100"}`}>
            {t.label} {counts[t.key]}
          </button>
        ))}
      </div>

      {!items && !error && <p className="text-xs font-bold text-slate-400">불러오는 중</p>}
      {items && shown.length === 0 && (
        <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-xl p-4">
          {tab === "todo" ? "아직 현장 확인할 후보가 없습니다. '후보 추가'로 네이버부동산에서 찾은 매물을 입력해 주세요." : "해당하는 후보가 없습니다."}
        </p>
      )}

      {tab === "todo" && shown.length > 0 && !mapLoading && !mapError && (
        <div className="space-y-2">
          <div className="h-72 md:h-96 rounded-2xl overflow-hidden border border-slate-100">
            <KakaoMap center={{ lat: START.lat, lng: START.lng }} level={5} style={{ width: "100%", height: "100%" }} onCreate={setMap}>
              {[{ lat: START.lat, lng: START.lng }, ...shown].map((s, i, all) =>
                i === 0 ? null : (
                  <Polyline key={`seg-${i}`} path={[{ lat: all[i - 1].lat, lng: all[i - 1].lng }, { lat: s.lat, lng: s.lng }]}
                    endArrow strokeWeight={5} strokeColor="#059669" strokeOpacity={0.85} />
                )
              )}
              <CustomOverlayMap position={{ lat: START.lat, lng: START.lng }} yAnchor={-0.4}>
                <div className="px-2 py-1 rounded-full bg-slate-950 text-white text-[10px] font-black shadow">출발 · {START.name}</div>
              </CustomOverlayMap>
              {shown.map((c, i) => (
                <CustomOverlayMap key={c.id} position={{ lat: c.lat, lng: c.lng }} zIndex={selected === c.id ? 30 : 10}>
                  <div className="flex flex-col items-center">
                    {selected === c.id && <div className="mb-1 max-w-[180px] px-2 py-1 rounded-lg bg-white text-slate-900 text-[10px] font-black shadow border border-slate-200 break-keep text-center">{c.label}</div>}
                    <button type="button" aria-label={`${i + 1}번 ${c.label}`} onClick={() => { setSelected(c.id); document.getElementById(`cand-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white border-2 border-white shadow-lg ${i === 0 ? "bg-amber-500 ring-4 ring-amber-300/60" : "bg-emerald-700"}`}>
                      {i + 1}
                    </button>
                  </div>
                </CustomOverlayMap>
              ))}
            </KakaoMap>
          </div>
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
            가좌역에서 가까운 후보부터 번호 순서로 화살표를 따라가세요. 후보 {shown.length}곳, 걷는 거리 약 {km?.toFixed(1)}km입니다. 선은 직선 순서 표시이고 실제 길은 <b>길찾기</b>를 따라가세요.
          </p>
        </div>
      )}

      <ol className="space-y-3">
        {shown.map((c, i) => {
          const price = [c.deposit !== null && `보증금 ${man(c.deposit)}`, c.monthly_rent !== null && `월세 ${man(c.monthly_rent)}`, c.management_fee !== null && `관리비 ${man(c.management_fee)}`].filter(Boolean).join(" · ");
          return (
            <li key={c.id} id={`cand-${c.id}`} className={`rounded-2xl border-2 p-4 ${selected === c.id ? "border-blue-300" : "border-slate-100"}`}>
              <div className="flex gap-3 items-start">
                {tab === "todo" && <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0 ${i === 0 ? "bg-amber-500" : "bg-emerald-700"}`}>{i + 1}</div>}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h4 className="font-black text-slate-950 break-keep">{c.label}</h4>
                  <p className="text-[11px] font-bold text-slate-400 break-keep">{c.address}{c.floor ? ` · ${c.floor}` : ""}{c.area ? ` · ${c.area}` : ""}</p>
                  {price && <p className="text-[11px] font-bold text-slate-600">{price}</p>}
                  {(c.realtor_name || c.realtor_phone) && <p className="text-[11px] font-bold text-slate-500">중개사 {[c.realtor_name, c.realtor_phone].filter(Boolean).join(" · ")}</p>}
                  {c.source_ref && <p className="text-[10px] font-bold text-slate-400 break-all">네이버 {c.source_ref}</p>}
                  {c.note && <p className="text-[11px] text-slate-500 break-keep">메모: {c.note}</p>}
                  <p className="text-[10px] font-bold text-slate-300">
                    {c.created_by_name ? `${c.created_by_name} 입력` : ""}{c.checked_by_name ? ` · ${c.checked_by_name} 확인` : ""}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a href={kakaoTo(c)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-slate-950 text-white text-[11px] font-black">길찾기</a>
                    {c.status === "todo" && (
                      <>
                        <button type="button" disabled={busyId === c.id} onClick={() => setStatus(c, "verified")} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-black disabled:opacity-50">공실 맞음</button>
                        <button type="button" disabled={busyId === c.id} onClick={() => setStatus(c, "invalid")} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-black disabled:opacity-50">공실 아님</button>
                      </>
                    )}
                    {c.status === "verified" && (
                      <button type="button" disabled={busyId === c.id} onClick={() => register(c)} className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black disabled:opacity-50">{busyId === c.id ? "등록 중" : "공실로 등록"}</button>
                    )}
                    {(c.status === "verified" || c.status === "invalid") && (
                      <button type="button" disabled={busyId === c.id} onClick={() => setStatus(c, "todo")} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-black disabled:opacity-50">대기로 되돌리기</button>
                    )}
                  </div>
                  {c.status === "todo" && (
                    <input value={noteDraft[c.id] ?? ""} onChange={(e) => setNoteDraft({ ...noteDraft, [c.id]: e.target.value })} maxLength={500}
                      placeholder="현장 확인 메모 (선택, 위 버튼을 누를 때 함께 저장)" className="w-full mt-1 border-2 border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-900" />
                  )}
                  {c.status === "registered" && c.vacancy_id && (
                    <a href={`/space/${c.vacancy_id}`} target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] font-black text-blue-600 underline underline-offset-2">중개사용 수요 카드 열기</a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-[10px] font-bold text-slate-300 leading-relaxed">
        공실로 등록하면 지도에 공개되고 투표를 받을 수 있게 됩니다. 현장에서 실제로 비어 있는 것을 확인한 뒤에 눌러 주세요. 사진은 지도의 공실 상세에서 추가합니다.
      </p>
    </div>
  );
}
