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
  area?: string;
  currentVotes?: VoteItem[];
  reports?: any[];
  imageUrl?: string;
  isDisputed?: boolean;
  moveInInfo?: { text: string; imageUrl?: string; reportedAt: string };
}

const getLogo = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;

export const DUMMY_VACANCIES: Vacancy[] = [];
