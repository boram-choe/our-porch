// 가입 경로 추적: 처음 들어온 경로를 브라우저에 저장해 두었다가, 가입이 끝나면 DB에 한 번 기록한다.
// 링크 형식: https://여긴뭐가.kr/?src=poster&c=namgajwa  (utm_source / utm_campaign 도 인식)
import { supabase } from "./supabase";

const KEY = "gongsil_acq";
const SAFE = /^[a-z0-9:._-]{1,60}$/;

type Acq = { src: string; campaign: string | null; landing: string; firstSeenAt: string; explicit: boolean };

const clean = (v: string | null): string | null => {
  const s = (v || "").trim().toLowerCase();
  return SAFE.test(s) ? s : null;
};

function read(): Acq | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Acq) : null;
  } catch {
    return null;
  }
}

/** 첫 방문(또는 명시적 태그가 새로 붙은 방문)의 유입 경로를 저장한다. */
export function captureAcquisition() {
  try {
    const url = new URL(window.location.href);
    const explicitSrc = clean(url.searchParams.get("src") || url.searchParams.get("utm_source"));
    const campaign = clean(url.searchParams.get("c") || url.searchParams.get("utm_campaign"));
    const existing = read();

    // 이미 명시적 태그가 저장돼 있으면 처음 값을 유지
    if (existing?.explicit) return;

    let src = explicitSrc;
    let explicit = !!explicitSrc;
    if (!src) {
      if (existing) return; // 태그 없는 재방문은 덮어쓰지 않음
      let host = "";
      try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch { /* 무시 */ }
      const own = window.location.hostname.replace(/^www\./, "");
      src = host && host !== own ? clean(`ref:${host}`) || "referral" : "direct";
      explicit = false;
    }

    const acq: Acq = {
      src,
      campaign,
      landing: url.pathname.slice(0, 200),
      firstSeenAt: new Date().toISOString(),
      explicit,
    };
    localStorage.setItem(KEY, JSON.stringify(acq));
  } catch {
    /* 저장소 접근 불가 시 추적만 건너뜀 */
  }
}

/** 가입 완료 직후 호출. 로그인 세션이 있을 때만 한 번 기록되고, 이미 기록된 사용자는 무시된다. */
export async function recordSignupSource(userId: string | null | undefined) {
  if (!userId) return;
  const acq = read() || { src: "direct", campaign: null, landing: "/", firstSeenAt: new Date().toISOString(), explicit: false };
  const { error } = await supabase.from("signup_sources").insert({
    user_id: userId,
    source: acq.src,
    campaign: acq.campaign,
    landing: acq.landing,
    first_seen_at: acq.firstSeenAt,
  });
  // 23505: 이미 기록됨 (정상). 그 외 오류는 가입 흐름을 막지 않도록 로그만 남김
  if (error && error.code !== "23505") console.warn("가입 경로 기록 실패:", error.message);
}
