"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTeamToken } from "@/lib/db";

type Row = { id: string; item_name: string; points: number; phone: string; status: "pending" | "sent" | "rejected"; note: string | null; created_at: string; handled_at: string | null; nickname: string | null };
type Data = { budget: number; used: number; items: Row[] };

const STATUS_LABEL = { pending: "발송 대기", sent: "발송 완료", rejected: "반려" } as const;

/** 대표/운영 전용: 기프티콘 교환 신청 목록. 문자로 직접 보낸 뒤 '발송 완료'를 눌러 처리한다. */
export default function RewardRequestsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = getTeamToken();
    if (!token) return;
    supabase.rpc("staff_reward_requests", { p_token: token }).then(({ data: d, error: e }) => {
      if (e || !d || d.error) setError(true);
      else { setError(false); setData(d as Data); }
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const mark = async (id: string, status: "sent" | "rejected") => {
    const token = getTeamToken();
    if (!token) return;
    const note = status === "rejected" ? window.prompt("반려 사유를 적어 주세요 (사용자에게는 포인트가 돌아갑니다)") : null;
    if (status === "rejected" && !note) return;
    setBusy(id);
    await supabase.rpc("staff_reward_mark", { p_token: token, p_id: id, p_status: status, p_note: note });
    setBusy(null);
    load();
  };

  const pending = data?.items.filter((r) => r.status === "pending") ?? [];
  const done = data?.items.filter((r) => r.status !== "pending") ?? [];

  return (
    <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 space-y-5 text-slate-950">
      <div>
        <h3 className="font-black text-base">기프티콘 지급</h3>
        <p className="text-[11px] font-bold text-slate-400 mt-1">신청한 번호로 스타벅스 기프티콘을 문자로 보낸 뒤 &quot;발송 완료&quot;를 누르세요. 반려하면 포인트가 사용자에게 돌아갑니다.</p>
      </div>

      {error && <p className="text-xs font-bold text-rose-500">목록을 불러오지 못했습니다. 다시 로그인해 주세요.</p>}

      {data && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-black">{pending.length}</div><div className="text-[10px] font-bold text-slate-400">발송 대기</div></div>
          <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-black tabular-nums">{data.used.toLocaleString()}</div><div className="text-[10px] font-bold text-slate-400">신청 누계 (P=원)</div></div>
          <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-black tabular-nums">{Math.max(data.budget - data.used, 0).toLocaleString()}</div><div className="text-[10px] font-bold text-slate-400">남은 예산 (한도 {data.budget.toLocaleString()})</div></div>
        </div>
      )}

      {data && pending.length === 0 && <p className="text-xs font-bold text-slate-400">대기 중인 신청이 없습니다.</p>}

      <ul className="space-y-3">
        {pending.map((r) => (
          <li key={r.id} className="border-2 border-amber-100 bg-amber-50/40 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-black">{r.item_name} <span className="text-slate-400 font-bold">· {r.nickname ?? "탈퇴한 사용자"}</span></span>
              <span className="text-[10px] font-bold text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <a href={`sms:${r.phone}`} className="text-base font-black tabular-nums text-sky-700 underline">{r.phone}</a>
            <div className="flex gap-2">
              <button type="button" disabled={busy === r.id} onClick={() => mark(r.id, "sent")} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-black disabled:opacity-50">발송 완료</button>
              <button type="button" disabled={busy === r.id} onClick={() => mark(r.id, "rejected")} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-black disabled:opacity-50">반려</button>
            </div>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <details className="text-xs">
          <summary className="font-black text-slate-500 cursor-pointer">처리한 내역 {done.length}건</summary>
          <ul className="mt-2 divide-y divide-slate-50">
            {done.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-2 font-bold text-slate-500">
                <span>{r.nickname ?? "탈퇴한 사용자"} · {r.phone}</span>
                <span>{STATUS_LABEL[r.status]}{r.note ? ` (${r.note})` : ""}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
