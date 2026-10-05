"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Check, MessageCircle, MapPin, ChevronRight } from "lucide-react";
import type { Vacancy } from "@/data/dummyVacancies";
import {
  DEMAND_CATEGORIES, MAX_DEMAND_VOTES, MAX_OPINION_LENGTH,
  fetchNeighborhoodDemand, saveNeighborhoodDemand, type NeighborhoodDemand, type SaveDemandResult,
} from "@/lib/neighborhood";

const ERROR_TEXT: Record<string, string> = {
  unauthorized: "로그인이 풀렸어요. 로그아웃 후 카카오로 다시 로그인해 주세요.",
  not_your_neighborhood: "내 동네에서만 투표할 수 있어요.",
  too_many: `업종은 최대 ${MAX_DEMAND_VOTES}개까지 고를 수 있어요.`,
  invalid_input: "입력한 내용을 다시 확인해 주세요.",
  network: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
};

type Props = {
  neighborhood: string;
  isGuest?: boolean;
  vacancies: Vacancy[];
  votedVacancyIds: string[];
  onClose: () => void;
  onPickVacancy: (v: Vacancy) => void;
};

export default function NeighborhoodDemandModal({ neighborhood, isGuest, vacancies, votedVacancyIds, onClose, onPickVacancy }: Props) {
  const [demand, setDemand] = useState<NeighborhoodDemand | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"vote" | "results">("results");
  const [picks, setPicks] = useState<string[]>([]);
  const [opinion, setOpinion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const d = await fetchNeighborhoodDemand(neighborhood);
    setDemand(d);
    setLoading(false);
    return d;
  };

  useEffect(() => {
    let live = true;
    (async () => {
      const d = await fetchNeighborhoodDemand(neighborhood);
      if (!live) return;
      setDemand(d);
      setLoading(false);
      const mine = d?.mine;
      if (mine && mine.categories.length > 0) {
        setPicks(mine.categories);
        setOpinion(mine.opinion ?? "");
        setPhase("results");
      } else {
        setPhase(isGuest ? "results" : "vote");
      }
    })();
    return () => { live = false; };
  }, [neighborhood, isGuest]);

  const toggle = (label: string) => {
    setError(null);
    setPicks((p) => (p.includes(label) ? p.filter((x) => x !== label) : p.length >= MAX_DEMAND_VOTES ? p : [...p, label]));
  };

  const submit = async () => {
    if (picks.length === 0) return;
    setSaving(true);
    const res: SaveDemandResult = await saveNeighborhoodDemand(neighborhood, picks, opinion);
    setSaving(false);
    if (!res.ok) { setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.network); return; }
    setError(null);
    await load();
    setPhase("results");
  };

  const top = demand?.top ?? [];
  const maxCount = Math.max(1, ...top.map((t) => t.count));
  const myLabels = demand?.mine?.categories ?? [];
  const dongVacancies = useMemo(
    () => vacancies.filter((v) => v.neighborhood === neighborhood && !["hidden", "merged", "rejected", "completed"].includes(v.status || "")),
    [vacancies, neighborhood],
  );
  const topLabel = top[0]?.category;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[400] bg-slate-950/95 backdrop-blur-md overflow-y-auto" role="dialog" aria-modal="true" aria-label="동네 수요 투표">
      <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-24 text-white">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[11px] font-black text-amber-400 tracking-widest">{neighborhood} 수요</span>
          <button type="button" onClick={onClose} aria-label="닫기" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><X size={20} /></button>
        </div>

        {loading && <p className="text-sm font-bold text-slate-400">불러오는 중</p>}

        {!loading && phase === "vote" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black leading-snug break-keep">우리 동네에 없어서,<br />꼭 옆 동네까지 가야 했던 적이 언제인가요?</h2>
              <p className="mt-3 text-sm font-bold text-slate-300 leading-relaxed break-keep">
                그럴 때 필요했던 업종을 <b className="text-amber-400">최대 {MAX_DEMAND_VOTES}개</b>까지 골라 주세요. 이웃들의 선택이 모이면 우리 동네에 무엇이 부족한지 보여요.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {DEMAND_CATEGORIES.map((c) => {
                const on = picks.includes(c.label);
                const full = !on && picks.length >= MAX_DEMAND_VOTES;
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.label)} disabled={full} aria-pressed={on}
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3.5 text-center transition-all active:scale-95 ${on ? "bg-amber-500 border-amber-400 text-slate-950" : "bg-white/5 border-white/10 text-white hover:border-white/30"} ${full ? "opacity-35" : ""}`}>
                    <span className="text-2xl leading-none">{c.emoji}</span>
                    <span className="text-[12px] font-black leading-tight">{c.label}</span>
                    <span className={`text-[9px] font-bold leading-tight break-keep ${on ? "text-slate-800" : "text-slate-400"}`}>{c.hint}</span>
                    {on && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center"><Check size={10} strokeWidth={4} /></span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-black text-slate-400 -mt-3">{picks.length} / {MAX_DEMAND_VOTES}개 선택</p>

            <label className="block">
              <span className="text-[12px] font-black text-slate-200">언제, 어떤 상황이었는지 한 줄로 알려주세요 <span className="text-slate-500">(선택)</span></span>
              <textarea value={opinion} onChange={(e) => setOpinion(e.target.value.slice(0, MAX_OPINION_LENGTH))} rows={2}
                placeholder="예: 밤에 아이가 아플 때 문 연 소아과가 없어서 옆 동네까지 갔어요"
                className="mt-2 w-full rounded-2xl bg-white/5 border-2 border-white/10 focus:border-amber-400 outline-none px-4 py-3 text-sm font-bold text-white placeholder:text-slate-500" />
              <span className="flex justify-between text-[10px] font-bold text-slate-500 mt-1">
                <span>이름·연락처 같은 개인정보는 적지 마세요.</span><span>{opinion.length}/{MAX_OPINION_LENGTH}</span>
              </span>
            </label>

            {error && <p className="text-sm font-black text-rose-400">{error}</p>}

            <div className="flex flex-col gap-2">
              <button type="button" onClick={submit} disabled={saving || picks.length === 0}
                className="w-full py-4 rounded-2xl bg-amber-500 text-slate-950 text-base font-black disabled:opacity-40 active:scale-[0.98] transition-all">
                {saving ? "저장 중" : demand?.mine?.categories.length ? "내 투표 수정하기" : "투표하고 이웃들의 선택 보기"}
              </button>
              <button type="button" onClick={demand?.mine?.categories.length ? () => setPhase("results") : onClose} className="w-full py-3 rounded-2xl text-sm font-black text-slate-400">
                {demand?.mine?.categories.length ? "현황 보기" : "나중에 할게요"}
              </button>
            </div>
          </div>
        )}

        {!loading && phase === "results" && (
          <div className="space-y-7">
            <div>
              <h2 className="text-2xl font-black leading-snug break-keep">{neighborhood}에<br />이런 가게가 필요해요</h2>
              <p className="mt-2 text-sm font-bold text-slate-400">
                {demand && demand.voters > 0 ? `이웃 ${demand.voters}명이 참여했어요.` : "아직 투표가 없어요. 첫 번째로 남겨 주세요."}
              </p>
            </div>

            {top.length > 0 && (
              <ul className="space-y-2.5">
                {top.map((t, i) => {
                  const mine = myLabels.includes(t.category);
                  const cat = DEMAND_CATEGORIES.find((c) => c.label === t.category);
                  return (
                    <li key={t.category} className="grid grid-cols-[28px_1fr_44px] items-center gap-3">
                      <span className={`text-sm font-black ${i < 3 ? "text-amber-400" : "text-slate-500"}`}>{i + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[13px] font-black">
                          <span>{cat?.emoji}</span><span className="truncate">{t.category}</span>
                          {mine && <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full">내 선택</span>}
                        </div>
                        <div className="mt-1.5 h-2.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${i < 3 ? "bg-amber-500" : "bg-slate-500"}`} style={{ width: `${Math.max(6, (t.count / maxCount) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-right text-sm font-black tabular-nums">{t.count}표</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {demand && demand.opinions.length > 0 && (
              <section className="space-y-2.5">
                <h3 className="flex items-center gap-1.5 text-[12px] font-black text-slate-300"><MessageCircle size={14} /> 이웃들의 한 줄 의견</h3>
                <ul className="space-y-2">
                  {demand.opinions.slice(0, 8).map((o, i) => (
                    <li key={`${o.at}-${i}`} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <p className="text-[13px] font-bold leading-relaxed break-keep">{o.content}</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-500">{o.nickname}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!isGuest && (
              <button type="button" onClick={() => setPhase("vote")} className="w-full py-3.5 rounded-2xl bg-white/10 border border-white/15 text-sm font-black hover:bg-white/15">
                {myLabels.length > 0 ? "내 투표 수정하기" : "내 투표 남기기"}
              </button>
            )}
            {isGuest && <p className="text-[12px] font-bold text-slate-400">카카오 로그인 후에 투표할 수 있어요.</p>}

            <section className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-[12px] font-black text-slate-300"><MapPin size={14} /> 우리 동네 빈 공간</h3>
              {dongVacancies.length === 0 ? (
                <p className="text-[12px] font-bold text-slate-500">지금 등록된 빈 공간이 없어요. 새로운 공간을 발견하면 제보해 주세요.</p>
              ) : (
                <>
                  {topLabel && <p className="text-[11px] font-bold text-slate-400 break-keep">가장 필요하다고 한 업종은 <b className="text-amber-400">{topLabel}</b>이에요. 아래 공간마다 하나씩 투표할 수 있어요.</p>}
                  <ul className="space-y-2">
                    {dongVacancies.map((v) => {
                      const done = votedVacancyIds.includes(v.id);
                      return (
                        <li key={v.id}>
                          <button type="button" onClick={() => onPickVacancy(v)} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400 px-4 py-3 text-left transition-all">
                            <span className="min-w-0">
                              <span className="block text-[13px] font-black truncate">{v.landmark || v.address}</span>
                              <span className="block text-[10px] font-bold text-slate-400">{v.floor || ""}{done ? " · 투표 완료" : " · 이 공간에 투표하기"}</span>
                            </span>
                            <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </motion.div>
  );
}
