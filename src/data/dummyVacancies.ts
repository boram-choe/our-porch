export interface VoteItem {
  id?: string;
  categoryId?: string;
  label?: string;
  brand?: string;
  logo?: string;
  count: number;
}

export interface Vacancy {
  id: string;
  lat: number;
  lng: number;
  address: string;
  landmark: string; // [전문인 견해] 도로명 주소보다 직관적인 위치 파악을 위한 랜드마크 명칭
  floor: string;    
  price?: string;
  size?: string;
  status?: string;
  tags?: string[];
  area?: string | null;
  currentVotes?: VoteItem[];
  reports?: any[];
  images?: string[];         // 현장 사진 리스트 (최대 5장)
  imageUrl?: string | null;  // [하위 호환] 첫 번째 이미지 URL
  deposit?: number | null;       // 보증금 (단위: 만원)
  monthlyRent?: number | null;   // 월세 (단위: 만원)
  managementFee?: number | null; // 관리비 (단위: 만원)
  surveyRemarks?: string | null; // 툇마루단 한줄평/기타사항
  realtorName?: string | null;   // 담당 공인중개사 성함
  realtorPhone?: string | null;  // 담당 공인중개사 연락처
  isDisputed?: boolean;
  moveInInfo?: { text: string; imageUrl?: string; reportedAt: string };
}

const getLogo = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;

export const DUMMY_VACANCIES: Vacancy[] = [];
