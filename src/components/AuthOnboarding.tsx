"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, User, ArrowRight, Sparkles, Navigation as NavigationIcon, CheckCircle2, Globe, Heart, MessageSquare, Briefcase, Baby, GraduationCap, Home, Dog, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { saveUserProfile } from "@/lib/db";
import { supabase } from "@/lib/supabase";
export interface UserLocation {
  neighborhood: string;
  lat: number;
  lng: number;
}

export interface UserProfile {
  nickname: string;
  activeLocationType: 'home' | 'work';
  home: UserLocation;
  work?: UserLocation;
  personaIds?: string[];
  personaLabel?: string;
  gender?: "male" | "female";
  ageRange?: string;
  activityTimes?: string[];
  workActivityTimes?: string[];
  isAdmin?: boolean;
}

export const PERSONAS = [
  { id: "worker", name: "직장인", icon: <Briefcase size={20} />, description: "매일 같은 거리에서 새로운 영감을 찾는 직장인" },
  { id: "parenting", name: "육아맘/대디", icon: <Baby size={20} />, description: "아이와 함께 걷기 좋은 따뜻한 동네를 꿈꾸는 부모님" },
  { id: "homemaker", name: "전업주부", icon: <Heart size={20} />, description: "사랑하는 가족과 함께 동네의 온기를 채우는 이웃" },
  { id: "student", name: "취준생/학생", icon: <GraduationCap size={20} />, description: "나만의 아지트 같은 조용한 공간이 필요한 공부러" },
  { id: "solo", name: "1인 가구", icon: <Home size={20} />, description: "혼자서도 풍성하게 즐기는 미니멀 라이프 이웃" },
  { id: "pet", name: "반려인", icon: <Dog size={20} />, description: "댕냥이와 함께 행복한 산책길을 만드는 집사님" },
  { id: "senior", name: "동네 어르신", icon: <Heart size={20} />, description: "우리 동네의 역사를 훤히 꿰고 계신 터줏대감" }
];

export function loadSavedProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("gongsil_user_profile");
  return saved ? JSON.parse(saved) : null;
}

export default function AuthOnboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(0); // 0: 개인정보동의, 1: Kakao, 2: Location, 3: Nickname, 4: Persona

  // 개인정보 동의 상태
  const [consentAll, setConsentAll] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);       // 필수: 이용약관
  const [consentPrivacy, setConsentPrivacy] = useState(false);   // 필수: 개인정보 수집·이용
  const [consentLocation, setConsentLocation] = useState(false); // 필수: 위치정보 수집·이용
  const [consentMarketing, setConsentMarketing] = useState(false); // 선택: 마케팅 수신
  const [expandedConsent, setExpandedConsent] = useState<string | null>(null);

  const [nicknameSuffix, setNicknameSuffix] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [coords, setCoords] = useState({ lat: 37.5665, lng: 126.9780 });
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [customPersona, setCustomPersona] = useState("");
  const [gender, setGender] = useState<"male" | "female" | undefined>(undefined);
  const [ageRange, setAgeRange] = useState<string | undefined>(undefined);
  const [selectedActivityTimes, setSelectedActivityTimes] = useState<string[]>([]);

  // 전체 동의 처리
  const handleConsentAll = (checked: boolean) => {
    setConsentAll(checked);
    setConsentTerms(checked);
    setConsentPrivacy(checked);
    setConsentLocation(checked);
    setConsentMarketing(checked);
  };

  // 개별 동의 변경 시 전체 동의 상태 업데이트
  const updateSingleConsent = (setter: (v: boolean) => void, value: boolean) => {
    setter(value);
    // 다음 렌더에서 전체 동의 상태 계산
  };

  useEffect(() => {
    setConsentAll(consentTerms && consentPrivacy && consentLocation && consentMarketing);
  }, [consentTerms, consentPrivacy, consentLocation, consentMarketing]);

  // 카카오 로그인 후 돌아왔을 때 세션이 있으면 다음 단계(약관 동의)로 자동 이동
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && step === 0) {
        setStep(1);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && step === 0) {
        setStep(1);
      }
    });

    return () => subscription.unsubscribe();
  }, [step]);

  const canProceedConsent = consentTerms && consentPrivacy && consentLocation;

  const creatures = [
    // 동물 (Animals)
    "호랑이", "고양이", "강아지", "여우", "토끼", "판다", "곰", "사자", "기린", "코끼리", 
    "다람쥐", "사슴", "고래", "돌고래", "펭귄", "쿼카", "햄스터", "알파카", "수달", "너구리",
    // 공룡 (Dinosaurs)
    "티라노사우르스", "트리케라톱스", "스테고사우르스", "프테라노돈", "벨로키랍토르", "브라키오사우르스", "파키케팔로", "안킬로사우르스", "스피노사우르스",
    // 식물/꽃 (Plants/Flowers)
    "민들레", "장미", "튤립", "벚꽃", "해바라기", "선인장", "몬스테라", "유칼립투스", "네잎클로버", "라벤더", "로즈마리", "담쟁이", "올리브나무",
    // 야채 (Vegetables)
    "당근", "감자", "고구마", "브로콜리", "가지", "아보카도", "파프리카", "양파", "마늘", "호박", "옥수수",
    // 과일 (Fruits)
    "사과", "바나나", "딸기", "복숭아", "망고", "블루베리", "감귤", "레몬", "체리", "포도", "수박", "멜론", "파인애플"
  ];

  const getCombinedLabel = (ids: string[], custom: string, userGender: string | undefined) => {
    if (ids.length === 0) return "";
    const has = (id: string) => ids.includes(id);
    const getCat = (id: string) => {
       if (id === "other") return custom.trim() || "미스테리한 이웃";
       const p = PERSONAS.find(item => item.id === id);
       if (id === "senior") return "터줏대감";
       return p?.name || ""; 
    };

    if (ids.length === 1) {
       const id = ids[0];
       if (id === "other") return custom.trim() || "미스테리한 이웃";
       
       const labels: { [key: string]: string } = {
         worker: "영감을 찾는 직장인",
         parenting: userGender === "female" ? "다정한 동네 육아맘" : "다정한 동네 육아대디",
         homemaker: "가족을 위하는 따뜻한 살림꾼",
         student: "아지트를 찾는 공부러",
         solo: "즐거운 미니멀 라이퍼",
         pet: "행복한 멍냥이 집사",
         senior: "지혜로운 터줏대감"
       };
       return labels[id] || PERSONAS.find(p => p.id === id)?.name || "";
    }

    // Special Combinations (2 items)
    if (has("worker") && has("parenting")) return userGender === "female" ? "갓생 사는 워킹맘" : "갓생 사는 워킹대디";
    if (has("worker") && has("student")) return "성장을 꿈꾸는 공부하는 직장인";
    if (has("worker") && has("pet")) return "댕냥이가 기다리는 프로 퇴근러";
    if (has("worker") && has("solo")) return "자유를 만끽하는 직장인";
    if (has("worker") && has("senior")) return "동네를 훤히 꿰고 있는 베테랑 직장인";
    if (has("parenting") && has("student")) return userGender === "female" ? "꿈을 놓지 않는 열정 육아맘" : "꿈을 놓지 않는 열정 육아대디";
    if (has("parenting") && has("pet")) return "아이와 댕냥이의 든든한 수호신";
    if (has("parenting") && has("senior")) return "아이와 함께 동네를 지키는 든든한 터줏대감";
    if (has("student") && has("solo")) return "자취하며 꿈을 키우는 힙스터";
    if (has("student") && has("pet")) return "댕냥이와 함께 꿈꾸는 공부러";
    if (has("solo") && has("pet")) return "반려동물과 힐링 중인 1인 가구";
    if (has("solo") && has("senior")) return "혼자서도 동네를 꽉 잡고 있는 터줏대감";
    if (has("pet") && has("senior")) return "댕냥이와 오랜 세월 함께한 터줏대감";

    // Fallback for 2 items including 'other'
    if (ids.length === 2 && has("other")) {
       const otherText = custom.trim() || "미스테리한 이웃";
       const first = ids[0] === "other" ? ids[1] : ids[0];
       const firstName = PERSONAS.find(p => p.id === first)?.name || "주민";
       return `본업은 ${firstName}, 부캐는 ${otherText}`;
    }

    const selectedCats = ids.map(getCat);
    if (ids.length === 2) {
       return `${selectedCats[0]}이자 ${selectedCats[1]}`;
    }

    return `동네의 슈퍼 히어로! ${selectedCats.join('·')}`;
  };

  const generateRandomNickname = async (currentNeighborhood: string) => {
    if (!currentNeighborhood) return;

    // 단어 리스트를 무작위로 섞음
    const shuffledSuffixes = [...creatures].sort(() => Math.random() - 0.5);

    try {
      // 해당 동(neighborhood)의 기존 유저 프로필 조회하여 닉네임 중복 체크
      const { data, error } = await supabase
        .from("user_profiles")
        .select("nickname")
        .eq("neighborhood", currentNeighborhood);

      if (error) throw error;

      const takenNicknames = new Set(data?.map(row => row.nickname) || []);

      // 중복되지 않는 첫 번째 단어 선택
      const availableSuffix = shuffledSuffixes.find(suffix => {
        const candidate = `${currentNeighborhood} ${suffix}`;
        return !takenNicknames.has(candidate);
      });

      if (availableSuffix) {
        setNicknameSuffix(availableSuffix);
      } else {
        // 모든 단어가 중복된 경우, 랜덤한 3자리 숫자를 덧붙여 고유성 확보
        const randomNum = Math.floor(Math.random() * 900) + 100;
        setNicknameSuffix(`${shuffledSuffixes[0]}${randomNum}`);
      }
    } catch (e) {
      console.warn("닉네임 중복 체크 실패 (랜덤 기본값 사용):", e);
      const name = creatures[Math.floor(Math.random() * creatures.length)];
      setNicknameSuffix(name);
    }
  };

  // Generate initial nickname when step becomes 3
  useEffect(() => {
    if (step === 3 && !nicknameSuffix) {
      generateRandomNickname(neighborhood);
    }
  }, [step, neighborhood]);

  const handleLocationAuth = async () => {
    setIsLocating(true);
    setLocationError(null);

    if (!("geolocation" in navigator)) {
      setLocationError("GPS 기능을 지원하지 않는 브라우저입니다.");
      setIsLocating(false);
      return; 
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`,
            { headers: { Authorization: `KakaoAK ${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}` } }
          );
          const data = await res.json();

          if (data.documents && data.documents.length > 0) {
            const addr = data.documents[0];
            const dong =
              addr.road_address?.region_3depth_name ||
              addr.address?.region_3depth_name ||
              addr.address?.region_3depth_h_name ||
              "";

            if (!dong) {
              setLocationError("카카오 지도에서 동 이름을 찾을 수 없습니다.");
              setIsLocating(false);
              return;
            }

            setNeighborhood(dong);
            setIsLocating(false);
            setStep(3); 
          } else {
            setLocationError("카카오 API 응답 오류 (데이터 없음).");
            setIsLocating(false);
          }
        } catch (e: any) {
          console.error("역지오코딩 실패:", e);
          setLocationError(`카카오 API 호출 실패: ${e.message}`);
          setIsLocating(false);
        }
      },
      (err) => {
        console.error("GPS 위치 획득 실패:", err.message);
        setLocationError(err.code === 1 ? "denied" : `GPS 에러 (${err.code}): ${err.message}`);
        setIsLocating(false);
      },
      { timeout: 15000, enableHighAccuracy: false } // 타임아웃 15초로 연장, 빠른 응답을 위해 고정밀 모드 해제
    );
  };

  const togglePersona = (id: string) => {
    setSelectedPersonaIds(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 2) {
        alert("나의 조각은 최대 2개까지만 선택할 수 있어요!");
        return prev;
      }
      return [...prev, id];
    });
  };

  const finish = async () => {
    const finalNickname = `${neighborhood} ${nicknameSuffix}`;
    const personaLabel = getCombinedLabel(selectedPersonaIds, customPersona, gender);
    const profile: UserProfile = { 
      nickname: finalNickname, 
      activeLocationType: 'home',
      home: { neighborhood, ...coords },
      personaIds: selectedPersonaIds,
      personaLabel,
      gender,
      ageRange,
      activityTimes: selectedActivityTimes
    };
    localStorage.setItem("gongsil_user_profile", JSON.stringify(profile));

    // Supabase에 저장 (비동기, 실패해도 앱은 정상 동작)
    try {
      const dbId = await saveUserProfile({
        nickname: finalNickname,
        neighborhood,
        lat: coords.lat,
        lng: coords.lng,
        gender,
        ageRange,
        activityTimes: selectedActivityTimes,
        personaIds: selectedPersonaIds,
        personaLabel,
      });
      if (dbId) {
        localStorage.setItem("gongsil_user_id", dbId);
      }
    } catch (e) {
      console.warn("Supabase 저장 실패 (로컬만 저장됨)", e);
    }

    onComplete(profile);
  };

  const PERSONAS_WITH_OTHER = [
    ...PERSONAS,
    { id: "other", name: "기타", description: "나만의 특별한 조각을 직접 입력하고 싶어요" }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[1000] overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Kakao Login (진입점) */}
        {step === 0 && (
          <motion.div 
            key="kakao" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-md p-10 text-center relative z-10"
          >
            <div className="w-24 h-24 bg-amber-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-amber-400/20">
               <Heart size={44} className="text-slate-950" fill="currentColor" />
            </div>
            <h1 className="text-4xl font-black text-white mb-4 tracking-tighter leading-tight">반가워요! <br/> <span className="text-amber-400">여긴뭐가</span> 입니다 ✨</h1>
            <p className="text-slate-400 mb-12 font-bold leading-relaxed">우리 동네의 비어있는 공간을 찾고<br/>새로운 꿈을 채워넣어 볼까요?</p>
            
            <button 
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                      redirectTo: `${window.location.origin}/?login=success`
                    }
                  });
                  if (error) {
                    console.error("Kakao Login Error:", error);
                    alert("카카오 로그인 연동 중 문제가 발생했습니다: " + error.message);
                  }
                } catch (err: any) {
                  console.error("Kakao OAuth Exception:", err);
                  alert("카카오 로그인 실행 중 에러가 발생했습니다: " + (err.message || err));
                }
              }}
              className="w-full bg-[#FEE500] text-slate-950 py-5 rounded-2xl text-lg font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mb-4"
            >
              <div className="w-6 h-6 bg-slate-950 rounded-full flex items-center justify-center"><MessageSquare size={14} className="text-[#FEE500]" fill="currentColor" /></div>
              카카오로 1초 만에 시작하기
            </button>

            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-500 hover:text-slate-300 font-bold underline transition-colors"
            >
              카카오 연동 없이 둘러보기 ↗
            </button>
          </motion.div>
        )}

        {/* Step 1: 개인정보 동의 (신규 가입 시) */}
        {step === 1 && (
          <motion.div
            key="consent"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md relative z-10 flex flex-col h-[90vh] max-h-[700px]"
          >
            {/* 상단 헤더 */}
            <div className="px-8 pt-10 pb-6 text-center">
              <div className="w-16 h-16 bg-amber-400/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5">
                <ShieldCheck size={32} className="text-amber-400" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tighter leading-tight mb-2">
                서비스 이용 전<br/><span className="text-amber-400">약관 동의</span>가 필요해요
              </h1>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                여긴뭐가는 주민 참여 기반 서비스로,<br/>
                아래 약관에 동의하셔야 이용이 가능합니다.
              </p>
            </div>

            {/* 동의 목록 */}
            <div className="flex-1 overflow-y-auto px-8 space-y-3 no-scrollbar">
              {/* 전체 동의 */}
              <button
                onClick={() => handleConsentAll(!consentAll)}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                  consentAll
                    ? "bg-amber-400/10 border-amber-400/50"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  consentAll ? "bg-amber-400 border-amber-400" : "border-slate-600"
                }`}>
                  {consentAll && <CheckCircle2 size={14} className="text-slate-950" strokeWidth={3} />}
                </div>
                <span className="text-white font-black text-sm text-left">전체 동의하기</span>
                <span className="ml-auto text-[10px] text-slate-500 font-bold">
                  선택 포함
                </span>
              </button>

              <div className="border-t border-white/5 pt-3 space-y-2">
                {/* 이용약관 */}
                {[{
                  key: "terms",
                  label: "서비스 이용약관 동의",
                  required: true,
                  checked: consentTerms,
                  onToggle: () => setConsentTerms(v => !v),
                  detail: `환영합니다! 여긴뭐가는 따뜻하고 신뢰할 수 있는 동네 커뮤니티를 지향합니다.\n\n제1조 (목적) 본 약관은 여긴뭐가 서비스의 이용 조건, 회사와 이용자의 권리·의무를 규정함을 목적으로 합니다.\n\n제2조 (이용자 의무) 이웃을 존중하는 매너를 지켜주세요. 허위 공실 정보, 욕설, 타인 비방, 불법적인 상업 광고 등록 시 예고 없이 이용이 제한될 수 있습니다.\n\n제3조 (플랫폼의 권리와 면책) 여긴뭐가는 주민들의 자발적 제보로 운영됩니다. 등록된 공실 정보는 참고용이며, 플랫폼은 실제 부동산 권리관계나 거래에 대해 법적 책임을 지지 않습니다.`
                }, {
                  key: "privacy",
                  label: "개인정보 수집·이용 동의",
                  required: true,
                  checked: consentPrivacy,
                  onToggle: () => setConsentPrivacy(v => !v),
                  detail: `여긴뭐가는 쾌적한 서비스 제공을 위해 꼭 필요한 최소한의 정보만 수집합니다.\n\n■ 수집 항목: 카카오 식별자, 닉네임, 페르소나 데이터(성별, 연령, 활동시간 등)\n■ 수집 목적: 본인 확인, 동네 맞춤형 공실 리포트 제공, 불량 이용자 제재\n■ 보유 기간: 회원 탈퇴 시 즉시 파기 (단, 관련 법령에 의한 보존이 필요한 경우 법정 기간 동안 안전하게 보관합니다)\n\n※ 동의를 거부할 권리가 있으나, 거부 시 서비스 가입 및 이용이 제한됩니다.`
                }, {
                  key: "location",
                  label: "위치정보 수집·이용 동의",
                  required: true,
                  checked: consentLocation,
                  onToggle: () => setConsentLocation(v => !v),
                  detail: `우리 동네를 확인하고 내 주변 공실을 보기 위해 위치 정보가 필요합니다.\n\n■ 수집 항목: 스마트폰 GPS 위치 정보 (위도, 경도)\n■ 이용 목적: '우리 동네' 인증 및 내 주변 공실/상권 정보 정렬\n■ 보유 기간: 위치 정보는 동네 인증 시 일회성으로 활용되며, 사용자의 이동 경로를 별도로 추적하거나 서버에 영구 저장하지 않습니다.\n\n※ 위치정보법 제18조에 따라 별도 동의를 받습니다. 거부 시 동네 기반 서비스 이용이 제한됩니다.`
                }, {
                  key: "marketing",
                  label: "마케팅 정보 수신 동의",
                  required: false,
                  checked: consentMarketing,
                  onToggle: () => setConsentMarketing(v => !v),
                  detail: `우리 동네 상권의 흥미로운 소식을 가장 먼저 받아보세요!\n\n■ 수신 내용: 신규 공실 알림, 우리 동네 투표 결과, 업종 매칭 성공 소식 및 혜택 알림\n■ 수신 방법: 카카오톡 알림톡 및 채널 메시지\n\n※ 선택 동의 항목이므로 거부하셔도 기본 서비스는 정상적으로 이용 가능합니다.`
                }].map(item => (
                  <div key={item.key}>
                    <button
                      onClick={item.onToggle}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        item.checked ? "bg-white/5 border-white/10" : "bg-transparent border-transparent hover:border-white/5"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.checked ? "bg-amber-400 border-amber-400" : "border-slate-600"
                      }`}>
                        {item.checked && <CheckCircle2 size={12} className="text-slate-950" strokeWidth={3} />}
                      </div>
                      <span className="text-sm font-bold text-slate-300 text-left flex-1">{item.label}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        item.required ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-400"
                      }`}>{item.required ? "필수" : "선택"}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedConsent(expandedConsent === item.key ? null : item.key); }}
                        className="text-slate-600 hover:text-slate-400 transition-colors ml-1"
                      >
                        {expandedConsent === item.key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </button>
                    <AnimatePresence>
                      {expandedConsent === item.key && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 mb-2 p-4 bg-slate-900 rounded-xl border border-white/5 flex flex-col gap-2">
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed whitespace-pre-line">{item.detail}</p>
                            {item.key === "privacy" && (
                              <a 
                                href="/privacy" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline self-start flex items-center gap-1 mt-1"
                              >
                                개인정보 처리방침 전문 보기 ↗
                              </a>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* 동의 후 진행 버튼 */}
            <div className="px-8 pt-4 pb-8">
              <button
                disabled={!canProceedConsent}
                onClick={() => setStep(2)}
                className="w-full bg-amber-400 text-slate-950 py-5 rounded-2xl text-lg font-black shadow-xl hover:bg-amber-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={20} />
                동의하고 시작하기
              </button>
              {!canProceedConsent && (
                <p className="text-center text-[11px] text-slate-600 font-bold mt-3">필수 항목 3개에 모두 동의해 주세요</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Location Auth */}
        {step === 2 && (
          <motion.div 
            key="location" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md p-10 text-center relative z-10"
          >
            <div className="w-20 h-20 bg-slate-900 border-2 border-amber-400/30 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl">
               <MapPin size={36} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-6 tracking-tighter leading-tight">탐험을 시작하기 위해 <br/> <span className="text-amber-400">현재 동네</span>를 인증해 주세요</h1>
            <p className="text-slate-400 mb-10 font-bold leading-relaxed break-keep">
              내가 사랑하는 동네의 숨은 매력을 발견하고 <br/>
              비어있는 상상 공간을 함께 채우기 위해 <br/>
              <span className="block mt-1">위치 인증이 필요합니다.</span>
            </p>
            
            <button 
              onClick={handleLocationAuth} disabled={isLocating}
              className="w-full bg-amber-400 text-slate-950 py-6 rounded-3xl text-xl font-black shadow-2xl hover:bg-amber-300 transition-all flex items-center justify-center gap-3"
            >
              {isLocating ? <div className="w-6 h-6 border-4 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : <>현재 위치로 인증하기 <NavigationIcon size={24} /></>}
            </button>

            {/* 위치 인증 실패 에러 메시지 */}
            {locationError === "denied" && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-left">
                <p className="text-red-400 font-black text-sm mb-1">📵 위치 접근이 차단되어 있어요</p>
                <p className="text-red-300/70 text-xs font-bold leading-relaxed">
                  브라우저 설정에서 위치 권한을 허용한 후 다시 시도해 주세요.<br/>
                  (주소창 왼쪽 자물쇠 아이콘 → 위치 → 허용)
                </p>
              </div>
            )}
            {locationError && locationError !== "denied" && (
              <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl text-left">
                <p className="text-orange-400 font-black text-sm mb-1">📍 위치 확인에 실패했어요</p>
                <p className="text-orange-300/70 text-xs font-bold leading-relaxed">
                  {locationError}<br/>
                  (잠시 후 다시 시도해 주세요)
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Nickname */}
        {step === 3 && (
          <motion.div 
            key="nickname" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md p-10 text-center relative z-10"
          >
            <div className="w-20 h-20 bg-amber-400/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
               <User size={36} className="text-amber-400" />
            </div>

            {/* GPS로 감지된 동네 표시 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <MapPin size={14} className="text-amber-400" />
              <span className="text-amber-400 font-black text-sm tracking-widest">{neighborhood}</span>
              <span className="text-slate-500 text-xs font-bold">위치 인증 완료 ✓</span>
            </div>

            <h1 className="text-3xl font-black text-white mb-8 tracking-tighter leading-tight">동네를 탐험할 <br/> <span className="text-amber-400">별명</span>을 정해주세요!</h1>
            
            <div className="space-y-5">
              <div className="relative flex items-center gap-3 bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 focus-within:border-amber-400 transition-all">
                <span className="text-xl font-black text-amber-400 shrink-0">{neighborhood}</span>
                <input 
                  type="text" value={nicknameSuffix} onChange={(e) => setNicknameSuffix(e.target.value)}
                  placeholder="별명을 입력하세요"
                  className="flex-1 bg-transparent text-xl font-bold text-white outline-none placeholder:text-slate-600"
                />
                <button onClick={() => generateRandomNickname(neighborhood)} className="p-2 text-amber-400 hover:scale-110 transition-transform"><Globe size={22} /></button>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">최종 닉네임 미리보기</p>
                 <p className="text-lg font-black text-white">{neighborhood} {nicknameSuffix || "???"}</p>
              </div>

              <button 
                disabled={!nicknameSuffix} onClick={() => setStep(4)}
                className="w-full bg-white text-slate-950 py-5 rounded-2xl text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
              >
                좋아요, 이제 마지막 단계!
              </button>
            </div>
          </motion.div>
        )}


        {step === 4 && (
          <motion.div 
            key="persona" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-xl p-10 text-center relative z-10 overflow-y-auto max-h-[85vh] no-scrollbar rounded-[3rem]"
          >
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
               <Sparkles size={32} className="text-amber-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-6 tracking-tighter">동네를 채우는 <br/> <span className="text-amber-400">나의 조각</span>을 선택하세요</h1>
            
            {/* Gender Selection */}
            <div className="mb-6">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">성별</p>
              <div className="flex gap-4 justify-center">
                {(["female", "male"] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`px-8 py-3 rounded-2xl text-sm font-black transition-all border-2 ${gender === g ? "bg-white text-slate-950 border-white shadow-xl" : "bg-white/5 text-slate-500 border-white/10 hover:border-white/20"}`}
                  >
                    {g === "female" ? "여성" : "남성"}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Range Selection */}
            <div className="mb-6">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">연령대</p>
              <div className="grid grid-cols-3 gap-2 px-4">
                {["10대", "20대", "30대", "40대", "50대", "60대+"].map(age => (
                  <button
                    key={age}
                    onClick={() => setAgeRange(age)}
                    className={`py-2 rounded-xl text-[13px] font-black transition-all border-2 ${ageRange === age ? "bg-amber-400 text-slate-950 border-amber-400 shadow-lg" : "bg-white/5 text-slate-500 border-white/10 hover:border-white/20"}`}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Time Selection */}
            <div className="mb-10">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">주요 활동 시간</p>
              <div className="grid grid-cols-3 gap-2 px-4">
                {["평일 낮", "평일 저녁", "주말"].map(time => (
                  <button
                    key={time}
                    onClick={() => {
                      if (selectedActivityTimes.includes(time)) {
                        setSelectedActivityTimes(selectedActivityTimes.filter(t => t !== time));
                      } else {
                        setSelectedActivityTimes([...selectedActivityTimes, time]);
                      }
                    }}
                    className={`py-3 rounded-xl text-[13px] font-black transition-all border-2 ${selectedActivityTimes.includes(time) ? "bg-white text-slate-950 border-white shadow-lg" : "bg-white/5 text-slate-500 border-white/10 hover:border-white/20"}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
               <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 text-center">나의 라이프스타일 (최대 2개)</p>
               <div className="grid grid-cols-2 gap-4 p-2">
                 {PERSONAS_WITH_OTHER.map(p => (
                   <button 
                     key={p.id} onClick={() => togglePersona(p.id)}
                     className={`p-6 rounded-3xl border-2 transition-all text-center group relative overflow-hidden ${selectedPersonaIds.includes(p.id) ? "bg-amber-400 border-amber-400 shadow-lg shadow-amber-400/20" : "bg-white/5 border-white/10 hover:border-white/30"}`}
                   >
                     <p className={`text-lg font-black relative z-10 ${selectedPersonaIds.includes(p.id) ? "text-slate-950" : "text-white"}`}>{p.name}</p>
                   </button>
                 ))}
               </div>
            </div>

            {selectedPersonaIds.includes("other") && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <input 
                  type="text" value={customPersona} onChange={(e) => setCustomPersona(e.target.value)}
                  placeholder="나만의 조각을 직접 입력하세요 (예: 맛집 탐방가)"
                  className="w-full bg-white/10 border-2 border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-400 transition-all text-center"
                />
              </motion.div>
            )}

            {/* Real-time Preview */}
            <div className="mb-8 p-5 bg-amber-400/10 rounded-3xl border border-amber-400/20">
               <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-2">나는</p>
               <p className="text-xl font-black text-white leading-tight">
                 🙋 "{getCombinedLabel(selectedPersonaIds, customPersona, gender) || "어떤 분인가요?"}"
               </p>
            </div>

            <button 
              disabled={
                !gender || 
                !ageRange || 
                selectedActivityTimes.length === 0 || 
                selectedPersonaIds.length === 0 || 
                (selectedPersonaIds.includes("other") && customPersona.trim() === "")
              } 
              onClick={() => setStep(5)}
              className="w-full bg-amber-400 text-slate-950 py-5 rounded-2xl text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              선택 완료
            </button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div 
            key="done" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-10 text-center relative z-10"
          >
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-24 h-24 bg-amber-400 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-amber-400/30"
            >
               <CheckCircle2 size={48} className="text-slate-950" />
            </motion.div>
            <h1 className="text-4xl font-black text-white mb-6 tracking-tighter leading-tight">상상할 준비가 <br/> 완료되었습니다!</h1>
            <p className="text-slate-400 mb-12 font-bold leading-relaxed">{neighborhood} {nicknameSuffix}님, <br/> {neighborhood}의 빈 공간들을 <br/> 함께 깨워볼까요?</p>
            
            <button 
              onClick={finish}
              className="w-full bg-amber-400 text-slate-950 py-6 rounded-3xl text-2xl font-black shadow-2xl hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-4 group"
            >
              지금 시작하기 <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
