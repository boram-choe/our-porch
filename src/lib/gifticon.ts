import { supabase } from "./supabase";

export interface GifticonRequest {
  id: string;
  user_id: string;
  item_id: string;
  item_name: string;
  price: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export const STORE_ITEMS = [
  { id: 'starbucks_americano', name: '스타벅스 아이스 아메리카노', price: 4500, image: '☕' },
  { id: 'cu_5000', name: 'CU 5,000원 모바일상품권', price: 5000, image: '🏪' },
];

export async function fetchGifticonRequests(userId: string): Promise<GifticonRequest[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('gifticon_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn("기프티콘 내역 조회 실패:", error);
    return [];
  }
  return data || [];
}

export async function purchaseGifticon(userId: string, itemId: string, itemName: string, price: number): Promise<{ success: boolean; message: string }> {
  if (!userId) return { success: false, message: "로그인이 필요합니다." };

  try {
    // 1. (Mock) B2B API 호출 시뮬레이션
    // 실제 운영 시 이곳에 B2B API (기프티쇼 비즈 등) 호출 로직이 들어갑니다.
    // const apiResponse = await fetch('https://b2b-api.example.com/send', { ... });
    
    // 모의 딜레이
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 2. DB에 내역 저장 (포인트 차감 증빙)
    const { error } = await supabase
      .from('gifticon_requests')
      .insert([{
        user_id: userId,
        item_id: itemId,
        item_name: itemName,
        price: price,
        status: 'completed' // Mock이므로 즉시 완료 처리
      }]);

    if (error) {
      console.error("기프티콘 내역 저장 실패:", error);
      return { success: false, message: "처리 중 오류가 발생했습니다. (DB)" };
    }

    return { success: true, message: "기프티콘 교환이 완료되었습니다! (모의 발송)" };
  } catch (error) {
    console.error("기프티콘 구매 실패:", error);
    return { success: false, message: "처리 중 오류가 발생했습니다." };
  }
}
