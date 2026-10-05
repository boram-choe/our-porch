import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isLaunchArea } from "@/lib/launchArea";
import CopyLinkButton from "@/components/CopyLinkButton";
import Logo from "@/components/Logo";

// 중개사·건물주에게 보내는 공실 "주민 수요 카드". 로그인 없이 볼 수 있고, 투표 수는 매번 최신으로 집계한다.
export const dynamic = "force-dynamic";

const SITE = "https://여긴뭐가.kr";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HIDDEN_STATUSES = ["hidden", "merged", "rejected"];

type Params = { params: Promise<{ id: string }> };

async function loadSpace(id: string) {
  if (!UUID.test(id)) return null;
  const { data: v } = await supabase.from("vacancies").select("*").eq("id", id).maybeSingle();
  if (!v || HIDDEN_STATUSES.includes(v.status || "")) return null;

  const [{ data: votes }, { count: commentCount }, { data: dongDemand }] = await Promise.all([
    supabase.from("votes").select("category").eq("vacancy_id", id),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("vacancy_id", id),
    v.neighborhood ? supabase.rpc("neighborhood_demand", { p_neighborhood: v.neighborhood }) : Promise.resolve({ data: null }),
  ]);

  const tally = new Map<string, number>();
  for (const row of votes ?? []) tally.set(row.category, (tally.get(row.category) ?? 0) + 1);
  const categories = [...tally.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const demand = (dongDemand ?? null) as { voters: number; top: { category: string; count: number }[] } | null;
  return { v, categories, totalVotes: votes?.length ?? 0, commentCount: commentCount ?? 0, demand };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const data = await loadSpace(id);
  if (!data) return { title: "공개되지 않은 공간 | 여긴뭐가", robots: { index: false } };
  const name = data.v.landmark || data.v.address || "이 공간";
  const desc =
    data.totalVotes > 0
      ? `주민 ${data.totalVotes}명이 이 공간에 필요한 가게를 투표했어요. 가장 많은 의견: ${data.categories[0].name}.`
      : "이 공간에 어떤 가게가 생기면 좋을지 주민 의견을 모으고 있어요.";
  return {
    title: `${name} 주민 수요 카드 | 여긴뭐가`,
    description: desc,
    openGraph: { title: `${name} 주민 수요 카드`, description: desc, url: `${SITE}/space/${id}` },
  };
}

const won = (n?: number | null) => (n === null || n === undefined ? null : `${n.toLocaleString("ko-KR")}만원`);

const STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  available: { text: "공실 · 주민 의견 수집 중", tone: "bg-emerald-100 text-emerald-800" },
  pending: { text: "확인 중인 공간", tone: "bg-amber-100 text-amber-800" },
  completed: { text: "입점 확정", tone: "bg-sky-100 text-sky-800" },
};

export default async function SpacePage({ params }: Params) {
  const { id } = await params;
  const data = await loadSpace(id);
  if (!data) notFound();
  const { v, categories, totalVotes, commentCount, demand } = data;

  const name = v.landmark || v.address || "이름 없는 공간";
  const floor = v.floor ? (/층|지하/.test(v.floor) ? v.floor : `${v.floor}층`) : null;
  const status = STATUS_LABEL[v.status || "available"] ?? STATUS_LABEL.available;
  const comingSoon = !!v.neighborhood && !isLaunchArea(v.neighborhood);
  const photo = (v.images ? String(v.images).split(",")[0] : v.image_url) || null;
  const top = categories[0];
  const cardUrl = `${SITE}/space/${id}?src=space_card`;
  const appUrl = `/?vacancyId=${id}&src=space_card`;

  const facts: [string, string | null][] = [
    ["보증금", won(v.deposit)],
    ["월세", won(v.monthly_rent)],
    ["관리비", won(v.management_fee)],
    ["면적", v.area && v.area !== "정보 대기 중" ? v.area : null],
    ["공실 기간", v.vacancy_period || null],
  ];

  return (
    <div className="h-full overflow-y-auto bg-stone-50 text-slate-900">
      <main className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Logo size={28} className="rounded-lg" />
            여긴뭐가 · 주민 수요 카드
          </p>
          <h1 className="text-2xl md:text-3xl font-black leading-tight text-balance">{name}</h1>
          <p className="text-slate-600">
            {[v.address, floor].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.tone}`}>{status.text}</span>
            {comingSoon && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">준비 중인 지역</span>
            )}
          </div>
        </header>

        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={`${name} 현장 사진`} className="w-full max-h-80 object-cover rounded-2xl border border-stone-200" />
        )}

        <section className="rounded-2xl bg-white border border-stone-200 p-5 md:p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-black">주민이 원하는 가게</h2>
            <p className="text-sm text-slate-500 mt-1">이 공간에 어떤 가게가 생기면 좋을지 주민이 직접 고른 결과입니다. 1인 1표입니다.</p>
          </div>

          {totalVotes === 0 ? (
            <p className="text-slate-600 bg-stone-100 rounded-xl p-4">
              아직 투표가 없습니다. 아래 버튼으로 이 공간을 열어 첫 의견을 남길 수 있습니다.
            </p>
          ) : (
            <>
              <p className="text-base">
                주민 <b>{totalVotes}명</b>이 투표했고, 가장 많은 의견은 <b>{top.name}</b>({top.count}표)입니다.
                {commentCount > 0 && <> 댓글은 {commentCount}개입니다.</>}
              </p>
              <ul className="flex flex-col gap-2.5">
                {categories.map((c) => (
                  <li key={c.name} className="grid grid-cols-[88px_1fr_64px] items-center gap-3 text-sm">
                    <span className="font-bold text-slate-700">{c.name}</span>
                    <span className="h-3 rounded-full bg-stone-100 overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-emerald-600"
                        style={{ width: `${Math.round((c.count / top.count) * 100)}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums text-slate-600">
                      {c.count}표 <span className="text-slate-400">({Math.round((c.count / totalVotes) * 100)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
              {totalVotes < 5 && (
                <p className="text-xs text-slate-500">
                  투표가 {totalVotes}건이라 표본이 작습니다. 참고용으로만 봐 주세요.
                </p>
              )}
            </>
          )}
        </section>

        {demand && demand.voters > 0 && (
          <section className="rounded-2xl bg-white border border-stone-200 p-5 md:p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black">{v.neighborhood} 이웃들이 가장 필요하다고 한 업종</h2>
              <p className="text-sm text-slate-500 mt-1">이 공간만이 아니라 동네 전체에서 "없어서 옆 동네까지 가야 했던" 업종을 이웃 {demand.voters}명이 골랐습니다. 한 사람이 최대 3개까지 선택합니다.</p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {demand.top.slice(0, 5).map((c) => (
                <li key={c.category} className="grid grid-cols-[88px_1fr_48px] items-center gap-3 text-sm">
                  <span className="font-bold text-slate-700">{c.category}</span>
                  <span className="h-3 rounded-full bg-stone-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${Math.round((c.count / demand.top[0].count) * 100)}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-slate-600">{c.count}명</span>
                </li>
              ))}
            </ul>
            {demand.voters < 10 && <p className="text-xs text-slate-500">참여자가 {demand.voters}명이라 표본이 작습니다. 참고용으로만 봐 주세요.</p>}
          </section>
        )}

        <section className="rounded-2xl bg-white border border-stone-200 p-5 md:p-6 flex flex-col gap-4">
          <h2 className="text-lg font-black">공간 정보</h2>
          <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-slate-500">{label}</dt>
                <dd className={value ? "font-bold" : "text-slate-400"}>{value ?? "정보 대기 중"}</dd>
              </div>
            ))}
            {(v.realtor_name || v.realtor_phone) && (
              <div className="contents">
                <dt className="text-slate-500">담당 중개사</dt>
                <dd className="font-bold">{[v.realtor_name, v.realtor_phone].filter(Boolean).join(" · ")}</dd>
              </div>
            )}
          </dl>
          <p className="text-xs text-slate-500">
            정보는 주민 제보와 현장 조사를 바탕으로 합니다. 계약 전에 반드시 중개사와 건물주를 통해 직접 확인해 주세요.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <a
            href={appUrl}
            className="text-center rounded-xl bg-slate-900 text-white font-black py-3.5 px-4 hover:bg-slate-800"
          >
            앱에서 투표하고 의견 남기기
          </a>
          <p className="text-sm text-slate-600">
            건물주이거나 중개사이신가요? 앱에서 이 공간을 열고 <b>정보 정정 제보</b>를 남기면 현장 조사원이 확인합니다.
          </p>
          <div className="flex items-center gap-3 flex-wrap rounded-xl bg-stone-100 p-3 text-sm">
            <span className="text-slate-500 break-all min-w-0 flex-1">{cardUrl}</span>
            <CopyLinkButton url={cardUrl} className="font-bold text-emerald-800 px-3 py-1.5 rounded-lg bg-white border border-stone-200" />
          </div>
        </section>

        <footer className="text-xs text-slate-400 pb-6">
          여긴뭐가는 동네 빈 상가에 필요한 가게를 주민이 함께 고르는 서비스입니다.
        </footer>
      </main>
    </div>
  );
}
