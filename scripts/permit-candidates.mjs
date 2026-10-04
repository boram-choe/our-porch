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
// 판단 방식 (지번·호수 단위, 최근 24개월):
//   1) 폐업했고, 같은 호수(주소에 호수가 있는 경우)에 그 뒤로 새 인허가가 없고, 지금 영업 중인 곳도 없으면 "공실 후보 호수"
//   2) 건물 전체에 영업 중인 업소가 없고 최근 폐업만 있으면 "건물 전체 비었을 가능성"
//   점수 = 후보 호수 수 x 3 + (건물 전체 비었을 가능성이면 4) + min(최근 폐업 수, 5)
// 한계: 음식점·카페·미용업만 본다. 학원·병원·소매점이 들어왔는지는 알 수 없으므로 반드시 현장에서 확인해야 한다.

import { readFileSync, existsSync } from "node:fs";

// ── 설정 ────────────────────────────────────────────────────────────
const SERVICES = [
  { id: "LOCALDATA_072404", name: "일반음식점" },
  { id: "LOCALDATA_072405", name: "휴게음식점(카페 등)" },
  { id: "LOCALDATA_051801", name: "미용업" },
];
const WINDOW_DAYS = 730;
const TODAY = new Date();

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, []),
);
const GU = args.gu || "서대문구";
const DONGS = String(args.dongs || "").split(",").map((s) => s.trim()).filter(Boolean);
const DRY = !!args.dry;
if (DONGS.length === 0) {
  console.error('--dongs 를 지정해 주세요. 예: --gu 서대문구 --dongs 남가좌동,북가좌동');
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
const unitDetail = (rd) => {
  const m = String(rd || "").match(/,\s*([^()]+?)\s*(?:\(|$)/);
  if (!m) return null;
  const s = m[1];
  if (!/\d+(?:-\d+)?호/.test(s) && !/\d+층/.test(s)) return null;
  return s.replace(/\s+/g, "").replace(/제/g, "").replace(/지상/g, "");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    if (!lots.has(L)) lots.set(L, { closed: [], opened: 0, active: 0, names: new Map(), rd: null });
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
    if (!v.rd) v.rd = r.RDNWHLADDR;
    const u = unitDetail(r.RDNWHLADDR);
    if (u) {
      const key = `${L}|${u.replace(/\d+층/g, "")}`;
      if (!units.has(key)) units.set(key, { lot: L, unit: u, rows: [] });
      units.get(key).rows.push(r);
    }
  }

  const unitCands = new Map(); // lot -> [{unit,name,closed}]
  for (const { lot, rows: rs } of units.values()) {
    const closed = rs.filter((r) => r.TRDSTATENM === "폐업" && parseDate(r.DCBYMD));
    if (closed.length === 0) continue;
    const last = closed.reduce((a, b) => (parseDate(a.DCBYMD) > parseDate(b.DCBYMD) ? a : b));
    if (daysAgo(parseDate(last.DCBYMD)) > WINDOW_DAYS) continue;
    const later = rs.some((r) => r !== last && parseDate(r.APVPERMYMD) && parseDate(r.APVPERMYMD) > parseDate(last.DCBYMD));
    const activeNow = rs.some((r) => r.TRDSTATENM === "영업/정상");
    if (later || activeNow) continue;
    if (!unitCands.has(lot)) unitCands.set(lot, []);
    unitCands.get(lot).push({ unit: unitDetail(last.RDNWHLADDR), name: last.BPLCNM, closed: last.DCBYMD.slice(0, 10) });
  }

  const out = [];
  for (const [L, v] of lots) {
    const us = (unitCands.get(L) || []).sort((a, b) => b.closed.localeCompare(a.closed));
    const wholeEmpty = v.closed.length > 0 && v.active === 0 && v.opened === 0;
    if (us.length === 0 && !wholeEmpty) continue;
    let name = null, best = 0;
    for (const [n, c] of v.names) if (c > best) { name = n; best = c; }
    const lastClosed = [...us.map((u) => u.closed), ...v.closed.map((c) => c.at)].sort().pop() || "";
    out.push({
      lot: L, building: name, units: us, closed24: v.closed.length, opened24: v.opened, active: v.active, wholeEmpty,
      lastClosed, score: us.length * 3 + (wholeEmpty ? 4 : 0) + Math.min(v.closed.length, 5),
    });
  }
  return out.sort((a, b) => b.score - a.score || b.lastClosed.localeCompare(a.lastClosed));
}

// ── 3) 위치 찾기 + DB 저장 ──────────────────────────────────────────
async function geocode(lot) {
  const d = await getJson(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(lot)}`);
  const doc = d.documents?.[0];
  return doc ? { lat: Number(doc.y), lng: Number(doc.x), addr: doc.address_name } : null;
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

function noteOf(c) {
  const parts = [`인허가 자동 후보 (최근 24개월 폐업 ${c.closed24}곳, 새로 연 곳 ${c.opened24}곳, 지금 영업 중 ${c.active}곳)`];
  if (c.wholeEmpty) parts.push("건물에 영업 중인 업소가 없음");
  if (c.units.length) {
    parts.push(`폐업 후 재개업 없는 호수 ${c.units.length}곳: ` + c.units.slice(0, 5).map((u) => `${u.unit} ${u.name}(${u.closed.slice(0, 7)})`).join(", ") + (c.units.length > 5 ? " 외" : ""));
  }
  return parts.join(" / ").slice(0, 990);
}

// ── 실행 ────────────────────────────────────────────────────────────
console.log(`대상: 서울 ${GU} ${DONGS.join(", ")} / 최근 ${WINDOW_DAYS}일 / ${DRY ? "미리보기(저장 안 함)" : "DB 저장"}`);
const rows = await loadRows();
const cands = analyze(rows);
console.log(`\n후보 건물 ${cands.length}곳 (건물 전체 비었을 가능성 ${cands.filter((c) => c.wholeEmpty).length}곳, 후보 호수 있는 건물 ${cands.filter((c) => c.units.length).length}곳)`);
for (const c of cands.slice(0, 10)) {
  console.log(`  ${String(c.score).padStart(2)}점  ${shortLot(c.lot)}  ${c.building || ""}  호수 ${c.units.length}  최근폐업 ${c.closed24}  영업중 ${c.active}${c.wholeEmpty ? "  [건물 전체 비었을 가능성]" : ""}`);
}
if (DRY) process.exit(0);

const token = await getToken();
let added = 0, dup = 0, noGeo = 0, fail = 0;
for (const c of cands) {
  const g = await geocode(c.lot);
  if (!g) { noGeo++; console.log(`  위치를 못 찾음: ${c.lot}`); continue; }
  const r = await rpc("staff_candidate_add", {
    p_token: token,
    p: {
      source: "permit", source_ref: `permit:${c.lot}`, label: c.building ? `${c.building} (${shortLot(c.lot).split(" ").slice(-2).join(" ")})` : shortLot(c.lot),
      address: g.addr || shortLot(c.lot), neighborhood: dongOf(c.lot), lat: g.lat, lng: g.lng, note: noteOf(c), score: c.score,
    },
  });
  if (r.id) added++; else if (r.error === "duplicate") dup++; else { fail++; console.log(`  저장 실패(${r.error || JSON.stringify(r).slice(0, 80)}): ${c.lot}`); }
  await sleep(120);
}
console.log(`\n저장 완료: 추가 ${added}곳, 이미 있어서 건너뜀 ${dup}곳, 위치 못 찾음 ${noGeo}곳, 실패 ${fail}곳`);
