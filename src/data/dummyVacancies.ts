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

export const DUMMY_VACANCIES: Vacancy[] = [
  {
    id: "v1",
    lat: 37.5615,
    lng: 126.9240,
    address: "서울 중구 을지로1가 16",
    landmark: "서울시청 1층 공간",
    floor: "1층",
    area: "15평",
    currentVotes: [
      { id: "1", brand: "베이커리", logo: getLogo("B"), count: 12 },
      { id: "2", brand: "와인바", logo: getLogo("W"), count: 5 },
    ],
  },
  {
    id: "v2",
    lat: 37.5631,
    lng: 126.9200,
    address: "서울 마포구 동교로 242-5",
    landmark: "홍대입구역 3번출구 도보 5분",
    floor: "시야가 탁 트인 2층",
    area: "30평",
    currentVotes: [
      { id: "3", brand: "갤러리 카페", logo: getLogo("G"), count: 28 },
      { id: "4", brand: "독립서점", logo: getLogo("S"), count: 15 },
    ],
  },
  {
    id: "v3",
    lat: 37.5595,
    lng: 126.9250,
    address: "서울 마포구 성미산로 190",
    landmark: "연남동 주민센터 인근 골목",
    floor: "아늑한 기운의 지하 1층",
    area: "12평",
    currentVotes: [],
  },
];
