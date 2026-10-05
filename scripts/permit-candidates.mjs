#!/usr/bin/env node
// 서울시 인허가(영업/폐업) 데이터로 "공실일 가능성이 높은 건물" 후보를 자동으로 만들어 listing_candidates 에 넣는다.
//
// 사용법 (프로젝트 루트에서):
//   node scripts/permit-candidates.mjs --gu 서대문구 --dongs 남가좌동,북가좌동 --dry     # 결과만 보기
//   node scripts/permit-candidates.mjs --gu 서대문구 --dongs 남가좌동,북가좌동           # DB에 후보 추가
//
// 필요한 값 (.env.local 에 이미 있는 것을 자동으로 읽는다):
//   SEOUL_OPEN_API_KEY_STOR, NEXT_PUBLIC_KAKAO_REST_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
// 대표 계정 로그인 정보 (DB 저장 시에만 필요): 환경변수 TEAM_ID, TEAM_PASSWORD 또는 TEAM_TOKEN
//
// 판단 방식 (건물·호수 단위, 최근 24개월):
//   1) 폐업했고, 같은 동·호수에 그 뒤로 새 인허가가 없고, 지금 영업 중인 곳도 없으면 "공실 후보 호수"
//      - 호수 표기가 달라도 같은 호수로 보도록 (동 번호, 호 번호)만 비교한다 (예: "상가102동1층101호" = "상가동 102동 1층 101호")
//   2) 카카오 지도에 같은 이름의 가게가 지금도 그 건물 근처에 있으면 후보에서 뺀다 (새 사업자로 다시 허가받은 경우 등)
//   3) 건물 전체에 영업 중인 업소가 없고 최근 폐업만 있으면 "건물 전체 비었을 가능성"
//   점수 = 후보 호수 수 x 3 + (건물 전체 비었을 가능성이면 4) + min(최근 폐업 수, 5)
// 한계: 음식점·카페·미용업만 본다. 학원·병원·소매점·편의점이 들어왔는지는 알 수 없으므로 반드시 현장에서 확인해야 한다.

import { readFileSync, existsSync } from "node:fs";

// ── 설정 ────────────────────────────────────────────────────────────
const SERVICES = [
  { id: "LOCALDATA_072404", name: "일반음식점" },
  { id: "LOCALDATA_072405", name: "휴게음식점(카페 등)" },
  { id: "LOCALDATA_051801", name: "미용업" },
];
const WINDOW_DAYS = 730;
const TODAY = new Date();
const LIVE_RADIUS_M = 150;

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, []),
);
const MIN_DAYS = Number(args["min-days"] || 60); // 폐업 후 이 일수가 지나야 "장기 공실 후보"로 본다 (기본 2개월)
const GU = args.gu || "서대문구";
const DONGS = String(args.dongs || "").split(",").map((s) => s.trim()).filter(Boolean);
const DRY = !!args.dry;
if (DONGS.length === 0) {
  console.error("--dongs 를 지정해 주세요. 예: --gu 서대문구 --dongs 남가좌동,북가좌동");
  process.exit(1);
}

// .env.local 읽기
const env = { ...process.env };
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const need = ["SEOUL_OPEN_API_KEY_STOR", "NEXT_PUBLIC_KAKAO_REST_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
for (const k of need) if (!env[k]) { console.error(`환경변수 ${k} 가 없습니다.`); process.exit(1); }

// ── 도우미 ──────────────────────────────────────────────────────────
const parseDate = (s) => { const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const daysAgo = (d) => (TODAY - d) / 86400000;
const lotOf = (addr) => {
  const a = String(addr || "").replace(/\(.*?\)/g, "").trim();
  const m = a.match(/(.+?동\s*\d+(?:-\d+)?)/);
  return m ? m[1] : a;
};
const buildingName = (rd) => {
  const m = String(rd || "").match(/\(([^()]*)\)\s*$/);
  if (!m) return null;
  const parts = m[1].split(",").map((p) => p.trim());
  const n = parts.length > 1 ? parts[1] : null;
  return n && !/층|호$|^\d+$/.test(n) ? n : null; // 층·호수 표기만 있는 경우는 건물 이름으로 쓰지 않는다
};
const detailOf = (r) => {
  const rd = (String(r.RDNWHLADDR || "").match(/,\s*([^()]+?)\s*(?:\(|$)/) || [])[1];
  return rd || String(r.SITEWHLADDR || "").replace(/^.*?동\s*\d+(?:-\d+)?/, "");
};
// 표기가 달라도 같은 호수로 보기 위한 키: (동 번호 또는 별동, 호 번호의 앞자리)
const unitKeyOf = (r) => {
  const detail = detailOf(r);
  const ho = detail.match(/(\d+)(?:-\d+)?\s*호/);
  if (!ho) return null;
  const dong = detail.match(/(\d+)\s*동/);
  const byeol = /별동/.test(detail) ? "별" : "";
  return `${dong ? dong[1] : ""}${byeol}|${ho[1]}`;
};
const unitLabelOf = (r) => detailOf(r).replace(/\s+/g, " ").replace(/제(?=\d)/g, "").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 가게 이름 비교용 (지점 표시 제거)
const coreName = (n) =>
  String(n || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, "")
    .replace(/(가재울|가좌역|가좌|dmc|뉴타운|명지대|북가좌|남가좌|서대문|서울)/g, "")
    .replace(/(본점|직영점|점)$/, "");
const sameShop = (a, b) => {
  const x = coreName(a), y = coreName(b);
  if (x.length < 2 || y.length < 2) return false;
  return x === y || (Math.min(x.length, y.length) >= 3 && (x.startsWith(y) || y.startsWith(x)));
};

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: url.includes("kakao") ? { Authorization: `KakaoAK ${env.NEXT_PUBLIC_KAKAO_REST_API_KEY}` } : {} });
      if (res.ok) return await res.json();
    } catch { /* 재시도 */ }
    await sleep(1500);
  }
  throw new Error(`요청 실패: ${url.replace(env.SEOUL_OPEN_API_KEY_STOR, "***")}`);
}

// ── 1) 인허가 데이터 내려받기 (대상 구·동만 남김) ───────────────────
async function loadRows() {
  const rows = [];
  for (const svc of SERVICES) {
    let start = 1, total = Infinity, kept = 0;
    process.stdout.write(`${svc.name} 내려받는 중`);
    while (start <= total) {
      const end = start + 999;
      const d = await getJson(`http://openapi.seoul.go.kr:8088/${env.SEOUL_OPEN_API_KEY_STOR}/json/${svc.id}/${start}/${end}/`);
      const body = d[svc.id];
      if (!body || !body.row) break;
      total = body.list_total_count;
      for (const r of body.row) {
        const site = r.SITEWHLADDR || "";
        if (site.includes(GU) && DONGS.some((dn) => site.includes(dn))) { rows.push({ ...r, svc: svc.name }); kept++; }
      }
      if ((start - 1) / 1000 % 50 === 0) process.stdout.write(".");
      start = end + 1;
    }
    console.log(` 전체 ${total}건 중 대상 지역 ${kept}건`);
  }
  return rows;
}

// ── 2) 후보 계산 ────────────────────────────────────────────────────
function analyze(rows) {
  const units = new Map();
  const lots = new Map();
  const lotInfo = (L) => {
    if (!lots.has(L)) lots.set(L, { closed: [], opened: 0, active: 0, names: new Map(), activeByDk: new Map(), closedByDk: new Map() });
    return lots.get(L);
  };
  for (const r of rows) {
    const L = lotOf(r.SITEWHLADDR);
    const v = lotInfo(L);
    const closedAt = r.TRDSTATENM === "폐업" ? parseDate(r.DCBYMD) : null;
    const openedAt = parseDate(r.APVPERMYMD);
    if (r.TRDSTATENM === "영업/정상") v.active++;
    if (openedAt && daysAgo(openedAt) <= WINDOW_DAYS) v.opened++;
    if (closedAt && daysAgo(closedAt) <= WINDOW_DAYS) v.closed.push({ name: r.BPLCNM, at: r.DCBYMD.slice(0, 10) });
    const bn = buildingName(r.RDNWHLADDR);
    if (bn) v.names.set(bn, (v.names.get(bn) || 0) + 1);
    const uk = unitKeyOf(r);
    if (uk) {
      const key = `${L}|${uk}`;
      if (!units.has(key)) units.set(key, { lot: L, dk: uk.split("|")[0], rows: [] });
      units.get(key).rows.push(r);
      // 같은 상가동(예: 204동)에서 지금 영업 중인 가게 이름 — 나중에 지도 위치를 상가동 단위로 좁히는 데 쓴다
      const dk = uk.split("|")[0];
      if (r.TRDSTATENM === "영업/정상") {
        if (!v.activeByDk.has(dk)) v.activeByDk.set(dk, []);
        v.activeByDk.get(dk).push(r.BPLCNM);
      }
      if (closedAt && daysAgo(closedAt) <= WINDOW_DAYS) v.closedByDk.set(dk, (v.closedByDk.get(dk) || 0) + 1);
    }
  }

  const unitCands = new Map(); // lot -> Map(상가동 키 -> [{unit,name,closed}])
  for (const { lot, dk, rows: rs } of units.values()) {
    const closed = rs.filter((r) => r.TRDSTATENM === "폐업" && parseDate(r.DCBYMD));
    if (closed.length === 0) continue;
    const last = closed.reduce((a, b) => (parseDate(a.DCBYMD) > parseDate(b.DCBYMD) ? a : b));
    const vacantDays = daysAgo(parseDate(last.DCBYMD));
    if (vacantDays > WINDOW_DAYS || vacantDays < MIN_DAYS) continue; // 너무 오래됐거나, 아직 2개월이 안 된 호수는 제외
    const later = rs.some((r) => r !== last && parseDate(r.APVPERMYMD) && parseDate(r.APVPERMYMD) > parseDate(last.DCBYMD));
    const activeNow = rs.some((r) => r.TRDSTATENM === "영업/정상");
    if (later || activeNow) continue;
    if (!unitCands.has(lot)) unitCands.set(lot, new Map());
    const byDk = unitCands.get(lot);
    if (!byDk.has(dk)) byDk.set(dk, []);
    byDk.get(dk).push({ unit: unitLabelOf(last), name: last.BPLCNM, closed: last.DCBYMD.slice(0, 10), days: Math.round(vacantDays) });
  }

  const out = [];
  for (const [L, v] of lots) {
    const byDk = unitCands.get(L) || new Map();
    const lastClosedAt = v.closed.map((c) => c.at).sort().pop();
    const wholeEmpty = v.closed.length > 0 && v.active === 0 && v.opened === 0 && daysAgo(parseDate(lastClosedAt)) >= MIN_DAYS;
    if (byDk.size === 0 && !wholeEmpty) continue;
    let name = null, best = 0;
    for (const [n, c] of v.names) if (c > best) { name = n; best = c; }
    const groups = [...byDk.entries()].map(([dk, us]) => ({
      dk, units: us.sort((a, b) => b.closed.localeCompare(a.closed)),
      activeNames: v.activeByDk.get(dk) || [], closedInDk: v.closedByDk.get(dk) || 0,
    }));
    out.push({ lot: L, building: name, groups, closed24: v.closed.length, opened24: v.opened, active: v.active, wholeEmpty });
  }
  return out;
}

// ── 3) 위치 찾기 + 지금 영업 중인 가게 확인 ─────────────────────────
async function geocode(lot) {
  const d = await getJson(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(lot)}`);
  const doc = d.documents?.[0];
  return doc ? { lat: Number(doc.y), lng: Number(doc.x), addr: doc.address_name } : null;
}

// 건물 근처에 지금 등록된 음식점·카페 (이름과 좌표). 큰 단지는 반경을 넓힌다.
async function liveShops(g, radius = LIVE_RADIUS_M) {
  const shops = [];
  for (const code of ["FD6", "CE7"]) {
    for (let page = 1; page <= 3; page++) {
      const d = await getJson(`https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${code}&x=${g.lng}&y=${g.lat}&radius=${radius}&page=${page}&size=15`);
      for (const p of d.documents || []) shops.push({ name: p.place_name, lat: Number(p.y), lng: Number(p.x) });
      if (d.meta?.is_end) break;
      await sleep(60);
    }
  }
  return shops;
}

async function rpc(name, body) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getToken() {
  if (env.TEAM_TOKEN) return env.TEAM_TOKEN;
  if (!env.TEAM_ID || !env.TEAM_PASSWORD) throw new Error("저장하려면 TEAM_ID 와 TEAM_PASSWORD (또는 TEAM_TOKEN) 환경변수가 필요합니다.");
  const r = await rpc("team_login", { p_id: env.TEAM_ID, p_password: env.TEAM_PASSWORD });
  if (!r.token) throw new Error("로그인에 실패했습니다.");
  return r.token;
}

const shortLot = (lot) => lot.replace(/^서울특별시\s*/, "서울 ");
const dongOf = (lot) => DONGS.find((d) => lot.includes(d)) || "";
// 점수: 후보 호수 x 3 + 건물 전체 비었을 가능성 + 최근 폐업 수 + 장기 공실 보너스(공실 추정 2~12개월이면 +2)
const monthsOf = (u) => u.days / 30;
const scoreOf = (c) =>
  c.units.length * 3 + (c.wholeEmpty ? 4 : 0) + Math.min(c.split ? c.closedInDk : c.closed24, 5) +
  (c.units.some((u) => monthsOf(u) >= 2 && monthsOf(u) <= 12) ? 2 : 0);
const dkLabel = (dk) => (!dk ? "" : dk.includes("별") ? `별동${dk.replace("별", "") ? " " + dk.replace("별", "") + "동" : ""}` : `${dk}동`);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function noteOf(c) {
  const parts = [`인허가 자동 후보 (건물 전체: 최근 24개월 폐업 ${c.closed24}곳, 새로 연 곳 ${c.opened24}곳, 지금 영업 중 ${c.active}곳)`];
  parts.push(`지도 위치: ${c.basis}`);
  if (c.wholeEmpty) parts.push("건물에 영업 중인 업소가 없음");
  if (c.units.length) {
    parts.push(`폐업 후 재개업 없는 호수 ${c.units.length}곳 (공실 추정 기간 ${Math.round(Math.min(...c.units.map(monthsOf)))}~${Math.round(Math.max(...c.units.map(monthsOf)))}개월): ` +
      c.units.slice(0, 5).map((u) => `${u.unit} ${u.name}(${u.closed.slice(0, 7)}, ${Math.max(1, Math.round(monthsOf(u)))}개월째)`).join(", ") + (c.units.length > 5 ? " 외" : ""));
  }
  if (c.removedLive) parts.push(`같은 이름 가게가 지금도 영업 중이라 제외한 호수 ${c.removedLive}곳`);
  return parts.join(" / ").slice(0, 990);
}

// ── 실행 ────────────────────────────────────────────────────────────
console.log(`대상: 서울 ${GU} ${DONGS.join(", ")} / 최근 ${WINDOW_DAYS}일 / ${DRY ? "미리보기(저장 안 함)" : "DB 저장"}`);
const rows = await loadRows();
const raw = analyze(rows);
console.log(`\n1차 후보 건물 ${raw.length}곳. 위치를 찾고 지금 영업 중인 같은 이름 가게를 확인합니다...`);

const final = [];
let noGeo = 0, removedUnits = 0;
for (const lotEntry of raw) {
  const g = await geocode(lotEntry.lot);
  if (!g) { noGeo++; console.log(`  위치를 못 찾음: ${lotEntry.lot}`); continue; }
  const split = lotEntry.groups.length >= 2; // 상가동이 여러 개인 단지는 상가동마다 따로 후보로 만든다
  const live = lotEntry.groups.length ? await liveShops(g, split ? 300 : LIVE_RADIUS_M) : [];
  let made = 0;
  for (const gr of lotEntry.groups) {
    const kept = gr.units.filter((u) => !live.some((p) => sameShop(p.name, u.name)));
    const removed = gr.units.length - kept.length;
    removedUnits += removed;
    if (kept.length === 0) continue;
    // 위치: 같은 상가동에서 지금 영업 중인 가게의 카카오 지도 좌표 평균. 못 찾으면 건물 대표 위치
    const near = split || gr.dk ? live.filter((p) => gr.activeNames.some((n) => sameShop(p.name, n))) : [];
    const pos = near.length
      ? { lat: mean(near.map((p) => p.lat)), lng: mean(near.map((p) => p.lng)), basis: `같은 상가동에서 영업 중인 가게 ${near.length}곳의 위치 기준` }
      : { lat: g.lat, lng: g.lng, basis: "건물 대표 위치 (상가동 위치는 알 수 없음)" };
    const c = {
      lot: lotEntry.lot, building: lotEntry.building, dk: gr.dk, split, units: kept, removedLive: removed,
      closed24: lotEntry.closed24, closedInDk: gr.closedInDk, opened24: lotEntry.opened24, active: lotEntry.active,
      wholeEmpty: lotEntry.wholeEmpty && !split, g, lat: pos.lat, lng: pos.lng, basis: pos.basis,
    };
    c.score = scoreOf(c);
    final.push(c);
    made++;
  }
  if (made === 0 && lotEntry.wholeEmpty) {
    const c = { lot: lotEntry.lot, building: lotEntry.building, dk: "", split: false, units: [], removedLive: 0, closed24: lotEntry.closed24, closedInDk: 0,
      opened24: lotEntry.opened24, active: lotEntry.active, wholeEmpty: true, g, lat: g.lat, lng: g.lng, basis: "건물 대표 위치" };
    c.score = scoreOf(c);
    final.push(c);
  }
  await sleep(80);
}
final.sort((a, b) => b.score - a.score);

console.log(`\n최종 후보 ${final.length}곳 (건물 전체 비었을 가능성 ${final.filter((c) => c.wholeEmpty).length}곳, 후보 호수 총 ${final.reduce((n, c) => n + c.units.length, 0)}개, 같은 이름 가게가 영업 중이라 뺀 호수 ${removedUnits}개, 상가동 단위로 나눈 후보 ${final.filter((c) => c.split).length}곳)`);
for (const c of final.slice(0, 12)) {
  console.log(`  ${String(c.score).padStart(2)}점  ${shortLot(c.lot)}${c.split ? " 상가" + dkLabel(c.dk) : ""}  ${c.building || ""}  호수 ${c.units.length}  [${c.basis}]  (${c.lat.toFixed(5)}, ${c.lng.toFixed(5)})`);
  for (const u of c.units.slice(0, 3)) console.log(`        - ${u.unit} ${u.name} (${u.closed})`);
}
if (DRY) process.exit(0);

const token = await getToken();
let added = 0, dup = 0, fail = 0;
for (const c of final) {
  const place = c.building || shortLot(c.lot).split(" ").slice(-2).join(" ");
  const r = await rpc("staff_candidate_add", {
    p_token: token,
    p: {
      source: "permit", source_ref: `permit:${c.lot}#${c.dk || "-"}`,
      label: c.split ? `${place} 상가${dkLabel(c.dk)} (후보 호수 ${c.units.length}곳)` : c.building ? `${c.building} (${shortLot(c.lot).split(" ").slice(-2).join(" ")})` : shortLot(c.lot),
      address: c.g.addr || shortLot(c.lot), neighborhood: dongOf(c.lot), lat: c.lat, lng: c.lng, note: noteOf(c), score: c.score,
    },
  });
  if (r.id) added++; else if (r.error === "duplicate") dup++; else { fail++; console.log(`  저장 실패(${r.error || JSON.stringify(r).slice(0, 80)}): ${c.lot}`); }
  await sleep(120);
}
console.log(`\n저장 완료: 추가 ${added}곳, 이미 있어서 건너뜀 ${dup}곳, 위치 못 찾음 ${noGeo}곳, 실패 ${fail}곳`);
