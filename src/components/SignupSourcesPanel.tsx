"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { getTeamToken } from "@/lib/db";
import CopyLinkButton from "./CopyLinkButton";

const SITE = "https://여긴뭐가.kr";

type SourceRow = { source: string; campaign: string | null; n: number; last_at: string };
type Stats = { total_users: number; tracked: number; last7: number; by_source: SourceRow[] };

// 자주 쓰는 채널. 직접 입력도 가능하다.
const PRESETS = [
  { src: "poster", label: "포스터 QR" },
  { src: "band", label: "상가번영회·밴드" },
  { src: "kakao", label: "카카오 채널" },
  { src: "daangn", label: "당근" },
  { src: "realtor", label: "중개사 전달" },
];

const SAFE = /^[a-z0-9:._-]{1,60}$/;

/** 대표/운영 전용: 가입 경로별 가입자 수 + 포스터용 추적 링크·QR 만들기 */
export default function SignupSourcesPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [src, setSrc] = useState("poster");
  const [campaign, setCampaign] = useState("namgajwa");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const token = getTeamToken();
    if (!token) return;
    supabase.rpc("staff_signup_sources", { p_token: token }).then(({ data, error }) => {
      if (error || !data || data.error) setLoadError(true);
      else setStats(data as Stats);
    });
  }, []);

  const valid = SAFE.test(src) && (campaign === "" || SAFE.test(campaign));
  const link = useMemo(() => {
    if (!valid) return "";
    const q = new URLSearchParams({ src });
    if (campaign) q.set("c", campaign);
    return `${SITE}/?${q.toString()}`;
  }, [src, campaign, valid]);

  useEffect(() => {
    if (!link) { setQr(null); return; }
    let live = true;
    QRCode.toDataURL(link, { margin: 1, width: 320 }).then((u) => live && setQr(u)).catch(() => live && setQr(null));
    return () => { live = false; };
  }, [link]);

  const untracked = stats ? Math.max(stats.total_users - stats.tracked, 0) : 0;

  return (
    <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 space-y-5 text-slate-950">
      <div>
        <h3 className="font-black text-base text-slate-950">가입 경로</h3>
        <p className="text-[11px] font-bold text-slate-400 mt-1">링크마다 꼬리표(src)가 붙어 어디서 들어온 가입자인지 집계됩니다.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-black">{stats?.total_users ?? "-"}</div><div className="text-[10px] font-bold text-slate-400">전체 가입자</div></div>
        <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-black">{stats?.tracked ?? "-"}</div><div className="text-[10px] font-bold text-slate-400">경로 기록됨</div></div>
        <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-black">{stats?.last7 ?? "-"}</div><div className="text-[10px] font-bold text-slate-400">최근 7일 신규</div></div>
      </div>

      {loadError && <p className="text-xs font-bold text-rose-500">집계를 불러오지 못했습니다. 다시 로그인해 주세요.</p>}

      {stats && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-2 pr-3">경로</th><th className="py-2 pr-3">캠페인</th><th className="py-2 text-right">가입자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.by_source.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-xs font-bold text-slate-400">아직 기록된 가입이 없습니다. 이 기능이 켜진 뒤 가입한 사람부터 집계됩니다.</td></tr>
              )}
              {stats.by_source.map((r) => (
                <tr key={`${r.source}|${r.campaign}`}>
                  <td className="py-2 pr-3 font-bold text-slate-800 break-all">{r.source}</td>
                  <td className="py-2 pr-3 text-slate-500 break-all">{r.campaign ?? "-"}</td>
                  <td className="py-2 text-right font-black tabular-nums">{r.n}</td>
                </tr>
              ))}
              {untracked > 0 && (
                <tr><td className="py-2 pr-3 text-slate-400">기록 이전 가입</td><td className="py-2 pr-3 text-slate-300">-</td><td className="py-2 text-right text-slate-400 tabular-nums">{untracked}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-100 pt-5 space-y-3">
        <h4 className="font-black text-sm text-slate-950">추적 링크 · QR 만들기</h4>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.src} type="button" onClick={() => setSrc(p.src)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black border ${src === p.src ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[11px] font-black text-slate-500 flex flex-col gap-1">
            경로 (src)
            <input value={src} onChange={(e) => setSrc(e.target.value.toLowerCase())} className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" />
          </label>
          <label className="text-[11px] font-black text-slate-500 flex flex-col gap-1">
            캠페인 (선택, 예: 동네·장소)
            <input value={campaign} onChange={(e) => setCampaign(e.target.value.toLowerCase())} className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold text-slate-900" />
          </label>
        </div>
        {!valid && <p className="text-xs font-bold text-rose-500">영문 소문자, 숫자, - _ . : 만 쓸 수 있습니다 (60자 이내).</p>}
        {valid && (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="가입 경로 QR 코드" width={160} height={160} className="rounded-lg border border-slate-100" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-bold text-slate-600 break-all">{link}</p>
              <CopyLinkButton url={link} className="text-xs font-black px-3 py-1.5 rounded-lg bg-slate-900 text-white" />
              <p className="text-[11px] text-slate-400">QR 이미지는 길게 눌러(또는 우클릭) 저장해 포스터에 넣으세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
