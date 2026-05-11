"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Vacancy, VoteItem } from "@/data/dummyVacancies";
import { X, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Sparkles, ShoppingBag, Coffee, Utensils, Scissors, Stethoscope, Dumbbell, GraduationCap, Camera as CameraIcon, Gift, Share2, MessageSquare, Heart, Send, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { recordVote } from "@/components/MyPage";
import { saveVote } from "@/lib/db";
import { Comment, fetchComments, addComment, toggleCommentLike, reportComment } from "../lib/comments";

// ─── Constants ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'cafe', label: '카페', icon: <Coffee size={24} />, subs: ['프랜차이즈', '감성카페', '디저트/베이커리'], brands: ['스타벅스', '투썸플레이스', '이디야', '폴바셋', '메가커피', '빽다방'] },
  { id: 'food', label: '음식점', icon: <Utensils size={24} />, subs: ['한식', '양식', '일식/중식', '패스트푸드'], brands: ['맥도날드', '서브웨이', '본죽', '미즈컨테이너', '버거킹'] },
  { id: 'hair', label: '미용/뷰티', icon: <Scissors size={24} />, subs: ['헤어살롱', '남성전용/바버샵', '네일/에스테틱'], brands: ['준오헤어', '박승철헤어', '리안헤어', '올리브영'] },
  { id: 'doctor', label: '병원/약국', icon: <Stethoscope size={24} />, subs: ['소아과', '치과', '내과/가정의학', '약국'], brands: [] },
  { id: 'gym', label: '운동/헬스', icon: <Dumbbell size={24} />, subs: ['헬스장', '필라테스/요가', '태권도/주짓수'], brands: [] },
  { id: 'store', label: '상점/생활', icon: <ShoppingBag size={24} />, subs: ['편의점', '소품샵', '무인점포', '반찬가게'], brands: ['GS25', 'CU', '세븐일레븐', '다이소'] },
  { id: 'edu', label: '교육/학원', icon: <GraduationCap size={24} />, subs: ['영어/수학', '음악/미술', '스터디카페'], brands: [] },
  { id: 'studio', label: '스튜디오', icon: <CameraIcon size={24} />, subs: ['사진관', '공방/클래스', '꽃집'], brands: [] },
  { id: 'etc', label: '기타', icon: <Gift size={24} />, subs: [], brands: [] },
];

const BRAND_DOMAIN_MAP: Record<string, string> = {
  "스타벅스": "starbucks.co.kr",
  "스벅": "starbucks.co.kr",
  "맥도날드": "mcdonalds.co.kr",
  "버거킹": "burgerking.co.kr",
  "서브웨이": "subway.co.kr",
  "올리브영": "oliveyoung.co.kr",
  "다이소": "daiso.co.kr",
  "메가커피": "mega-mgccoffee.com",
  "빽다방": "paikdabang.com",
  "투썸": "twosome.co.kr",
  "이디야": "ediya.com",
  "파리바게뜨": "paris.co.kr",
  "파바": "paris.co.kr",
  "배스킨라빈스": "baskinrobbins.co.kr",
  "베라": "baskinrobbins.co.kr",
};

function getBrandLogo(brand: string) {
  const norm = brand.trim().replace(/\s/g, "");
  const domain = BRAND_DOMAIN_MAP[norm];
  if (domain) return `https://logo.clearbit.com/${domain}`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(brand)}&background=random&color=fff&size=128&bold=true`;
}

import { UserProfile } from "./AuthOnboarding";

export default function Building3D({ vacancy, onClose, onVacancyUpdate, hasVoted, isEntrepreneurMode, onModeSwitch, userProfile, recommendedCategory }: { 
  vacancy: Vacancy, 
  onClose: () => void,
  onVacancyUpdate: (v: Vacancy) => void,
  hasVoted: boolean,
  isEntrepreneurMode?: boolean,
  onModeSwitch?: () => void,
  userProfile: UserProfile | null,
  recommendedCategory: string | null
}) {
  const [reportMode, setReportMode] = useState<"dispute" | "movein" | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [moveInText, setMoveInText] = useState("");
  const [inputValue, setInputValue] = useState("");
  
  const [votingStep, setVotingStep] = useState<"category" | "detail" | "results">(hasVoted ? "results" : "category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // 댓글 관련 상태
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, vacancy.id]);

  const loadComments = async () => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("gongsil_user_id") || undefined;
    const data = await fetchComments(vacancy.id, userId);
    setComments(data);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || typeof window === "undefined") return;
    const userId = localStorage.getItem("gongsil_user_id");
    if (!userId) return;

    setIsSubmittingComment(true);
    const added = await addComment(vacancy.id, userId, newComment.trim());
    if (added) {
      setNewComment("");
      await loadComments();
    }
    setIsSubmittingComment(false);
  };

  const handleLike = async (commentId: string, isLiked: boolean) => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("gongsil_user_id");
    if (!userId) return;

    const success = await toggleCommentLike(commentId, userId, isLiked);
    if (success) {
      await loadComments();
    }
  };

  const handleReport = async (commentId: string) => {
    if (typeof window === "undefined") return;
    if (!confirm("이 댓글을 신고하시겠습니까?")) return;
    const userId = localStorage.getItem("gongsil_user_id");
    if (!userId) return;

    const success = await reportComment(commentId, userId);
    if (success) {
      alert("신고가 접수되었습니다.");
      await loadComments();
    }
  };

  const groupedVotes = useMemo(() => {
    const groups: Record<string, { total: number, items: VoteItem[], label: string, icon: any }> = {};
    const votes = vacancy.currentVotes || [];
    
    votes.forEach(vote => {
      const catId = vote.categoryId || 'etc';
      const categoryInfo = CATEGORIES.find(c => c.id === catId);
      
      if (!groups[catId]) {
        groups[catId] = { 
          total: 0, 
          items: [], 
          label: categoryInfo?.label || '기타',
          icon: categoryInfo?.icon || <Gift size={20} />
        };
      }
      groups[catId].total += vote.count;
      groups[catId].items.push(vote);
    });

    return Object.entries(groups)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [vacancy.currentVotes]);

  const sortedVotes = useMemo(() => {
    const votes = vacancy.currentVotes || [];
    return [...votes].sort((a,b) => b.count - a.count);
  }, [vacancy.currentVotes]);

  const getCategoryIdFromRecommendation = (rec: string) => {
    if (rec.includes("카페")) return "cafe";
    if (rec.includes("식당") || rec.includes("맛집")) return "food";
    if (rec.includes("미용실")) return "hair";
    if (rec.includes("의원") || rec.includes("약국") || rec.includes("소아과") || rec.includes("내과")) return "doctor";
    if (rec.includes("헬스") || rec.includes("탁구장") || rec.includes("체육관") || rec.includes("키즈 카페")) return "gym";
    if (rec.includes("소품샵") || rec.includes("마켓") || rec.includes("식자재 마트") || rec.includes("슈퍼마켓")) return "store";
    if (rec.includes("학원")) return "edu";
    if (rec.includes("공방") || rec.includes("사진관")) return "studio";
    return "etc";
  };

  const getCleanName = (name: string) => {
    return name
      .replace("24시 ", "")
      .replace("조용한 ", "")
      .replace("느낌 ", "")
      .replace("감성 ", "")
      .replace("친절한 ", "")
      .replace("프리미엄 ", "")
      .replace("유기농 ", "")
      .replace("프라이빗 ", "")
      .replace("동네 큰 ", "")
      .replace("로컬 ", "")
      .trim();
  };

  const handleVoteSubmit = async (e?: React.FormEvent, customBrand?: string, customCat?: string) => {
    if (e) e.preventDefault();
    let brand = (customBrand || inputValue).trim();
    if (!brand) return;

    // 데이터 세척: 수식어 제거
    brand = getCleanName(brand);

    const catId = customCat || selectedCategory || 'etc';
    const currentVotes = vacancy.currentVotes || [];
    const existing = currentVotes.find(v => v.brand === brand);
    
    let nextVotes: VoteItem[] = [];
    if (existing) {
      nextVotes = currentVotes.map(v => v.brand === brand ? { ...v, count: v.count + 1 } : v);
    } else {
      nextVotes = [...currentVotes, {
        id: Math.random().toString(36).substr(2, 9),
        brand,
        categoryId: catId,
        logo: getBrandLogo(brand),
        count: 1
      }];
    }

    const updated = { ...vacancy, currentVotes: nextVotes };
    setVotingStep("results");
    setInputValue("");
    setSelectedCategory(null);
    onVacancyUpdate(updated);
    recordVote(brand, updated.landmark || updated.address);

    try {
      const userId = localStorage.getItem("gongsil_user_id");
      if (userId) {
        const catInfo = CATEGORIES.find(c => c.id === catId);
        await saveVote({
          vacancyId: vacancy.id,
          userId,
          category: catInfo?.label || brand,
          categoryIcon: catInfo ? undefined : undefined,
          comment: brand,
        });
      }
    } catch (e) {
      console.warn("투표 Supabase 저장 실패:", e);
    }
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setVotingStep("detail");
  };

  const handleSubSelect = (sub: string) => {
    setInputValue(sub);
  };

  const submitReport = (type: string, content?: string) => {
    const newReport = {
      id: Date.now().toString(),
      type: type as 'dispute' | 'movein',
      content: content || (type === 'dispute' ? '다른 가게가 생겼어요' : ''),
      timestamp: Date.now()
    };
    const updated = {
      ...vacancy,
      reports: [...(vacancy.reports || []), newReport]
    };
    onVacancyUpdate(updated);
    setReportSubmitted(true);
  };

  const handleShare = async () => {
    const text = `우리 동네 '${vacancy.landmark || vacancy.address}' 공간에 이런 게 생기면 어떨까요? 함께 상상해봐요! ✨`;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: '여긴뭐가 | 우리 동네 상상 시뮬레이터', text, url });
      } catch (err) { console.log('Share failed', err); }
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      alert("공유 링크가 클립보드에 복사되었습니다! 🔗");
    }
  };

  const BuildingVisual = () => {
    const isCompact = votingStep !== "results";
    const topCategory = groupedVotes[0];
    const floors = [
      { id: "3층 이상", label: "3F+", y: 0 },
      { id: "2층", label: "2F", y: 1 },
      { id: "1층", label: "1F", y: 2 },
      { id: "지하", label: "B1", y: 3 },
    ];

    return (
      <motion.div 
        animate={{ 
          scale: isCompact ? 0.65 : 1, 
          y: isCompact ? -40 : 0,
          opacity: 1 
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="absolute top-[8%] left-1/2 -translate-x-1/2 w-64 h-80 flex flex-col items-center z-0"
      >
        <div className="relative w-48 h-6 mb-[-4px] z-10">
          <div className="absolute inset-0 bg-slate-800 rounded-t-lg shadow-lg border-b-2 border-slate-700" />
        </div>
        <div className="relative w-48 h-full flex flex-col gap-2 p-1 bg-slate-900/20 backdrop-blur-sm rounded-b-xl border-x-4 border-b-4 border-slate-800 shadow-2xl">
          <div className="absolute inset-y-0 -left-1 w-2 bg-gradient-to-r from-slate-800 to-slate-700 rounded-l-md" />
          <div className="absolute inset-y-0 -right-1 w-2 bg-gradient-to-l from-slate-800 to-slate-700 rounded-r-md" />
          {floors.map((f, idx) => {
            const isTarget = vacancy.floor === f.id || vacancy.floor?.includes(f.id.replace(" 이상", ""));
            const showWinner = isTarget && topCategory;
            return (
              <motion.div 
                key={f.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative flex-1 rounded-xl border-2 transition-all duration-700 flex items-center justify-center 
                  ${isTarget 
                    ? 'bg-slate-900 border-amber-500/50 shadow-[inset_0_0_30px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/20 overflow-visible' 
                    : 'bg-slate-900/60 border-white/5 overflow-hidden'}
                `}
              >
                <div className="absolute inset-0 grid grid-cols-3 gap-2 p-3 opacity-20 pointer-events-none">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="bg-slate-700 rounded-sm" />)}
                </div>
                <AnimatePresence mode="wait">
                  {showWinner && (
                    <motion.div 
                      key={topCategory.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative z-20 flex flex-col items-center justify-center w-full h-full"
                    >
                      <div className="relative min-w-[100px] h-16 bg-white rounded-xl border-b-4 border-slate-300 shadow-2xl flex flex-col items-center justify-center p-2">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl" />
                        <span className="text-2xl">{topCategory.icon}</span>
                        <span className="text-[10px] font-black text-slate-800">{topCategory.label}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className={`absolute bottom-1 right-2 text-[8px] font-black tracking-tighter ${isTarget ? 'text-amber-500/60' : 'text-white/10'}`}>
                  {f.label}
                </span>
              </motion.div>
            );
          })}
        </div>
        <div className="w-56 h-4 bg-slate-800 rounded-b-2xl shadow-xl mt-[-2px] border-t-2 border-slate-700" />
      </motion.div>
    );
  };

  return (
    <div className="relative w-full h-full">
      <BuildingVisual />

      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-10">
        <button onClick={onClose} className="pointer-events-auto w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all">
          <X size={24} />
        </button>
        <div className="text-right bg-slate-900/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 pointer-events-none">
          <h2 className="text-xl font-black text-white">{vacancy.landmark || vacancy.address.split(' ').pop() || '선택한 위치'}</h2>
          <div className="flex items-center justify-end gap-2 mt-1">
             <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
             <p className="text-amber-200 font-bold text-xs uppercase tracking-widest">{vacancy.floor?.includes('층') || vacancy.floor?.includes('지하') ? vacancy.floor : `${vacancy.floor || '1'}층`} 상상 공간</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!reportMode ? (
          <motion.div 
            key="voter"
            initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-none z-20"
          >
            <div className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-6 w-full max-w-2xl mx-auto shadow-[0_30px_70px_rgba(0,0,0,0.6)] pointer-events-auto overflow-hidden transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Gift size={20} className="text-white" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1">상상 더하기</h3>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                     {votingStep === 'results' ? '이웃들의 상상 결합 중' : '동네의 미래를 그려보세요'}
                   </p>
                </div>
                {votingStep !== "category" && (
                   <button 
                    onClick={() => { setVotingStep("category"); setSelectedCategory(null); }}
                    className="ml-auto bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all"
                   >
                     수정하기
                   </button>
                 )}
              </div>

              <div className="relative">
                <AnimatePresence mode="wait">
                  {votingStep === "category" ? (
                    <motion.div key="cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-4">
                      {recommendedCategory && !hasVoted && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedCategory(recommendedCategory ? getCategoryIdFromRecommendation(recommendedCategory) : null);
                            handleVoteSubmit(undefined, recommendedCategory || undefined, recommendedCategory ? getCategoryIdFromRecommendation(recommendedCategory) : undefined);
                          }}
                          className="w-full p-8 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500 rounded-[2.5rem] border-4 border-white shadow-[0_25px_50px_rgba(245,158,11,0.3)] flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                              <Sparkles size={32} fill="currentColor" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] leading-none opacity-80">{userProfile?.nickname || "대표님"}님을 위한 추천</p>
                                <span className="px-3 py-1 bg-slate-950 text-amber-500 text-[10px] font-black rounded-full uppercase tracking-tighter shadow-lg">
                                  {CATEGORIES.find(c => c.id === getCategoryIdFromRecommendation(recommendedCategory || ""))?.label || "기타"}
                                </span>
                              </div>
                              <h4 className="text-3xl font-black text-slate-950 tracking-tighter leading-tight italic">"{recommendedCategory}"</h4>
                            </div>
                          </div>
                        </motion.button>
                      )}
                      
                      <div className="grid grid-cols-4 gap-3">
                        {CATEGORIES.map((cat) => (
                           <button key={cat.id} onClick={() => handleCategorySelect(cat.id)} className="flex flex-col items-center justify-center aspect-square bg-white/5 border border-white/10 rounded-2xl hover:bg-amber-500 active:scale-95 transition-all group">
                             <div className="text-white group-hover:scale-110 transition-transform mb-2 scale-90">{cat.icon}</div>
                             <span className="text-[10px] font-black text-white/70 group-hover:text-white uppercase">{cat.label}</span>
                           </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : votingStep === "detail" ? (
                    <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4">
                       <div className="flex flex-wrap gap-2">
                         {CATEGORIES.find(c => c.id === selectedCategory)?.subs.map(sub => (
                           <button key={sub} onClick={() => handleSubSelect(sub)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border-2 ${inputValue === sub ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-lg' : 'bg-white/5 text-white/50 border-white/5 hover:border-white/20'}`}>{sub}</button>
                         ))}
                       </div>
                       <form onSubmit={handleVoteSubmit} className="relative z-30">
                        <input 
                          type="text" 
                          value={inputValue} 
                          onChange={(e) => setInputValue(e.target.value)} 
                          placeholder="직접 입력하거나 선택해 주세요..." 
                          className="w-full bg-slate-950 text-white placeholder-slate-600 font-bold rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-white/5 text-sm" 
                        />
                        <button 
                          type="submit" 
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 hover:bg-amber-400 active:scale-90 transition-all shadow-xl shadow-amber-500/40 z-40"
                        >
                          <CheckCircle2 size={24} />
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                       <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all" onClick={() => setExpandedCategoryId(expandedCategoryId === 'all' ? null : 'all')}>
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-lg animate-bounce">
                               {groupedVotes[0]?.icon || <Sparkles size={16} />}
                             </div>
                             <div className="flex-1">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">최다 상상 키워드</p>
                                <h4 className="text-sm font-black text-white truncate max-w-[120px]">{groupedVotes[0]?.label || "상상을 더해주세요!"}</h4>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">참여</p>
                                <p className="text-xs font-black text-white">{sortedVotes.reduce((a,b)=>a+b.count, 0)}명</p>
                             </div>
                             <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandedCategoryId === 'all' ? 'rotate-180' : ''}`} />
                          </div>
                       </div>
                       
                       <AnimatePresence>
                         {expandedCategoryId === 'all' && (
                           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar pt-2 px-1">
                             {groupedVotes.map((group, idx) => (
                               <div key={group.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                 <div className="flex items-center gap-3 p-3 bg-white/5">
                                   <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-white">{idx+1}</div>
                                   <span className="text-xs font-black text-white flex-1">{group.label}</span>
                                   <span className="text-[10px] font-black text-amber-500">{group.total}표</span>
                                 </div>
                                 <div className="p-3 pt-1 flex flex-wrap gap-2">
                                    {group.items.map(item => (
                                      <div key={item.id} className="flex items-center gap-1.5 bg-slate-950/50 px-2 py-1 rounded-lg border border-white/5">
                                        <img src={item.logo} alt="" className="w-3 h-3 rounded-full" />
                                        <span className="text-[9px] font-bold text-white/60">{item.brand}</span>
                                        <span className="text-[8px] font-black text-amber-500/80">{item.count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              <button onClick={handleShare} className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all mt-2">
                                <Share2 size={12} /> 상상 조각 공유하기
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {!hasVoted && (
                          <button onClick={() => setVotingStep("category")} className="w-full py-5 bg-white text-slate-950 rounded-[2rem] text-sm font-black shadow-xl hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 group mt-4">
                            <Sparkles size={18} className="group-hover:animate-spin" /> 내가 원하는 건 리스트에 없어요
                          </button>
                        )}
                        
                        <button 
                          onClick={() => setShowComments(true)} 
                          className="w-full py-5 bg-slate-800 text-white rounded-[2rem] text-sm font-black shadow-lg hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 group mt-4 border border-white/5"
                        >
                          <MessageSquare size={18} className="text-amber-500" /> 이웃들의 의견 보기
                        </button>

                        {!isEntrepreneurMode && onModeSwitch && (
                          <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            onClick={() => {
                              if(confirm("예비사장님 모드로 전환하시겠습니까?\n전환 시 해당 공실의 상세 재무 분석 리포트를 이용하실 수 있습니다.")) {
                                onModeSwitch();
                                alert("예비사장님 모드로 활성화되었습니다! 마이페이지에서 상세 리포트를 확인해 보세요.");
                              }
                            }}
                            className="mt-5 p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white relative overflow-hidden group shadow-xl cursor-pointer"
                          >
                            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
                              <Briefcase size={40} className="text-white" />
                            </div>
                            <div className="relative z-10">
                              <h4 className="text-base font-black text-white leading-tight">이 공간을 경영하실 사장님을 기다립니다! ✨</h4>
                              <p className="text-[11px] font-bold text-blue-100/80 mt-1.5 flex items-center gap-1">
                                수익분석 해보기 <ChevronRight size={12} />
                              </p>
                            </div>
                          </motion.div>
                        )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <button onClick={() => setReportMode("dispute")} className="flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors text-[10px] font-black uppercase tracking-widest"><AlertTriangle size={12} /> 정보 정정하기</button>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                   <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] text-white font-black">{i}</div>)}
                   </div>
                   <span className="text-[11px] font-black text-amber-400">{sortedVotes.reduce((acc,curr) => acc+curr.count, 0)}명의 상상 결합 중</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="report" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }} transition={{ type: "spring", damping: 25 }} className="absolute bottom-0 left-0 right-0 p-4 z-30">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
              <button onClick={() => setReportMode(null)} className="text-slate-400 text-xs font-black flex items-center gap-1 mb-8 hover:text-slate-600 transition uppercase tracking-widest"><ChevronDown size={14} className="rotate-90" /> 돌아가기</button>
              <AnimatePresence mode="wait">
                {reportSubmitted ? (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                    <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><CheckCircle2 size={48} className="text-emerald-500" /></div>
                    <p className="font-black text-slate-900 text-3xl tracking-tight mb-2">상상 조각을 받았습니다!</p>
                    <p className="text-slate-400 font-bold">동네를 아끼는 마음, 감사합니다.</p>
                  </motion.div>
                ) : reportMode === "dispute" ? (
                  <motion.div key="dispute" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">공간 정보 정정 🕯️</h3>
                    <p className="text-slate-500 font-bold mb-10 leading-relaxed text-sm">실제 현장 소식과 다른 내용이 있나요? 알려주세요.</p>
                    <div className="flex gap-4">
                      <button onClick={() => submitReport('dispute')} className="flex-1 bg-slate-50 text-slate-400 font-black py-8 rounded-[2rem] hover:bg-slate-100 transition-all flex flex-col items-center gap-4 border-2 border-slate-50">
                        <X size={32} className="text-slate-300" /><span className="text-sm">다른 가게가 생겼어요</span>
                      </button>
                      <button onClick={() => setReportMode("movein")} className="flex-1 bg-amber-50 text-amber-600 font-black py-8 rounded-[2rem] hover:bg-amber-100 transition-all flex flex-col items-center gap-4 border-2 border-amber-100 shadow-sm shadow-amber-500/10">
                        <Sparkles size={32} className="text-amber-500" /><span className="text-sm">입점 소식을 알아요</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="movein" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">🎊 입점 정보 공유</h3>
                    <p className="text-slate-500 font-bold mb-8 text-sm">현수막이나 공사 차량을 보셨나요? 정보를 나눠주세요.</p>
                    <textarea value={moveInText} onChange={(e) => setMoveInText(e.target.value)} placeholder="어떤 브랜드나 가게가 들어오나요?" rows={3} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 font-bold resize-none mb-6 text-slate-700" />
                    <button onClick={() => submitReport('movein', moveInText)} className="w-full bg-slate-950 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/30">제보 완료하기</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            key="comments-sheet" 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[180] flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowComments(false)} />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-t-[3rem] shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex flex-col items-center pt-3 pb-6 px-8">
                <div className="w-12 h-1 bg-slate-200 rounded-full mb-6" />
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
                      <MessageSquare size={20} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-950 tracking-tight">이웃들의 한마디</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">상세 의견 {comments.length}개</p>
                    </div>
                  </div>
                  <button onClick={() => setShowComments(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-32 no-scrollbar">
                {comments.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare size={24} className="text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">아직 남겨진 의견이 없어요.<br/>첫 의견을 남겨보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comments.map((comment) => {
                      const isHidden = comment.reports_count >= 3;
                      return (
                        <div key={comment.id} className="group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[11px] font-black text-slate-900">{comment.profiles?.nickname || "익명 이웃"}</span>
                                <span className="text-[10px] font-bold text-slate-400">{comment.profiles?.neighborhood}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="text-[10px] font-bold text-slate-300">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className={`rounded-2xl rounded-tl-none p-4 border shadow-sm transition-all ${
                                isHidden 
                                ? "bg-slate-50 border-slate-100 opacity-60" 
                                : "bg-slate-50 border-slate-100 group-hover:border-amber-200"
                              }`}>
                                {isHidden ? (
                                  <p className="text-[11px] font-bold text-slate-400 italic">다수의 신고로 인해 가려진 댓글입니다.</p>
                                ) : (
                                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                )}
                              </div>
                              {!isHidden && (
                                <button 
                                  onClick={() => handleReport(comment.id)}
                                  className="mt-2 text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors flex items-center gap-1"
                                >
                                  <AlertTriangle size={10} /> 신고하기
                                </button>
                              )}
                            </div>
                            <div className="flex flex-col items-center gap-4">
                              <button 
                                onClick={() => handleLike(comment.id, comment.is_liked)}
                                className={`flex flex-col items-center gap-1 transition-all ${comment.is_liked ? "text-amber-500 scale-110" : "text-slate-300 hover:text-slate-400"}`}
                              >
                                <Heart size={20} fill={comment.is_liked ? "currentColor" : "none"} strokeWidth={comment.is_liked ? 0 : 2.5} />
                                <span className="text-[10px] font-black">{comment.likes_count}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100">
                <div className="relative flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                      placeholder="이웃들에게 상세 의견을 나눠주세요..." 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/20 transition-all text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  <button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-xl active:scale-90"
                  >
                    {isSubmittingComment ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={20} fill="currentColor" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}} />
    </div>
  );
}
