"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Vacancy, VoteItem } from "@/data/dummyVacancies";
import { X, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Sparkles, ShoppingBag, Coffee, Utensils, Scissors, Stethoscope, Dumbbell, GraduationCap, Camera as CameraIcon, Gift, Share2, MessageSquare, Heart, Send, Briefcase, MapPin, Maximize, Clock, Star, Info } from "lucide-react";
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

function getKoreanSubjectMarker(word: string): string {
  if (!word) return "이";
  const lastChar = word.charAt(word.length - 1);
  const charCode = lastChar.charCodeAt(0);
  if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
    const hasBatchim = (charCode - 0xAC00) % 28 > 0;
    return hasBatchim ? "이" : "가";
  }
  return "이";
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
  const [reportMode, setReportMode] = useState<"choice" | "input" | null>(null);
  const [reportType, setReportType] = useState<"movein" | "dispute" | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const [votingStep, setVotingStep] = useState<"category" | "detail" | "results">(hasVoted ? "results" : "category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const hasPhoto = !!(vacancy.images?.[0] || vacancy.imageUrl);
  const showTopVisual = (votingStep === 'results') || hasPhoto;

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

  // 삭제됨: getCleanName (사용자가 입력한 원본 텍스트 유지를 위해)

  const handleVoteSubmit = async (e?: React.FormEvent, customBrand?: string, customCat?: string) => {
    if (e) e.preventDefault();
    let brand = (customBrand || inputValue).trim();
    if (!brand) return;

    const catId = customCat || selectedCategory || 'etc';
    let currentVotes = [...(vacancy.currentVotes || [])];
    
    // 1인 1투표 로직: 로컬 스토리지 확인
    const prevVoteKey = `gongsil_voted_vacancy_${vacancy.id}`;
    const prevVotedBrand = localStorage.getItem(prevVoteKey);
    
    if (prevVotedBrand && prevVotedBrand !== brand) {
      // 이전 투표 항목 취소 (count 감소)
      currentVotes = currentVotes.map(v => {
        if (v.brand === prevVotedBrand) {
          return { ...v, count: Math.max(0, v.count - 1) };
        }
        return v;
      }).filter(v => v.count > 0);
    } else if (prevVotedBrand === brand) {
      // 동일 항목에 다시 투표한 경우 무시
      setVotingStep("results");
      setInputValue("");
      setSelectedCategory(null);
      return;
    }

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

    // 새로운 투표 기록 저장
    localStorage.setItem(prevVoteKey, brand);

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
    // 각 공실의 고유 ID를 쿼리 파라미터로 결합하여 북마크/공유 시 해당 공실이 즉시 열리도록 딥링크 구축
    const url = `https://여긴뭐가.kr/?vacancyId=${vacancy.id}`;
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
        className="absolute top-[12%] left-1/2 -translate-x-1/2 w-64 h-80 flex flex-col items-center z-0"
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
    <div className="relative w-full h-full overflow-y-auto no-scrollbar bg-slate-950 flex flex-col">
      {/* 대표사진이 등록되었거나 혹은 마지막 투표 결과(결과창에선 건물 애니메이션을 위해 50vh 유지)일 경우에만 상단 50% 공간 노출 */}
      {showTopVisual ? (
        <div className="relative w-full h-[50vh] flex-shrink-0 overflow-hidden flex items-center justify-center">
          {/* 툇마루단 촬영 실사 배경 */}
          <AnimatePresence>
            {hasPhoto && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: votingStep === 'results' ? 0.6 : 0.95 }}
                className="absolute inset-0 z-0 pointer-events-none"
              >
                <img 
                  src={vacancy.images?.[0] || vacancy.imageUrl || ""} 
                  className="w-full h-full object-cover" 
                  alt="Field Photo Background" 
                />
                {/* 자연스러운 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950" />
                <div className="absolute inset-0 backdrop-blur-[1px]" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 건물 3D 애니메이션은 오직 마지막 투표결과창(results) 단계에만 출력 */}
          {votingStep === 'results' && <BuildingVisual />}
        </div>
      ) : (
        /* 대표사진이 등록되기 전이고 결과창이 아닐 때는 상단 50% 공간 없이 즉시 스크롤 패딩으로 대체하여 내용창 밀어올림 */
        <div className="h-28 w-full flex-shrink-0" />
      )}

      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-50">
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

      {/* 하단 투표/제보 시트 영역 (자연스러운 스크롤 지원 및 상태표시줄 잘림 대책용 넉넉한 바닥 패딩 pb-36) */}
      <div className="w-full px-4 pb-36 md:pb-24 relative z-20 flex-shrink-0 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {!reportMode ? (
            <motion.div 
              key="voter"
              initial={{ y: 100, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-2xl mx-auto"
            >
              {/* [💡 이 공간, 어떤 곳인가요? 참고 자료 카드]
                  사용자가 상상 카테고리를 고르기 전(votingStep === 'category')에만 참고 정보를 묶어서 노출하고, 
                  본격적인 세부 투표에 진입하면 깨끗하게 숨겨 불필요한 시선 흐려짐을 원천 차단합니다! */}
              {votingStep === 'category' && (
                <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-6 mb-5 w-full shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Info size={16} className="text-amber-500" />
                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest leading-none">💡 이 공간, 어떤 곳인가요?</h4>
                  </div>
                  
                  {/* 메인 정보 태그 그룹 */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {/* 1. 명칭 및 층수 태그 */}
                    <div className="px-4 py-2 bg-amber-500 text-slate-950 rounded-full text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2">
                      <MapPin size={12} strokeWidth={3} />
                      {vacancy.landmark || vacancy.address.split(' ').pop()} {vacancy.floor?.includes('층') ? vacancy.floor : `${vacancy.floor || '1'}층`}
                    </div>

                    {/* 2. 규모 태그 */}
                    <div className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-full text-xs font-bold border border-white/10 flex items-center gap-2">
                      <Maximize size={12} className="text-amber-400" />
                      {vacancy.area ? (vacancy.area.includes('평') ? vacancy.area : `전용면적 ${vacancy.area}평`) : (vacancy.size || "규모 확인 중")}
                    </div>

                    {/* 3. 공실 기간 태그 */}
                    {vacancy.vacancyPeriod && vacancy.vacancyPeriod !== "잘 모르겠어요" && (
                      <div className="px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-full text-xs font-bold border border-white/10 flex items-center gap-2">
                        <Clock size={12} className="text-amber-400" />
                        {vacancy.vacancyPeriod}
                      </div>
                    )}

                    {/* 4. 특징 태그들 */}
                    {vacancy.tags?.filter(t => t !== "이웃발견").map(tag => (
                      <div key={tag} className="px-4 py-2 bg-white/5 text-white/70 rounded-full text-xs font-bold border border-white/5">
                        {tag}
                      </div>
                    ))}
                  </div>

                  {/* 툇마루단 한마디 */}
                  {vacancy.surveyRemarks && (
                    <div className="w-full mb-5">
                      <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">툇마루단의 한마디</p>
                      </div>
                      <div className="inline-flex px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-2xl text-xs font-bold border border-white/10 shadow-sm">
                        "{vacancy.surveyRemarks}"
                      </div>
                    </div>
                  )}

                  {/* 이웃들의 상상 TOP 3 (대분류 기준 집계) */}
                  {groupedVotes.length > 0 && (
                    <div className="w-full space-y-2">
                      <div className="flex items-center gap-2 ml-1">
                        <Star size={14} className="text-amber-500" />
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">현재 이웃들의 상상 TOP 3</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {groupedVotes.slice(0, 3).map((group, i) => (
                          <div key={group.id} className="flex items-center justify-between bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-[11px] font-black text-slate-950 shadow-lg shadow-amber-500/20">{i + 1}</div>
                              <div className="flex items-center gap-2 text-sm font-bold text-white">
                                <span className="scale-75 opacity-70 flex items-center justify-center">{group.icon}</span>
                                <span>{group.label}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">{group.total}표</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 중개사 정보 */}
                  {vacancy.realtorName && (
                    <div className="mt-4 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <Briefcase size={12} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400">담당 중개사: <span className="text-white ml-1">{vacancy.realtorName}</span></span>
                      </div>
                      {vacancy.realtorPhone && (
                        <a href={`tel:${vacancy.realtorPhone}`} className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/10 hover:bg-amber-500/20 transition-all">
                          문의하기
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* [🗳️ 상상의 실 투표함 구역]
                  참고자료 리포트 카드와 확실한 경계를 띄우고, 2px 골드빛 보더를 둘러 인터랙티브 포인트를 즉시 인지하도록 유도합니다! */}
              <div className="bg-slate-900/95 backdrop-blur-3xl border-2 border-amber-500/20 rounded-[3rem] p-6 w-full shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Gift size={20} className="text-white" />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1">상상 투표소</h3>
                     <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">
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
                    {vacancy.status === 'completed' ? (
                      <motion.div 
                        key="completed-msg"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.3)] border-4 border-white/20 text-center relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12 scale-150"><Sparkles size={100} className="text-white" /></div>
                        <div className="relative z-10">
                          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/30">
                            <CheckCircle2 size={40} className="text-white" strokeWidth={3} />
                          </div>
                          <h4 className="text-2xl font-black text-white tracking-tighter leading-tight mb-2">계약이 완료되었습니다! 🎊</h4>
                          <p className="text-base font-bold text-emerald-50 leading-relaxed">
                            어떤 공간이 입점될 예정입니다.<br/>
                            많이 기대해주세요! ✨
                          </p>
                        </div>
                      </motion.div>
                    ) : votingStep === "category" ? (
                      <motion.div key="cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-4">
                        
                        {/* 질문 헤더 수정 */}
                        <div className="text-center my-2">
                          <h4 className="text-base font-black text-amber-400 tracking-tight leading-none mb-1">
                            어떤 공간이 생기면 좋을까요?
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400">동네에 필요한 공간을 하나 꾹 눌러주세요</p>
                        </div>

                        {recommendedCategory && !hasVoted && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedCategory(recommendedCategory ? getCategoryIdFromRecommendation(recommendedCategory) : null);
                              handleVoteSubmit(undefined, recommendedCategory || undefined, recommendedCategory ? getCategoryIdFromRecommendation(recommendedCategory) : undefined);
                            }}
                            className="w-full p-4 md:p-6 bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500 rounded-[2.5rem] border-[3px] border-white shadow-[0_25px_50px_rgba(245,158,11,0.3)] flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 shadow-2xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                                <Sparkles size={20} fill="currentColor" />
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-3 mb-1">
                                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] leading-none opacity-80">{userProfile?.nickname || "대표님"}님을 위한 추천</p>
                                  <span className="px-2.5 py-0.5 bg-slate-950 text-amber-500 text-[9px] font-black rounded-full uppercase tracking-tighter shadow-lg">
                                    {CATEGORIES.find(c => c.id === getCategoryIdFromRecommendation(recommendedCategory || ""))?.label || "기타"}
                                  </span>
                                </div>
                                <h4 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tighter leading-tight italic">"{recommendedCategory}"</h4>
                              </div>
                            </div>
                          </motion.button>
                        )}
                        
                        {/* 3x3 Grid 개편 */}
                        <div className="grid grid-cols-3 gap-3">
                          {CATEGORIES.map((cat) => (
                             <button 
                               key={cat.id} 
                               onClick={() => handleCategorySelect(cat.id)} 
                               className="flex flex-col items-center justify-center h-20 w-full bg-white/5 border border-white/10 rounded-2xl hover:bg-amber-500 hover:border-amber-400 active:scale-95 transition-all group"
                             >
                               <div className="text-white group-hover:scale-110 transition-transform mb-1.5 scale-90">{cat.icon}</div>
                               <span className="text-[10px] font-black text-white/70 group-hover:text-white uppercase leading-none">{cat.label}</span>
                             </button>
                          ))}
                        </div>
                      </motion.div>
                  ) : votingStep === "detail" ? (
                    <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-4">
                       
                       {/* 대분류 이름 주입 질문 헤더 추가 (따옴표 제거 & 한국어 이/가 조사 유연 대응) */}
                       {(() => {
                         const catLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || "공간";
                         const marker = getKoreanSubjectMarker(catLabel);
                         return (
                           <div className="text-center my-2">
                             <h4 className="text-base font-black text-amber-400 tracking-tight leading-none mb-1">
                               어떤 {catLabel}{marker} 생기면 좋을까요?
                             </h4>
                             <p className="text-[10px] font-bold text-slate-400">원하시는 세부 공간 종류나 브랜드를 선택 또는 입력해 주세요</p>
                           </div>
                         );
                       })()}

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
                                <h4 className="text-sm font-black text-white truncate max-w-[150px]">
                                  {groupedVotes.length > 0 
                                    ? groupedVotes.filter(g => g.total === groupedVotes[0].total).map(g => g.label).join(' · ') 
                                    : "상상을 더해주세요!"}
                                </h4>
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

                        {/* 베타 버전에서는 예비사장님 모드 진입 버튼 숨김
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
                        */}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <button onClick={() => setReportMode("choice")} className="flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors text-[10px] font-black uppercase tracking-widest"><AlertTriangle size={12} /> 정보 정정하기</button>
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
          <motion.div 
            key="report" 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }} 
            transition={{ type: "spring", damping: 25 }} 
            className="w-full max-w-2xl mx-auto"
          >
            {/* 이전 투표창과 완벽히 통일된 딥 실버/슬레이트 카드 스타일 */}
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 w-full shadow-2xl relative overflow-hidden text-white">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
              <button 
                onClick={() => {
                  if (reportMode === "input") {
                    setReportMode("choice");
                  } else {
                    setReportMode(null);
                    setReportType(null);
                    setReportText("");
                  }
                }} 
                className="text-slate-400 hover:text-white text-xs font-black flex items-center gap-1 mb-8 transition uppercase tracking-widest"
              >
                <ChevronDown size={14} className="rotate-90" /> 돌아가기
              </button>

              <AnimatePresence mode="wait">
                {reportSubmitted ? (
                  /* 정정 리포트 제출 성공 서브 스크린 - 툇마루단/CEO 에스컬레이션 알림 포함 */
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center">
                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner text-amber-500">
                      <AlertTriangle size={32} />
                    </div>
                    <span className="inline-block px-3 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-black rounded-full mb-3 uppercase tracking-widest">
                      ⚠️ 현장 확인 대기 중
                    </span>
                    <h3 className="font-black text-white text-xl tracking-tight mb-2">검토 리스트에 즉시 접수되었습니다</h3>
                    <p className="text-[11px] font-bold text-slate-400 mb-6 leading-relaxed max-w-sm mx-auto">
                      담당 지역 <span className="text-amber-400 font-black">툇마루단, 운영팀장, CEO</span>가 직접 확인해야 할 공실 정정 리스트에 즉시 반영되었습니다.
                    </p>
                    
                    {/* 사용자 제보 내용 표시 */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 mb-8 text-left max-w-md mx-auto">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[9px] font-black text-amber-500 tracking-wider uppercase">제보된 공간 정정 의견</span>
                      </div>
                      <p className="text-xs font-bold text-slate-300 leading-relaxed whitespace-pre-wrap">
                        "{reportText}"
                      </p>
                    </div>

                    <button 
                      onClick={() => {
                        setReportSubmitted(false);
                        setReportMode(null);
                        setReportText("");
                        setReportType(null);
                      }} 
                      className="w-full max-w-md bg-amber-500 text-slate-950 font-black py-4.5 rounded-2xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                    >
                      확인
                    </button>
                  </motion.div>
                ) : reportMode === "choice" ? (
                  /* 정정 리포트 유형 선택 서브 스크린 (입점소식 알아요 vs 달라요) */
                  <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      <AlertTriangle size={18} className="text-amber-500" />
                      <h3 className="text-lg font-black text-amber-500 uppercase tracking-widest leading-none">공간 정보 정정</h3>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mb-6">실제 현장 소식과 다른 내용이 있나요? 올바른 정보를 제보해주세요.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {/* 1. 입점소식을 알아요 */}
                      <button
                        onClick={() => { setReportType("movein"); setReportMode("input"); }}
                        className="flex flex-col items-center justify-center p-6 rounded-3xl border border-white/5 bg-slate-950/40 hover:bg-slate-950/80 hover:border-amber-500/50 transition-all shadow-md group text-center"
                      >
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                          <Sparkles size={24} />
                        </div>
                        <span className="text-sm font-black text-white mb-1">입점소식을 알아요</span>
                        <span className="text-[9px] font-bold text-slate-500 leading-tight">공사 소식이나 현수막 제보</span>
                      </button>

                      {/* 2. 제가 아는 정보와 달라요 */}
                      <button
                        onClick={() => { setReportType("dispute"); setReportMode("input"); }}
                        className="flex flex-col items-center justify-center p-6 rounded-3xl border border-white/5 bg-slate-950/40 hover:bg-slate-950/80 hover:border-amber-500/50 transition-all shadow-md group text-center"
                      >
                        <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                          <AlertTriangle size={24} />
                        </div>
                        <span className="text-sm font-black text-white mb-1">제가 아는 정보와 달라요</span>
                        <span className="text-[9px] font-bold text-slate-500 leading-tight">공실 여부 또는 정보 정정</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* 정정 리포트 텍스트 입력 서브 스크린 */
                  <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-2 ml-1">
                      {reportType === "movein" ? (
                        <Sparkles size={18} className="text-amber-500" />
                      ) : (
                        <AlertTriangle size={18} className="text-orange-500" />
                      )}
                      <h3 className="text-lg font-black text-white uppercase tracking-widest leading-none">
                        {reportType === "movein" ? "🎊 입점 정보 공유" : "🕯️ 정보 상이 제보"}
                      </h3>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mb-6">
                      {reportType === "movein" 
                        ? "현수막이나 공사 현황을 보셨나요? 정보를 나눠주세요." 
                        : "실제 현장 정보와 어떤 점이 다른가요? 상세하게 적어주세요."}
                    </p>
                    
                    <textarea 
                      value={reportText} 
                      onChange={(e) => setReportText(e.target.value)} 
                      placeholder={
                        reportType === "movein" 
                          ? "예: 1층에 투썸플레이스가 다음 주부터 공사를 시작한다고 현수막이 붙어 있어요!" 
                          : "예: 이 공간은 이미 공실이 아니라 옷가게가 영업을 시작했어요 / 1층이 아니라 2층 공실이에요."
                      } 
                      rows={4} 
                      className="w-full px-6 py-5 bg-slate-950/80 border border-white/10 rounded-3xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 font-bold resize-none mb-6 text-white placeholder-slate-600 text-sm" 
                    />
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setReportMode("choice")} 
                        className="flex-1 py-4.5 bg-white/5 border border-white/10 text-slate-300 font-black rounded-2xl text-sm hover:bg-white/10 transition-all"
                      >
                        돌아가기
                      </button>
                      <button 
                        onClick={() => {
                          if (reportText.trim()) {
                            submitReport(reportType!, reportText);
                          }
                        }}
                        disabled={!reportText.trim()}
                        className="flex-1 py-4.5 bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black rounded-2xl text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/10"
                      >
                        제보 완료하기
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

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
