"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as htmlToImage from "html-to-image";
import { X, Sparkles, AlertCircle, RefreshCw, Compass, ArrowRight, Home, MapPin, Info, Check, ShieldCheck, ChevronLeft, ChevronRight, Share2, Download, Link2, Camera } from "lucide-react";
import { Vacancy } from "../data/dummyVacancies";
import { 
  analyzeFengShui, 
  getGeneralBuildingFengShui, 
  getPersonaFengShuiTip, 
  getScenariosForPersonas, 
  PersonaScenario, 
  FengShuiResult,
  getNearbyGeoFeatures,
  getZodiacFromBirthDate
} from "../lib/fengShuiEngine";

interface FengShuiTarotProps {
  isOpen: boolean;
  onClose: (showNudge?: boolean) => void;
  vacancies: Vacancy[];
  onSelectVacancy: (vacancy: Vacancy, openDetail?: boolean) => void;
  onSelectFortuneArea?: (lat: number, lng: number, areaName: string, fortuneName?: string) => void;
  mapCenter: { lat: number; lng: number };
  userProfile: any; // UserProfile
  onStartDiscovery?: () => void;
}

// 거리 계산 유틸리티 (미터 단위)
function calculateDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // 지구 반경 (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDirNameFromAngle(angle: number): string {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "북쪽";
  if (normalized >= 22.5 && normalized < 67.5) return "북동쪽";
  if (normalized >= 67.5 && normalized < 112.5) return "동쪽";
  if (normalized >= 112.5 && normalized < 157.5) return "동남쪽";
  if (normalized >= 157.5 && normalized < 202.5) return "남쪽";
  if (normalized >= 202.5 && normalized < 247.5) return "남서쪽";
  if (normalized >= 247.5 && normalized < 292.5) return "서쪽";
  return "북서쪽";
}

// 15종 동적 마스코트 캐릭터 매핑 함수
function getDynamicMascot(
  score: number,
  desiredFortune: string,
  nickname: string = "대표"
): { src: string; message: string; alt: string } {
  const isToad = ["wealth", "south", "southeast", "west", "southwest"].includes(desiredFortune);
  const isTigerDragon = ["mentors", "east", "northeast", "northwest"].includes(desiredFortune);
  
  if (isToad) {
    if (score >= 88) {
      return {
        src: "/images/characters/toad_4.png",
        alt: "돈 폭발 복두꺼비",
        message: `와아~ 이 집 터 진짜 대박이에요! 💰 엽전 기운이 사방팔방 넘쳐흘러요! ✨`
      };
    } else if (score >= 83) {
      return {
        src: "/images/characters/toad_2.png",
        alt: "윙크하는 복두꺼비",
        message: `${nickname || ""}님, 재물 기운이 살랑살랑~ 😉 부자 될 준비 되셨나요? 🪙`
      };
    } else if (score >= 80) {
      return {
        src: "/images/characters/toad_5.png",
        alt: "잠자는 복두꺼비",
        message: `돈 더미 위에서 꿀잠 자는 지세예요~ 😴 가만있어도 재물이 차곡차곡 쌓여요! 💵`
      };
    } else {
      return {
        src: "/images/characters/toad_3.png",
        alt: "공손한 복두꺼비",
        message: `재물 기운이 살짝 주춤하고 있어요! 🙏 처방을 실천하면 금방 좋아질 거예요~`
      };
    }
  } else if (isTigerDragon) {
    if (score >= 88) {
      return {
        src: "/images/characters/tiger_dragon_5.png",
        alt: "함께 웃는 백호 청룡",
        message: `백호랑 청룡이 함께 깔깔 웃고 있어요! 🐉🐯 귀인과 행운이 줄줄이 찾아올 거예요~`
      };
    } else if (score >= 83) {
      return {
        src: "/images/characters/tiger_dragon_2.png",
        alt: "함께하는 백호 청룡",
        message: `둘이 사이좋게 함께하는 기운이에요! 🤝 좋은 인연과 귀인이 자연스럽게 다가올 거예요!`
      };
    } else if (score >= 80) {
      return {
        src: "/images/characters/tiger_dragon_4.png",
        alt: "함께 자는 백호 청룡",
        message: `백호와 청룡이 나란히 꿀잠 자는 평화로운 기운이에요~ 😴 집안이 조용하고 따뜻해질 거예요!`
      };
    } else {
      return {
        src: "/images/characters/tiger_dragon_3.png",
        alt: "물고기 먹는 백호 청룡",
        message: `같이 물고기 먹으며 사이가 돈독해지는 기운이에요! 🐟 양보하고 나누면 더 좋아질 거예요~`
      };
    }
  } else {
    if (score >= 88) {
      return {
        src: "/images/characters/haetae_2.png",
        alt: "달려가는 아기 해치",
        message: `집 기운이 너무 좋아서 저도 신나게 달려가고 싶어요! 🏃 나쁜 기운은 완전히 차단했어요~ 🏡✨`
      };
    } else if (score >= 83) {
      return {
        src: "/images/characters/haetae_1.png",
        alt: "앉아있는 아기 해치",
        message: `저 해치가 든든하게 지켜드릴게요! 😊 나쁜 기운은 얼씬도 못 하게 할 거예요~ 🍀`
      };
    } else if (score >= 80) {
      return {
        src: "/images/characters/haetae_4.png",
        alt: "메롱하는 아기 해치",
        message: `메롱~! 😜 집안 분위기가 아주 활기차요! 피로할 틈이 없는 즐거운 공간이에요~`
      };
    } else {
      return {
        src: "/images/characters/haetae_3.png",
        alt: "고민하는 아기 해치",
        message: `기운이 살짝 엇나가서 저도 같이 고민 중이에요~ 🤔 개운 처방이면 금방 해결돼요!`
      };
    }
  }
}

// 15종 개운 솔루션 방 전용 동적 멘트 매핑 함수
function getDynamicRemedyMascot(
  score: number,
  desiredFortune: string,
  remedyTitle: string
): { src: string; message: string; alt: string } {
  const isToad = ["wealth", "south", "southeast", "west", "southwest"].includes(desiredFortune);
  const isTigerDragon = ["mentors", "east", "northeast", "northwest"].includes(desiredFortune);
  
  if (isToad) {
    return {
      src: "/images/characters/toad_3.png",
      alt: "처방 복두꺼비",
      message: `이 황금 처방인 [${remedyTitle}]을(를) 꼭 실천해 보세요! 꽉 막혀있던 재물길이 활짝 열릴 거예요~ 🔮🪙`
    };
  } else if (isTigerDragon) {
    return {
      src: "/images/characters/tiger_dragon_3.png",
      alt: "처방 백호 청룡",
      message: `서로 기운을 돋워주는 [${remedyTitle}] 처방이에요! 동반자와의 오해가 사르르 풀리고 귀인운이 차오를 거예요~ 🐉🐯`
    };
  } else {
    return {
      src: "/images/characters/haetae_3.png",
      alt: "처방 아기 해치",
      message: `제가 드리는 정밀 처방전인 [${remedyTitle}]이에요! 집안의 나쁜 액운을 말끔히 씻어내서 아주 평안해질 거예요~ 🌿✨`
    };
  }
}

export default function FengShuiTarot({ 
  isOpen, 
  onClose, 
  vacancies, 
  onSelectVacancy, 
  onSelectFortuneArea,
  mapCenter, 
  userProfile, 
  onStartDiscovery 
}: FengShuiTarotProps) {
  const primaryPersonaId = userProfile?.personaIds?.[0] || "default";
  const personaTip = getPersonaFengShuiTip(primaryPersonaId);

  // 모드 상태: 'neighborhood' (동네 명당 찾기) | 'myhome' (우리 집 풍수 분석)
  const [tarotMode, setTarotMode] = useState<"neighborhood" | "myhome">("myhome");
  
  // 단계 정의: 'input' (정보 입력) -> 'card' (카드 고르기) -> 'result' (결과 분석)
  const [step, setStep] = useState<"input" | "card" | "result">("input");
  
  // 우리 집 풍수지리 분석 결과 슬라이드 상태
  const [currentHomeSlide, setCurrentHomeSlide] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  const slideVariants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 150 : -150,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -150 : 150,
      opacity: 0
    })
  };

  const handleNextHomeSlide = () => {
    if (currentHomeSlide < 4) {
      setSlideDirection("right");
      setCurrentHomeSlide(prev => prev + 1);
    }
  };

  const handlePrevHomeSlide = () => {
    if (currentHomeSlide > 0) {
      setSlideDirection("left");
      setCurrentHomeSlide(prev => prev - 1);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 55;
    if (info.offset.x < -swipeThreshold) {
      handleNextHomeSlide();
    } else if (info.offset.x > swipeThreshold) {
      handlePrevHomeSlide();
    }
  };

  // 사용자 입력 상태
  const [birthDate, setBirthDate] = useState<string>("1995-06-15");
  const [spaceTheme, setSpaceTheme] = useState<string>("cafe");
  const [desiredFortune, setDesiredFortune] = useState<string>("wealth");
  
  // 이중 페르소나 선택 상태
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(["homemaker"]);
  
  // 페르소나 기반 무작위 3개 시나리오 및 선택된 시나리오
  const [scenariosPool, setScenariosPool] = useState<PersonaScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  
  // 타로 카드 선택 및 애니메이션 상태
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  
  // 매칭 결과 상태
  const [matchedVacancy, setMatchedVacancy] = useState<Vacancy | null>(null);
  const [fsResult, setFsResult] = useState<FengShuiResult | null>(null);
  const [nearestVacancyDistance, setNearestVacancyDistance] = useState<number>(0);
  
  // 우리 집 풍수 모의 진단 결과
  const [homeFsResult, setHomeFsResult] = useState<{
    score: number;
    grade: string;
    summary: string;
    pros: string[];
    cons: string[];
    remedy: { title: string; description: string; icon: string };
    entranceDirection: string;
    geo?: {
      mountain: string;
      water: string;
      description: string;
      alignmentAnalysis: string;
    };
  } | null>(null);

  const [activeFortuneTab, setActiveFortuneTab] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const generateShareImage = useCallback(async () => {
    setIsGeneratingImage(true);
    setShareImageUrl(null);
    try {
      const el = contentRef.current;
      if (!el) return null;
      
      const dataUrl = await htmlToImage.toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#0f172a",
        style: { display: "flex" }
      });
      
      setShareImageUrl(dataUrl);
      return dataUrl;
    } catch (e: any) {
      alert(`캡처 중 상세 오류:\n${e.name || ''} : ${e.message || e.toString()}`);
      console.error("이미지 생성 오류", e);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [homeFsResult]);
  const activePersonaIds = selectedPersonas.length > 0 ? selectedPersonas : ["default"];
  const personaTips = activePersonaIds.map(id => getPersonaFengShuiTip(id));

  const getMatchedSpaces = () => {
    const categories = [
      { id: "wealth", name: "재물운 💰", desc: "사업 번창 및 부를 축적하는 명당", personas: ["worker"] },
      { id: "fame", name: "성공 및 학업운 ⭐️", desc: "승진, 합격 및 명예를 높이는 명당", personas: ["student"] },
      { id: "mentors", name: "연애 및 귀인운 🤝", desc: "소중한 인연 및 조력자가 깃드는 명당", personas: ["solo"] },
      { id: "stability", name: "안정 및 건강운 🏥", desc: "가족 화목 및 심신 회복을 주는 명당", personas: ["homemaker", "parenting", "pet", "senior"] },
    ];

    const { zodiacYear } = getZodiacFromBirthDate(birthDate);

    return categories.map(cat => {
      const userLat = userProfile?.home?.lat || mapCenter.lat;
      const userLng = userProfile?.home?.lng || mapCenter.lng;
      const userNeighborhood = userProfile?.home?.neighborhood || "우리 동네";

      const seed = getDeterministicHash(userNeighborhood + cat.id + zodiacYear.toString());
      const distance = 800 + (seed % 1400); // 800m ~ 2200m
      
      const geo = getNearbyGeoFeatures(userLat, userLng, userNeighborhood);
      
      const dirAngles: Record<string, number> = {
        north: 0,
        northeast: 45,
        east: 90,
        southeast: 135,
        south: 180,
        southwest: 225,
        west: 270,
        northwest: 315
      };

      const waterAngle = dirAngles[geo.waterDirection] !== undefined ? dirAngles[geo.waterDirection] : 180;
      const mountainAngle = dirAngles[geo.mountainDirection] !== undefined ? dirAngles[geo.mountainDirection] : 0;

      let baseAngle = 135;
      let dirName = "동남쪽";
      let suffix = "";
      let grade = "";
      let theoryDesc = "";

      if (cat.id === "wealth") {
        baseAngle = waterAngle;
        dirName = getDirNameFromAngle(baseAngle);
        const waterName = geo.water.split(" 및 ")[0].split("(")[0];
        suffix = `${waterName} 수역 재운 명당`;
        grade = "금대수(琴帶水) 재물 길지";
        theoryDesc = `인증된 위치 주변의 주요 수맥/도로인 [${geo.water.split(" 및 ")[0]}]가 위치한 ${dirName}은 재물의 기운이 흘러들고 모이는 방위입니다. 수(水)는 재물을 뜻하며, 이 구역은 도로 and 지천이 활발히 휘감아 돌며 재물이 머무르는 격식을 보조합니다.`;
      } else if (cat.id === "fame") {
        baseAngle = mountainAngle;
        dirName = getDirNameFromAngle(baseAngle);
        const mountainName = geo.mountain.split(" 주맥")[0].split(" 지맥")[0].split("(")[0];
        suffix = `${mountainName} 지맥 성공 구역`;
        grade = "쌍룡쟁주(雙龍爭珠) 성공 구역";
        theoryDesc = `든든하게 기운을 받쳐주는 [${geo.mountain}]이 위치한 ${dirName}은 명예와 권위를 상징하는 방위입니다. 산(山)의 정기가 솟구치는 기맥을 따라 강렬한 생기를 흡수하여 사회적 성취와 진급을 끌어당깁니다.`;
      } else if (cat.id === "mentors") {
        baseAngle = (mountainAngle + 90) % 360;
        dirName = getDirNameFromAngle(baseAngle);
        suffix = "인덕 상생 귀인 구역";
        grade = "장풍득수(藏風得水) 귀인 구역";
        theoryDesc = `[${geo.mountain.split("(")[0]}] 지맥의 측면을 호위하며 기운을 보존하는 ${dirName}은 나를 돕고 지지해 주는 귀인과 인연이 가담하는 위치입니다. 세찬 바람을 누르고 온기를 머금은 '장풍득수(藏風得水)' 지세가 인적 조력의 에너지를 활성화합니다.`;
      } else {
        baseAngle = (mountainAngle + 45) % 360;
        dirName = getDirNameFromAngle(baseAngle);
        suffix = "배산임수 안락 평온 구역";
        grade = "배산임수(背山臨水) 건강 명당";
        theoryDesc = `[${geo.mountain.split("(")[0]}]의 아늑한 품이자 바람을 막아주는 ${dirName}은 대지의 안정을 뜻하는 방위입니다. 뒤가 든든히 지켜지고 앞이 막힘없이 트여 음양의 조화가 완벽한 배산임수의 기운을 통해 심신을 고요히 다스려 줍니다.`;
      }

      // 해시 시드를 활용해 해당 분면 내부에서 자연스럽게 -15도 ~ +15도 보정(Jittering)
      const angleOffset = -15 + (seed % 31);
      const angle = (baseAngle + angleOffset) * (Math.PI / 180);

      const latOffset = (distance * Math.sin(angle)) / 111000;
      const lngOffset = (distance * Math.cos(angle)) / (111000 * Math.cos(userLat * Math.PI / 180));
      
      const targetLat = userLat + latOffset;
      const targetLng = userLng + lngOffset;

      const areaName = `${userNeighborhood} ${dirName} ${Math.round(distance)}m 부근 ${suffix}`;
      const score = 85 + (seed % 15);

      return {
        ...cat,
        match: {
          areaName,
          lat: targetLat,
          lng: targetLng,
          distance,
          score,
          grade,
          theoryDesc
        }
      };
    });
  };

  // 모달이 열릴 때 사용자의 페르소나들을 읽어와서 세팅
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setSelectedCardIdx(null);
      setMatchedVacancy(null);
      setFsResult(null);
      setHomeFsResult(null);
      setCurrentHomeSlide(0);
      setSlideDirection(null);
      setDesiredFortune("south"); // 기본 방향 초기화
      
      const savedPersonas = userProfile?.personaIds?.filter((id: string) => 
        ["homemaker", "worker", "parenting", "student", "solo", "pet", "senior"].includes(id)
      ) || [];
      
      if (savedPersonas.length > 0) {
        setSelectedPersonas(savedPersonas);
      } else {
        setSelectedPersonas(["homemaker"]); // 기본값
      }
    }
  }, [isOpen, userProfile]);

  // 페르소나가 변경될 때마다 3개의 시나리오를 무작위로 추출하여 선택지 구성
  useEffect(() => {
    if (!isOpen) return;
    const rawScenarios = getScenariosForPersonas(selectedPersonas);
    
    if (rawScenarios.length > 0) {
      // 무작위 셔플 후 최대 3개 선택
      const shuffled = [...rawScenarios].sort(() => 0.5 - Math.random());
      const sampled = shuffled.slice(0, 3);
      setScenariosPool(sampled);
      
      // 첫 번째 시나리오를 기본 선택 처리
      setSelectedScenarioId(sampled[0].id);
    } else {
      setScenariosPool([]);
      setSelectedScenarioId("");
    }
  }, [selectedPersonas, isOpen]);

  const handleStartTarot = () => {
    setStep("card");
  };

  if (!isOpen) return null;

  // 카드 선택 완료 시 결과 분석 처리
  const handlePickCard = (cardIdx: number) => {
    setSelectedCardIdx(cardIdx);

    const { zodiacYear } = getZodiacFromBirthDate(birthDate);

    if (tarotMode === "neighborhood") {
      // 1. 동네 명당 찾기 모드
      const available = vacancies.filter(v => v.status === "available" || !v.status);
      
      if (available.length === 0) {
        setMatchedVacancy(null);
        setFsResult(null);
        setTimeout(() => setStep("result"), 1200);
        return;
      }

      // 선택된 시나리오나 기본 정보 기반으로 최고 점수 공실 매칭
      const targetScenario = scenariosPool.find(s => s.id === selectedScenarioId);
      const matchedTheme = targetScenario ? targetScenario.fortuneType : desiredFortune;

      let bestVacancy = available[0];
      let bestResult = analyzeFengShui(bestVacancy, zodiacYear, spaceTheme, matchedTheme);

      for (let i = 1; i < available.length; i++) {
        const v = available[i];
        const res = analyzeFengShui(v, zodiacYear, spaceTheme, matchedTheme);
        
        // 장기 공실일 경우 가산점 곱해 관심 유도
        let scoreMultiplier = 1.0;
        if (v.vacancyPeriod && (v.vacancyPeriod.includes("6개월") || v.vacancyPeriod.includes("1년") || v.vacancyPeriod.includes("오래"))) {
          scoreMultiplier = 1.05; 
        }

        if (res.score * scoreMultiplier > bestResult.score) {
          bestVacancy = v;
          bestResult = res;
        }
      }

      // 거리 계산
      const dist = calculateDistanceM(mapCenter.lat, mapCenter.lng, bestVacancy.lat, bestVacancy.lng);
      setNearestVacancyDistance(dist);
      setMatchedVacancy(bestVacancy);
      setFsResult(bestResult);

    } else {
      // 2. 우리 집 풍수 모의 분석 모드
      const DIRECTIONS_MAP: Record<string, string> = {
        south: "남향 (오향)",
        southeast: "남동향 (손향)",
        east: "동향 (묘향)",
        northeast: "북동향 (간향)",
        north: "북향 (자향)",
        northwest: "북서향 (건향)",
        west: "서향 (유향)",
        southwest: "남서향 (곤향)"
      };
      const selectedDir = DIRECTIONS_MAP[desiredFortune] || "남향 (오향)";
      
      // 실제 좌표 및 행정동 정보 연동
      const userLat = userProfile?.home?.lat || mapCenter.lat;
      const userLng = userProfile?.home?.lng || mapCenter.lng;
      const userNeighborhood = userProfile?.home?.neighborhood || "우리 동네";

      const geo = getNearbyGeoFeatures(userLat, userLng, userNeighborhood);

      // 방향 각도 매핑 및 배산임수 조화 계산
      const dirAngles: Record<string, number> = {
        north: 0,
        northeast: 45,
        east: 90,
        southeast: 135,
        south: 180,
        southwest: 225,
        west: 270,
        northwest: 315
      };

      const houseAngle = dirAngles[desiredFortune] !== undefined ? dirAngles[desiredFortune] : 180;
      const waterAngle = dirAngles[geo.waterDirection] !== undefined ? dirAngles[geo.waterDirection] : 180;

      let diff = Math.abs(houseAngle - waterAngle);
      if (diff > 180) diff = 360 - diff;

      const baseScore = 80 + ((zodiacYear + cardIdx) % 15);
      let alignmentBonus = 0;
      let alignmentAnalysis = "";

      if (diff <= 45) {
        alignmentBonus = 6;
        alignmentAnalysis = `현재 거주하시는 집의 방향(${selectedDir})이 동네 주요 물길/도로 순환인 [${geo.water.split(" 및 ")[0]}] 방향과 잘 어우러지며 뒷산의 안락한 지맥을 등지는 이상적인 '배산임수 순응형' 배치입니다. 재물과 긍정적인 생기가 가옥 내부로 차곡차곡 유입됩니다.`;
      } else if (diff >= 135) {
        alignmentBonus = -3;
        alignmentAnalysis = `현재 집의 방향(${selectedDir})이 든든한 뒷산맥을 정면으로 마주 보고 물길을 등지는 '배수진(背水陣)' 구조에 가깝습니다. 심리적인 보호감이 강해 건강 관리에 도움을 주나 재물이 머무는 기류가 약해질 수 있으므로, 현관 앞 윈드차임이나 식물 비보 처방을 통해 기운을 완화해 주는 것이 좋습니다.`;
      } else {
        alignmentBonus = 2;
        alignmentAnalysis = `현재 집의 방향(${selectedDir})이 산맥과 물길의 축에서 비껴나 비스듬히 흐르는 기류를 옆으로 마주하는 배치입니다. 외부 바람이 곧바로 부딪치지 않아 사계절 내내 집안 기운이 편온하고 평화롭게 유지되는 조화로운 구조입니다.`;
      }

      const finalScore = Math.min(100, baseScore + alignmentBonus);

      const homeGrades = [
        {
          grade: "배산임수형 주거명당",
          summary: "집 뒤로는 탄탄한 빌딩이나 지맥이 기운을 가두고, 앞으로는 탁 트인 도로가 있어 환기와 재물 순환이 우수한 훌륭한 주거 환경입니다.",
          pros: ["가족 구성원들의 기운이 모이고, 만성 피로가 덜어집니다.", "뜻하지 않은 재물 소식이 들어올 수 있습니다."],
          cons: ["방이 조금 건조해지기 쉬우니 실내 가습이나 수경 재배에 신경 쓰세요."],
          remedy: { title: "둥근 잎 화분 배치", description: "현관에서 거실로 들어가는 복도에 둥근 잎 식물을 두어 외부의 나쁜 기를 정화하세요.", icon: "🌿" }
        },
        {
          grade: "금계포란형 아늑한 복지",
          summary: "외부 소음과 매연이 정돈된 중심에 위치하여 닭이 알을 품듯 온화하고 안전하게 생기를 가두는 평화로운 터입니다.",
          pros: ["자녀들의 집중력과 공부운이 크게 향상됩니다.", "부부간의 불화가 가라앉고 돈독해집니다."],
          cons: ["일조량이 간혹 부족해 우울감이 올 수 있으니 화사한 조명을 유지하세요."],
          remedy: { title: "황금색 인테리어 처방", description: "서쪽 벽면에 노란 해바라기 액자나 골드톤 소품을 장식하여 재물운을 모으세요.", icon: "🌻" }
        },
        {
          grade: "장풍득수형 로컬 기운",
          summary: "바람 소리가 사그라들고 빛이 모이는 완만한 경사지에 위치하여, 거주할수록 건강이 크게 증진되는 장수 명당입니다.",
          pros: ["머리가 항상 개운하고 수면의 질이 극대화됩니다.", "인덕이 많아져 주변 이웃과 친밀해집니다."],
          cons: ["기가 조용히 가라앉으므로 공격적인 추진력은 다소 약해질 수 있습니다."],
          remedy: { title: "맑은 윈드차임 처방", description: "창가나 베란다 쪽에 황동 종이나 풍경을 달아 바람이 불 때마다 맑은 소리를 내어 생기를 활성화하세요.", icon: "🔔" }
        }
      ];

      const resData = homeGrades[(zodiacYear + cardIdx) % homeGrades.length];
      setHomeFsResult({
        score: finalScore,
        grade: resData.grade,
        summary: resData.summary,
        pros: resData.pros,
        cons: resData.cons,
        remedy: resData.remedy,
        entranceDirection: selectedDir,
        geo: {
          mountain: geo.mountain,
          water: geo.water,
          description: geo.description,
          alignmentAnalysis
        }
      });
    }

    // 신비로운 뒤집기 딜레이
    setTimeout(() => {
      setStep("result");
    }, 1200);
  };

  // SVG 레이더 차트 데이터 변환
  const getRadarPoints = (fortunes: any) => {
    const values = [fortunes.wealth, fortunes.stability, fortunes.fame, fortunes.mentors, fortunes.harmony];
    const center = 100;
    const maxR = 60;
    
    return values.map((val, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const r = (val / 100) * maxR;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  };

  // 레이더 가이드 오각형 생성
  const getRadarGridPoints = (level: number) => {
    const center = 100;
    const r = level * 15;
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  };

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden text-slate-100 my-8 md:my-16"
        >
          {/* 장식용 네온 그라디언트 백그라운드 */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* 상단 헤더 */}
          <div className="flex items-center justify-between p-6 pt-8 md:p-8 border-b border-slate-800 relative z-10">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                  우리 집 풍수지리 분석 🔮
                </h2>
                <p className="text-[11px] font-bold text-slate-400">나의 오행과 주거 공간의 방향이 이루는 기운 진단</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setShowShareModal(true);
                  await generateShareImage();
                }}
                className="w-10 h-10 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 flex items-center justify-center transition-all border border-amber-500/20"
                title="현재 화면 캡처 및 공유"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => onClose(step === "result")}
                className="w-10 h-10 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 relative z-10">
            {/* [1단계] 정보 입력 */}
            {step === "input" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {tarotMode === "neighborhood" ? (
                  /* 1) 동네 공실 매칭 모드 입력 폼 */
                  <div className="space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4 text-left">
                      <Compass className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-spin-slow" />
                      <div>
                        <h4 className="text-sm font-black text-amber-400">이웃들의 상상과 풍수의 만남</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1 font-medium">
                          귀하의 탄생 생년(오행)과 희망하는 창업/공간 테마를 분석하여, 동네 마커 중 풍수학적으로 부와 안정을 가져다줄 <strong>장기 공실</strong> 명당을 타로점 형태로 찾아드립니다.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* 생년월일 입력 */}
                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">태어난 생년월일</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* 관심 테마 */}
                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">관심있는 공간 테마</label>
                        <select
                          value={spaceTheme}
                          onChange={(e) => setSpaceTheme(e.target.value)}
                          className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all"
                        >
                          <option value="cafe" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>대박을 꿈꾸는 예쁜 카페 터 ☕</option>
                          <option value="flower" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>싱그럽고 조용한 꽃집 / 공방 🌿</option>
                          <option value="restaurant" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>손님이 끊이지 않는 맛있는 식당 🍲</option>
                          <option value="fashion" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>감각적이고 세련된 의류 편집숍 👕</option>
                          <option value="office" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>집중이 잘 되고 안락한 사무실 💻</option>
                          <option value="education" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>학구열을 불태울 학원 / 서재 📚</option>
                          <option value="clinic" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>사람을 치유하는 한의원 / 약국 🏥</option>
                          <option value="pub" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>흥이 돋는 이자카야 / 주점 🍺</option>
                        </select>
                      </div>
                    </div>

                    {/* 페르소나 맞춤형 시나리오 카드 매칭 */}
                    <div className="space-y-3 pt-2 text-left">
                      <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1">
                        내가 고민하는 대표적 질문 <span className="text-[10px] text-amber-500 font-bold">(페르소나 연동)</span>
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {scenariosPool.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedScenarioId(s.id)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                              selectedScenarioId === s.id
                                ? "bg-amber-500/10 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                : "bg-slate-850/50 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <span className="text-base mt-0.5">🔮</span>
                            <div>
                              <p className="text-xs font-black text-white">{s.question}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">
                                목표 기운: <span className="text-amber-400 font-black">{s.fortuneType === "wealth" ? "재물운 💰" : s.fortuneType === "stability" ? "안정운 🏥" : s.fortuneType === "fame" ? "명예운 ⭐️" : "귀인운 🤝"}</span>
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2) 우리 집 풍수 모의 분석 입력 폼 */
                  <div className="space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4 text-left">
                      <Home className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-amber-400">나의 현재 주거공간 분석</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1 font-medium">
                          귀하가 거주하시는 곳의 대략적인 방향과 생년을 조합하여, 현재 집안에 깃드는 재물 및 건강 에너지를 계산하고 기운을 북돋우는 비보(Remedy) 인테리어 팁을 처방해 드립니다.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">태어난 생년월일</label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all [color-scheme:dark]"
                        />
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">집(거실 베란다 기준)의 방향</label>
                        <select
                          value={desiredFortune}
                          onChange={(e) => setDesiredFortune(e.target.value)}
                          className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all"
                        >
                          <option value="south" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>따뜻하고 빛이 가득 찬 남향 (南向) ☀️</option>
                          <option value="southeast" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>생기와 번영이 움트는 남동향 (南東向) 🌅</option>
                          <option value="east" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>새로운 기운과 시작의 동향 (東向) 🌅</option>
                          <option value="northeast" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>변화와 도약의 북동향 (北東向) ❄️</option>
                          <option value="north" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>차분하고 깊은 사색의 북향 (北向) ❄️</option>
                          <option value="northwest" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>결실과 권위의 북서향 (北西向) 🍂</option>
                          <option value="west" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>노을의 온기와 풍요로운 서향 (西向) 🌇</option>
                          <option value="southwest" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>온화함과 안정의 남서향 (南西向) 🌇</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleStartTarot}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-amber-500/10 hover:shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    점괘를 이끌어낼 타로 카드 보러 가기
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                  
                  {/* 🔒 개인정보 미저장 안내 메시지 */}
                  <p className="text-[10px] text-center text-slate-500 font-bold mt-4 flex items-center justify-center gap-1">
                    <span>🔒</span> 
                    입력하신 생년월일 등의 정보는 풍수지리 계산 및 카드 궁합 매칭에만 일회성으로 활용되며, 서버에 별도로 절대 저장되지 않습니다.
                  </p>
                </div>
              </motion.div>
            )}

            {/* [2단계] 타로 카드 고르기 */}
            {step === "card" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8 py-4">
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-black text-white">대지의 점괘를 이끌 카드를 고르세요</h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-2 leading-relaxed">
                    마음을 가라앉히고 오직 직관만을 따라<br />
                    아래 3장의 풍수 카드 중<br />
                    당신의 기운을 대변하는 단 한 장을 터치하세요.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-lg mx-auto py-4">
                  {[0, 1, 2].map((idx) => {
                    const isPicked = selectedCardIdx === idx;
                    const isAnyPicked = selectedCardIdx !== null;
                    
                    return (
                      <motion.div
                        key={idx}
                        className={`relative w-36 h-56 rounded-2xl cursor-pointer border-2 transition-all overflow-hidden ${
                          isPicked
                            ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] z-20 scale-105"
                            : isAnyPicked
                            ? "opacity-30 pointer-events-none scale-95 border-slate-800"
                            : "border-amber-500/45 shadow-[0_0_12px_rgba(245,158,11,0.18)] hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] bg-gradient-to-b from-slate-850 to-slate-900"
                        }`}
                        onMouseEnter={() => !isAnyPicked && setHoveredCardIdx(idx)}
                        onMouseLeave={() => setHoveredCardIdx(null)}
                        onClick={() => !isAnyPicked && handlePickCard(idx)}
                        animate={
                          isPicked
                            ? { rotateY: 180, scale: 1.1 }
                            : hoveredCardIdx === idx
                            ? { y: -10, rotate: idx === 0 ? -2 : idx === 2 ? 2 : 0 }
                            : { y: 0, rotate: 0 }
                        }
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      >
                        {/* 카드 뒷면 */}
                        <div className="absolute inset-0 p-4 flex flex-col items-center justify-between bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-900">
                          <div className="absolute inset-2 border border-amber-500/28 rounded-xl pointer-events-none" />
                          <div className="w-full h-full flex flex-col items-center justify-between relative z-10 py-4">
                            <span className="text-[9px] font-black text-amber-500/65 uppercase tracking-widest">FENG SHUI TAROT</span>
                            
                            <div className="w-16 h-16 border-2 border-dashed border-amber-500/35 rounded-full flex items-center justify-center relative">
                              <div className="absolute inset-2 border border-amber-500/30 rounded-full animate-spin-slow" />
                              <Compass className="w-6 h-6 text-amber-500/55" />
                            </div>
                            
                            <Compass className="w-4 h-4 text-amber-500/60 animate-spin-slow" />
                          </div>
                        </div>

                        {/* 카드 앞면 뒤집힘 로딩 */}
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                          <div className="absolute inset-2 border border-amber-400/30 rounded-xl" />
                          <Compass className="w-10 h-10 text-amber-400 animate-spin" />
                          <span className="text-[10px] font-black text-amber-400 mt-4 animate-pulse">명당 분석 중...</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* [3단계] 결과 출력 */}
            {step === "result" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* 1) 동네 공실 매칭 모드 결과 */}
                {tarotMode === "neighborhood" && (
                  <>
                    {!matchedVacancy || !fsResult ? (
                      <div className="text-center py-12 space-y-4">
                        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
                        <h3 className="text-lg font-black text-white">매칭 가능한 대길(大吉) 상가가 없습니다</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-bold">
                          현재 조사된 위치 주변에 가용한 공실 상가가 부족하거나 사주와 맞는 터가 비어있지 않습니다. 지도의 범위를 넓혀 명당 찾기를 시도해 보세요.
                        </p>
                        <button
                          onClick={() => setStep("input")}
                          className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-2xl transition-all text-xs"
                        >
                          조건 재설정하기
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 헤더 진단서 카드 */}
                        <div className="bg-slate-950/60 border border-amber-500/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative">
                          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-b-[2rem]" />
                          
                          <div className="text-center md:text-left">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Lucky Site Matched</span>
                            <h3 className="text-xl font-black text-white mt-1 flex items-center gap-1.5 justify-center md:justify-start">
                              {matchedVacancy.landmark} <span className="text-xs text-slate-400 font-bold">({matchedVacancy.floor})</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 font-medium">{matchedVacancy.address}</p>
                            
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mt-3">
                              <span className="text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full">
                                ☯️ {fsResult.zodiac} 궁합
                              </span>
                              <span className="text-xs font-bold bg-slate-850 text-slate-300 px-2.5 py-0.5 rounded-full">
                                🔥 {fsResult.personalElement}의 터
                              </span>
                              {matchedVacancy.vacancyPeriod && (
                                <span className="text-xs font-black bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 py-0.5 rounded-full animate-pulse">
                                  ⏳ {matchedVacancy.vacancyPeriod} 방치됨
                                </span>
                              )}
                              <span className="text-xs text-slate-400 font-medium">
                                🗺️ 내 위치에서 {nearestVacancyDistance >= 1000 ? `${(nearestVacancyDistance / 1000).toFixed(1)}km` : `${nearestVacancyDistance}m`}
                              </span>
                            </div>
                          </div>

                          {/* 점수 뱃지 */}
                          <div className="shrink-0 flex flex-col items-center justify-center bg-slate-900 border-2 border-amber-500/20 w-32 h-32 rounded-3xl shadow-lg relative">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">풍수 점수</div>
                            <div className="text-4xl font-black text-amber-400 tracking-tighter mt-1">
                              {fsResult.score}<span className="text-xs text-slate-400">점</span>
                            </div>
                            <div className="text-[9px] font-black text-amber-500 border border-amber-500/30 rounded-full px-2.5 py-0.5 mt-2 bg-amber-500/5">
                              {fsResult.entranceDirection}
                            </div>
                          </div>
                        </div>

                        {/* 5대 지표 및 5각 차트 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">👑</span>
                                <h4 className="text-base font-black text-amber-400">{fsResult.grade}</h4>
                              </div>
                              <p className="text-sm font-medium text-slate-300 leading-relaxed mt-3">{fsResult.summary}</p>
                              
                              <div className="mt-4 space-y-2">
                                <div className="flex items-start gap-2 text-xs font-medium text-slate-300">
                                  <span className="text-emerald-500 font-bold mt-0.5">✔</span>
                                  <span>{fsResult.pros[0]}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs font-medium text-slate-300">
                                  <span className="text-emerald-500 font-bold mt-0.5">✔</span>
                                  <span>{fsResult.pros[1]}</span>
                                </div>
                                {fsResult.cons.length > 0 && (
                                  <div className="flex items-start gap-2 text-xs font-medium text-rose-400 border-t border-slate-850 pt-2.5 mt-2.5">
                                    <span className="text-rose-500 font-bold mt-0.5">⚠️</span>
                                    <span>{fsResult.cons[0]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-850 text-[10px] text-slate-400 font-bold mt-4">
                              💡 이 명당 터는 장기 공실 상태로 머물고 있어 사용자의 기발한 투표 및 새로운 오픈 상상을 절실히 필요로 하고 있습니다.
                            </div>
                          </div>

                          {/* 5각형 오행 레이더 차트 */}
                          <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 flex items-center justify-center relative min-h-[220px]">
                            <svg className="w-48 h-48" viewBox="0 0 200 200">
                              <polygon
                                points={getRadarGridPoints(1)}
                                fill="none"
                                stroke="#1e293b"
                                strokeWidth="1"
                              />
                              <polygon
                                points={getRadarGridPoints(2)}
                                fill="none"
                                stroke="#334155"
                                strokeWidth="1"
                              />
                              <polygon
                                points={getRadarGridPoints(3)}
                                fill="none"
                                stroke="#475569"
                                strokeWidth="1"
                              />
                              <polygon
                                points={getRadarGridPoints(4)}
                                fill="none"
                                stroke="#64748b"
                                strokeWidth="1"
                              />
                              
                              {/* 5각 가이드 라인 */}
                              {(() => {
                                const center = 100;
                                const r = 60;
                                return Array.from({ length: 5 }).map((_, i) => {
                                  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                                  const x = center + r * Math.cos(angle);
                                  const y = center + r * Math.sin(angle);
                                  return (
                                    <line
                                      key={i}
                                      x1={center}
                                      y1={center}
                                      x2={x}
                                      y2={y}
                                      stroke="#334155"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                    />
                                  );
                                });
                              })()}
                              
                              <polygon
                                points={getRadarPoints(fsResult.fortunes)}
                                fill="rgba(245, 158, 11, 0.25)"
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                              />
                              
                              {(() => {
                                const labels = [
                                  { text: "💰 재물운", offset: [0, -10] },
                                  { text: "🏥 안정운", offset: [15, 0] },
                                  { text: "⭐ 명예운", offset: [10, 10] },
                                  { text: "🤝 귀인운", offset: [-10, 10] },
                                  { text: "☯️ 궁합도", offset: [-15, 0] }
                                ];
                                return labels.map((lbl, i) => {
                                  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                                  const x = 100 + 72 * Math.cos(angle) + lbl.offset[0];
                                  const y = 100 + 72 * Math.sin(angle) + lbl.offset[1];
                                  return (
                                    <text key={i} x={x} y={y} textAnchor="middle" className="fill-slate-400 text-[9px] font-black">
                                      {lbl.text}
                                    </text>
                                  );
                                });
                              })()}
                            </svg>
                          </div>
                        </div>

                        {/* 처방전 */}
                        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-400/20 rounded-[2.5rem] p-6 relative overflow-hidden">
                          <div className="flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl shrink-0 shadow-lg animate-pulse">
                              {fsResult.remedy.icon}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                                개운 보완 처방전 (裨補 處方)
                              </span>
                              <h4 className="text-sm font-black text-white mt-1.5">{fsResult.remedy.title}</h4>
                              <p className="text-xs font-medium text-slate-300 leading-relaxed mt-1.5">{fsResult.remedy.description}</p>
                            </div>
                          </div>
                        </div>

                        {/* 하단 버튼 */}
                        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-800">
                          <button
                            onClick={() => {
                              onSelectVacancy(matchedVacancy);
                              onClose();
                            }}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-amber-500/15 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            이 명당 터 지도에서 황금 마커로 확인하기 🗺️
                            <ArrowRight className="w-4 h-4 text-slate-950" />
                          </button>
                          <button
                            onClick={() => {
                              setStep("input");
                              setSelectedCardIdx(null);
                            }}
                            className="bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-4 px-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            <RefreshCw className="w-4 h-4" />
                            다시 매칭하기
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 2) 우리 집 풍수 모의 분석 결과 */}
                {tarotMode === "myhome" && homeFsResult && (() => {
                  const matchedSpaces = getMatchedSpaces();
                  const activeItem = matchedSpaces.find(item => item.id === activeFortuneTab) || matchedSpaces[0];
                  const match = activeItem.match;

                  return (
                    <div className="space-y-6">
                      {/* 상단 슬라이드 페이지 정보 (1/5) */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-400">
                          {currentHomeSlide === 0 && "🏡 종합 진단서"}
                          {currentHomeSlide === 1 && "⛰️ 지형지물 결합 분석"}
                          {currentHomeSlide === 2 && "⚖️ 주거 격식 등급"}
                          {currentHomeSlide === 3 && "🔮 개운 인테리어 솔루션"}
                          {currentHomeSlide === 4 && "🧭 행운의 명당 찾기"}
                        </span>
                        <div className="px-3 py-1 bg-slate-800 border border-slate-700/60 rounded-full text-xs font-bold text-slate-300">
                          {currentHomeSlide + 1} / 5
                        </div>
                      </div>

                      {/* 슬라이드 뷰포트 영역 */}
                      <div className="relative overflow-hidden min-h-[460px] flex items-stretch md:px-8">
                        {/* PC용 좌측 화살표 버튼 */}
                        <button
                          onClick={handlePrevHomeSlide}
                          disabled={currentHomeSlide === 0}
                          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/60 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all ${
                            currentHomeSlide === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* PC용 우측 화살표 버튼 */}
                        <button
                          onClick={handleNextHomeSlide}
                          disabled={currentHomeSlide === 4}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/60 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all ${
                            currentHomeSlide === 4 ? "opacity-0 pointer-events-none" : "opacity-100"
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
                          <motion.div
                            key={currentHomeSlide}
                            custom={slideDirection}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={handleDragEnd}
                            className="w-full select-none cursor-grab active:cursor-grabbing px-2"
                          >
                            {currentHomeSlide === 0 && (
                              /* 🏡 우리 집 주거 풍수 진단서 (점수 포함) */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <Home size={20} />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">우리 집 주거 풍수 진단서</h4>
                                    <p className="text-xs text-slate-400 font-medium">선택 방향: <span className="text-amber-400/90 font-semibold">{homeFsResult.entranceDirection}</span> (거실 창문 기준)</p>
                                  </div>
                                </div>

                                {/* 캐릭터 말풍선 피드백 */}
                                {(() => {
                                  const mascot = getDynamicMascot(homeFsResult.score, desiredFortune, userProfile?.nickname);
                                  return (
                                    <div className="flex flex-col items-center justify-center gap-3 py-3 w-full">
                                      <motion.div
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                        className="relative shrink-0"
                                      >
                                        <img 
                                          src={mascot.src} 
                                          alt={mascot.alt} 
                                          className="w-28 h-28 md:w-32 md:h-32 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                                        />
                                      </motion.div>
                                      <div className="relative w-full bg-slate-850 border border-slate-800 text-sm md:text-base text-slate-200 px-5 py-4 rounded-2xl shadow-xl text-center break-keep leading-relaxed font-medium mt-1">
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-850 border-t border-l border-slate-800 rotate-45" />
                                        <span>{mascot.message}</span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-5 flex items-center justify-between text-left shadow-inner">
                                  <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">진단 종합 점수</span>
                                    <p className="text-lg md:text-xl font-bold text-amber-400 break-keep">
                                      주거 풍수 <span className="text-2xl font-black inline-block whitespace-nowrap">{homeFsResult.score}점</span>
                                    </p>
                                  </div>
                                  <div className="px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/25 rounded-xl text-xs font-bold text-purple-400 tracking-wide break-keep">
                                    기운 개운 시뮬레이션
                                  </div>
                                </div>
                              </div>
                            )}

                            {currentHomeSlide === 1 && homeFsResult.geo && (
                              /* ⛰️ 우리 동네 지형지물(배산임수) 결합 분석 카드 */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-4 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <Compass size={20} className="animate-spin-slow" />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">우리 동네 지형지물 결합 분석</h4>
                                    <p className="text-xs text-slate-400 font-medium">인증 위치의 산맥 지맥과 수변 수역 고려 진단</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1 text-left">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                      ⛰️ 배산 (背山)
                                    </span>
                                    <p className="text-xs font-semibold text-slate-200 break-keep">{homeFsResult.geo.mountain}</p>
                                  </div>
                                  <div className="p-3 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1 text-left">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                      🌊 임수 (臨水)
                                    </span>
                                    <p className="text-xs font-semibold text-slate-200 break-keep">{homeFsResult.geo.water}</p>
                                  </div>
                                </div>


                                <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-850/50 space-y-3 shadow-inner">
                                  <p className="text-xs md:text-sm font-normal text-slate-300 leading-relaxed font-sans text-left break-keep">
                                    {homeFsResult.geo.description}
                                  </p>
                                  <div className="h-px bg-slate-850/60" />
                                  <div className="text-[11px] md:text-xs font-normal text-slate-400 leading-relaxed font-sans flex items-start gap-2.5 text-left break-keep">
                                    <span className="text-amber-500 shrink-0 mt-0.5 select-none text-sm">☯️</span>
                                    <p>
                                      <strong className="text-amber-400 font-bold mr-1">방향 궁합 분석:</strong> 
                                      {homeFsResult.geo.alignmentAnalysis}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {currentHomeSlide === 2 && (
                              /* ⚖️ 격식 등급 카드 */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-4 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <ShieldCheck size={20} />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">우리 집 주거 격식 등급 판정</h4>
                                    <p className="text-xs text-slate-400 font-medium">생년월일과 가옥 방향을 종합한 격식 등급</p>
                                  </div>
                                </div>

                                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 flex items-center justify-between text-left shadow-inner">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">주거 격식 등급</span>
                                    <p className="text-sm md:text-base font-bold text-amber-400 break-keep">{homeFsResult.grade}</p>
                                  </div>
                                  <div className="px-3.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs font-bold text-amber-400">
                                    대길 (大吉)
                                  </div>
                                </div>

                                {/* 종합 총평 요약문 처리 */}
                                <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl text-xs md:text-sm text-slate-300 text-left break-keep leading-relaxed font-medium">
                                  <strong>📝 종합 총평:</strong> {homeFsResult.summary}
                                </div>
                                
                                {/* 페르소나 연계 분석 내용 */}
                                <div className="space-y-3">
                                  {personaTips.map((tip, idx) => (
                                    <div key={idx} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-left space-y-1.5 shadow-inner">
                                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs break-keep">
                                        <span className="text-sm">🏠</span>
                                        <span>{tip.personaName} 맞춤형 주택 개운 비법</span>
                                      </div>
                                      <p className="text-xs font-normal text-slate-355 leading-relaxed font-sans break-keep">
                                        {tip.personaName}님의 사주와 기운을 극대화하려면 거실 기준 <span className="text-amber-400 font-semibold">{homeFsResult.entranceDirection}</span> 보완이 핵심입니다. 
                                        행운의 행동 &lsquo;<span className="text-amber-400 font-semibold">{tip.action}</span>&rsquo;을 직접 실천하고, 
                                        행운의 음료 &lsquo;<span className="text-amber-400 font-semibold">{tip.food}</span>&rsquo;를 섭취하여 에너지를 끌어들이세요.
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <div className="space-y-2.5 border-t border-slate-850/80 pt-3 text-left">
                                  <div className="flex items-start gap-2 text-xs font-normal text-slate-350 break-keep">
                                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✔</span>
                                    <span>{homeFsResult.pros[0]}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-xs font-normal text-slate-350 break-keep">
                                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✔</span>
                                    <span>{homeFsResult.pros[1]}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-xs font-normal text-rose-450 break-keep">
                                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">⚠️</span>
                                    <span>{homeFsResult.cons[0]}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {currentHomeSlide === 3 && (
                              /* 처방전 카드 */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
                                    <Sparkles size={20} />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">주거 개운 인테리어 솔루션</h4>
                                    <p className="text-xs text-slate-400 font-medium">부족한 주거 에너지 보완 비보(裨補) 처방</p>
                                  </div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden text-left shadow-md">
                                  <div className="flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-600/90 text-white flex items-center justify-center text-xl shrink-0 shadow-lg select-none">
                                      {homeFsResult.remedy.icon}
                                    </div>
                                    <div className="space-y-1">
                                      <h4 className="text-sm md:text-base font-bold text-white break-keep">{homeFsResult.remedy.title}</h4>
                                      <p className="text-sm font-normal text-slate-300 leading-relaxed mt-1.5 break-keep">{homeFsResult.remedy.description}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* 캐릭터 마법 처방 연출 */}
                                {(() => {
                                  const mascot = getDynamicRemedyMascot(homeFsResult.score, desiredFortune, homeFsResult.remedy.title);
                                  return (
                                    <div className="flex flex-col items-center justify-center gap-2 mt-4 bg-slate-950/20 px-5 pt-5 pb-6 rounded-2xl border border-slate-850/50 animate-fade-in w-full">
                                      <motion.div
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                                        className="relative shrink-0"
                                      >
                                        <img 
                                          src={mascot.src} 
                                          alt={mascot.alt} 
                                          className="w-28 h-28 md:w-32 md:h-32 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                                        />
                                      </motion.div>
                                      <div className="relative w-full bg-slate-850 border border-slate-800 text-sm md:text-base text-slate-200 px-5 py-4 rounded-2xl shadow-xl text-center break-keep leading-relaxed font-medium mt-1">
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-850 border-t border-l border-slate-800 rotate-45" />
                                        <span>{mascot.message}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {currentHomeSlide === 4 && (
                              /* 우리 동네 나에게 도움이 되는 공간 매칭 카드 (2.5km 이내 공실 추천 & 지도 마커 동시 노출) */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-5 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <Compass size={20} className="animate-spin-slow" />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">우리 동네 행운의 명당 찾기</h4>
                                    <p className="text-xs text-slate-400 font-medium">사주에 따른 2.5km 이내의 맞춤형 공실 추천</p>
                                  </div>
                                </div>

                                {/* 설명 가이드 텍스트 박스 */}
                                <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-xl text-[11px] md:text-xs text-slate-300 text-left break-keep leading-relaxed font-medium">
                                  📍 <strong>우리 동네 4대 명당 상가:</strong> 반경 2.5km 내에서 {userProfile?.nickname || "대표"}님의 오행 및 페르소나에 부합하는 공간을 엄선했습니다. 아래 탭을 눌러 각 명당의 상세 설명과 위치를 지도로 확인해 보세요.
                                </div>

                                {/* 탭 버튼들 */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                  {matchedSpaces.map((item) => {
                                    const isSelected = activeFortuneTab === item.id;
                                    const isMyPersonaMatch = selectedPersonas.some((pId: string) => item.personas.includes(pId));
                                    return (
                                      <button
                                        key={item.id}
                                        onClick={() => setActiveFortuneTab(item.id)}
                                        className={`relative py-3.5 px-2 rounded-2xl border transition-all text-[11px] md:text-xs font-black flex items-center justify-center gap-1.5 select-none ${
                                          isSelected
                                            ? "bg-purple-600 border-purple-500 text-white shadow-[0_4px_15px_rgba(147,51,234,0.3)] scale-[1.02]"
                                            : "bg-slate-800/40 border-slate-700/80 text-slate-400 hover:border-slate-700 hover:text-white"
                                        }`}
                                      >
                                        {isMyPersonaMatch && (
                                          <span className="absolute top-1 right-1.5 text-[8px] text-amber-400">★</span>
                                        )}
                                        <span>{item.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* 상세 설명 및 지도로 보기 */}
                                <AnimatePresence mode="wait">
                                  {activeFortuneTab === "" ? (
                                    /* 탭 선택 전 안내 빈 상태 */
                                    <motion.div
                                      key="empty-state"
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className="flex flex-col items-center justify-center gap-3 py-6 text-center"
                                    >
                                      {(() => {
                                        const isToad = ["south","southeast","west","southwest"].includes(desiredFortune);
                                        const isTigerDragon = ["east","northeast","northwest"].includes(desiredFortune);
                                        const mascotSrc = isToad
                                          ? "/images/characters/toad_2.png"
                                          : isTigerDragon
                                          ? "/images/characters/tiger_dragon_1.png"
                                          : "/images/characters/haetae_1.png";
                                        return (
                                          <motion.img
                                            src={mascotSrc}
                                            alt="명당 수호신"
                                            className="w-28 h-28 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                          />
                                        );
                                      })()}
                                      <p className="text-xs text-slate-400 font-medium break-keep leading-relaxed">
                                        위 탭을 눌러 원하는 운의 명당을 확인하세요! ✨
                                      </p>
                                    </motion.div>
                                  ) : match ? (
                                    <motion.div
                                      key={activeFortuneTab}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      transition={{ duration: 0.2 }}
                                      className={`relative rounded-3xl p-6 border-2 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-gradient-to-br ${
                                        selectedPersonas.some((pId: string) => activeItem.personas.includes(pId))
                                          ? "from-amber-500/10 to-yellow-500/5 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                                          : "from-slate-900/60 to-slate-950/60 border-slate-800/80"
                                      }`}
                                    >
                                      {selectedPersonas.some((pId: string) => activeItem.personas.includes(pId)) && (
                                        <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-widest shadow-md">
                                          내 페르소나 추천 ⭐️
                                        </div>
                                      )}

                                      <div className="space-y-2 flex-1 text-left">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-black text-amber-400">{activeItem.name}</span>
                                          <span className="text-[9px] font-bold text-slate-500">{activeItem.desc}</span>
                                        </div>
                                        <h4 className="text-base font-black text-white flex items-center gap-2 break-keep">
                                          {match.areaName}
                                        </h4>
                                        <p className="text-sm text-slate-300 leading-relaxed font-normal break-keep">
                                          {(() => {
                                            const { elementKr, zodiac } = getZodiacFromBirthDate(birthDate);
                                            if (activeItem.id === "wealth") {
                                              return `${zodiac}이신 귀하의 사주 오행(${elementKr})과 상생하는 터입니다. ${match.theoryDesc}`;
                                            } else if (activeItem.id === "fame") {
                                              return `${userProfile?.nickname || "귀하"}님의 평판과 지위를 지탱해 주는 상승의 터입니다. ${match.theoryDesc}`;
                                            } else if (activeItem.id === "mentors") {
                                              return `부드러운 조화와 인연을 끌어당겨 대인 관계의 생기를 더하는 터입니다. ${match.theoryDesc}`;
                                            } else {
                                              return `바람을 가둬 생기를 평화롭게 유지하고 신체 안정을 지탱하는 터입니다. ${match.theoryDesc}`;
                                            }
                                          })()}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                                          <span className="text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md">
                                            ☯️ {match.grade}
                                          </span>
                                          <span className="text-xs font-bold bg-slate-900 border border-slate-800 text-amber-400 px-2.5 py-0.5 rounded-md">
                                            {match.score}점
                                          </span>
                                          <span className="text-xs font-medium text-slate-400">
                                            📍 내 위치에서 {match.distance >= 1000 ? `${(match.distance / 1000).toFixed(1)}km` : `${Math.round(match.distance)}m`}
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => {
                                          if (onSelectFortuneArea) {
                                            onSelectFortuneArea(match.lat, match.lng, match.areaName, activeItem.name);
                                          }
                                          onClose(true);
                                        }}
                                        className="shrink-0 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-amber-500/10 active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
                                      >
                                        <span>이 구역 지도로 보기 🗺️</span>
                                        <ArrowRight className="w-4 h-4 text-slate-950" />
                                      </button>
                                    </motion.div>
                                  ) : null}
                                </AnimatePresence>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* 하단 도트 인디케이터 (점점점점점) */}
                      <div className="flex items-center justify-center gap-2 py-3 mt-4">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSlideDirection(idx > currentHomeSlide ? "right" : "left");
                              setCurrentHomeSlide(idx);
                            }}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              idx === currentHomeSlide
                                ? "w-6 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                                : "w-2 bg-slate-700 hover:bg-slate-650"
                            }`}
                          />
                        ))}
                      </div>

                      {/* SNS 공유 버튼 */}
                      <div className="pt-2 mt-1 space-y-3">
                        <button
                          onClick={async () => {
                            setShowShareModal(true);
                            const dataUrl = await generateShareImage();
                            if (!dataUrl) {
                              alert("이미지 캡처에 실패했습니다. (html2canvas 오류)");
                            }
                          }}
                          className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 hover:opacity-90 active:scale-[0.98] text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2.5 text-sm select-none"
                        >
                          <Share2 className="w-4 h-4" />
                          내 풍수 결과 공유하기 ✨
                        </button>
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => onClose(step === "result")}
                            className="flex-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-3.5 px-4 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all flex items-center justify-center gap-1.5 text-xs"
                          >
                            지도로 돌아가기
                          </button>
                          <button
                            onClick={() => {
                              setStep("input");
                              setSelectedCardIdx(null);
                              setCurrentHomeSlide(0);
                              setSlideDirection(null);
                            }}
                            className="flex-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-3.5 px-4 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all flex items-center justify-center gap-1.5 text-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            다시 측정하기
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>

    {/* ===== 히든 공유 카드 (트레이스 / html2canvas용) ===== */}
    {homeFsResult && (() => {
      const allChars = [
        "/images/characters/toad_1.png","/images/characters/toad_2.png","/images/characters/toad_3.png",
        "/images/characters/toad_4.png","/images/characters/toad_5.png",
        "/images/characters/haetae_1.png","/images/characters/haetae_2.png","/images/characters/haetae_3.png",
        "/images/characters/haetae_4.png","/images/characters/haetae_5.png",
        "/images/characters/tiger_dragon_1.png","/images/characters/tiger_dragon_2.png",
        "/images/characters/tiger_dragon_3.png","/images/characters/tiger_dragon_4.png",
        "/images/characters/tiger_dragon_5.png",
      ];
      const rndChar = allChars[getDeterministicHash(birthDate + desiredFortune) % allChars.length];
      const matchedForCard = (() => {
        const spaces = getMatchedSpaces();
        const preferredItem = spaces.find(s => s.id === desiredFortune) || spaces[0];
        return preferredItem.match;
      })();
      return (
        <div
          style={{
            display: "none",
            position: "fixed",
            top: "-9999px",
            left: 0,
            width: "400px",
            minHeight: "600px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
            borderRadius: "24px",
            padding: "32px 28px",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            fontFamily: "'Noto Sans KR', sans-serif",
            overflow: "hidden",
            zIndex: -1,
          }}
        >
          {/* 배경 홀로그래픽 원 */}
          <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0) 70%)" }} />
          <div style={{ position: "absolute", bottom: "-60px", left: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0) 70%)" }} />

          {/* 사이트 로고 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "22px" }}>🏡</span>
            <span style={{ color: "#e2e8f0", fontWeight: 900, fontSize: "14px", letterSpacing: "-0.3px" }}>우리집 풍수지리 분석</span>
          </div>

          {/* 캐릭터 */}
          <img
            src={rndChar}
            alt="풍수 수호신"
            style={{ width: "120px", height: "120px", objectFit: "contain" }}
          />

          {/* 점수 원형 */}
          <div style={{
            width: "110px", height: "110px", borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(139,92,246,0.4)"
          }}>
            <span style={{ color: "#fbbf24", fontSize: "11px", fontWeight: 700, marginBottom: "2px" }}>풍수 점수</span>
            <span style={{ color: "#ffffff", fontSize: "36px", fontWeight: 900, lineHeight: 1 }}>{homeFsResult.score}</span>
            <span style={{ color: "#e2e8f0", fontSize: "11px", fontWeight: 600 }}>/ 100</span>
          </div>

          {/* 등급 + 요약 */}
          <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: "13px", marginBottom: "6px" }}>🏅 {homeFsResult.grade}</div>
            <div style={{ color: "#e2e8f0", fontSize: "12px", lineHeight: 1.6, fontWeight: 400 }}>{homeFsResult.summary.slice(0, 60)}{homeFsResult.summary.length > 60 ? "..." : ""}</div>
          </div>

          {/* 개운 처방 */}
          <div style={{ width: "100%", background: "rgba(139,92,246,0.12)", borderRadius: "16px", padding: "14px 18px", border: "1px solid rgba(139,92,246,0.25)" }}>
            <div style={{ color: "#c4b5fd", fontWeight: 700, fontSize: "11px", marginBottom: "5px" }}>✨ 개운 인테리어 처방</div>
            <div style={{ color: "white", fontWeight: 800, fontSize: "13px" }}>{homeFsResult.remedy.icon} {homeFsResult.remedy.title}</div>
          </div>

          {/* 명당 */}
          {matchedForCard && (
            <div style={{ width: "100%", background: "rgba(245,158,11,0.08)", borderRadius: "16px", padding: "14px 18px", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: "11px", marginBottom: "5px" }}>🧭 근처 풍수 명당</div>
              <div style={{ color: "white", fontWeight: 800, fontSize: "13px" }}>{matchedForCard.areaName}</div>
              <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "3px" }}>{matchedForCard.grade} · {matchedForCard.score}점</div>
            </div>
          )}

          {/* 해시태그 & URL */}
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: "10px", marginBottom: "4px" }}>#명당찾기 #풍수타로 #우리집풍수</div>
            <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: "11px" }}>🌐 gongsil.vercel.app</div>
          </div>
        </div>
      );
    })()}

    {/* ===== SNS 공유 모달 ===== */}
    <AnimatePresence>
      {showShareModal && (
        <motion.div
          key="share-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setShowShareModal(false); }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl"
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-base">내 풍수 결과 공유하기 ✨</h3>
                <p className="text-xs text-slate-400 mt-0.5">친구에게 내 집 풍수 기운을 알려봐요!</p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* 공유 이미지 프리뷰 */}
            <div className="bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center" style={{ minHeight: "180px" }}>
              {isGeneratingImage ? (
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
                  />
                  <span className="text-xs text-slate-400">카드 생성 중...</span>
                </div>
              ) : shareImageUrl ? (
                <img src={shareImageUrl} alt="공유 카드" className="w-full object-contain rounded-xl" />
              ) : null}
            </div>

            {/* SNS 버튼 그리드 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 이미지 다운로드 */}
              <button
                disabled={!shareImageUrl}
                onClick={() => {
                  if (!shareImageUrl) return;
                  const a = document.createElement("a");
                  a.href = shareImageUrl;
                  a.download = "우리집풍수결과.png";
                  a.click();
                }}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                <Download className="w-4 h-4" />
                이미지 저장
              </button>

              {/* 링크 복사 */}
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  } catch {}
                }}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white font-bold text-xs hover:bg-slate-700 active:scale-95 transition-all"
              >
                {shareCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                {shareCopied ? "복사 완료!" : "링크 복사"}
              </button>

              {/* Twitter / X */}
              <button
                onClick={() => {
                  const text = `우리 집 풍수 점수가 ${homeFsResult?.score}점이에요! 🏡✨ #명당찾기 #풍수타로 #우리집풍수`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, "_blank");
                }}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#1a1a2e] border border-slate-700 text-white font-bold text-xs hover:bg-slate-800 active:scale-95 transition-all"
              >
                <span className="font-black text-base leading-none">𝕏</span>
                X (Twitter)
              </button>

              {/* 카카오 */}
              <button
                onClick={() => {
                  const text = `우리 집 풍수 점수 ${homeFsResult?.score}점! 🏡 개운 처방도 확인해 봐~ ✨`;
                  window.open(`https://sharer.kakao.com/talk/friends/picker/link?app_key=DEMO&text=${encodeURIComponent(text)}&link=${encodeURIComponent(window.location.href)}`, "_blank");
                }}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#FEE500] text-[#3A1D1D] font-bold text-xs hover:opacity-90 active:scale-95 transition-all"
              >
                <span className="text-base leading-none">💬</span>
                카카오톡
              </button>
            </div>

            {/* 해시태그 안내 */}
            <p className="text-center text-[10px] text-slate-500 break-keep leading-relaxed">
              이미지 저장 후 인스타그램에서 스토리·피드로 공유해 보세요!<br />
              <span className="text-slate-600">#명당찾기 #풍수타로 #우리집풍수 #개운인테리어</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
