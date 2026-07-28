"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as htmlToImage from "html-to-image";
import { X, Sparkles, AlertCircle, RefreshCw, Compass, ArrowRight, Home, MapPin, Info, Check, ShieldCheck, ChevronLeft, ChevronRight, Share2, Download, Link2, Camera } from "lucide-react";
import { Vacancy } from "../data/dummyVacancies";
import { InstagramShareCard } from "./InstagramShareCard";
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
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
}

// 거리 계산 ?�틸리티 (미터 ?�위)
function calculateDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // 지�?반경 (m)
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
  if (normalized >= 22.5 && normalized < 67.5) return "북동�?;
  if (normalized >= 67.5 && normalized < 112.5) return "?�쪽";
  if (normalized >= 112.5 && normalized < 157.5) return "?�남�?;
  if (normalized >= 157.5 && normalized < 202.5) return "?�쪽";
  if (normalized >= 202.5 && normalized < 247.5) return "?�서�?;
  if (normalized >= 247.5 && normalized < 292.5) return "?�쪽";
  return "북서�?;
}

// 15�??�적 마스코트 캐릭??매핑 ?�수
function getDynamicMascot(
  score: number,
  desiredFortune: string,
  nickname: string = "?�??
): { src: string; message: string; alt: string } {
  const isToad = ["wealth", "south", "southeast", "west", "southwest"].includes(desiredFortune);
  const isTigerDragon = ["mentors", "east", "northeast", "northwest"].includes(desiredFortune);
  
  if (isToad) {
    if (score >= 88) {
      return {
        src: "/images/characters/toad_4.png",
        alt: "????�� 복두꺼비",
        message: `?�?? ??�???진짜 ?�박이?�요! ?��\n?�전 기운???�방?�방 ?�쳐?�러?? ??
      };
    } else if (score >= 83) {
      return {
        src: "/images/characters/toad_2.png",
        alt: "?�크?�는 복두꺼비",
        message: `${nickname || ""}??\n?�물 기운???�랑?�랑~ ?��\n부????준�??�셨?�요? ?��`
      };
    } else if (score >= 80) {
      return {
        src: "/images/characters/toad_5.png",
        alt: "?�자??복두꺼비",
        message: `???��? ?�에??꿀???�는 지?�예?? ?��\n가만있?�도 ?�물??차곡차곡 ?�여?? ?��`
      };
    } else {
      return {
        src: "/images/characters/toad_3.png",
        alt: "공손??복두꺼비",
        message: `?�물 기운???�짝 주춤?�고 ?�어?? ?��\n처방???�천?�면 금방 좋아�?거예??`
      };
    }
  } else if (isTigerDragon) {
    if (score >= 88) {
      return {
        src: "/images/characters/tiger_dragon_5.png",
        alt: "?�께 ?�는 백호 �?��",
        message: `백호??�?��???�께 깔깔 ?�고 ?�어?? ?��?��\n귀?�과 ?�운??줄줄??찾아??거예??`
      };
    } else if (score >= 83) {
      return {
        src: "/images/characters/tiger_dragon_2.png",
        alt: "?�께?�는 백호 �?��",
        message: `?�이 ?�이좋게 ?�께?�는 기운?�에?? ?��\n좋�? ?�연�?귀?�이 ?�연?�럽�??��???거예??`
      };
    } else if (score >= 80) {
      return {
        src: "/images/characters/tiger_dragon_4.png",
        alt: "?�께 ?�는 백호 �?��",
        message: `백호?� �?��???��???꿀???�는 ?�화로운 기운?�에?? ?��\n집안??조용?�고 ?�뜻?�질 거예??`
      };
    } else {
      return {
        src: "/images/characters/tiger_dragon_3.png",
        alt: "물고�?먹는 백호 �?��",
        message: `같이 물고�?먹으�??�이가 ?�독?��???기운?�에?? ?��\n?�보?�고 ?�누�???좋아�?거예??`
      };
    }
  } else {
    if (score >= 88) {
      return {
        src: "/images/characters/haetae_2.png",
        alt: "?�려가???�기 ?�치",
        message: `�?기운???�무 좋아???�???�나�??�려가�??�어?? ?��\n좋�? 기운??가?�해???�주 ?�든?�요~ ?��??
      };
    } else if (score >= 83) {
      return {
        src: "/images/characters/haetae_1.png",
        alt: "?�아?�는 ?�기 ?�치",
        message: `?� ?�치가 ?�든?�게 지켜드릴게?? ?��\n?�쁜 기운?� ?�씬??�??�게 ??거예?? ??`
      };
    } else if (score >= 80) {
      return {
        src: "/images/characters/haetae_4.png",
        alt: "메롱?�는 ?�기 ?�치",
        message: `메롱~! ?�� 집안 분위기�? ?�주 ?�기차요!\n?�로???�이 ?�는 즐거??공간?�에??`
      };
    } else {
      return {
        src: "/images/characters/haetae_3.png",
        alt: "고�??�는 ?�기 ?�치",
        message: `기운???�짝 ?�나가???�??같이 고�? 중이?�요~ ?��\n개운 처방?�면 금방 ?�결?�요!`
      };
    }
  }
}

// 조사(??�? ?�에???�요 ?? ?�동 변???�수
function getJosa(word: string, josa1: string, josa2: string) {
  if (!word) return josa1;
  const lastChar = word.charCodeAt(word.length - 1);
  // ?��????�닌 경우 기본�?(josa1) 반환
  if (lastChar < 0xac00 || lastChar > 0xd7a3) return josa1; 
  const hasJongseong = (lastChar - 0xac00) % 28 > 0;
  return hasJongseong ? josa1 : josa2;
}

// 15�?개운 ?�루??�??�용 ?�적 멘트 매핑 ?�수
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
      message: `???�금 처방??[${remedyTitle}]${getJosa(remedyTitle, "??, "�?)} �??�천??보세??\n�?막�??�던 ?�물길이 ?�짝 ?�릴 거예?? ?��?��`
    };
  } else if (isTigerDragon) {
    return {
      src: "/images/characters/tiger_dragon_3.png",
      alt: "처방 백호 �?��",
      message: `?�로 기운???�워주는 [${remedyTitle}] 처방?�에??\n?�반?��????�해가 ?�르�??�리고 귀?�운??차오�?거예?? ?��?��`
    };
  } else {
    return {
      src: "/images/characters/haetae_3.png",
      alt: "처방 ?�기 ?�치",
      message: `?��? ?�리???��? 처방?�인 [${remedyTitle}]${getJosa(remedyTitle, "?�에??, "?�요")}!\n집안???�쁜 ?�운??말끔???�어?�서 ?�주 ?�안?�질 거예?? ?��??
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
  onStartDiscovery,
  isMinimized,
  onMinimize,
  onRestore
}: FengShuiTarotProps) {
  const primaryPersonaId = userProfile?.personaIds?.[0] || "default";
  const personaTip = getPersonaFengShuiTip(primaryPersonaId);

  // 모드 ?�태: 'neighborhood' (?�네 명당 찾기) | 'myhome' (?�리 �??�수 분석)
  const [tarotMode, setTarotMode] = useState<"neighborhood" | "myhome">("myhome");
  
  // ?�계 ?�의: 'input' (?�보 ?�력) -> 'card' (카드 고르�? -> 'result' (결과 분석)
  const [step, setStep] = useState<"input" | "card" | "result">("input");
  
  // ?�리 �??�수지�?분석 결과 ?�라?�드 ?�태
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

  // ?�용???�력 ?�태
  const [birthDate, setBirthDate] = useState<string>("1995-06-15");
  const [spaceTheme, setSpaceTheme] = useState<string>("cafe");
  const [desiredFortune, setDesiredFortune] = useState<string>("wealth");
  
  // ?�중 ?�르?�나 ?�택 ?�태
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(["homemaker"]);
  
  // ?�르?�나 기반 무작??3�??�나리오 �??�택???�나리오
  const [scenariosPool, setScenariosPool] = useState<PersonaScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  
  // ?��?카드 ?�택 �??�니메이???�태
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [cardModifiers, setCardModifiers] = useState<number[]>([15, 0, -15]);
  const [cardThemes, setCardThemes] = useState<string[]>(["wealth", "stability", "fame"]);
  
  // 매칭 결과 ?�태
  const [matchedVacancy, setMatchedVacancy] = useState<Vacancy | null>(null);
  const [fsResult, setFsResult] = useState<FengShuiResult | null>(null);
  const [nearestVacancyDistance, setNearestVacancyDistance] = useState<number>(0);
  
  // ?�리 �??�수 모의 진단 결과
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
    matchedTheme?: string;
  } | null>(null);

  const [activeFortuneTab, setActiveFortuneTab] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const instagramCardRef = useRef<HTMLDivElement>(null);

  const generateShareImage = useCallback(async () => {
    setIsGeneratingImage(true);
    setShareImageUrl(null);
    try {
      const el = instagramCardRef.current;
      if (!el) return null;

      const dataUrl = await htmlToImage.toPng(el, {
        pixelRatio: 1, // Use 1 to prevent memory issues and cropping on mobile Safari
        backgroundColor: "#0f172a",
        width: 1080,
        height: 1920,
        style: {
          transform: 'translate(0, 0)',
        }
      });

      setShareImageUrl(dataUrl);
      return dataUrl;
    } catch (e: any) {
      alert(`캡처 �??�세 ?�류:\n${e.name || ''} : ${e.message || e.toString()}`);
      console.error("?��?지 ?�성 ?�류", e);
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  }, [homeFsResult]);
  const activePersonaIds = selectedPersonas.length > 0 ? selectedPersonas : ["default"];
  const personaTips = activePersonaIds.map(id => getPersonaFengShuiTip(id));

  const getMatchedSpaces = () => {
    const categories = [
      { id: "wealth", name: "?�물???��", desc: "?�업 번창 �?부�?축적?�는 명당", personas: ["worker"] },
      { id: "fame", name: "?�공 �??�업??⭐️", desc: "?�진, ?�격 �?명예�??�이??명당", personas: ["student"] },
      { id: "mentors", name: "?�애 �?귀?�운 ?��", desc: "?�중???�연 �?조력?��? 깃드??명당", personas: ["solo"] },
      { id: "stability", name: "?�정 �?건강???��", desc: "가�??�목 �??�신 ?�복??주는 명당", personas: ["homemaker", "parenting", "pet", "senior"] },
    ];

    const { zodiacYear } = getZodiacFromBirthDate(birthDate);

    return categories.map(cat => {
      const userLat = userProfile?.home?.lat || mapCenter.lat;
      const userLng = userProfile?.home?.lng || mapCenter.lng;
      const userNeighborhood = userProfile?.home?.neighborhood || "?�리 ?�네";

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
      let dirName = "?�남�?;
      let suffix = "";
      let grade = "";
      let theoryDesc = "";

      if (cat.id === "wealth") {
        baseAngle = waterAngle;
        dirName = getDirNameFromAngle(baseAngle);
        const waterName = geo.water.split(" �?")[0].split("(")[0];
        suffix = `${waterName} ?�역 ?�운 명당`;
        grade = "금�????�帶�? ?�물 길�?";
        theoryDesc = `?�증???�치 주�???주요 ?�맥/?�로??[${geo.water.split(" �?")[0]}]가 ?�치??${dirName}?� ?�물??기운???�러?�고 모이??방위?�니?? ??�????�물???�하�? ??구역?� ?�로 and 지천이 ?�발???�감???�며 ?�물??머무르는 격식??보조?�니??`;
      } else if (cat.id === "fame") {
        baseAngle = mountainAngle;
        dirName = getDirNameFromAngle(baseAngle);
        const mountainName = geo.mountain.split(" 주맥")[0].split(" 지�?)[0].split("(")[0];
        suffix = `${mountainName} 지�??�공 구역`;
        grade = "?�룡?�주(?�龍??��) ?�공 구역";
        theoryDesc = `?�든?�게 기운??받쳐주는 [${geo.mountain}]???�치??${dirName}?� 명예?� 권위�??�징?�는 방위?�니?? ??�????�기가 ?�구치는 기맥???�라 강렬???�기�??�수?�여 ?�회???�취?� 진급???�어?�깁?�다.`;
      } else if (cat.id === "mentors") {
        baseAngle = (mountainAngle + 90) % 360;
        dirName = getDirNameFromAngle(baseAngle);
        suffix = "?�덕 ?�생 귀??구역";
        grade = "?�풍?�수(?�風得水) 귀??구역";
        theoryDesc = `[${geo.mountain.split("(")[0]}] 지맥의 측면???�위?�며 기운??보존?�는 ${dirName}?� ?��? ?�고 지지??주는 귀?�과 ?�연??가?�하???�치?�니?? ?�찬 바람???�르�??�기�?머금?� '?�풍?�수(?�風得水)' 지?��? ?�적 조력???�너지�??�성?�합?�다.`;
      } else {
        baseAngle = (mountainAngle + 45) % 360;
        dirName = getDirNameFromAngle(baseAngle);
        suffix = "배산?�수 ?�락 ?�온 구역";
        grade = "배산?�수(?�山?�水) 건강 명당";
        theoryDesc = `[${geo.mountain.split("(")[0]}]???�늑???�이??바람??막아주는 ${dirName}?� ?�지???�정???�하??방위?�니?? ?��? ?�든??지켜�?�??�이 막힘?�이 ?�여 ?�양??조화가 ?�벽??배산?�수??기운???�해 ?�신??고요???�스??줍니??`;
      }

      // ?�시 ?�드�??�용???�당 분면 ?��??�서 ?�연?�럽�?-15??~ +15??보정(Jittering)
      const angleOffset = -15 + (seed % 31);
      const angle = (baseAngle + angleOffset) * (Math.PI / 180);

      const latOffset = (distance * Math.sin(angle)) / 111000;
      const lngOffset = (distance * Math.cos(angle)) / (111000 * Math.cos(userLat * Math.PI / 180));
      
      const targetLat = userLat + latOffset;
      const targetLng = userLng + lngOffset;

      const areaName = `${userNeighborhood} ${dirName} ${Math.round(distance)}m 부�?${suffix}`;
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

  // 모달???�릴 ???�용?�의 ?�르?�나?�을 ?�어?�???�팅
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setSelectedCardIdx(null);
      setMatchedVacancy(null);
      setFsResult(null);
      setHomeFsResult(null);
      setCurrentHomeSlide(0);
      setSlideDirection(null);
      setDesiredFortune("south"); // 기본 방향 초기??
      
      const savedPersonas = userProfile?.personaIds?.filter((id: string) => 
        ["homemaker", "worker", "parenting", "student", "solo", "pet", "senior"].includes(id)
      ) || [];
      
      if (savedPersonas.length > 0) {
        setSelectedPersonas(savedPersonas);
      } else {
        setSelectedPersonas(["homemaker"]); // 기본�?
      }
    }
  }, [isOpen, userProfile]);

  // ?�르?�나가 변경될 ?�마??3개의 ?�나리오�?무작?�로 추출?�여 ?�택지 구성
  useEffect(() => {
    if (!isOpen) return;
    const rawScenarios = getScenariosForPersonas(selectedPersonas);
    
    if (rawScenarios.length > 0) {
      // 무작???�플 ??최�? 3�??�택
      const shuffled = [...rawScenarios].sort(() => 0.5 - Math.random());
      const sampled = shuffled.slice(0, 3);
      setScenariosPool(sampled);
      
      // �?번째 ?�나리오�?기본 ?�택 처리
      setSelectedScenarioId(sampled[0].id);
    } else {
      setScenariosPool([]);
      setSelectedScenarioId("");
    }
  }, [selectedPersonas, isOpen]);

  const handleStartTarot = () => {
    // 3?�의 카드??각각 ?��?+15), ?�길(0), ?�길(-15) 모디?�이?��? 무작?�로 부??
    const shuffledModifiers = [15, 0, -15].sort(() => 0.5 - Math.random());
    setCardModifiers(shuffledModifiers);
    
    // 3?�의 카드??각각 ?�른 기운(?�물, 명예, ?�정, 귀??�?3�? 부??
    const shuffledThemes = ["wealth", "fame", "stability", "mentors"].sort(() => 0.5 - Math.random()).slice(0, 3);
    setCardThemes(shuffledThemes);
    
    setStep("card");
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={onRestore}
        className="fixed bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-amber-400 font-black px-6 py-3 rounded-full border border-amber-500/50 shadow-[0_10px_30px_rgba(245,158,11,0.2)] flex items-center gap-2 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
      >
        <Compass className="w-5 h-5 animate-spin-slow" />
        ?�수 결과 ?�시보기
      </motion.button>
    );
  }


  // 카드 ?�택 ?�료 ??결과 분석 처리
  const handlePickCard = (cardIdx: number) => {
    setSelectedCardIdx(cardIdx);

    const { zodiacYear } = getZodiacFromBirthDate(birthDate);

    if (tarotMode === "neighborhood") {
      // 1. ?�네 명당 찾기 모드
      const available = vacancies.filter(v => v.status === "available" || !v.status);
      
      if (available.length === 0) {
        setMatchedVacancy(null);
        setFsResult(null);
        setTimeout(() => setStep("result"), 2500);
        return;
      }

      // ?�택???�나리오??기본 ?�보 기반?�로 최고 ?�수 공실 매칭
      const targetScenario = scenariosPool.find(s => s.id === selectedScenarioId);
      const matchedTheme = targetScenario ? targetScenario.fortuneType : desiredFortune;

      let bestVacancy = available[0];
      let bestResult = analyzeFengShui(bestVacancy, zodiacYear, spaceTheme, matchedTheme);

      for (let i = 1; i < available.length; i++) {
        const v = available[i];
        const res = analyzeFengShui(v, zodiacYear, spaceTheme, matchedTheme);
        
        // ?�기 공실??경우 가?�점 곱해 관???�도
        let scoreMultiplier = 1.0;
        if (v.vacancyPeriod && (v.vacancyPeriod.includes("6개월") || v.vacancyPeriod.includes("1??) || v.vacancyPeriod.includes("?�래"))) {
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
      
      // 카드 모디?�이?��? ?�용?�여 ?�수 반영 (최�? 98???�한)
      const finalNeighborhoodScore = Math.min(98, Math.max(40, bestResult.score + cardModifiers[cardIdx]));
      setFsResult({ ...bestResult, score: finalNeighborhoodScore });

    } else {
      // 2. ?�리 �??�수 모의 분석 모드
      const DIRECTIONS_MAP: Record<string, string> = {
        south: "?�향 (?�향)",
        southeast: "?�동??(?�향)",
        east: "?�향 (묘향)",
        northeast: "북동??(간향)",
        north: "북향 (?�향)",
        northwest: "북서??(건향)",
        west: "?�향 (?�향)",
        southwest: "?�서??(곤향)"
      };
      const selectedDir = DIRECTIONS_MAP[desiredFortune] || "?�향 (?�향)";
      
      // ?�제 좌표 �??�정???�보 ?�동
      const userLat = userProfile?.home?.lat || mapCenter.lat;
      const userLng = userProfile?.home?.lng || mapCenter.lng;
      const userNeighborhood = userProfile?.home?.neighborhood || "?�리 ?�네";

      const geo = getNearbyGeoFeatures(userLat, userLng, userNeighborhood);

      // 방향 각도 매핑 �?배산?�수 조화 계산
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
        alignmentAnalysis = `?�재 거주?�시??집의 방향(${selectedDir})???�네 주요 물길/?�로 ?�환??[${geo.water.split(" �?")[0]}] 방향�????�우?��?�??�산???�락??지맥을 ?��????�상?�인 '배산?�수 ?�응?? 배치?�니?? ?�물�?긍정?�인 ?�기가 가???��?�?차곡차곡 ?�입?�니??`;
      } else if (diff >= 135) {
        alignmentBonus = -3;
        alignmentAnalysis = `?�재 집의 방향(${selectedDir})???�든???�산맥을 ?�면?�로 마주 보고 물길???��???'배수�??�水??' 구조??가깝습?�다. ?�리?�인 보호감이 강해 건강 관리에 ?��???주나 ?�물??머무??기류가 ?�해�????�으므�? ?��? ???�드차임?�나 ?�물 비보 처방???�해 기운???�화??주는 것이 좋습?�다.`;
      } else {
        alignmentBonus = 2;
        alignmentAnalysis = `?�재 집의 방향(${selectedDir})???�맥�?물길??축에??비껴??비스?�히 ?�르??기류�??�으�?마주?�는 배치?�니?? ?��? 바람??곧바�?부?�치지 ?�아 ?�계???�내 집안 기운???�온?�고 ?�화�?�� ?��??�는 조화로운 구조?�니??`;
      }

      // 카드 모디?�이?��? ?�용?�여 ?�수가 명확?�게(?��? ?�길, ?�길) ?�라지?�록 처리
      const finalScore = Math.min(98, Math.max(40, baseScore + alignmentBonus + cardModifiers[cardIdx]));

      const theme = cardThemes[cardIdx];
      let resData;
      if (theme === "wealth") {
        resData = {
          grade: "금계?��????�물명당",
          summary: "?��? ?�음�?매연???�돈??중심???�치?�여 ??�� ?�을 ?�듯 ?�화?�고 ?�전?�게 ?�기�?가?�며 ?�물??축적?�는 ?�입?�다.",
          pros: ["?�하지 ?��? ?�물 ?�식???�어?�니??", "?�업?�과 ?�자?�이 밝아집니??"],
          cons: ["기의 ?�름???�체?�어 ?�동?�이 ?�어�????�으??주기?�인 ?�기가 ?�요?�니??"],
          remedy: { title: "?�금???�테리어 처방", description: "?�쪽 벽면???��? ?�바?�기 ?�자??골드???�품???�식?�여 ?�체??기운??깨고 ?�물?�을 모으?�요.", icon: "?��" }
        };
      } else if (theme === "fame") {
        resData = {
          grade: "?�풍?�수??명예명당",
          summary: "바람 ?�리가 ?�그?�들�?빛이 모이???�만??경사지???�치?�여, 거주?�의 ?�름???�리 ?�려지�?명예가 ?�아지???�입?�다.",
          pros: ["?�회???�정�?진급?�이 ?�게 ?�승?�니??", "?�험?�나 중요??발표?�서 좋�? ?�과�??�니??"],
          cons: ["기�? ?�로 ?�기 ?�워 감정 기복???�길 ???�으??묵직??가구�? 배치?�세??"],
          remedy: { title: "붉�????�인???�품", description: "거실 ?�쪽?�나 ?�재??붉�???조명?�나 쿠션??배치?�여 묵직??가구�? ?�께 명예??불의 기운)??균형??맞추?�요.", icon: "?��" }
        };
      } else if (theme === "stability") {
        resData = {
          grade: "배산?�수??건강명당",
          summary: "�??�로???�탄??지맥이 기운??가?�고 ?�으로는 ???�여 ?�기가 ?�수??거주?�수�?건강???�게 증진?�는 ?�수 명당?�니??",
          pros: ["가�?구성?�들??기운??모이�?만성 ?�로가 ?�어집니??", "머리가 ??�� 개운?�고 ?�면??질이 극�??�됩?�다."],
          cons: ["방이 조금 건조?��?�??�우???�내 가?�이???�경 ?�배???�경 ?�세??"],
          remedy: { title: "?�근 ???�분 배치", description: "건조?�을 막기 ?�해 ?��??�서 거실�??�어가??복도???�근 ???�물???�어 ?�분???�하�??�쁜 기�? ?�화?�세??", icon: "?��" }
        };
      } else {
        resData = {
          grade: "비룡?�운??귀?�명??,
          summary: "주�? ?�로망과 ?�근?�이 좋아 ?�람�?기운???�임?�이 교류?�며, ?��????�연�?귀?�을 맺어주는 ?�통???�입?�다.",
          pros: ["?�덕??많아??주�? ?�웃�?귀?�의 ?��???받습?�다.", "막혔???�?��?계나 계약 문제가 ?�월?�게 ?�립니??"],
          cons: ["?��? ?�음?�나 ??? 기운 교류???�게 ?�로?�질 ???�으므�?공간 분리가 ?�요?�니??"],
          remedy: { title: "맑�? ?�드차임 처방", description: "?��??�나 창�????�동 종이???�경???�아 출입???�마??맑�? ?�리�??�어 ?�한 기운??거르�?좋�? ?�연�?부르세??", icon: "?��" }
        };
      }
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
        },
        matchedTheme: cardThemes[cardIdx]
      });
    }

    // ?�비로운 ?�집�??�레??
    setTimeout(() => {
      setStep("result");
    }, 2500);
  };

  // SVG ?�이??차트 ?�이??변??
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

  // ?�이??가?�드 ?�각???�성
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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden text-slate-100 my-8 md:my-16"
        >
          {/* ?�식???�온 그라?�언??백그?�운??*/}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* ?�단 ?�더 */}
          <div className="flex items-center justify-between p-6 pt-8 md:p-8 border-b border-slate-800 relative z-10">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                  ?�리 �??�수지�?분석 ?��
                </h2>
                <p className="text-[11px] font-bold text-slate-400">?�의 ?�행�?주거 공간??방향???�루??기운 진단</p>
              </div>
            </div>
            <div className="flex gap-2">

              <button
                onClick={() => onClose(step === "result")}
                className="w-10 h-10 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 relative z-10" ref={contentRef}>
            {/* [1?�계] ?�보 ?�력 */}
            {step === "input" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {tarotMode === "neighborhood" ? (
                  /* 1) ?�네 공실 매칭 모드 ?�력 ??*/
                  <div className="space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4 text-left">
                      <Compass className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-spin-slow" />
                      <div>
                        <h4 className="text-sm font-black text-amber-400">?�웃?�의 ?�상�??�수??만남</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1 font-medium">
                          귀?�의 ?�생 ?�년(?�행)�??�망?�는 창업/공간 ?�마�?분석?�여, ?�네 마커 �??�수?�적?�로 부?� ?�정??가?�다�?<strong>?�기 공실</strong> 명당???�로점 ?�태�?찾아?�립?�다.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* ?�년?�일 ?�력 */}
                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">?�어???�년?�일</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* 관???�마 */}
                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">관?�있??공간 ?�마</label>
                        <select
                          value={spaceTheme}
                          onChange={(e) => setSpaceTheme(e.target.value)}
                          className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all"
                        >
                          <option value="cafe" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�박을 꿈꾸???�쁜 카페 ????/option>
                          <option value="flower" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�그?�고 조용??꽃집 / 공방 ?��</option>
                          <option value="restaurant" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�님???�이지 ?�는 맛있???�당 ?��</option>
                          <option value="fashion" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>감각?�이�??�련???�류 ?�집???��</option>
                          <option value="office" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>집중?????�고 ?�락???�무???��</option>
                          <option value="education" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�구?�을 불태???�원 / ?�재 ?��</option>
                          <option value="clinic" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�람??치유?�는 ?�의??/ ?�국 ?��</option>
                          <option value="pub" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�이 ?�는 ?�자카야 / 주점 ?��</option>
                        </select>
                      </div>
                    </div>

                    {/* ?�르?�나 맞춤???�나리오 카드 매칭 */}
                    <div className="space-y-3 pt-2 text-left">
                      <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1">
                        ?��? 고�??�는 ?�?�적 질문 <span className="text-[10px] text-amber-500 font-bold">(?�르?�나 ?�동)</span>
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
                            <span className="text-base mt-0.5">?��</span>
                            <div>
                              <p className="text-xs font-black text-white">{s.question}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">
                                목표 기운: <span className="text-amber-400 font-black">{s.fortuneType === "wealth" ? "?�물???��" : s.fortuneType === "stability" ? "?�정???��" : s.fortuneType === "fame" ? "명예??⭐️" : "귀?�운 ?��"}</span>
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2) ?�리 �??�수 모의 분석 ?�력 ??*/
                  <div className="space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4 text-left">
                      <Home className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-amber-400">?�의 ?�재 주거공간 분석</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1 font-medium">
                          귀?��? 거주?�시??곳의 ?�?�적??방향�??�년??조합?�여, ?�재 집안??깃드???�물 �?건강 ?�너지�?계산?�고 기운??북돋?�는 비보(Remedy) ?�테리어 ?�을 처방???�립?�다.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">?�어???�년?�일</label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all [color-scheme:dark]"
                        />
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="text-[12px] font-black text-slate-400 tracking-wider uppercase">�?거실 베�???기�?)??방향</label>
                        <select
                          value={desiredFortune}
                          onChange={(e) => setDesiredFortune(e.target.value)}
                          className="w-full bg-slate-850/80 border-2 border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:outline-none rounded-2xl px-4 py-3 text-white font-bold text-sm transition-all"
                        >
                          <option value="south" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�뜻?�고 빛이 가??�??�향 (?�向) ?��?/option>
                          <option value="southeast" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�기?� 번영???�?�는 ?�동??(?�東?? ?��</option>
                          <option value="east" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�로??기운�??�작???�향 (?�向) ?��</option>
                          <option value="northeast" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>변?��? ?�약??북동??(?�東?? ?�️</option>
                          <option value="north" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>차분?�고 깊�? ?�색??북향 (?�向) ?�️</option>
                          <option value="northwest" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>결실�?권위??북서??(?��??? ?��</option>
                          <option value="west" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�을???�기?� ?�요로운 ?�향 (西向) ?��</option>
                          <option value="southwest" className="bg-slate-900 text-white" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>?�화?�과 ?�정???�서??(?��??? ?��</option>
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
                    ?�괘�??�끌?�낼 ?��?카드 보러 가�?
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                  
                  {/* ?�� 개인?�보 미�????�내 메시지 */}
                  <p className="text-[10px] text-center text-slate-500 font-bold mt-4 flex items-center justify-center gap-1">
                    <span>?��</span> 
                    ?�력?�신 ?�년?�일 ?�의 ?�보???�수지�?계산 �?카드 궁합 매칭?�만 ?�회?�으�??�용?�며, ?�버??별도�??��? ?�?�되지 ?�습?�다.
                  </p>
                </div>
              </motion.div>
            )}

            {/* [2?�계] ?��?카드 고르�?*/}
            {step === "card" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8 py-4">
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-black text-white">?�지???�괘�??�끌 카드�?고르?�요</h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-2 leading-relaxed">
                    마음??가?�앉?�고 ?�직 직�?만을 ?�라<br />
                    ?�래 3?�의 ?�수 카드 �?br />
                    ?�신??기운???�변?�는 ?????�을 ?�치?�세??
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-lg mx-auto py-4">
                  {[0, 1, 2].map((idx) => {
                    const isPicked = selectedCardIdx === idx;
                    const isAnyPicked = selectedCardIdx !== null;
                    
                    return (
                      <motion.div
                        key={idx}
                        className={`relative w-36 h-56 rounded-2xl cursor-pointer border-2 transition-all [transform-style:preserve-3d] ${
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
                        {/* 카드 ?�면 */}
                        <div className="absolute inset-0 p-4 flex flex-col items-center justify-between bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-900 rounded-2xl [backface-visibility:hidden]">
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

                        {/* 카드 ?�면 ?�집??로딩 �?결과 */}
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                          <div className="absolute inset-2 border border-amber-400/30 rounded-xl" />
                          {isPicked ? (
                            <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in gap-2">
                               {(() => {
                                 const matchedTheme = tarotMode === "neighborhood" 
                                   ? (scenariosPool.find(s => s.id === selectedScenarioId)?.fortuneType || desiredFortune) 
                                   : cardThemes[idx];
                                 
                                 // ?�택??카드??모디?�이?��? ?�해 ?�수 ?�추
                                 const modifier = cardModifiers[idx];
                                 const cardScore = 80 + modifier; // 95(?��?, 80(?�길), 65(?�길)
                                 const prefix = modifier > 0 ? "?��?大吉)" : modifier < 0 ? "?�길(小吉)" : "무난(�?";
                                 
                                 const mascot = getDynamicMascot(cardScore, matchedTheme, userProfile?.nickname);
                                 const fortuneName = matchedTheme === "wealth" ? "?�물???��" : matchedTheme === "stability" ? "?�정???��" : matchedTheme === "fame" ? "명예??⭐️" : "귀?�운 ?��";
                                 return (
                                   <>
                                     <img src={mascot.src} alt="Tarot Result" className="w-20 h-20 object-contain drop-shadow-[0_5px_15px_rgba(245,158,11,0.5)]" />
                                     <div className="text-center mt-2">
                                       <span className="text-[10px] text-amber-500 font-bold block mb-0.5">?�택??기운 카드</span>
                                       <span className="text-sm font-black text-white">{prefix} {fortuneName}</span>
                                     </div>
                                   </>
                                 );
                               })()}
                            </div>
                          ) : (
                            <>
                              <Compass className="w-10 h-10 text-slate-700 animate-spin-slow" />
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* [3?�계] 결과 출력 */}
            {step === "result" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* 1) ?�네 공실 매칭 모드 결과 */}
                {tarotMode === "neighborhood" && (
                  <>
                    {!matchedVacancy || !fsResult ? (
                      <div className="text-center py-12 space-y-4">
                        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
                        <h3 className="text-lg font-black text-white">매칭 가?�한 ?��?大吉) ?��?가 ?�습?�다</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-bold">
                          ?�재 조사???�치 주�???가?�한 공실 ?��?가 부족하거나 ?�주?� 맞는 ?��? 비어?��? ?�습?�다. 지?�의 범위�??��? 명당 찾기�??�도??보세??
                        </p>
                        <button
                          onClick={() => setStep("input")}
                          className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-2xl transition-all text-xs"
                        >
                          조건 ?�설?�하�?
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* ?�더 진단??카드 */}
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
                                ??�� {fsResult.zodiac} 궁합
                              </span>
                              <span className="text-xs font-bold bg-slate-850 text-slate-300 px-2.5 py-0.5 rounded-full">
                                ?�� {fsResult.personalElement}????
                              </span>
                              {matchedVacancy.vacancyPeriod && (
                                <span className="text-xs font-black bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 py-0.5 rounded-full animate-pulse">
                                  ??{matchedVacancy.vacancyPeriod} 방치??
                                </span>
                              )}
                              <span className="text-xs text-slate-400 font-medium">
                                ?���????�치?�서 {nearestVacancyDistance >= 1000 ? `${(nearestVacancyDistance / 1000).toFixed(1)}km` : `${nearestVacancyDistance}m`}
                              </span>
                            </div>
                          </div>

                          {/* ?�수 뱃�? */}
                          <div className="shrink-0 flex flex-col items-center justify-center bg-slate-900 border-2 border-amber-500/20 w-32 h-32 rounded-3xl shadow-lg relative">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">?�수 ?�수</div>
                            <div className="text-4xl font-black text-amber-400 tracking-tighter mt-1">
                              {fsResult.score}<span className="text-xs text-slate-400">??/span>
                            </div>
                            <div className="text-[9px] font-black text-amber-500 border border-amber-500/30 rounded-full px-2.5 py-0.5 mt-2 bg-amber-500/5">
                              {fsResult.entranceDirection}
                            </div>
                          </div>
                        </div>

                        {/* 5?� 지??�?5�?차트 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">?��</span>
                                <h4 className="text-base font-black text-amber-400">{fsResult.grade}</h4>
                              </div>
                              <p className="text-sm font-medium text-slate-300 leading-relaxed mt-3">{fsResult.summary}</p>
                              
                              <div className="mt-4 space-y-2">
                                <div className="flex items-start gap-2 text-xs font-medium text-slate-300">
                                  <span className="text-emerald-500 font-bold mt-0.5">??/span>
                                  <span>{fsResult.pros[0]}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs font-medium text-slate-300">
                                  <span className="text-emerald-500 font-bold mt-0.5">??/span>
                                  <span>{fsResult.pros[1]}</span>
                                </div>
                                {fsResult.cons.length > 0 && (
                                  <div className="flex items-start gap-2 text-xs font-medium text-rose-400 border-t border-slate-850 pt-2.5 mt-2.5">
                                    <span className="text-rose-500 font-bold mt-0.5">?�️</span>
                                    <span>{fsResult.cons[0]}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-850 text-[10px] text-slate-400 font-bold mt-4">
                              ?�� ??명당 ?�는 ?�기 공실 ?�태�?머물�??�어 ?�용?�의 기발???�표 �??�로???�픈 ?�상???�실???�요�??�고 ?�습?�다.
                            </div>
                          </div>

                          {/* 5각형 ?�행 ?�이??차트 */}
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
                              
                              {/* 5�?가?�드 ?�인 */}
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
                                  { text: "?�� ?�물??, offset: [0, -10] },
                                  { text: "?�� ?�정??, offset: [15, 0] },
                                  { text: "�?명예??, offset: [10, 10] },
                                  { text: "?�� 귀?�운", offset: [-10, 10] },
                                  { text: "??�� 궁합??, offset: [-15, 0] }
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

                        {/* 처방??*/}
                        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-400/20 rounded-[2.5rem] p-6 relative overflow-hidden">
                          <div className="flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl shrink-0 shadow-lg animate-pulse">
                              {fsResult.remedy.icon}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                                개운 보완 처방??(裨補 ?�方)
                              </span>
                              <h4 className="text-sm font-black text-white mt-1.5">{fsResult.remedy.title}</h4>
                              <p className="text-xs font-medium text-slate-300 leading-relaxed mt-1.5">{fsResult.remedy.description}</p>
                            </div>
                          </div>
                        </div>

                        {/* ?�단 버튼 */}
                        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-800">
                          <button
                            onClick={() => {
                              onSelectVacancy(matchedVacancy);
                              if (onMinimize) onMinimize();
                              else onClose();
                            }}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-amber-500/15 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            ??명당 ??지?�에???�금 마커�??�인?�기 ?���?
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
                            ?�시 매칭?�기
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 2) ?�리 �??�수 모의 분석 결과 */}
                {tarotMode === "myhome" && homeFsResult && (() => {
                  const matchedSpaces = getMatchedSpaces();
                  const activeItem = matchedSpaces.find(item => item.id === activeFortuneTab) || matchedSpaces[0];
                  const match = activeItem.match;

                  return (
                    <div className="space-y-6">
                      {/* ?�단 ?�라?�드 ?�이지 ?�보 (1/5) */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-400">
                          {currentHomeSlide === 0 && "?�� 종합 진단??}
                          {currentHomeSlide === 1 && "?�️ 지?��?�?결합 분석"}
                          {currentHomeSlide === 2 && "?�️ 주거 격식 ?�급"}
                          {currentHomeSlide === 3 && "?�� 개운 ?�테리어 ?�루??}
                          {currentHomeSlide === 4 && "?�� ?�운??명당 찾기"}
                        </span>
                        <div className="px-3 py-1 bg-slate-800 border border-slate-700/60 rounded-full text-xs font-bold text-slate-300">
                          {currentHomeSlide + 1} / 5
                        </div>
                      </div>

                      {/* ?�라?�드 뷰포???�역 */}
                      <div className="relative overflow-hidden min-h-[460px] flex items-stretch md:px-8">
                        {/* PC??좌측 ?�살??버튼 */}
                        <button
                          onClick={handlePrevHomeSlide}
                          disabled={currentHomeSlide === 0}
                          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-950/60 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all ${
                            currentHomeSlide === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* PC???�측 ?�살??버튼 */}
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
                              /* ?�� ?�리 �?주거 ?�수 진단??(?�수 ?�함) */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <Home size={20} />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">?�리 �?주거 ?�수 진단??/h4>
                                    <p className="text-xs text-slate-400 font-medium">?�택 방향: <span className="text-amber-400/90 font-semibold">{homeFsResult.entranceDirection}</span> (거실 창문 기�?)</p>
                                  </div>
                                </div>

                                {/* 캐릭??말풍???�드�?*/}
                                {(() => {
                                  const finalTheme = homeFsResult.matchedTheme || desiredFortune;
                                  const mascot = getDynamicMascot(homeFsResult.score, finalTheme, userProfile?.nickname);
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
                                        <span>
                                          {mascot.message.split('\n').map((line, i, arr) => (
                                            <span key={i}>
                                              {line}
                                              {i !== arr.length - 1 && <br />}
                                            </span>
                                          ))}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-5 flex items-center justify-between text-left shadow-inner">
                                  <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">진단 종합 ?�수</span>
                                    <p className="text-lg md:text-xl font-bold text-amber-400 break-keep">
                                      주거 ?�수 <span className="text-2xl font-black inline-block whitespace-nowrap">{homeFsResult.score}??/span>
                                    </p>
                                  </div>
                                  <div className="px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/25 rounded-xl text-xs font-bold text-purple-400 tracking-wide break-keep">
                                    기운 개운 ?��??�이??
                                  </div>
                                </div>
                              </div>
                            )}

                            {currentHomeSlide === 1 && homeFsResult.geo && (
                              /* ?�️ ?�리 ?�네 지?��?�?배산?�수) 결합 분석 카드 */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-4 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <Compass size={20} className="animate-spin-slow" />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">?�리 ?�네 지?��?�?결합 분석</h4>
                                    <p className="text-xs text-slate-400 font-medium">?�증 ?�치???�맥 지맥과 ?��? ?�역 고려 진단</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1 text-left">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                      ?�️ 배산 (?�山)
                                    </span>
                                    <p className="text-xs font-semibold text-slate-200 break-keep">{homeFsResult.geo.mountain}</p>
                                  </div>
                                  <div className="p-3 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1 text-left">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                      ?�� ?�수 (?�水)
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
                                    <span className="text-amber-500 shrink-0 mt-0.5 select-none text-sm">??��</span>
                                    <p>
                                      <strong className="text-amber-400 font-bold mr-1">방향 궁합 분석:</strong> 
                                      {homeFsResult.geo.alignmentAnalysis}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {currentHomeSlide === 2 && (
                              /* ?�️ 격식 ?�급 카드 */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-4 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <ShieldCheck size={20} />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">?�리 �?주거 격식 ?�급 ?�정</h4>
                                    <p className="text-xs text-slate-400 font-medium">?�년?�일�?가??방향??종합??격식 ?�급</p>
                                  </div>
                                </div>

                                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 flex items-center justify-between text-left shadow-inner">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">주거 격식 ?�급</span>
                                    <p className="text-sm md:text-base font-bold text-amber-400 break-keep">{homeFsResult.grade}</p>
                                  </div>
                                  <div className="px-3.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs font-bold text-amber-400">
                                    ?��?(大吉)
                                  </div>
                                </div>

                                {/* 종합 총평 ?�약�?처리 */}
                                <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl text-xs md:text-sm text-slate-300 text-left break-keep leading-relaxed font-medium">
                                  <strong>?�� 종합 총평:</strong> {homeFsResult.summary}
                                </div>
                                
                                {/* ?�르?�나 ?�계 분석 ?�용 */}
                                <div className="space-y-3">
                                  {personaTips.map((tip, idx) => (
                                    <div key={idx} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-left space-y-1.5 shadow-inner">
                                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs break-keep">
                                        <span className="text-sm">?��</span>
                                        <span>{tip.personaName} 맞춤??주택 개운 비법</span>
                                      </div>
                                      <p className="text-xs font-normal text-slate-355 leading-relaxed font-sans break-keep">
                                        {tip.personaName}?�의 ?�주?� 기운??극�??�하?�면 거실 기�? <span className="text-amber-400 font-semibold">{homeFsResult.entranceDirection}</span> 보완???�심?�니?? 
                                        ?�운???�동 &lsquo;<span className="text-amber-400 font-semibold">{tip.action}</span>&rsquo;??직접 ?�천?�고, 
                                        ?�운???�료 &lsquo;<span className="text-amber-400 font-semibold">{tip.food}</span>&rsquo;�???��?�여 ?�너지�??�어?�이?�요.
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <div className="space-y-2.5 border-t border-slate-850/80 pt-3 text-left">
                                  <div className="flex items-start gap-2 text-xs font-normal text-slate-350 break-keep">
                                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">??/span>
                                    <span>{homeFsResult.pros[0]}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-xs font-normal text-slate-350 break-keep">
                                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">??/span>
                                    <span>{homeFsResult.pros[1]}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-xs font-normal text-rose-450 break-keep">
                                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">?�️</span>
                                    <span>{homeFsResult.cons[0]}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {currentHomeSlide === 3 && (
                              /* 처방??카드 */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
                                    <Sparkles size={20} />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">주거 개운 ?�테리어 ?�루??/h4>
                                    <p className="text-xs text-slate-400 font-medium">부족한 주거 ?�너지 보완 비보(裨補) 처방</p>
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

                                {/* 캐릭??마법 처방 ?�출 */}
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
                                        <span>
                                          {mascot.message.split('\n').map((line, i, arr) => (
                                            <span key={i}>
                                              {line}
                                              {i !== arr.length - 1 && <br />}
                                            </span>
                                          ))}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {currentHomeSlide === 4 && (
                              /* ?�리 ?�네 ?�에�??��????�는 공간 매칭 카드 (2.5km ?�내 공실 추천 & 지??마커 ?�시 ?�출) */
                              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-[2rem] p-6 md:p-8 space-y-5 shadow-2xl h-full flex flex-col justify-between select-text">
                                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/60">
                                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <Compass size={20} className="animate-spin-slow" />
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <h4 className="text-base md:text-lg font-bold text-white tracking-tight">?�리 ?�네 ?�운??명당 찾기</h4>
                                    <p className="text-xs text-slate-400 font-medium">?�주???�른 2.5km ?�내??맞춤??길운 ?�소 추천</p>
                                  </div>
                                </div>

                                {/* ?�명 가?�드 ?�스??박스 */}
                                <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-xl text-[11px] md:text-xs text-slate-300 text-left break-keep leading-relaxed font-medium">
                                  ?�� <strong>?�리 ?�네 4?� 명당 ?��?:</strong> 반경 2.5km ?�에??{userProfile?.nickname || "?�??}?�의 ?�행 �??�르?�나??부?�하??공간???�선?�습?�다. ?�래 ??�� ?�러 �?명당???�세 ?�명�??�치�?지?�로 ?�인??보세??
                                </div>

                                {/* ??버튼??*/}
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
                                          <span className="absolute top-1 right-1.5 text-[8px] text-amber-400">??/span>
                                        )}
                                        <span>{item.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* ?�세 ?�명 �?지?�로 보기 */}
                                <AnimatePresence mode="wait">
                                  {activeFortuneTab === "" ? (
                                    /* ???�택 ???�내 �??�태 */
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
                                            alt="명당 ?�호??
                                            className="w-28 h-28 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                          />
                                        );
                                      })()}
                                      <p className="text-xs text-slate-400 font-medium break-keep leading-relaxed">
                                        ????�� ?�러 ?�하???�의 명당???�인?�세?? ??
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
                                          ???�르?�나 추천 ⭐️
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
                                              return `${zodiac}?�신 귀?�의 ?�주 ?�행(${elementKr})�??�생?�는 ?�입?�다. ${match.theoryDesc}`;
                                            } else if (activeItem.id === "fame") {
                                              return `${userProfile?.nickname || "귀??}?�의 ?�판�?지?��? 지?�해 주는 ?�승???�입?�다. ${match.theoryDesc}`;
                                            } else if (activeItem.id === "mentors") {
                                              return `부?�러??조화?� ?�연???�어?�겨 ?�??관계의 ?�기�??�하???�입?�다. ${match.theoryDesc}`;
                                            } else {
                                              return `바람??가???�기�??�화�?�� ?��??�고 ?�체 ?�정??지?�하???�입?�다. ${match.theoryDesc}`;
                                            }
                                          })()}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                                          <span className="text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md">
                                            ??�� {match.grade}
                                          </span>
                                          <span className="text-xs font-bold bg-slate-900 border border-slate-800 text-amber-400 px-2.5 py-0.5 rounded-md">
                                            {match.score}??
                                          </span>
                                          <span className="text-xs font-medium text-slate-400">
                                            ?�� ???�치?�서 {match.distance >= 1000 ? `${(match.distance / 1000).toFixed(1)}km` : `${Math.round(match.distance)}m`}
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => {
                                          if (onSelectFortuneArea) {
                                            onSelectFortuneArea(match.lat, match.lng, match.areaName, activeItem.name);
                                          }
                                          if (onMinimize) onMinimize();
                                          else onClose(true);
                                        }}
                                        className="shrink-0 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-amber-500/10 active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
                                      >
                                        <span>??구역 지?�로 보기 ?���?/span>
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

                      {/* ?�단 ?�트 ?�디케?�터 (?�점?�점?? */}
                      <div className="flex items-center justify-center gap-2 py-3 mt-4 no-capture">
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

                      {/* SNS 공유 버튼 (마�?�??�이지?�서�??�시) */}
                      <div className="pt-2 mt-1 space-y-3 no-capture">
                        {currentHomeSlide === 4 && (
                          <button
                            onClick={async () => {
                              setShowShareModal(true);
                              const dataUrl = await generateShareImage();
                              if (!dataUrl) {
                                alert("?��?지 캡처???�패?�습?�다. ?�시 ???�시 ?�도?�주?�요.");
                              }
                            }}
                            className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 hover:opacity-90 active:scale-[0.98] text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2.5 text-sm select-none"
                          >
                            <Share2 className="w-4 h-4" />
                            ???�수 결과 공유?�기 ??
                          </button>
                        )}
                        <div className="flex gap-2.5">
                          <button
                            onClick={() => onClose(step === "result")}
                            className="flex-1 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold py-3.5 px-4 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all flex items-center justify-center gap-1.5 text-xs"
                          >
                            <MapPin className="w-4 h-4" />
                            지?�로 ?�아가�?
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
                            ?�시 측정?�기
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

    {/* ===== ?�든 공유 카드 (?�스?�그램 카드?�스?? ===== */}
    {homeFsResult && (() => {
      const finalTheme = homeFsResult.matchedTheme || desiredFortune;
      const mascot = getDynamicMascot(homeFsResult.score, finalTheme, userProfile?.nickname);
      const remedyMascot = getDynamicRemedyMascot(homeFsResult.score, finalTheme, homeFsResult.remedy.title);
      
      return (
        <InstagramShareCard
          ref={instagramCardRef}
          userProfile={userProfile}
          homeFsResult={homeFsResult}
          desiredFortune={desiredFortune}
          matchedVacancy={matchedVacancy || null}
          mascot={mascot}
          remedyMascot={remedyMascot}
          remedyTitle={homeFsResult.remedy.title}
        />
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
            {/* 모달 ?�더 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-base">???�수 결과 공유?�기 ??/h3>
                <p className="text-xs text-slate-400 mt-0.5">친구?�게 ??�??�수 기운???�려봐요!</p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* 공유 ?��?지 ?�리�?*/}
            <div className="bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center" style={{ minHeight: "180px" }}>
              {isGeneratingImage ? (
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
                  />
                  <span className="text-xs text-slate-400">카드 ?�성 �?..</span>
                </div>
              ) : shareImageUrl ? (
                <img src={shareImageUrl} alt="공유 카드" className="w-full object-contain rounded-xl" />
              ) : null}
            </div>

            {/* SNS 버튼 그룹 */}
            <div className="grid grid-cols-2 gap-3">
              {/* ?��?지 ?�운로드 */}
              <button
                disabled={!shareImageUrl}
                onClick={() => {
                  if (!shareImageUrl) return;
                  const a = document.createElement("a");
                  a.href = shareImageUrl;
                  a.download = "?�리집풍?�결�?png";
                  a.click();
                }}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 active:scale-95 transition-all shadow-lg"
              >
                <Download className="w-4 h-4" />
                ?��?지 ?�?�하�?
              </button>

              {/* ?�스?�그램 공유 (Web Share API) */}
              <button
                disabled={!shareImageUrl}
                onClick={async () => {
                  if (!shareImageUrl) return;
                  try {
                    const blob = await (await fetch(shareImageUrl)).blob();
                    const file = new File([blob], '?�리집풍?�결�?png', { type: blob.type });
                    
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                        files: [file],
                        title: '?�리�??�수?��?진단??,
                      });
                    } else {
                      alert("기기?�서 ?��?지 직접 공유�?지?�하지 ?�습?�다. ?��?지�??�?�한 ???�스?�그램???�려주세??");
                      const a = document.createElement("a");
                      a.href = shareImageUrl;
                      a.download = "?�리집풍?�결�?png";
                      a.click();
                    }
                  } catch (e) {
                    console.log('공유 ?�패 ?�는 취소', e);
                  }
                }}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                <span className="font-black text-base leading-none">?��</span>
                ?�스?�??공유?�기
              </button>
            </div>

            {/* ?�시?�그 ?�내 */}
            <p className="text-center text-[10px] text-slate-500 break-keep leading-relaxed">
              ?��?지 ?�?????�스?�그램?�서 ?�토�?�피?�로 공유??보세??<br />
              <span className="text-slate-600">#명당찾기 #?�수?��?#?�리집풍??#개운?�테리어</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
