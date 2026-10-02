import { NextResponse } from 'next/server';

// 서울시 상권분석서비스(상권-점포) 기반 업종 추천.
// 공실 좌표에서 가장 가까운 상권(최대 1.5km)을 찾고, 그 상권에 적은데 주변 상권에는 있는 업종을 추천한다.
// 가까운 상권이 없으면 success:false 를 돌려주고, 화면이 "참고용 예시"로 대체한다 (임의의 상권 값을 만들어 내지 않는다).

const BASE = 'http://openapi.seoul.go.kr:8088';
const MAX_DISTANCE_M = 1500;
const NEIGHBORS = 3; // 비교용 주변 상권 수
const MIN_NEARBY = 3; // 주변 상권에 이 수 이상 있어야 "수요가 있는 업종"으로 본다

// 추천에서 제외할 업종 (생활 밀착 업종이 아니거나 공실 용도로 부적합)
const IGNORED = new Set([
  '여관', '고시원', '통신기기수리', '가전제품수리', '건축물청소', '부동산중개업', '세무사사무소', '법무사사무소',
  '자동차수리', '자동차미용', '노래방', 'PC방', '당구장', '골프연습장', '볼링장', '스크린골프', '예식장', '장례식장',
]);

type Area = { code: string; name: string; lat: number; lng: number };
type StoreRow = { SVC_INDUTY_CD_NM?: string; STOR_CO?: number };

let areaCache: { at: number; areas: Area[] } | null = null;
let quarterCache: { at: number; value: string } | null = null;
const DAY = 24 * 60 * 60 * 1000;

// 서울시 상권영역 좌표는 중부원점 TM(EPSG:5181)이라 위경도로 바꿔서 쓴다.
function tmToWgs84(x: number, y: number): [number, number] {
  const a = 6378137.0, f = 1 / 298.257222101, e2 = 2 * f - f * f, ep2 = e2 / (1 - e2);
  const lat0 = 38.0, lon0 = 127.0, fe = 200000.0, fn = 500000.0;
  const rad = Math.PI / 180;
  const M = (phi: number) =>
    a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi
      - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi)
      + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi)
      - ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const m = M(lat0 * rad) + (y - fn);
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu)
    + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu)
    + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu)
    + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const c1 = ep2 * Math.cos(phi1) ** 2, t1 = Math.tan(phi1) ** 2;
  const n1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const r1 = (a * (1 - e2)) / (1 - e2 * Math.sin(phi1) ** 2) ** 1.5;
  const d = (x - fe) / n1;
  const lat = phi1 - ((n1 * Math.tan(phi1)) / r1) * (d ** 2 / 2
    - ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24
    + ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6) / 720);
  const lon = lon0 * rad + (d - ((1 + 2 * t1 + c1) * d ** 3) / 6
    + ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) / 120) / Math.cos(phi1);
  return [lat / rad, lon / rad];
}

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000, r = Math.PI / 180;
  const dLa = (bLat - aLat) * r, dLo = (bLng - aLng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function getJson(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Seoul API status ${res.status}`);
  return res.json();
}

async function loadAreas(key: string): Promise<Area[]> {
  if (areaCache && Date.now() - areaCache.at < DAY) return areaCache.areas;
  const pages = await Promise.all([
    getJson(`${BASE}/${key}/json/TbgisTrdarRelm/1/1000/`),
    getJson(`${BASE}/${key}/json/TbgisTrdarRelm/1001/2000/`),
  ]);
  const areas: Area[] = [];
  for (const p of pages) {
    for (const r of p.TbgisTrdarRelm?.row ?? []) {
      const [lat, lng] = tmToWgs84(Number(r.XCNTS_VALUE), Number(r.YDNTS_VALUE));
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat > 37 && lat < 38) {
        areas.push({ code: String(r.TRDAR_CD), name: String(r.TRDAR_CD_NM), lat, lng });
      }
    }
  }
  areaCache = { at: Date.now(), areas };
  return areas;
}

async function fetchStores(key: string, quarter: string, code: string): Promise<StoreRow[]> {
  const data = await getJson(`${BASE}/${key}/json/VwsmTrdarStorQq/1/1000/${quarter}/${code}`);
  return data.VwsmTrdarStorQq?.row ?? [];
}

// 데이터가 있는 가장 최근 분기를 찾는다 (최대 8분기 전까지)
async function latestQuarter(key: string, sampleCode: string): Promise<string | null> {
  if (quarterCache && Date.now() - quarterCache.at < DAY / 4) return quarterCache.value;
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.ceil((now.getMonth() + 1) / 3);
  for (let i = 0; i < 8; i++) {
    const quarter = `${y}${q}`;
    const rows = await fetchStores(key, quarter, sampleCode).catch(() => []);
    if (rows.length > 0) {
      quarterCache = { at: Date.now(), value: quarter };
      return quarter;
    }
    q -= 1;
    if (q === 0) { q = 4; y -= 1; }
  }
  return null;
}

function countByIndustry(rows: StoreRow[]) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const name = r.SVC_INDUTY_CD_NM;
    if (!name) continue;
    m.set(name, (m.get(name) ?? 0) + Number(r.STOR_CO ?? 0));
  }
  return m;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const key = process.env.SEOUL_OPEN_API_KEY_STOR;

  if (!key) return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 });
  }

  try {
    const areas = await loadAreas(key);
    const near = areas
      .map((a) => ({ ...a, dist: distanceM(lat, lng, a.lat, a.lng) }))
      .filter((a) => a.dist <= MAX_DISTANCE_M)
      .sort((a, b) => a.dist - b.dist);

    if (near.length === 0) {
      return NextResponse.json({ success: false, error: 'No commercial area within range' }, { status: 404 });
    }

    const main = near[0];
    const around = near.slice(1, 1 + NEIGHBORS);
    const quarter = await latestQuarter(key, main.code);
    if (!quarter) {
      return NextResponse.json({ success: false, error: 'No store data available' }, { status: 404 });
    }

    const [mainRows, ...aroundRows] = await Promise.all([
      fetchStores(key, quarter, main.code),
      ...around.map((a) => fetchStores(key, quarter, a.code).catch(() => [])),
    ]);

    const here = countByIndustry(mainRows);
    const nearby = new Map<string, number>();
    for (const rows of aroundRows) {
      for (const [name, n] of countByIndustry(rows)) nearby.set(name, (nearby.get(name) ?? 0) + n);
    }

    // 주변 상권에는 있는데 이 상권에는 적거나 없는 업종을 우선 추천
    const candidates = [...nearby.entries()]
      .filter(([name, n]) => !IGNORED.has(name) && n >= MIN_NEARBY)
      .map(([name, n]) => ({ name, here: here.get(name) ?? 0, nearby: n }))
      .sort((a, b) => a.here - b.here || b.nearby - a.nearby);

    const picked = candidates.slice(0, 3);
    if (picked.length === 0) {
      return NextResponse.json({ success: false, error: 'Not enough data to recommend' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      trdarCd: main.code,
      trdarName: main.name,
      distanceM: Math.round(main.dist),
      quarter,
      recommendations: picked.map((c) => c.name),
      details: picked,
    });
  } catch (error) {
    console.error('Seoul API Fetch Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch Seoul API';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
