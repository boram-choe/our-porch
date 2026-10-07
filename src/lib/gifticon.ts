import { supabase } from "./supabase";

// 상상 포인트: 활동할 때마다 서버(point_events)에 쌓이고, 4,500P가 되면 스타벅스 기프티콘을 문자로 보내 준다.
// 적립은 DB 트리거가 자동으로 하고, 앱은 잔액을 읽기만 한다.

export interface PointEvent { kind: string; ref: string; points: number; created_at: string }
export interface RewardRequest { id: string; item_name: string; points: number; status: "pending" | "sent" | "rejected"; created_at: string }
export interface MyPoints { earned: number; spent: number; balance: number; events: PointEvent[]; requests: RewardRequest[] }

export const STORE_ITEMS = [
  { id: "starbucks_americano", name: "스타벅스 아이스 아메리카노", price: 4500, image: "☕" },
];

// 앱에 보여 주는 적립 규칙 (실제 지급액은 DB 함수가 정한다. 바꿀 때는 DB와 함께 고친다)
export const POINT_RULES: { kind: string; label: string; points: number; note?: string }[] = [
  { kind: "signup", label: "가입하고 동네 인증", points: 300, note: "처음 한 번" },
  { kind: "demand_vote", label: "동네 수요 투표", points: 200, note: "동네마다 한 번" },
  { kind: "demand_opinion", label: "한 줄 의견 남기기", points: 100, note: "동네마다 한 번" },
  { kind: "vote", label: "빈 공간에 투표", points: 100, note: "공간마다 한 번" },
  { kind: "comment", label: "빈 공간에 의견 남기기", points: 50, note: "공간마다 한 번" },
  { kind: "vacancy_verified", label: "내가 등록한 공실이 확인됨", points: 1000 },
  { kind: "vacancy_longterm", label: "2개월 넘은 공실로 확인됨", points: 500, note: "추가" },
  { kind: "movein_report", label: "가게 입점 제보가 확인됨", points: 500 },
];
export const POINT_LABEL: Record<string, string> = Object.fromEntries(POINT_RULES.map((r) => [r.kind, r.label]));

export async function fetchMyPoints(): Promise<MyPoints | null> {
  const { data, error } = await supabase.rpc("my_points");
  if (error || !data) return null;
  return data as MyPoints;
}

const ERROR_TEXT: Record<string, string> = {
  unauthorized: "로그인이 풀렸어요. 로그아웃 후 카카오로 다시 로그인해 주세요.",
  not_enough_points: "포인트가 아직 모자라요.",
  invalid_phone: "휴대폰 번호를 다시 확인해 주세요. (예: 010-1234-5678)",
  pending_exists: "이미 신청한 기프티콘이 있어요. 발송이 끝나면 다시 신청할 수 있어요.",
  cooldown: "기프티콘은 한 달에 한 번 교환할 수 있어요.",
  budget_exhausted: "이번 이벤트 기프티콘이 모두 소진됐어요. 다음 이벤트를 기다려 주세요.",
  disabled: "지금은 교환을 쉬고 있어요.",
  invalid_item: "교환할 수 없는 상품이에요.",
};

export async function requestReward(itemId: string, phone: string): Promise<{ success: boolean; message: string }> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { success: false, message: ERROR_TEXT.unauthorized };
  const { data, error } = await supabase.rpc("request_reward", { p_item_id: itemId, p_phone: phone });
  if (error || !data) return { success: false, message: "신청하지 못했어요. 잠시 후 다시 시도해 주세요." };
  if (data.error) return { success: false, message: ERROR_TEXT[data.error] ?? "신청하지 못했어요." };
  return { success: true, message: "교환 신청이 접수됐어요. 확인 후 문자로 기프티콘을 보내드려요. (영업일 기준 3일 이내)" };
}
