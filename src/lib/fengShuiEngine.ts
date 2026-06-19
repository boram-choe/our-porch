import { Vacancy } from "../data/dummyVacancies";

export interface FengShuiResult {
  score: number;
  grade: string;       // 명당 등급 (예: 금계포란형)
  summary: string;     // 한줄 평
  zodiac: string;      // 사용자의 띠
  personalElement: string; // 사용자의 오행
  entranceDirection: string; // 건물의 향
  fortunes: {
    wealth: number;    // 재물운
    stability: number; // 안정/건강운
    fame: number;      // 명예운
    mentors: number;   // 귀인운
    harmony: number;   // 궁합도
  };
  pros: string[];
  cons: string[];
  remedy: {
    title: string;
    description: string;
    icon: string;
  };
}

export interface PersonaTip {
  personaName: string;
  question: string;
  spotType: string;
  direction: string;
  food: string;
  action: string;
}

export interface PersonaScenario {
  id: string;
  personaId: string;
  personaName: string;
  fortuneType: string;
  question: string;
  spotType: string;
  direction: string;
  food: string;
  action: string;
}

// 결정론적 해시 함수 (공실 ID와 사용자 입력값을 결합해 동일 조건 시 고정 점수 산출)
function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// 생년월일에 따른 오행 및 띠 도출
export function getPersonalElementAndZodiac(birthYear: number): { element: string; elementKr: string; zodiac: string } {
  const ZODIACS = ["쥐띠", "소띠", "호랑이띠", "토끼띠", "용띠", "뱀띠", "말띠", "양띠", "원숭이띠", "닭띠", "개띠", "돼지띠"];
  
  let idx = (birthYear - 4) % 12;
  if (idx < 0) idx += 12;
  const zodiac = ZODIACS[idx];

  // 천간에 따른 오행 매칭
  const lastDigit = birthYear % 10;
  let element = "wood";
  let elementKr = "목 (木 - 나무)";

  if (lastDigit === 0 || lastDigit === 1) {
    element = "metal";
    elementKr = "금 (金 - 쇠)";
  } else if (lastDigit === 2 || lastDigit === 3) {
    element = "water";
    elementKr = "수 (水 - 물)";
  } else if (lastDigit === 4 || lastDigit === 5) {
    element = "wood";
    elementKr = "목 (木 - 나무)";
  } else if (lastDigit === 6 || lastDigit === 7) {
    element = "fire";
    elementKr = "화 (火 - 불)";
  } else if (lastDigit === 8 || lastDigit === 9) {
    element = "earth";
    elementKr = "토 (土 - 흙)";
  }

  return { element, elementKr, zodiac };
}

// 업종의 오행 성격 정의
export function getBusinessElement(businessType: string): string {
  switch (businessType) {
    case "cafe":
    case "flower":
    case "education":
      return "wood"; // 자라나는 기운
    case "restaurant":
    case "fashion":
    case "design":
      return "fire"; // 퍼져나가는 화려한 기운
    case "office":
    case "realty":
    case "storage":
      return "earth"; // 안정적이고 포용하는 기운
    case "academy":
    case "jewelry":
    case "clinic":
      return "metal"; // 완결성 있고 결단력 있는 기운
    case "pub":
    case "laundry":
    case "logistics":
      return "water"; // 흐르고 순환하는 기운
    default:
      return "earth";
  }
}

// 건물의 방향(향) 계산
export function getBuildingDirection(vacancyId: string, lat: number, lng: number): { dir: string; angle: string } {
  const DIRECTIONS = [
    { dir: "남서향 (南西向)", angle: "곤향 (坤向)" },
    { dir: "남향 (南向)", angle: "오향 (午向)" },
    { dir: "남동향 (南東向)", angle: "손향 (巽向)" },
    { dir: "동향 (東向)", angle: "묘향 (卯向)" },
    { dir: "북동향 (北東向)", angle: "간향 (艮向)" },
    { dir: "북향 (北向)", angle: "자향 (子向)" },
    { dir: "북서향 (北西向)", angle: "건향 (乾向)" },
    { dir: "서향 (西向)", angle: "유향 (酉向)" },
  ];
  
  const seed = getDeterministicHash(vacancyId + lat.toFixed(4));
  return DIRECTIONS[seed % DIRECTIONS.length];
}

// 메인 풍수지리 분석 함수
export function analyzeFengShui(
  vacancy: Vacancy,
  birthYear: number,
  businessType: string,
  desiredFortune: string
): FengShuiResult {
  const { element, elementKr, zodiac } = getPersonalElementAndZodiac(birthYear);
  const busElement = getBusinessElement(businessType);
  const buildingDirInfo = getBuildingDirection(vacancy.id, vacancy.lat, vacancy.lng);
  
  const seed = getDeterministicHash(vacancy.id + birthYear.toString() + businessType + desiredFortune);

  // 1. 명당 격식 종류 결정
  const GRADES = [
    {
      name: "금계포란형 (金鷄抱卵形)",
      summary: "금빛 닭이 둥지에서 알을 품는 형국으로, 재물과 손님이 저절로 가득 쌓이는 대길(大吉)의 명당 터입니다.",
      pros: ["자금 회전율이 높고 새로운 투자 유치에 매우 유리합니다.", "손님들이 안락함을 느껴 재방문 및 단골율이 급상승합니다."],
      cons: ["초기에 지나치게 공격적으로 확장하면 안정이 흔들릴 수 있습니다."],
      remedy: {
        title: "생기 촉진 조명 처방",
        description: "매장 내 서북쪽 구석에 은은한 오렌지/옐로우 웜톤 간접조명을 켜두어 알을 부화시키는 따스한 에너지를 채워주세요.",
        icon: "💡"
      }
    },
    {
      name: "배산임수형 (背山臨水形)",
      summary: "뒤로는 든든한 등받이 빌딩이 지탱하고, 앞으로는 넓은 도로와 보도가 굽이 흐르는 이상적인 배산임수의 지세입니다.",
      pros: ["사업체나 점포의 기틀이 매우 튼튼하게 확립되어 흔들림이 없습니다.", "점주의 신뢰도가 향상되어 고액 거래나 장기 계약에 유리합니다."],
      cons: ["외관의 권위적이고 굳건한 분위기 때문에 첫 진입 장벽이 다소 높을 수 있습니다."],
      remedy: {
        title: "장풍득수 관엽식물 처방",
        description: "출입구 안쪽 양옆에 사람 허리 높이 정도의 둥근 잎을 가진 관엽식물 화분을 한 쌍 배치하여 외부의 기운을 완충시키세요.",
        icon: "🌿"
      }
    },
    {
      name: "금대수형 (琴帶水形)",
      summary: "도로(물길)가 점포 전면을 부드럽게 감싸듯 휘어 감고 지나가는 형국으로, 현대 상권 분석에서 가장 선호하는 부(富)의 격식입니다.",
      pros: ["지나가는 동네의 재물 기운이 이곳에 머무르며 매장으로 빨려 들어옵니다.", "유동 인구 유입이 자동화되어 마케팅 비용 대비 고효율을 거둡니다."],
      cons: ["매출 급상승이 빠른 대신 직원들의 피로도가 높아 이직이 잦을 수 있습니다."],
      remedy: {
        title: "기운 정화 크리스탈 처방",
        description: "카운터 중앙에 원형 투명 크리스탈 볼을 놓아 급하게 회전하는 기운을 차분히 여과하고 내실을 다져주세요.",
        icon: "🔮"
      }
    },
    {
      name: "장풍득수형 (藏風得水形)",
      summary: "바람을 갈무리하여 에너지를 응축하고, 물을 얻어 촉촉함을 유발하는 지세로, 조용한 성장과 내실을 기하는 터입니다.",
      pros: ["실속 있는 고수익 매출이 발생하며, 기복 없이 안정적인 장기 유지가 가능합니다.", "동네 로컬 단골들이 단단한 커뮤니티를 형성해 지탱해 줍니다."],
      cons: ["노출도가 비교적 얌전하여 적극적인 온라인/SNS 홍보가 병행되어야 합니다."],
      remedy: {
        title: "명인 현판/아트월 처방",
        description: "입구 근처 벽면에 강렬한 컬러의 예술품이나 액자를 비추는 핀조명을 설치하여 은은한 기운을 활성화해 주세요.",
        icon: "🎨"
      }
    },
    {
      name: "쌍룡쟁주형 (雙龍爭珠形)",
      summary: "두 마리의 용이 활기차게 보주를 다투는 기상으로, 강한 상권 한복판에서 압도적인 주목과 성공을 쟁취하는 지세입니다.",
      pros: ["경쟁사와의 구도에서 독점적인 지위와 인기를 선점하게 됩니다.", "젊은 층의 호기심을 유발하는 트렌디한 브랜드 구성에 적합합니다."],
      cons: ["주변 경쟁의 열기가 뜨거워 정신적 긴장감이 높을 수 있습니다."],
      remedy: {
        title: "조화로운 목재 인테리어 처방",
        description: "점포 내부에 부드러운 원목 재질 소품이나 패브릭 장식을 추가하여 드센 기운을 평화롭고 따스하게 해소하세요.",
        icon: "🪵"
      }
    }
  ];

  const gradeIndex = seed % GRADES.length;
  const gradeData = GRADES[gradeIndex];

  // 2. 오행 상생/상극 관계를 고려한 궁합 및 기본 점수 연산
  let harmonyScore = 70;
  let harmonySummary = "무난하게 조화를 이루는 평온한 궁합입니다.";

  if (
    (element === "water" && busElement === "wood") ||
    (element === "wood" && busElement === "fire") ||
    (element === "fire" && busElement === "earth") ||
    (element === "earth" && busElement === "metal") ||
    (element === "metal" && busElement === "water") ||
    (element === busElement)
  ) {
    harmonyScore = 95;
    harmonySummary = "점주의 천부적인 기운과 매장 업종이 서로의 시너지를 증폭시키는 '상생(相生)'의 황금 궁합입니다!";
  } else if (
    (element === "water" && busElement === "fire") ||
    (element === "fire" && busElement === "metal") ||
    (element === "metal" && busElement === "wood") ||
    (element === "wood" && busElement === "earth") ||
    (element === "earth" && busElement === "water")
  ) {
    harmonyScore = 55;
    harmonySummary = "점주 기운과 매장의 오행 기운이 서로 부딪히는 '상극(相剋)' 구조입니다. 기를 통하게 해줄 개운 처방이 필요합니다.";
  }

  // 3. 원하는 운(desiredFortune) 가중치 부여
  const baseWealth = 60 + (seed % 31) + (desiredFortune === "wealth" ? 10 : 0);
  const baseStability = 60 + ((seed >> 2) % 31) + (desiredFortune === "stability" ? 10 : 0);
  const baseFame = 60 + ((seed >> 4) % 31) + (desiredFortune === "fame" ? 10 : 0);
  const baseMentors = 60 + ((seed >> 6) % 31) + (desiredFortune === "mentors" ? 10 : 0);

  const fortunes = {
    wealth: Math.min(100, Math.round(baseWealth * 0.8 + harmonyScore * 0.2)),
    stability: Math.min(100, Math.round(baseStability * 0.8 + harmonyScore * 0.2)),
    fame: Math.min(100, Math.round(baseFame * 0.8 + harmonyScore * 0.2)),
    mentors: Math.min(100, Math.round(baseMentors * 0.8 + harmonyScore * 0.2)),
    harmony: harmonyScore
  };

  const totalScore = Math.min(99, Math.round(
    (fortunes.wealth + fortunes.stability + fortunes.fame + fortunes.mentors + fortunes.harmony) / 5
  ));

  // 특별 15% 확률로 사거리 '로충살'이 포함된 경우
  let remedyData = { ...gradeData.remedy };
  let currentCons = [...gradeData.cons];
  
  if (seed % 7 === 0) {
    currentCons.push("매장 전면에 직통하는 도로의 강하고 날카로운 살기(로충살)가 밀려듭니다.");
    remedyData = {
      title: "팔괘 볼록거울 및 돌조각 처방",
      description: "매장 문 앞이나 윈도우 한켠에 동그란 반사 거울이나 무겁고 둥글둥글한 돌 장식품을 두어 찌르는 기운을 원만하게 분산시키세요.",
      icon: "🪞"
    };
  }

  return {
    score: totalScore,
    grade: gradeData.name,
    summary: gradeData.summary,
    zodiac,
    personalElement: elementKr,
    entranceDirection: buildingDirInfo.dir,
    fortunes,
    pros: gradeData.pros,
    cons: currentCons,
    remedy: remedyData
  };
}

// 4. 일반적인 건물 전체 풍수 진단 (공실 상세페이지 호출용)
export function getGeneralBuildingFengShui(vacancy: Vacancy) {
  const seed = getDeterministicHash(vacancy.id + vacancy.lat.toFixed(4));
  
  const GRADES = [
    { grade: "금계포란형 (金鷄抱卵形)", summary: "따스하고 온화한 기운이 지맥을 따라 흘러 들어와 둥지처럼 아늑하게 재물과 인재를 불려 나가는 복지(福地)의 명당 터입니다.", type: "재물운" },
    { grade: "배산임수형 (背山臨水形)", summary: "뒤로는 견고한 고층 건물이 바람막이 역할을 하고 전면으로는 유동의 흐름이 활발하여 장기적 안정성과 번영을 약속하는 터입니다.", type: "안정운" },
    { grade: "금대수형 (琴帶水形)", summary: "길과 통로가 둥근 허리띠처럼 이 터를 감싸 안으며 돈의 기운을 보존하고 회전력을 극대화하여 속전속결의 성과를 보장합니다.", type: "속재(速財)운" },
    { grade: "장풍득수형 (藏風得水形)", summary: "바람을 가둬 차분하고 따뜻한 공기를 유지하며 물길을 얻어 척박하지 않으므로 오랫동안 장사해도 지치지 않는 평화로운 터입니다.", type: "귀인운" },
    { grade: "쌍룡쟁주형 (雙龍爭珠形)", summary: "길목이 맞닿는 코너나 상업의 정점에 위치하여 강력한 생기를 유발하고 동네 전반의 인기를 흡수해 핫플레이스로 도약할 지세입니다.", type: "명예운" }
  ];

  const DIRECTIONS = ["남향 (오향)", "동향 (묘향)", "서향 (유향)", "북향 (자향)", "남동향 (손향)", "남서향 (곤향)", "북동향 (간향)", "북서향 (건향)"];
  
  const g = GRADES[seed % GRADES.length];
  const d = DIRECTIONS[(seed >> 3) % DIRECTIONS.length];
  const score = 75 + (seed % 25);

  return {
    score,
    grade: g.grade,
    summary: g.summary,
    fortuneTypeKr: g.type,
    entranceDirection: d
  };
}

// 5. 페르소나별 풍수 가이드 팁
export function getPersonaFengShuiTip(personaId: string): PersonaTip {
  const tips: Record<string, PersonaTip> = {
    homemaker: {
      personaName: "가정주부",
      question: "우리 가정이 늘 편안하고 자녀의 학업운과 남편의 건강이 지켜지는 최고의 명당은 어디인가요?",
      spotType: "배산임수가 튼튼하고 통풍이 잘 되는 안정적인 공실 터",
      direction: "남서향 (안락함과 포용의 방위)",
      food: "따뜻한 우롱차 또는 둥글레차",
      action: "가게 인테리어 구상 시 문 쪽에 잎이 넓은 소형 관엽식물을 두는 시뮬레이션하기"
    },
    worker: {
      personaName: "직장인 / 청년창업가",
      question: "치열한 상권 속에서도 대기업이나 경쟁사를 꺾고 압도적인 매출 상승을 보장하는 대박 명당 터는?",
      spotType: "쌍룡쟁주형 또는 도로가 물길처럼 휘감고 돌아 재물이 고이는 코너 상가",
      direction: "남동향 또는 남향 (지위와 인기를 끄는 방위)",
      food: "아이스 아메리카노 또는 상큼한 시트러스 에이드",
      action: "현관(출입구) 쪽에 밝은 조명을 구상하거나 황금빛 프레임 인테리어 상상하기"
    },
    parenting: {
      personaName: "육아부모",
      question: "우리 아이들이 아프지 않고 정서적으로 안정되며 똑똑하게 잘 자라는 동네 명당은?",
      spotType: "배후에 높은 산이나 숲(또는 대단지 공원)이 있어 든든하고 소음이 적은 곳",
      direction: "북동향 (배움과 자라남의 방위)",
      food: "유기농 보리차 또는 따뜻한 코코아",
      action: "차분하고 환한 조명 아래에서 자연 친화적인 동네 지도 살펴보기"
    },
    student: {
      personaName: "학생 / 취업준비생",
      question: "시험이나 면접 합격률을 대폭 끌어올리고 집중력이 흐트러지지 않는 최고의 학습 명당 터는?",
      spotType: "기의 순환이 부드럽고 바람이 잘 막히며 조용하여 학운이 솟구치는 공간",
      direction: "북동향 (간방 - 고요하고 새로운 도약을 뜻함)",
      food: "시원한 박하차 또는 녹차",
      action: "가게나 독서실 상상 시 책상이나 주 작업대를 북동쪽을 바라보도록 설정하기"
    },
    solo: {
      personaName: "자취생 / 1인가구",
      question: "좁은 독립 공간에서도 음기를 몰아내고 연애운과 재물 기운이 솔솔 유입되는 터는?",
      spotType: "입구가 탁 트여 햇빛이 오래 머물며, 퀴퀴한 골목길 냄새가 유입되지 않는 상가",
      direction: "동향 또는 남향 (생기와 활력이 솟아나는 방위)",
      food: "달콤한 바닐라 라떼 또는 오렌지 주스",
      action: "입구 근처에 맑고 둥근 종을 걸거나 향기로운 디퓨저를 배치하는 기획 투표하기"
    },
    pet: {
      personaName: "반려인",
      question: "반려동물이 예민해지지 않고 스트레스 없이 평화롭게 교감할 수 있는 힐링 명당은?",
      spotType: "주변 도로의 경적 소리가 닿지 않고 동네 공원이나 정원 산책길이 30초 컷으로 이어지는 공실",
      direction: "남서향 또는 동향 (대지 오행의 안정을 뜻하는 방위)",
      food: "부드러운 카모마일 티",
      action: "자연 채광이 가득 스며드는 공실의 창가 위치에 투표하기"
    },
    senior: {
      personaName: "시니어",
      question: "무병장수와 튼튼한 관절 건강을 유지하고 평화로운 기운을 제공하는 최고의 동네 터는?",
      spotType: "경사가 없고 완만하며 해가 잘 들고 배산임수의 안정이 보장된 상가",
      direction: "남서향 또는 북동향 (장수와 토(土) 기운을 통한 회복의 방위)",
      food: "몸을 따뜻하게 해주는 인삼차나 대추차",
      action: "흙의 따뜻한 에너지를 머금은 황토색 및 베이지 톤 디자인 구상하기"
    },
    default: {
      personaName: "우리 이웃",
      question: "일상 속에서 나쁜 액운을 털어내고 매일 좋은 복(福)을 유입시키는 개운 비법은?",
      spotType: "기의 순환이 정체되지 않도록 유동 통로가 넓고 시야가 시원한 명당 공실",
      direction: "남향 (활력과 번영의 방위)",
      food: "향긋한 허브티",
      action: "비어 있어 어둡고 적막한 공실에 '황금빛 상상 조각'을 던져 생기 불어넣기"
    }
  };

  return tips[personaId] || tips.default;
}

// 6. 타로용 페르소나별 3D 시나리오 정보
export const PERSONA_SCENARIOS: PersonaScenario[] = [
  // 1) 주부 (homemaker)
  {
    id: "homemaker_wealth",
    personaId: "homemaker",
    personaName: "주부",
    fortuneType: "wealth",
    question: "가계 경제에 활력을 줄 부가 수입이나 투자 이익을 모아다 줄 동네 재물 명당 상가는?",
    spotType: "길목에서 금빛 물줄기처럼 재물이 돌며 휘감고 갇히는 금대수형 터",
    direction: "동남향 (재물운의 성장 방위)",
    food: "국화차",
    action: "공실 입구 왼쪽에 황금색 화분이나 노란 장식을 배치하는 가상 인테리어"
  },
  {
    id: "homemaker_stability",
    personaId: "homemaker",
    personaName: "주부",
    fortuneType: "stability",
    question: "우리 가족 구성원 모두가 아프지 않고 우환 없이 화목하게 안정되는 건강 터는?",
    spotType: "뒤가 두껍게 빌딩으로 막혀 바람이 들지 않고 온기가 도는 배산임수 터",
    direction: "남서향 (대지와 화합의 방위)",
    food: "대추차",
    action: "실내 조명을 아늑한 주황빛으로 세팅하고 차분한 소형 수석을 비치하기"
  },
  {
    id: "homemaker_fame",
    personaId: "homemaker",
    personaName: "주부",
    fortuneType: "fame",
    question: "동네 이웃 및 커뮤니티에서 우리 집안의 평판과 신뢰가 오르고 명예가 올라가는 터는?",
    spotType: "주목도가 높아 동네의 아름다운 생기가 정점으로 모이는 상권 요충지",
    direction: "남향 (명예와 명성의 방위)",
    food: "홍차",
    action: "가게 입구에 밝은 로고 액자를 설치하고 미니 스퀘어 옐로우 조명을 설치하기"
  },

  // 2) 직장인 / 청년창업가 (worker)
  {
    id: "worker_wealth",
    personaId: "worker",
    personaName: "직장인/창업가",
    fortuneType: "wealth",
    question: "연봉 협상 대박, 부업 수익, 혹은 창업 시 막대한 월 순수익을 올릴 노다지 명당 터는?",
    spotType: "유동 인구가 마르지 않는 강물처럼 전면을 휘돌며 재물이 쏟아져 고이는 상가",
    direction: "동향 (성장과 확장, 도약의 방위)",
    food: "아이스 아메리카노",
    action: "사업장 입구에 거울을 두어 들어오는 나쁜 잡귀를 튕겨내고 물길을 여는 인테리어 구상"
  },
  {
    id: "worker_fame",
    personaId: "worker",
    personaName: "직장인/창업가",
    fortuneType: "fame",
    question: "내 브랜드 가치를 드높이고 동네 핫플레이스로 급성장하여 업계의 스타가 될 상가는?",
    spotType: "사방의 시선을 독차지하여 기의 폭발적인 대립과 흥행을 유발하는 코너 명당",
    direction: "남향 (열정 및 방송, 소문의 기운 방위)",
    food: "시트러스 에이드",
    action: "빛을 굴절시키는 투명 유리구나 크리스탈 아트를 창가에 매달기"
  },
  {
    id: "worker_stability",
    personaId: "worker",
    personaName: "직장인/창업가",
    fortuneType: "stability",
    question: "이직 준비나 장기 창업 시, 리스크 없이 끝까지 버텨내며 견실한 내실을 다져줄 둥지는?",
    spotType: "바람을 가둬 따스함이 서려 있고 지반이 단단한 장풍득수형의 안정적 골목 상점",
    direction: "북동향 (끈기와 안정을 담은 방위)",
    food: "진저 레몬티",
    action: "가게의 뒤편을 튼튼한 파티션이나 가구로 배치해 심리적 보호 구도를 조성"
  },

  // 3) 육아부모 (parenting)
  {
    id: "parenting_stability",
    personaId: "parenting",
    personaName: "육아부모",
    fortuneType: "stability",
    question: "자녀가 건강하게 무럭무럭 자라고, 정서적 안정을 유발해 숙면과 평화를 얻는 터는?",
    spotType: "뒤로는 대단지 숲이나 고층 주거지가 평풍처럼 감싸 조용하고 생기가 머무는 매장",
    direction: "남서향 (가장 온화하고 온기가 오래 머무는 어머니의 방위)",
    food: "부드러운 대추라떼",
    action: "아이 방이나 놀이방 입구에 잎이 둥근 식물을 한 쌍 두고 뾰족한 소품을 치우기"
  },
  {
    id: "parenting_wealth",
    personaId: "parenting",
    personaName: "육아부모",
    fortuneType: "wealth",
    question: "우리 가족의 양육비와 가계 재물을 화수분처럼 든든하게 받쳐줄 재운의 지맥은?",
    spotType: "큰 도로변에서 비껴 나가 흘러들어오는 물길의 굽이 안쪽에 포근히 안긴 명당",
    direction: "동남향 (나무가 물을 받아 무럭무럭 자라는 오행 방위)",
    food: "유자차",
    action: "점포나 가정 내 재물 방위(북서/동남)에 저금통이나 황금색 보석함을 장식"
  },

  // 4) 학생 / 취준생 (student)
  {
    id: "student_fame",
    personaId: "student",
    personaName: "학생/취준생",
    fortuneType: "fame",
    question: "시험 합격률 200%, 서류 및 면접 합격률을 폭발적으로 끌어올리는 학업운 명당 터는?",
    spotType: "맑고 단정한 기가 뿜어져 나와 머리가 개운해지고 서책의 향기가 퍼지는 얌전한 터",
    direction: "북동향 (간방 - 끊임없는 자기 성찰과 학문 성취의 방위)",
    food: "머리를 맑게 해주는 페퍼민트 티",
    action: "학습/업무 테이블을 배치할 때 정북쪽 혹은 북동쪽을 바라보고 앉아 정돈된 기 흡수"
  },

  // 5) 1인가구 (solo)
  {
    id: "solo_mentors",
    personaId: "solo",
    personaName: "1인가구",
    fortuneType: "mentors",
    question: "나에게 도움을 줄 조력자(귀인)나 일생을 함께할 인연(연인/친구)이 찾아오는 명당은?",
    spotType: "기의 소통이 원활하여 밝고 유쾌한 에너지가 머물며 인간관계에 생기가 가득 차는 터",
    direction: "서향 (도화 및 매력, 결실과 수확을 뜻하는 귀인 방위)",
    food: "체리 루이보스 티",
    action: "출입구나 창문에 소리가 곱게 나는 황동 윈드차임(종)을 매달아 맑은 기운을 진입시킴"
  }
];

export function getScenariosForPersonas(personaIds: string[]): PersonaScenario[] {
  return PERSONA_SCENARIOS.filter(s => personaIds.includes(s.personaId));
}

export interface GeoFeatures {
  mountain: string;
  water: string;
  mountainDirection: string; // "north", "south", etc.
  waterDirection: string;    // "north", "south", etc.
  description: string;
}

export function getNearbyGeoFeatures(lat: number, lng: number, neighborhood: string): GeoFeatures {
  const n = neighborhood || "";
  
  // 1. 서울 지역 구별 랜드마크 매핑
  if (n.includes("강남구") || n.includes("서초구")) {
    return {
      mountain: "관악산(冠岳山) 남쪽 지맥 및 우면산(牛眠山) 주맥",
      water: "양재천(良才川) 수변 및 한강(漢江) 본류",
      mountainDirection: "south",
      waterDirection: "north",
      description: "남쪽에 든든한 우면산과 관악산 지맥이 버티고 있고, 북쪽으로 양재천과 한강이 굽어 흐르는 전형적인 남산북수(南山北水)의 지세입니다."
    };
  }
  if (n.includes("송파구") || n.includes("강동구")) {
    return {
      mountain: "남한산성(南漢山城) 서편 청량산 지맥",
      water: "성내천(城內川)/탄천(炭川) 수역 및 한강(漢江) 동부 수로",
      mountainDirection: "southeast",
      waterDirection: "northwest",
      description: "동남쪽에 남한산 지맥이 바람을 막아주며, 서북쪽으로 한강 수로와 탄천이 교차하여 재물 기운이 넓게 고이는 지세입니다."
    };
  }
  if (n.includes("용산구") || n.includes("중구")) {
    return {
      mountain: "남산(南山)의 목멱산(木覓山) 정맥",
      water: "한강(漢江) 본류의 용산 강줄기",
      mountainDirection: "north",
      waterDirection: "south",
      description: "북쪽에 한양의 안산인 남산이 기운을 지탱하고, 남쪽으로 한강 본류가 웅장하게 흐르는 배산임수(배산임수)의 정석적인 명당 지세입니다."
    };
  }
  if (n.includes("종로구") || n.includes("성북구") || n.includes("서대문구")) {
    return {
      mountain: "북한산(北漢山) 국립공원 삼각산 지맥 및 인왕산(仁王山)",
      water: "홍제천(弘濟川) 및 청계천(淸溪川) 상류 수계",
      mountainDirection: "north",
      waterDirection: "south",
      description: "북쪽에 웅장한 북한산과 인왕산 지맥이 강한 바람을 완벽히 막아주고, 남쪽 지천으로 맑은 물줄기가 발원하는 장풍(藏風)의 지세입니다."
    };
  }
  if (n.includes("마포구") || n.includes("은평구")) {
    return {
      mountain: "북한산 노고산(老姑山) 및 와우산(臥牛山) 지맥",
      water: "홍제천(弘濟川) 하류 및 한강(漢江) 하류 수로",
      mountainDirection: "northeast",
      waterDirection: "southwest",
      description: "동북쪽의 와우산과 대지 산자락이 바람을 가두고, 서남쪽으로 한강의 너른 수면이 펼쳐져 있어 재물이 넓게 도는 금대수(琴帶水) 지형입니다."
    };
  }
  if (
    n.includes("영등포구") || 
    n.includes("동작구") || 
    n.includes("강서구") || 
    n.includes("금천구") || 
    n.includes("구로구") || 
    n.includes("양천구")
  ) {
    return {
      mountain: "관악산 서쪽 국사봉(國思峰) 및 지양산 지맥",
      water: "안양천(安養川) 하류 및 한강(漢江) 서부 수로",
      mountainDirection: "south",
      waterDirection: "north",
      description: "남쪽에 완만한 동작/관악산 끝자락 지맥이 디딤돌이 되고, 북쪽으로 안양천과 한강 서부 수로가 만나 도심의 재물 순환을 이끄는 지세입니다."
    };
  }
  if (n.includes("강북구") || n.includes("도봉구") || n.includes("노원구") || n.includes("중랑구")) {
    return {
      mountain: "북한산(北漢山) 인수봉 맥 및 도봉산/수락산 지맥",
      water: "우이천(友耳川) 및 중랑천(中浪川) 상류 수역",
      mountainDirection: "west",
      waterDirection: "east",
      description: "서쪽에 웅장한 도봉산과 북한산의 기운이 뻗어 내리며, 동쪽으로 중랑천과 우이천이 기운을 갈무리해 흘러가는 배산임수 지형입니다."
    };
  }
  if (n.includes("성동구") || n.includes("광진구") || n.includes("동대문구")) {
    return {
      mountain: "아차산(峨嵯山) 용마봉 및 배봉산 지맥",
      water: "중랑천(中浪川) 하류 및 한강(漢江) 본류의 만곡 수역",
      mountainDirection: "east",
      waterDirection: "west",
      description: "동쪽에 아차산 지맥이 든든한 바람막이가 되어주며, 서남쪽으로 중랑천과 한강이 만나 물돌이를 이루는 한강변의 대표적 명당 지형입니다."
    };
  }

  // 2. 서울 외 지역 및 기본값 (결정론적 해시 활용)
  const seed = getDeterministicHash(n + lat.toFixed(4) + lng.toFixed(4));
  
  const MOUNTAINS = [
    { name: "주변을 아늑하게 둘러싼 뒷산의 안산(案山) 지맥", dir: "north" },
    { name: "북서쪽에서 불어오는 찬 바람을 막아주는 현무(玄武) 봉우리", dir: "northwest" },
    { name: "좌우로 길게 뻗어 바람을 모으는 청룡(靑龍)과 백호(白虎) 능선", dir: "east" },
    { name: "동네를 호위하듯 든든히 버티고 선 배후의 구릉 맥", dir: "northeast" }
  ];

  const WATERS = [
    { name: "재물을 유도하는 유선형의 생활 도로와 인도", dir: "south" },
    { name: "마을을 부드럽게 감싸고 흐르는 하천의 지류 수로", dir: "southeast" },
    { name: "앞마당을 넓게 열어 기운을 모으는 평지(명당수)", dir: "southwest" },
    { name: "주변의 생기를 순환시키며 굽어지는 로컬 천변길", dir: "west" }
  ];

  const m = MOUNTAINS[seed % MOUNTAINS.length];
  const w = WATERS[(seed >> 2) % WATERS.length];

  return {
    mountain: m.name,
    water: w.name,
    mountainDirection: m.dir,
    waterDirection: w.dir,
    description: `인증된 위치인 ${n || '우리 동네'} 주변의 지세를 분석한 결과, 배후의 ${m.name}이 든든한 안정을 제공하고 전면의 ${w.name}이 기운을 흐르게 돕고 있습니다.`
  };
}

export function getZodiacFromBirthDate(dateStr: string): { zodiac: string; elementKr: string; element: string; zodiacYear: number } {
  // dateStr is in "YYYY-MM-DD" format
  const parts = dateStr.split("-");
  const year = parseInt(parts[0]) || 1995;
  const month = parseInt(parts[1]) || 1;
  const day = parseInt(parts[2]) || 1;

  // 사주명리학 기준: 매년 달라지는 입춘(立春) 절입 시각을 반영하여 정밀 판별.
  let zodiacYear = year;
  
  if (month < 2) {
    // 1월은 무조건 이전 해의 띠
    zodiacYear = year - 1;
  } else if (month === 2) {
    // 2월의 경우 입춘 절입 시각 계산 (1900-2099 범위 내)
    const Y = year - 1;
    let val = 4.8693;
    if (Y >= 1900 && Y < 2100) {
      val = 4.8693 + 0.242713 * (Y - 1900) - Math.floor((Y - 1900) / 4);
    }
    // 생일 시각은 해당 일의 정오(12:00)인 day + 0.5로 가정하여 비교
    const birthTimeVal = day + 0.5;
    if (birthTimeVal < val) {
      zodiacYear = year - 1;
    }
  }

  const ZODIACS = ["쥐띠", "소띠", "호랑이띠", "토끼띠", "용띠", "뱀띠", "말띠", "양띠", "원숭이띠", "닭띠", "개띠", "돼지띠"];
  let idx = (zodiacYear - 4) % 12;
  if (idx < 0) idx += 12;
  const zodiac = ZODIACS[idx];

  // 천간(Cheongan)에 따른 오행(Element) 배속
  const lastDigit = zodiacYear % 10;
  let element = "wood";
  let elementKr = "목 (木 - 나무)";

  if (lastDigit === 0 || lastDigit === 1) {
    element = "metal";
    elementKr = "금 (金 - 쇠)";
  } else if (lastDigit === 2 || lastDigit === 3) {
    element = "water";
    elementKr = "수 (水 - 물)";
  } else if (lastDigit === 4 || lastDigit === 5) {
    element = "wood";
    elementKr = "목 (木 - 나무)";
  } else if (lastDigit === 6 || lastDigit === 7) {
    element = "fire";
    elementKr = "화 (火 - 불)";
  } else if (lastDigit === 8 || lastDigit === 9) {
    element = "earth";
    elementKr = "토 (土 - 흙)";
  }

  return { zodiac, elementKr, element, zodiacYear };
}
