// 동네 수요 투표: "우리 동네에 없어서 옆 동네까지 가야 했던 업종"을 최대 3개 고르고 한 줄 의견을 남긴다.
// 공실별 투표와는 별개이며, 공실별 1표 규칙은 그대로다.
import { supabase } from "./supabase";

// id 는 Building3D 의 CATEGORIES 와 같다. label 은 DB(neighborhood_votes.category)에 저장되는 값이다.
export const DEMAND_CATEGORIES = [
  { id: "cafe", label: "카페", emoji: "☕", hint: "커피·디저트·베이커리" },
  { id: "food", label: "음식점", emoji: "🍚", hint: "식당·분식·배달 맛집" },
  { id: "hair", label: "미용/뷰티", emoji: "💇", hint: "미용실·네일·피부관리" },
  { id: "doctor", label: "병원/약국", emoji: "🏥", hint: "소아과·치과·약국" },
  { id: "gym", label: "운동/헬스", emoji: "🏋️", hint: "헬스·필라테스·요가" },
  { id: "store", label: "상점/생활", emoji: "🛒", hint: "편의점·세탁소·반찬가게" },
  { id: "edu", label: "교육/학원", emoji: "📚", hint: "학원·스터디카페" },
  { id: "studio", label: "스튜디오", emoji: "📷", hint: "사진관·공방·꽃집" },
  { id: "etc", label: "기타", emoji: "✨", hint: "코인노래방·PC방 등" },
] as const;

export const MAX_DEMAND_VOTES = 3;
export const MAX_OPINION_LENGTH = 140;

export type NeighborhoodDemand = {
  neighborhood: string;
  voters: number;
  top: { category: string; count: number }[];
  opinions: { nickname: string; content: string; at: string }[];
  mine: { categories: string[]; opinion: string | null } | null;
};

export type SaveDemandResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "not_your_neighborhood" | "too_many" | "invalid_input" | "network" };

export const categoryIdOfLabel = (label: string): string => DEMAND_CATEGORIES.find((c) => c.label === label)?.id ?? "etc";

export async function fetchNeighborhoodDemand(neighborhood: string): Promise<NeighborhoodDemand | null> {
  if (!neighborhood) return null;
  const { data, error } = await supabase.rpc("neighborhood_demand", { p_neighborhood: neighborhood });
  if (error || !data) return null;
  return data as NeighborhoodDemand;
}

export async function saveNeighborhoodDemand(neighborhood: string, categories: string[], opinion: string): Promise<SaveDemandResult> {
  // 프로필은 브라우저에 저장돼 있어 투표 화면은 열리지만, 카카오 로그인 세션이 만료됐을 수 있다.
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { ok: false, error: "unauthorized" };
  const { data, error } = await supabase.rpc("set_neighborhood_demand", {
    p_neighborhood: neighborhood,
    p_categories: categories,
    p_opinion: opinion.trim() || null,
  });
  if (error?.code === "42501" || error?.code === "23503") return { ok: false, error: "unauthorized" };
  if (error || !data) return { ok: false, error: "network" };
  if (data.error) return { ok: false, error: data.error };
  return { ok: true };
}

// 서울시 상권 데이터가 돌려주는 업종 이름(예: "분식전문점", "커피-음료")을 우리 업종 분류로 바꾼다.
export function categoryIdOfIndustry(name: string): string {
  const n = name.replace(/\s/g, "");
  if (/커피|음료|제과|베이커리|카페|디저트/.test(n)) return "cafe";
  if (/음식점|분식|치킨|호프|주점|김밥|식당|한식|중식|일식|양식|패스트푸드|족발|국수|고기|찜/.test(n)) return "food";
  if (/미용|네일|피부|이발|헤어|뷰티/.test(n)) return "hair";
  if (/의원|병원|약국|치과|한의|의료/.test(n)) return "doctor";
  if (/헬스|스포츠|요가|필라테스|체육|골프|수영/.test(n)) return "gym";
  if (/학원|교습|교육|독서실|스터디|서점|문구/.test(n)) return "edu";
  if (/사진|꽃|공방|스튜디오/.test(n)) return "studio";
  if (/편의점|슈퍼|마트|세탁|청과|수산|육류|반찬|잡화|의류|신발|가방|가구|인테리어/.test(n)) return "store";
  return "etc";
}
