"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight, Check, Heart, Coffee, Utensils, Dumbbell, BookOpen, Music, ShoppingBag, Baby, Users } from "lucide-react";

interface SpaceCuratorProps {
  onClose: () => void;
  onComplete: (recommendedCategory: string) => void;
}

const STEPS = [
  {
    id: "vibe",
    question: "오늘 당신의 하루에 가장 필요한 에너지는?",
    options: [
      { id: "rest", label: "🌿 차분한 휴식", icon: <Coffee size={32} />, color: "bg-emerald-500" },
      { id: "active", label: "🔥 활기찬 에너지", icon: <Dumbbell size={32} />, color: "bg-orange-500" },
      { id: "taste", label: "🥘 맛있는 즐거움", icon: <Utensils size={32} />, color: "bg-rose-500" },
      { id: "focus", label: "📚 몰입의 시간", icon: <BookOpen size={32} />, color: "bg-indigo-500" },
    ]
  },
  {
    id: "target",
    question: "누구와 함께하고 싶은 공간인가요?",
    options: [
      { id: "solo", label: "👤 나만의 시간", icon: <Users size={32} />, color: "bg-slate-700" },
      { id: "friends", label: "👯 친구와 수다", icon: <Music size={32} />, color: "bg-pink-500" },
      { id: "family", label: "👨‍👩‍👧‍👦 가족과 함께", icon: <Baby size={32} />, color: "bg-amber-500" },
      { id: "neighbor", label: "🏘️ 이웃과 소통", icon: <ShoppingBag size={32} />, color: "bg-blue-500" },
    ]
  }
];

const RECOMMENDATIONS: Record<string, string> = {
  "rest-solo": "조용한 동네 북카페",
  "rest-friends": "감성 브런치 카페",
  "rest-family": "도심 속 작은 식물원",
  "rest-neighbor": "동네 꽃집 & 찻집",
  "active-solo": "1인 프라이빗 헬스장",
  "active-friends": "댄스 & 요가 스튜디오",
  "active-family": "프리미엄 키즈 카페",
  "active-neighbor": "동네 탁구장 & 체육관",
  "taste-solo": "심야 라멘 혼밥집",
  "taste-friends": "내추럴 와인 바",
  "taste-family": "유기농 패밀리 레스토랑",
  "taste-neighbor": "공유 주방 & 반찬 가게",
  "focus-solo": "초집중 독서실",
  "focus-friends": "스터디 룸 & 오피스",
  "focus-family": "어린이 도서관",
  "focus-neighbor": "커뮤니티 워크샵 공간",
};

export default function SpaceCurator({ onClose, onComplete }: SpaceCuratorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const handleSelect = (id: string) => {
    const newSelections = [...selections, id];
    setSelections(newSelections);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsFinished(true);
    }
  };

  const getResult = () => {
    const key = selections.join("-");
    return RECOMMENDATIONS[key] || "멋진 로컬 공간";
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all">
        <X size={24} />
      </button>

      <AnimatePresence mode="wait">
        {!isFinished ? (
          <motion.div 
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl text-center"
          >
            <div className="mb-12">
              <span className="text-amber-500 font-black text-sm uppercase tracking-[0.3em] mb-4 block">나만의 공간 취향 찾기 ({currentStep + 1}/{STEPS.length})</span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">{STEPS[currentStep].question}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {STEPS[currentStep].options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className="group relative flex flex-col items-center justify-center p-8 bg-white/5 border-2 border-white/10 rounded-[3rem] hover:border-amber-500 hover:bg-amber-500/10 transition-all duration-300"
                >
                  <div className={`w-16 h-16 ${opt.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    {opt.icon}
                  </div>
                  <span className="font-black text-lg">{opt.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl text-center"
          >
            <div className="w-24 h-24 bg-amber-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(245,158,11,0.5)]">
              <Sparkles size={48} className="text-slate-950" />
            </div>
            
            <h3 className="text-xl font-bold text-amber-500 mb-2">당신을 위한 맞춤 공간은...</h3>
            <h2 className="text-5xl font-black tracking-tighter mb-8">"{getResult()}"</h2>
            
            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              대표님께 딱 어울리는 이 공간을<br/>
              우리 동네 어디에 세워볼까요?
            </p>

            <button
              onClick={() => onComplete(getResult())}
              className="w-full py-6 bg-amber-500 text-slate-950 rounded-[2.5rem] text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              내 취향 공실에 심으러 가기 <ArrowRight size={24} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 배경 장식 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
