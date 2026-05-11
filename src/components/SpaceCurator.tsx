"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, ArrowRight, Heart, Zap, Sparkles, Coffee, Utensils, Dumbbell, Scissors, Palette, Music, Camera, ShoppingBag, Baby, BookOpen, GraduationCap, Stethoscope, Briefcase, Pill, Store } from "lucide-react";
import { UserProfile } from "./AuthOnboarding";

interface SpaceCuratorProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onComplete: (recommendedCategory: string) => void;
}

interface Candidate {
  id: string;
  name: string;
  icon: any;
  color: string;
  tags: string[]; // persona, gender, time tags
}

// ─── 후보지 풀 (Pool) ────────────────────────────────────────────────────────
const CANDIDATES: Candidate[] = [
  { id: "study-cafe", name: "24시 스터디 카페", icon: <GraduationCap size={48} />, color: "bg-indigo-600", tags: ["univ", "teen", "night"] },
  { id: "coin-karaoke", name: "코인 노래방", icon: <Music size={48} />, color: "bg-pink-600", tags: ["univ", "teen", "night"] },
  { id: "photo-booth", name: "셀프 사진관", icon: <Camera size={48} />, color: "bg-purple-600", tags: ["univ", "teen", "F"] },
  { id: "wine-bar", name: "와인/위스키 바", icon: <Utensils size={48} />, color: "bg-rose-900", tags: ["office", "night"] },
  { id: "kids-cafe", name: "프리미엄 키즈카페", icon: <Baby size={48} />, color: "bg-amber-400", tags: ["parent", "day"] },
  { id: "gym-24h", name: "프라이빗 헬스장", icon: <Dumbbell size={48} />, color: "bg-slate-800", tags: ["office", "univ", "M"] },
  { id: "salad-bar", name: "샐러드/포케 전문점", icon: <Utensils size={48} />, color: "bg-emerald-500", tags: ["office", "F", "day"] },
  { id: "hair-salon", name: "동네 미용실", icon: <Scissors size={48} />, color: "bg-teal-500", tags: ["middle", "senior", "F"] },
  { id: "pediatrics", name: "친절한 소아과", icon: <Stethoscope size={48} />, color: "bg-blue-400", tags: ["parent", "day"] },
  { id: "organic-mart", name: "유기농 식자재 마트", icon: <ShoppingBag size={48} />, color: "bg-lime-600", tags: ["parent", "middle", "senior"] },
  { id: "hobby-studio", name: "원데이 클래스 공방", icon: <Palette size={48} />, color: "bg-violet-500", tags: ["univ", "office", "F"] },
  { id: "senior-center", name: "사랑방 느낌 카페", icon: <Coffee size={48} />, color: "bg-orange-500", tags: ["senior", "middle", "day"] },
  { id: "shared-office", name: "공유 오피스", icon: <Briefcase size={48} />, color: "bg-cyan-700", tags: ["office", "univ"] },
  { id: "book-cafe", name: "조용한 북카페", icon: <BookOpen size={48} />, color: "bg-stone-700", tags: ["univ", "middle", "senior"] },
  { id: "pharmacy", name: "동네 큰 약국", icon: <Pill size={48} />, color: "bg-red-500", tags: ["senior", "middle"] },
  { id: "local-super", name: "로컬 슈퍼마켓", icon: <Store size={48} />, color: "bg-blue-700", tags: ["senior", "middle"] },
  { id: "brunch-cafe", name: "감성 브런치 카페", icon: <Coffee size={48} />, color: "bg-yellow-600", tags: ["parent", "office", "F"] },
];

export default function SpaceCurator({ userProfile, onClose, onComplete }: SpaceCuratorProps) {
  const [step, setStep] = useState<"intro" | "tournament" | "result">("intro");
  
  // 토너먼트 상태
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentRoundWinners, setCurrentRoundWinners] = useState<Candidate[]>([]);
  const [round, setRound] = useState(8); // 8 -> 4 -> 2
  const [matchIdx, setMatchIdx] = useState(0);
  const [finalWinner, setFinalWinner] = useState<Candidate | null>(null);

  // 1. 초기화: 페르소나에 맞는 8개 후보 선정
  useEffect(() => {
    if (!userProfile) return;
    
    // 단순화된 페르소나 매핑 (AuthOnboarding 기반)
    const p = userProfile.nickname.includes("강아지") ? "teen" : 
              userProfile.nickname.includes("고양이") ? "univ" :
              userProfile.nickname.includes("사자") ? "office" : "middle";

    // 페르소나/태그 매칭 스코어링 (간단히 필터링만 적용)
    let filtered = CANDIDATES.filter(c => c.tags.includes(p) || c.tags.length === 0);
    
    // 8개 미만이면 전체 풀에서 랜덤하게 채움
    if (filtered.length < 8) {
      const others = CANDIDATES.filter(c => !filtered.includes(c));
      filtered = [...filtered, ...others].slice(0, 8);
    } else {
      // 8개 이상이면 섞어서 8개만 선택
      filtered = [...filtered].sort(() => Math.random() - 0.5).slice(0, 8);
    }
    
    setCandidates(filtered);
  }, [userProfile]);

  const handleMatchWinner = (winner: Candidate) => {
    const nextWinners = [...currentRoundWinners, winner];
    
    if (matchIdx + 2 < candidates.length) {
      // 다음 매치로
      setCurrentRoundWinners(nextWinners);
      setMatchIdx(matchIdx + 2);
    } else {
      // 라운드 종료
      if (nextWinners.length === 1) {
        // 최종 우승!
        setFinalWinner(nextWinners[0]);
        setStep("result");
      } else {
        // 다음 라운드 진출
        setCandidates(nextWinners);
        setCurrentRoundWinners([]);
        setMatchIdx(0);
        setRound(nextWinners.length);
      }
    }
  };

  const currentMatch = [candidates[matchIdx], candidates[matchIdx + 1]];

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden font-sans">
      <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all z-50">
        <X size={24} />
      </button>

      <AnimatePresence mode="wait">
        {step === "intro" ? (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="max-w-xl text-center">
            <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Zap size={40} className="text-slate-950" fill="currentColor" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-tight break-keep">
              {userProfile?.nickname || "대표님"}님,<br/>
              동네에 딱 하나만 생긴다면?
            </h1>
            <p className="text-slate-400 text-lg mb-12 leading-relaxed break-keep">
              잠재된 공간 취향을 찾아드리는<br/>
              <span className="text-amber-500 font-black">공간 이상형 월드컵</span>을 시작합니다!
            </p>
            <button onClick={() => setStep("tournament")} className="w-full py-6 bg-white text-slate-950 rounded-[2.5rem] text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
              월드컵 시작하기 <ArrowRight size={24} strokeWidth={3} />
            </button>
          </motion.div>
        ) : step === "tournament" ? (
          <motion.div key="tournament" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col">
            <div className="pt-12 text-center">
              <span className="bg-amber-500/10 text-amber-500 px-6 py-2 rounded-full text-sm font-black tracking-widest uppercase mb-4 inline-block border border-amber-500/20">
                {round === 8 ? "8강전" : round === 4 ? "4강전" : "결승전"} ({Math.floor(matchIdx/2) + 1} / {round/2})
              </span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-2">당신이 더 원하는 공간은?</h2>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 items-center justify-center p-4">
              {currentMatch[0] && currentMatch[1] && (
                <>
                  <MatchCard candidate={currentMatch[0]} onSelect={() => handleMatchWinner(currentMatch[0])} side="left" />
                  <div className="flex-shrink-0 w-16 h-16 bg-slate-900 border-2 border-white/10 rounded-full flex items-center justify-center z-10 shadow-2xl">
                    <span className="italic font-black text-amber-500 text-2xl">VS</span>
                  </div>
                  <MatchCard candidate={currentMatch[1]} onSelect={() => handleMatchWinner(currentMatch[1])} side="right" />
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl text-center">
            <div className="relative mb-12">
               <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="w-32 h-32 bg-amber-500 rounded-[3rem] flex items-center justify-center mx-auto shadow-[0_0_80px_rgba(245,158,11,0.4)]">
                 <Trophy size={64} className="text-slate-950" fill="currentColor" />
               </motion.div>
               <div className="absolute inset-0 animate-ping opacity-20"><Trophy size={100} className="mx-auto" /></div>
            </div>
            
            <h3 className="text-xl font-bold text-amber-500 mb-2">{userProfile?.nickname || "대표님"}님의 최종 선택!</h3>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-10 break-keep">"{finalWinner?.name}"</h2>
            
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl ${finalWinner?.color} mb-12 shadow-xl`}>
               {finalWinner?.icon}
               <span className="font-black text-xl">Winner</span>
            </div>

            <p className="text-slate-400 text-lg mb-12 leading-relaxed break-keep">
              {userProfile?.nickname || "대표님"}님이 꿈꾸시는 이 공간을<br/>
              우리 동네 어디에 세워볼까요?
            </p>

            <button
              onClick={() => onComplete(finalWinner?.name || "동네 공간")}
              className="w-full py-6 bg-white text-slate-950 rounded-[2.5rem] text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              우리 동네 빈 공간 둘러보기 <ArrowRight size={24} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 배경 장식 */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/30 rounded-full blur-[150px]" />
      </div>
    </div>
  );
}

function MatchCard({ candidate, onSelect, side }: { candidate: Candidate, onSelect: () => void, side: "left" | "right" }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -10 }}
      whileTap={{ scale: 0.95 }}
      initial={{ x: side === "left" ? -50 : 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      onClick={onSelect}
      className={`group relative w-full max-w-sm aspect-[4/5] md:aspect-[3/4] ${candidate.color} rounded-[3.5rem] p-8 flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 hover:border-white transition-colors overflow-hidden`}
    >
      {/* 카드 배경 애니메이션 */}
      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
      
      <div className="relative z-10 w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform">
        {candidate.icon}
      </div>
      <h3 className="relative z-10 text-3xl font-black tracking-tighter text-center break-keep leading-tight drop-shadow-lg">
        {candidate.name}
      </h3>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-slate-950/30 px-6 py-2 rounded-full backdrop-blur-md">
         <span className="text-xs font-black uppercase tracking-widest">선택하기</span>
         <Heart size={14} fill="currentColor" className="text-rose-400" />
      </div>
    </motion.button>
  );
}
