"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User as UserIcon, MapPin, Settings, Heart, MessageSquare, ChevronRight, LogOut, 
  Camera, Star, Award, Briefcase, Baby, Dog, Zap, HelpCircle, Edit3, Check, 
  Clock, Lightbulb, Sparkles, LayoutDashboard, ShieldCheck, Key, Home, Plus, Navigation as NavigationIcon, X
} from "lucide-react";
import { UserProfile, loadSavedProfile, PERSONAS } from "./AuthOnboarding";
import FeasibilityReport from "./FeasibilityReport";

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

export default function MyPage({ onLogout, isEntrepreneurMode, onModeChange }: { 
  onLogout: () => void,
  isEntrepreneurMode: boolean,
  onModeChange: (val: boolean) => void
}) {
  const [showFeasibility, setShowFeasibility] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "activity" | "settings">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  
  const [editPersonaIds, setEditPersonaIds] = useState<string[]>([]);
  const [editCustomPersona, setEditCustomPersona] = useState("");
  
  const [adminCode, setAdminCode] = useState("");
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  const [isRegisteringWork, setIsRegisteringWork] = useState(false);
  const [tempWorkLocation, setTempWorkLocation] = useState<{ neighborhood: string; lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tempWorkActivityTimes, setTempWorkActivityTimes] = useState<string[]>([]);

  useEffect(() => {
    const profile = loadSavedProfile();
    if (profile) {
      setUserProfile(profile);
      setEditNickname(profile.nickname);
      setEditPersonaIds(profile.personaIds || []);
    }

    const savedVotes = localStorage.getItem(VOTES_KEY);
    if (savedVotes) {
      setVotes(JSON.parse(savedVotes));
    }
  }, []);

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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            나의 페이지
            {userProfile.isAdmin && <ShieldCheck className="text-amber-500" size={20} />}
          </h1>
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
             onClick={() => onModeChange(true)}
             className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${isEntrepreneurMode ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
           >
             <Briefcase size={14} /> 예비창업자 모드
           </button>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-slate-100 rounded-full border-4 border-white shadow-md relative overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${userProfile.nickname}&backgroundColor=transparent`} alt="avatar" className="w-full h-full object-cover p-1" />
          </div>
          <div>
            <p className="text-xs text-amber-600 font-bold mb-0.5">
              {userProfile.personaLabel || `${userProfile.home?.neighborhood || "우리동네"} 활동 이웃`}
            </p>
            <h2 className="text-xl font-black text-slate-900">{userProfile.nickname}</h2>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-200/50 rounded-2xl">
          {(["profile", "activity", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {tab === "profile" ? "내 정보" : tab === "activity" ? "활동 내역" : "설정"}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                      <Star size={20} className="text-blue-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">상상 지수</p>
                    <p className="text-xl font-black text-slate-900">{votes.length * 150} P</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                      <MessageSquare size={20} className="text-amber-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">남긴 상상</p>
                    <p className="text-xl font-black text-slate-900">{votes.length}개</p>
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
                {isEntrepreneurMode ? "나의 창업 후보지" : "최근 상상 더하기 내역"}
              </h3>
              {isEntrepreneurMode && (
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Analysis Ready</span>
              )}
            </div>
            {votes.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-slate-200">
                <Lightbulb size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold">아직 남긴 상상이 없어요.<br/>동네 공간을 채워주세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {votes.map((vote) => (
                  <div key={vote.id} className={`bg-white rounded-3xl shadow-sm border transition-all ${isEntrepreneurMode ? "p-0 overflow-hidden border-blue-100 hover:border-blue-300" : "p-5 border-slate-100 flex items-center justify-between"}`}>
                    <div className={`${isEntrepreneurMode ? "p-5 flex items-center justify-between" : "flex items-center gap-4"}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isEntrepreneurMode ? "bg-blue-600 shadow-blue-500/20" : "bg-amber-500 shadow-amber-500/20"}`}>
                          {isEntrepreneurMode ? <Briefcase size={24} /> : <Sparkles size={24} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{vote.brand}</p>
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <MapPin size={10} />
                            {vote.location}
                          </p>
                        </div>
                      </div>
                      
                      {!isEntrepreneurMode && (
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-slate-300 flex items-center justify-end gap-1 mb-1">
                             <Clock size={10} />
                             {new Date(vote.timestamp).toLocaleDateString()}
                           </p>
                           <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-full">+150P</span>
                        </div>
                      )}
                    </div>

                    {isEntrepreneurMode && (
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
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
                   category: votes.find(v => v.location === selectedLocation)?.brand || ""
                 }}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
