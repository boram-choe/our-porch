"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight, Coffee, Utensils, Dumbbell, Scissors, Palette, User, Users, Baby, Heart } from "lucide-react";
import { UserProfile } from "./AuthOnboarding";

interface SpaceCuratorProps {
  userProfile: UserProfile | null;
  onClose: () => void;
  onComplete: (recommendedCategory: string) => void;
}

const STEPS = [
  {
    id: "need",
    question: "지금 우리 동네에서 가장 하고 싶은 일은?",
    options: [
      { id: "coffee", label: "☕ 커피와 디저트", icon: <Coffee size={32} />, color: "bg-amber-500" },
      { id: "meal", label: "🍱 든든한 식사", icon: <Utensils size={32} />, color: "bg-rose-500" },
      { id: "active", label: "🏋️ 운동과 취미", icon: <Dumbbell size={32} />, color: "bg-indigo-500" },
      { id: "life", label: "✂️ 생활과 관리", icon: <Scissors size={32} />, color: "bg-emerald-500" },
      { id: "culture", label: "🎨 문화와 창작", icon: <Palette size={32} />, color: "bg-purple-500" },
    ]
  },
  {
    id: "who",
    question: "누구와 함께하고 싶나요?",
    options: [
      { id: "solo", label: "👤 혼자서 편하게", icon: <User size={32} />, color: "bg-slate-600" },
      { id: "friends", label: "👯 친구/이웃과 함께", icon: <Users size={32} />, color: "bg-pink-500" },
      { id: "family", label: "👧 가족/아이와 함께", icon: <Baby size={32} />, color: "bg-blue-500" },
    ]
  }
];

const RECOMMENDATIONS: Record<string, string> = {
  "coffee-solo": "조용한 1인 작업 카페",
  "coffee-friends": "수다 떨기 좋은 감성 카페",
  "coffee-family": "아이와 가기 좋은 베이커리 카페",
  "meal-solo": "혼밥 하기 좋은 1인 식당",
  "meal-friends": "분위기 좋은 로컬 맛집/술집",
  "meal-family": "온 가족이 즐거운 외식 공간",
  "active-solo": "프라이빗 헬스 & 요가 룸",
  "active-friends": "왁자지껄 동네 탁구장/체육관",
  "active-family": "에너지 뿜뿜! 대형 키즈 카페",
  "life-solo": "기분 전환을 위한 감성 미용실",
  "life-friends": "득템의 재미! 동네 소품샵",
  "life-family": "우리 동네 믿음직한 소아과/내과",
  "culture-solo": "취향을 담는 원데이 클래스 공방",
  "culture-friends": "추억을 남기는 셀프 사진관",
  "culture-family": "창의력이 쑥쑥! 어린이 미술 학원",
};

export default function SpaceCurator({ userProfile, onClose, onComplete }: SpaceCuratorProps) {
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
    return RECOMMENDATIONS[key] || "우리 동네 멋진 공간";
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
            className="w-full max-w-2xl text-center"
          >
            <div className="mb-12">
              <span className="text-amber-500 font-black text-sm uppercase tracking-[0.3em] mb-4 block">공간 취향 테스트 ({currentStep + 1}/{STEPS.length})</span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight break-keep px-4">{STEPS[currentStep].question}</h2>
            </div>

            <div className={`grid ${currentStep === 0 ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
              {STEPS[currentStep].options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`group relative flex flex-col items-center justify-center p-6 bg-white/5 border-2 border-white/10 rounded-[2.5rem] hover:border-amber-500 hover:bg-amber-500/10 transition-all duration-300 ${currentStep === 0 && opt.id === 'culture' ? 'col-span-2' : ''}`}
                >
                  <div className={`w-16 h-16 ${opt.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    {opt.icon}
                  </div>
                  <span className="font-black text-lg whitespace-nowrap">{opt.label}</span>
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
              <Heart size={48} className="text-slate-950" fill="currentColor" />
            </div>
            
            <h3 className="text-xl font-bold text-amber-500 mb-2">{userProfile?.nickname || "대표님"}님께 추천하는 공간은...</h3>
            <h2 className="text-5xl font-black tracking-tighter mb-8 break-keep">"{getResult()}"</h2>
            
            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              이 공간이 우리 동네 어디에 생기면 좋을까요?<br/>
              지도의 빈 공간 중 한 곳을 골라주세요!
            </p>

            <button
              onClick={() => onComplete(getResult())}
              className="w-full py-6 bg-amber-500 text-slate-950 rounded-[2.5rem] text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              추천 업종으로 투표하기 <ArrowRight size={24} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
