"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User as UserIcon, MapPin, Settings, Heart, MessageSquare, ChevronRight, LogOut, 
  Camera, Star, Award, Briefcase, Baby, Dog, Zap, HelpCircle, Edit3, Check, 
  Clock, Lightbulb, Sparkles, LayoutDashboard, ShieldCheck, Key, Home, Plus, Navigation as NavigationIcon, X, ArrowLeft, Gift
} from "lucide-react";
import { UserProfile, loadSavedProfile, PERSONAS } from "./AuthOnboarding";
import FeasibilityReport from "./FeasibilityReport";
import { fetchUserReports, DbReport } from "@/lib/db";
import { supabase } from "@/lib/supabase";

const VOTES_KEY = "gongsil_user_votes";

export interface VoteRecord {
  id: string;
  brand: string;
  location: string;
  timestamp: string;
}

export function recordVote(brand: string, location: string) {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(VOTES_KEY);
    const votes = saved ? JSON.parse(saved) : [];
    votes.unshift({
      id: Math.random().toString(36).substring(2, 11),
      brand,
      location,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes.slice(0, 50)));
  } catch (e) {
    console.error("Failed to record vote", e);
  }
}

export default function MyPage({ onLogout, isEntrepreneurMode, onModeChange, onClose, vacancies = [], onVacancySelect }: { 
  onLogout: () => void,
  isEntrepreneurMode: boolean,
  onModeChange: (val: boolean) => void,
  onClose?: () => void,
  vacancies?: any[],
  onVacancySelect?: (vacancy: any) => void
}) {
  const [showFeasibility, setShowFeasibility] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showEntrepreneurModal, setShowEntrepreneurModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "activity" | "reports" | "settings">(isEntrepreneurMode ? "activity" : "profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [dbVotes, setDbVotes] = useState<any[]>([]);
  const [dbComments, setDbComments] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  
  const [editPersonaIds, setEditPersonaIds] = useState<string[]>([]);
  const [editCustomPersona, setEditCustomPersona] = useState("");
  
  const [adminCode, setAdminCode] = useState("");
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  const [isRegisteringWork, setIsRegisteringWork] = useState(false);
  const [tempWorkLocation, setTempWorkLocation] = useState<{ neighborhood: string; lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tempWorkActivityTimes, setTempWorkActivityTimes] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<"all" | "vote" | "comment">("all");

  // 1. Load saved profile on mount
  useEffect(() => {
    const profile = loadSavedProfile();
    if (profile) {
      setUserProfile(profile);
      setEditNickname(profile.nickname);
      setEditPersonaIds(profile.personaIds || []);
    }
  }, []);

  // 2. Load Supabase activity once on mount
  useEffect(() => {
    async function loadSupabaseActivity() {
      if (typeof window === "undefined") return;
      const userId = localStorage.getItem("gongsil_user_id");
      if (!userId) {
        setIsLoadingActivity(false);
        return;
      }
      setIsLoadingActivity(true);
      try {
        const [votesRes, commentsRes] = await Promise.all([
          supabase.from("votes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false })
        ]);
        if (votesRes.data) setDbVotes(votesRes.data);
        if (commentsRes.data) setDbComments(commentsRes.data);
      } catch (e) {
        console.warn("Supabase 활동 내역 조회 실패:", e);
      } finally {
        setIsLoadingActivity(false);
      }
    }
    loadSupabaseActivity();
  }, []);

  const votes = dbVotes.map(v => {
    const matched = vacancies.find(vac => vac.id === v.vacancy_id);
    return {
      id: v.id,
      brand: v.comment || v.category,
      location: matched ? (matched.landmark || matched.address) : "우리동네 공실",
      timestamp: v.created_at,
      vacancyId: v.vacancy_id
    };
  });

  const activityTimeline = [
    ...dbVotes.map(v => {
      const matched = vacancies.find(vac => vac.id === v.vacancy_id);
      return {
        id: v.id,
        type: "vote" as const,
        title: v.comment || v.category,
        location: matched ? (matched.landmark || matched.address) : "우리동네 공실",
        timestamp: v.created_at,
        points: 50,
        vacancyId: v.vacancy_id
      };
    }),
    ...dbComments.map(c => {
      const matched = vacancies.find(vac => vac.id === c.vacancy_id);
      return {
        id: c.id,
        type: "comment" as const,
        title: c.content,
        location: matched ? (matched.landmark || matched.address) : "우리동네 공실",
        timestamp: c.created_at,
        points: 50,
        vacancyId: c.vacancy_id
      };
    })
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalPoints = (dbVotes.length * 50) + (dbComments.length * 50);

  if (!userProfile) return null;

  const toggleEditPersona = (id: string) => {
    if (editPersonaIds.includes(id)) {
      setEditPersonaIds(editPersonaIds.filter(i => i !== id));
    } else {
      if (editPersonaIds.length >= 3) {
        alert("나의 조각은 최대 3개까지 선택할 수 있습니다.");
        return;
      }
      setEditPersonaIds([...editPersonaIds, id]);
    }
  };

  const getCombinedLabel = (ids: string[], custom: string, gender: string | undefined) => {
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
       if (id === "other") return custom.trim() || "정체를 알 수 없는 이웃";
       return PERSONAS.find(p => p.id === id)?.name || "";
    }

    if (has("worker") && has("parenting")) return gender === "female" ? "갓생 사는 워킹맘" : "갓생 사는 워킹대디";
    if (has("worker") && has("student")) return "성장을 꿈꾸는 공부하는 직장인";
    if (has("worker") && has("senior")) return "동네를 훤히 꿰고 있는 베테랑 직장인";
    if (has("parenting") && has("senior")) return "아이와 함께 동네를 지키는 든든한 터줏대감";
    if (has("student") && has("solo")) return "자취하며 꿈을 키우는 힙스터";
    if (has("solo") && has("senior")) return "혼자서도 동네를 꽉 잡고 있는 터줏대감";
    if (has("worker") && has("pet")) return "댕냥이가 기다리는 프로 퇴근러";
    if (has("parenting") && has("pet")) return "아이와 댕냥이의 든든한 수호신";
    if (has("worker") && has("solo")) return "자유를 만끽하는 직장인";
    if (has("solo") && has("pet")) return "반려동물과 힐링 중인 1인 가구";

    const selectedCats = ids.map(getCat);
    if (ids.length === 2) {
       const josa = (selectedCats[0].charCodeAt(selectedCats[0].length - 1) - 0xac00) % 28 > 0 ? "과" : "와";
       return `${selectedCats[0]}${josa} ${selectedCats[1]}의 삶을 꾸리는 분`;
    }

    return `동네의 슈퍼 히어로! ${selectedCats.join('·')}`;
  };

  const saveChanges = () => {
    const combinedLabel = getCombinedLabel(editPersonaIds, editCustomPersona, userProfile.gender);
    const updatedProfile: UserProfile = {
      ...userProfile,
      nickname: editNickname,
      personaIds: editPersonaIds,
      personaLabel: combinedLabel
    };
    setUserProfile(updatedProfile);
    localStorage.setItem("gongsil_user_profile", JSON.stringify(updatedProfile));
    setIsEditing(false);
  };

  const handleAdminAuth = () => {
    if (adminCode === "0000") {
      const updatedProfile = { ...userProfile, isAdmin: true };
      setUserProfile(updatedProfile);
      localStorage.setItem("gongsil_user_profile", JSON.stringify(updatedProfile));
      alert("관리자 권한이 승인되었습니다! 🔐");
      setAdminCode("");
      setShowAdminAuth(false);
    } else {
      alert("코드가 일치하지 않습니다.");
    }
  };

  const addWorkLocation = () => {
    if ("geolocation" in navigator) {
      setIsRegisteringWork(true);
      setLocationError(null);
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const geocoder = new (window as any).kakao.maps.services.Geocoder();
          geocoder.coord2Address(longitude, latitude, (result: any, status: any) => {
            if (status === (window as any).kakao.maps.services.Status.OK) {
              const addr = result[0].address.address_name;
              const parts = addr.split(' ');
              const dong = parts.find((p: string) => p.endsWith('동') || p.endsWith('가')) || parts[parts.length - 1];
              
              setTempWorkLocation({ neighborhood: dong, lat: latitude, lng: longitude });
            } else {
              setLocationError("주소 변환에 실패했습니다. 잠시 후 다시 시도해 주세요.");
              setIsRegisteringWork(false);
            }
          });
        },
        (error) => {
          let msg = "위치 인식에 실패했습니다.";
          if (error.code === 1) msg = "위치 권한 허용이 필요합니다.";
          else if (error.code === 3) msg = "인증 시간이 초과되었습니다. 다시 시도해 주세요.";
          
          setLocationError(msg);
          setIsRegisteringWork(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const saveWorkLocation = () => {
    if (!tempWorkLocation || tempWorkActivityTimes.length === 0) return;
    
    const updatedProfile: UserProfile = {
      ...userProfile,
      work: tempWorkLocation,
      workActivityTimes: tempWorkActivityTimes
    };
    setUserProfile(updatedProfile);
    localStorage.setItem("gongsil_user_profile", JSON.stringify(updatedProfile));
    
    alert(`'${tempWorkLocation.neighborhood}'이 나의 일터로 등록되었습니다! 🏢`);
    setTempWorkLocation(null);
    setTempWorkActivityTimes([]);
    setIsRegisteringWork(false);
  };

  const removeWorkLocation = () => {
    if (confirm("등록된 직장 정보를 삭제하시겠어요?")) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        work: undefined,
        activeLocationType: 'home'
      };
      setUserProfile(updatedProfile);
      localStorage.setItem("gongsil_user_profile", JSON.stringify(updatedProfile));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans relative">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-[3rem] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onClose && (
              <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all">
                <ArrowLeft size={22} className="text-slate-900" />
              </button>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              나의 페이지
              {userProfile.isAdmin && <ShieldCheck className="text-amber-500" size={20} />}
            </h1>
          </div>
          <button onClick={() => setActiveTab("settings")} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <Settings size={22} className="text-slate-400" />
          </button>
        </div>

        {/* Mode Switch Premium Toggle */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex mb-8 border border-slate-200">
           <button 
             onClick={() => onModeChange(false)}
             className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${!isEntrepreneurMode ? "bg-white text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
           >
             <Home size={14} /> 우리동네 주민 모드
           </button>
           <button 
             onClick={() => setShowEntrepreneurModal(true)}
             className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${isEntrepreneurMode ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
           >
             <Briefcase size={14} /> 예비사장님 모드
           </button>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-slate-100 rounded-full border-4 border-white shadow-md relative overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${userProfile.nickname}&backgroundColor=transparent`} alt="avatar" className="w-full h-full object-cover p-1" />
          </div>
          <div>
            <p className="text-xs text-amber-600 font-bold mb-0.5">
              {isEntrepreneurMode ? "성장을 꿈꾸는 예비사장님" : (userProfile.personaLabel || `${userProfile.home?.neighborhood || "우리동네"} 활동 이웃`)}
            </p>
            <h2 className="text-xl font-black text-slate-900">{userProfile.nickname}</h2>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-200/50 rounded-2xl">
          {(!isEntrepreneurMode ? ["profile", "activity", "reports", "settings"] : ["activity", "reports", "settings"]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {tab === "profile" ? "내 정보" : tab === "activity" ? (isEntrepreneurMode ? "관심공간" : "활동 내역") : tab === "reports" ? "제보 & 알림함" : "설정"}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {isEditing ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm space-y-6 border border-slate-100">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">닉네임 수정</label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold focus:border-amber-500 transition-all outline-none"
                  />
                </div>
                
                <button onClick={saveChanges} className="w-full bg-slate-950 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">
                  닉네임 저장하기
                </button>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">동네를 채우는 나의 조각 수정 (최대 3개)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PERSONAS.map((p) => {
                      const isSelected = editPersonaIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleEditPersona(p.id)}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                            isSelected ? "border-amber-500 bg-amber-50" : "border-slate-50 bg-slate-50"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                            isSelected ? "bg-amber-500 text-white" : "bg-white text-slate-400"
                          }`}>
                            {p.icon}
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? "text-slate-900" : "text-slate-400"}`}>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {editPersonaIds.includes("other") && (
                    <div className="mt-4 p-3 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-3">
                      <Edit3 size={16} className="text-amber-500" />
                      <input 
                         type="text" 
                         value={editCustomPersona}
                         onChange={(e) => setEditCustomPersona(e.target.value)}
                         placeholder="나만의 조각 입력"
                         className="flex-1 bg-transparent focus:outline-none font-bold text-sm"
                      />
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                    <p className="text-xs text-amber-600 font-bold mb-1">예상 프로필</p>
                    <p className="text-sm font-black text-slate-900">
                      ✨ "{getCombinedLabel(editPersonaIds, editCustomPersona, userProfile.gender)}"
                    </p>
                  </div>

                  <button onClick={saveChanges} className="w-full bg-amber-500 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all mt-4">
                    조각 수정 완료
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-900 flex items-center gap-2">
                      <Award size={18} className="text-amber-500" />
                      나의 동네 프로필
                    </h3>
                    <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                      수정하기
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                      <span className="text-xs font-bold text-slate-500">인증 지역</span>
                      <span className="text-sm font-black text-slate-900">{userProfile.home?.neighborhood || "미인증"}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                      <span className="text-xs font-bold text-slate-500">나의 조각</span>
                      <span className="text-sm font-black text-slate-900 text-right">{userProfile.personaLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-black text-slate-900 flex items-center gap-2 mb-6">
                    <NavigationIcon size={18} className="text-blue-500" />
                    나의 생활 반경
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-amber-500">
                           <Home size={20} />
                         </div>
                         <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">우리 동네</p>
                           <p className="text-sm font-black text-slate-900">{userProfile.home.neighborhood}</p>
                         </div>
                       </div>
                       <div className="px-3 py-1 bg-amber-50 text-[10px] font-black text-amber-600 rounded-lg">기본</div>
                    </div>

                    {userProfile.work ? (
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-500">
                             <Briefcase size={20} />
                           </div>
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">나의 일터</p>
                             <div className="flex items-center gap-2">
                               <p className="text-sm font-black text-slate-900">{userProfile.work.neighborhood}</p>
                               <div className="flex gap-1">
                                 {userProfile.workActivityTimes?.map(time => (
                                   <span key={time} className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">
                                     {time}
                                   </span>
                                 ))}
                               </div>
                             </div>
                           </div>
                         </div>
                         <button onClick={removeWorkLocation} className="text-[10px] font-bold text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">삭제</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <button 
                          onClick={addWorkLocation}
                          disabled={isRegisteringWork}
                          className="w-full p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all group disabled:opacity-50"
                        >
                          <NavigationIcon size={18} className={`${isRegisteringWork ? "animate-pulse text-blue-500" : "text-slate-300 group-hover:text-blue-500"}`} />
                          <span className="text-sm font-bold text-slate-400 group-hover:text-blue-600">
                            {isRegisteringWork ? "위치 인증 중..." : "나의 일터 추가하기"}
                          </span>
                        </button>

                        <AnimatePresence>
                          {locationError && !tempWorkLocation && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                              className="mt-3 p-5 bg-red-50 border-2 border-red-100 rounded-3xl text-center"
                            >
                              <p className="text-sm font-black text-red-600 mb-1">인증 실패</p>
                              <p className="text-[11px] font-bold text-red-400 mb-4">정확한 정보를 위해 <br/>위치 권한 허용이 반드시 필요해요.</p>
                              <button 
                                onClick={addWorkLocation}
                                className="w-full py-3 bg-white text-red-600 border-2 border-red-100 rounded-2xl text-xs font-black shadow-sm active:scale-95 transition-all"
                              >
                                다시 시도하기
                              </button>
                              <button 
                                onClick={() => setLocationError(null)}
                                className="mt-3 text-[10px] font-bold text-red-300 underline"
                              >
                                닫기
                              </button>
                            </motion.div>
                          )}

                          {tempWorkLocation && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                              className="mt-3 p-5 bg-white border-2 border-blue-100 rounded-3xl shadow-xl shadow-blue-500/5 relative z-20"
                            >
                              <p className="text-xs font-black text-slate-400 mb-4 text-center uppercase tracking-widest">일터 활동 시간 선택</p>
                              <div className="grid grid-cols-3 gap-2">
                                {["평일 낮", "평일 저녁", "주말"].map(time => {
                                  const isHomeTime = userProfile.activityTimes?.includes(time);
                                  const isSelected = tempWorkActivityTimes.includes(time);
                                  return (
                                    <button
                                      key={time}
                                      disabled={isHomeTime}
                                      onClick={() => {
                                        if (isSelected) setTempWorkActivityTimes(prev => prev.filter(t => t !== time));
                                        else setTempWorkActivityTimes(prev => [...prev, time]);
                                      }}
                                      className={`py-3 rounded-xl text-[11px] font-black transition-all border-2 ${
                                        isHomeTime 
                                          ? "bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed" 
                                          : isSelected
                                            ? "bg-blue-500 text-white border-blue-500"
                                            : "bg-white text-slate-600 border-slate-100 hover:border-blue-400 hover:text-blue-600"
                                      }`}
                                    >
                                      {time}
                                      {isHomeTime && <div className="text-[8px] mt-0.5 text-slate-300">홈 시간</div>}
                                    </button>
                                  );
                                })}
                              </div>
                              <button 
                                onClick={saveWorkLocation}
                                disabled={tempWorkActivityTimes.length === 0}
                                className="w-full mt-4 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-600/20 disabled:opacity-30 disabled:shadow-none transition-all"
                              >
                                선택 완료
                              </button>
                              <button 
                                onClick={() => { setTempWorkLocation(null); setTempWorkActivityTimes([]); setIsRegisteringWork(false); }}
                                className="w-full mt-3 text-[10px] font-bold text-slate-300 hover:text-slate-500"
                              >
                                취소
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-amber-500/10">
                        <Star size={20} className="text-amber-600" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">상상 지수</p>
                      <p className="text-xl font-black text-slate-900">{totalPoints} P</p>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveTab("activity");
                        setActivityFilter("all");
                      }}
                      className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-left hover:border-blue-300 hover:scale-[1.02] active:scale-95 transition-all w-full cursor-pointer flex flex-col items-start group"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-blue-500/10 group-hover:bg-blue-200 transition-all">
                        <MessageSquare size={20} className="text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">남긴 참여</p>
                      <div className="flex items-center justify-between w-full">
                        <p className="text-xl font-black text-slate-900">{dbVotes.length + dbComments.length}개</p>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </button>
                  </div>

                  {/* 🎁 상상 포인트 혜택 안내 가이드 카드 */}
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-[2.5rem] border border-amber-500/20 shadow-xl relative overflow-hidden select-none">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-150"><Award size={80} className="text-amber-500" /></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                          <Gift size={14} fill="currentColor" />
                        </div>
                        <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest leading-none">상상 포인트 혜택 안내</h4>
                      </div>
                      <p className="text-xs font-bold text-slate-200 leading-relaxed break-keep">
                        이웃님이 모으신 상상 포인트는 향후 '여긴뭐가'를 통해 실제 오프라인 골목에 오픈하는 매장의 <span className="text-amber-400 font-black">할인 쿠폰</span>으로 교환해 이용하실 수 있습니다! 🎁
                      </p>
                      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-black tracking-tighter">
                        <span>🗳️ 투표참여 50P</span>
                        <span>•</span>
                        <span>💬 의견작성 50P</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "activity" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black text-slate-900">
                {isEntrepreneurMode ? "관심공간" : "최근 상상 더하기 내역"}
              </h3>
              {isEntrepreneurMode && (
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Analysis Ready</span>
              )}
            </div>

            {!isEntrepreneurMode && (
              <div className="flex gap-2 p-1 bg-slate-200/40 rounded-xl w-fit">
                {(["all", "vote", "comment"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      activityFilter === filter
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {filter === "all" ? "전체" : filter === "vote" ? "🗳️ 투표" : "💬 의견"}
                  </button>
                ))}
              </div>
            )}

            {isLoadingActivity ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold text-slate-400">활동 내역을 불러오고 있어요...</p>
              </div>
            ) : (isEntrepreneurMode ? votes.length === 0 : activityTimeline.length === 0) ? (
              <div className="bg-white p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200/80 flex flex-col items-center justify-center py-14 px-6">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-500 shadow-inner">
                  <Lightbulb size={28} />
                </div>
                <p className="text-slate-900 font-black text-sm mb-1.5 break-keep">아직 상상한 기록이 없어요</p>
                <p className="text-slate-400 font-bold text-[11px] leading-relaxed max-w-[220px] mx-auto mb-6 break-keep">
                  우리 동네 지도를 둘러보고 비어 있는 공실 공간에 이웃님만의 상상 조각을 첫 번째로 던져보세요! 🎁
                </p>
                <button
                  onClick={onClose}
                  className="px-5 py-3 bg-slate-950 text-white font-black text-xs rounded-xl shadow-lg shadow-slate-950/10 hover:scale-[1.03] active:scale-95 transition-all"
                >
                  공실 구경하러 가기
                </button>
              </div>
            ) : isEntrepreneurMode ? (
              /* 예비사장님 관심 공간 */
              <div className="space-y-3">
                {votes.map((vote) => {
                  const matchedVacancy = vacancies.find(vac => vac.id === vote.vacancyId);
                  return (
                    <div key={vote.id} className="bg-white rounded-3xl shadow-sm border border-blue-100 hover:border-blue-300 transition-all p-0 overflow-hidden">
                      <button 
                        onClick={() => {
                          if (matchedVacancy && onVacancySelect) {
                            onVacancySelect(matchedVacancy);
                          }
                        }}
                        disabled={!matchedVacancy || !onVacancySelect}
                        className={`w-full p-5 flex items-center justify-between text-left transition-colors ${
                          matchedVacancy && onVacancySelect ? "hover:bg-slate-50 cursor-pointer" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-blue-600 shadow-blue-500/20">
                            <Briefcase size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{vote.brand}</p>
                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                              <MapPin size={10} />
                              {vote.location}
                            </p>
                          </div>
                        </div>
                        {matchedVacancy && onVacancySelect && <ChevronRight size={18} className="text-slate-300" />}
                      </button>

                      <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex flex-col">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">상태</p>
                           <p className="text-[11px] font-bold text-slate-900">창업 타당성 분석 가능</p>
                         </div>
                         <button 
                           onClick={() => {
                             setSelectedLocation(vote.location);
                             setShowFeasibility(true);
                           }}
                           className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
                         >
                           <Zap size={14} fill="currentColor" /> 재무 리포트 생성
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 동네주민 통합 활동 피드 */
              <div className="space-y-3">
                {activityTimeline
                  .filter(item => activityFilter === 'all' || item.type === activityFilter)
                  .map((item) => {
                    const matchedVacancy = vacancies.find(vac => vac.id === item.vacancyId);
                    return (
                      <button 
                        key={item.id} 
                        onClick={() => {
                          if (matchedVacancy && onVacancySelect) {
                            onVacancySelect(matchedVacancy);
                          }
                        }}
                        disabled={!matchedVacancy || !onVacancySelect}
                        className={`w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex items-center justify-between transition-all text-left ${
                          matchedVacancy && onVacancySelect 
                            ? "hover:border-amber-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
                            : "opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0 mr-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                            item.type === 'vote' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-blue-500 shadow-blue-500/20'
                          }`}>
                            {item.type === 'vote' ? <Sparkles size={22} /> : <MessageSquare size={22} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                                item.type === 'vote' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {item.type === 'vote' ? '🗳️ 상상 투표' : '💬 상세 의견'}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 tracking-tight truncate">
                              {item.type === 'vote' ? `'${item.title}' 투표 참여` : `"${item.title}"`}
                            </h4>
                            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1 truncate">
                              <MapPin size={10} />
                              {item.location}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0 flex flex-col items-end">
                           <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1 mb-1.5 justify-end">
                             <Clock size={10} />
                             {new Date(item.timestamp).toLocaleDateString()}
                           </p>
                           <div className="flex items-center gap-1 justify-end">
                             <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">+50P</span>
                             {matchedVacancy && onVacancySelect && <ChevronRight size={14} className="text-slate-300 ml-1 shrink-0" />}
                           </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "reports" && (
          <UserReportsSection vacancies={vacancies} />
        )}

        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-50">
                {userProfile.isAdmin && (
                  <button onClick={() => (window as any).showAdminDashboard()} className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-all text-left group">
                    <div className="flex items-center gap-3">
                      <LayoutDashboard size={18} className="text-amber-500" />
                      <span className="text-sm font-bold text-slate-700">마을 인사이트 리포트</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">DATA</span>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-all" />
                    </div>
                  </button>
                )}
                <button className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-all text-left">
                  <span className="text-sm font-bold text-slate-700">알림 설정</span>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
                <button className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-all text-left">
                  <span className="text-sm font-bold text-slate-700">개인정보 처리방침</span>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
                <button onClick={onLogout} className="w-full px-6 py-5 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-all">
                  <LogOut size={18} />
                  <span className="text-sm font-black">로그아웃</span>
                </button>
              </div>
            </div>

            {/* Admin Authentication Section */}
            {!userProfile.isAdmin && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                   <Key size={16} className="text-slate-400" />
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">관리자 인증</h3>
                </div>
                
                {showAdminAuth ? (
                  <div className="space-y-4">
                    <input 
                      type="password"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="관리자 코드를 입력하세요"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold focus:border-amber-500 transition-all outline-none text-sm"
                    />
                    <div className="flex gap-2">
                       <button onClick={() => setShowAdminAuth(false)} className="flex-1 py-3 bg-slate-50 text-slate-400 font-bold rounded-xl text-sm">취소</button>
                       <button onClick={handleAdminAuth} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm">인증하기</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowAdminAuth(true)}
                    className="text-xs font-bold text-slate-300 hover:text-slate-500 transition-all"
                  >
                    마을 인사이트 권한 요청하기
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showFeasibility && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-white overflow-y-auto"
          >
            <div className="p-6">
               <button 
                 onClick={() => setShowFeasibility(false)}
                 className="mb-8 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
               >
                 <X size={24} />
               </button>
               <FeasibilityReport 
                 initialData={{
                   location: selectedLocation,
                   category: votes.find(v => v.location === selectedLocation)?.brand || "",
                   vacancy: vacancies.find(v => v.landmark === selectedLocation || v.address === selectedLocation)
                 }}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 예비사장님 모드 고도화 안내 Coming Soon 프리미엄 모달 */}
      <AnimatePresence>
        {showEntrepreneurModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-slate-800 text-white p-6 md:p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl relative overflow-hidden text-center"
            >
              {/* 상단 다이나믹 앰비언트 글로우 라이팅 */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-[80px]" />
              
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner mx-auto mb-6">
                <Briefcase size={28} />
              </div>
              
              <h3 className="text-lg md:text-xl font-black text-white mb-3 tracking-tight">
                예비 사장님 모드 고도화 안내 🛠️
              </h3>
              
              <p className="text-[12px] md:text-[13px] font-bold text-slate-300 leading-relaxed mb-6 break-keep">
                현재 예비사장님을 위한 <span className="text-amber-400 font-black">상권분석리포트 및 수익분석리포트</span>는 부동산, 재무전문가들과 함께 깊이 있는 고도화 작업을 진행 중에 있습니다. 조금만 더 기대해 주세요! ✨
              </p>
              
              <button
                onClick={() => setShowEntrepreneurModal(false)}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-amber-500/10 pointer-events-auto"
              >
                확인했습니다
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 제보 & 알림함 컴포넌트 ──────────────────────────────────────────────────

function UserReportsSection({ vacancies }: { vacancies: any[] }) {
  const [reports, setReports] = useState<DbReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      if (typeof window === "undefined") return;
      const userId = localStorage.getItem("gongsil_user_id") || "anonymous_user";
      setIsLoading(true);
      const data = await fetchUserReports(userId);
      setReports(data);
      setIsLoading(false);
    }
    loadReports();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-400">제보 내역을 불러오고 있어요...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-black text-slate-900">나의 공간 제보 내역</h3>
        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
          {reports.length} 건 접수됨
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] text-center border-2 border-dashed border-slate-200">
          <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold text-sm leading-relaxed">
            아직 제보하신 내역이 없습니다.<br/>
            실제와 다른 공실 정보가 있다면<br/>
            <span className="text-amber-500 font-black">"정보 정정하기"</span>를 통해 제보해 주세요! ✍️
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const matchedVacancy = vacancies.find(v => v.id === report.vacancy_id);
            const spaceName = matchedVacancy?.landmark || matchedVacancy?.address || "우리동네 공실";
            const isResolved = report.status === 'resolved';

            return (
              <div key={report.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-md ${
                      report.report_type === 'movein' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                    }`}>
                      {report.report_type === 'movein' ? '🎉 입점 소식 제보' : '🚨 정보 정정 제보'}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">{spaceName}</h4>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      isResolved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {isResolved ? (
                        <>
                          <Check size={10} strokeWidth={3} /> 답변 완료
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> 확인 중
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 mb-1 uppercase tracking-widest text-[9px]">내가 접수한 내용</p>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    "{report.content}"
                  </p>
                  <p className="text-[9px] font-bold text-slate-300 mt-2 flex items-center gap-1">
                    <Clock size={8} /> {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                {isResolved && report.reply_content ? (
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 flex gap-3 items-start relative">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                      <Sparkles size={14} fill="currentColor" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">툇마루단 & 운영팀의 감사 메시지</p>
                      <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                        {report.reply_content}
                      </p>
                      <p className="text-[9px] font-bold text-emerald-600/70 mt-1">
                        ✓ 확인 완료 • 정정 사항이 동네 지도에 반영되었습니다.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/20 p-3.5 rounded-2xl border border-dashed border-amber-200/50 text-center">
                    <p className="text-[10px] font-bold text-amber-600/70 leading-relaxed">
                      🕰️ 담당 툇마루단이 현장에 출동하여 꼼꼼하게 실사 중에 있습니다. 확인이 완료되면 즉시 이곳으로 소식을 전해드릴게요!
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
