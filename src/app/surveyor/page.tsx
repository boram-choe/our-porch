"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, MapPin, Search, Check, Building2, LogOut, Lock, ArrowRight, Zap, User, Phone, LocateFixed, ListChecks, Clock, Map as MapIcon, AlertTriangle, Users, TrendingUp, DollarSign, ChevronDown, ChevronUp, Briefcase, Sparkles, Building, Eye, EyeOff, ClipboardList, Info, UserPlus, GitMerge } from "lucide-react";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import { useKakaoLoader } from "react-kakao-maps-sdk";
import SurveyInput from "../../components/SurveyInput";
import { saveVacancy, fetchVacancies, DbVacancy, generateSpaceId, fetchTeamMembers, saveTeamMember, TeamMember, generateMemberId, updateTeamMemberPassword, loginTeamMember } from "../../lib/db";
import { Vacancy } from "../../data/dummyVacancies";
import regionsData from "../../data/regions.json";

// ─── 인사 관리 데이터 (연락처 추가) ──────────────────────────────────────────────

const RANKS = ["주임", "대리", "과장", "부장", "이사님"];

const calculateRank = (hireDate: string) => {
  const months = Math.floor((new Date().getTime() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const rankIdx = Math.min(Math.floor(months / 3), RANKS.length - 1);
  return RANKS[rankIdx];
};

interface SurveyorProfile extends TeamMember {
  formattedName: string;
  calculatedRank: string;
}

export default function SurveyorPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<SurveyorProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeView, setActiveView] = useState<"map" | "management">("map");
  const [allVacancies, setAllVacancies] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'latest' | 'created'>('latest');
  
  const [pinLocation, setPinLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [isPinpointing, setIsPinpointing] = useState(false);
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(null);
  const [editingNeighborhood, setEditingNeighborhood] = useState<string>("");
  const [showSurveyInput, setShowSurveyInput] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [detectedLandmark, setDetectedLandmark] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 조직도 확장 상태
  const [expandedOrg, setExpandedOrg] = useState(false);
  const [expandedCities, setExpandedCities] = useState<string[]>(["11"]); // 기본 서울 확장
  const [expandedGus, setExpandedGus] = useState<string[]>([]);
  
  // 멤버 추가 모달 상태
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberDong, setNewMemberDong] = useState<{city: string, gu: string, dong: string} | null>(null);
  const [newMemberForm, setNewMemberForm] = useState({ name: "", phone: "", password: "", salary: 200 });

  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "4e959900c93f0a3268a637079835bb73",
    libraries: ["services"],
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const account = await loginTeamMember(loginId, password);
      
      if (account) {
        const rank = calculateRank(account.hire_date);
        const profile: SurveyorProfile = {
          ...account,
          calculatedRank: rank,
          formattedName: account.role === "CEO" ? `대표이사 ${account.real_name}` : 
                         account.role === "OPS" ? `운영팀장 ${account.real_name}` :
                         `툇마루단-${account.gu}-${account.real_name} ${rank}`
        };
        setIsAuthenticated(true);
        setCurrentUser(profile);
        if (typeof window !== "undefined") {
          localStorage.setItem("gongsil_surveyor_session", JSON.stringify(profile));
        }
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            setPinLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          });
        }
      } else {
        alert("아이디 또는 비밀번호가 올바르지 않습니다. (DB 응답: 데이터 없음)");
      }
    } catch (err: any) {
      alert(`로그인 중 오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("gongsil_surveyor_session");
      if (session) {
        const parsed = JSON.parse(session) as SurveyorProfile;
        setIsAuthenticated(true);
        setCurrentUser(parsed);
      }
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setPinLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    loadData();
    loadTeam();
  }, []);

  const loadTeam = async () => {
    const members = await fetchTeamMembers();
    setTeamMembers(members);
  };


  const loadData = async () => {
    const data = await fetchVacancies();
    const mappedData = data.map(v => ({
      ...v,
      // 뱀 -> 낙타 변환 (수정창 데이터 유실 방지 및 이력 기록)
      vacancyPeriod: v.vacancy_period,
      surveyRemarks: v.survey_remarks,
      realtorName: v.realtor_name,
      realtorPhone: v.realtor_phone,
      hiddenReason: v.hidden_reason,
      hiddenComment: v.hidden_comment,
      mergedIntoId: v.merged_into_id,
      rejectionReason: v.rejection_reason,
      updatedAt: v.updated_at || v.created_at,
      lastModifiedBy: v.last_modified_by,
      displayId: v.display_id,
      images: v.images ? (v.images as string).split(',') : []
    })) as any[];
    setAllVacancies(mappedData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("gongsil_surveyor_session");
  };

  const confirmLocation = () => {
    const threshold = 0.0001; 
    const existing = allVacancies.find(v => 
      Math.abs(v.lat - pinLocation.lat) < threshold && 
      Math.abs(v.lng - pinLocation.lng) < threshold
    );

    if (existing) {
      if (confirm(`이미 이 위치에 '${existing.landmark || "이름 없는 공실"}' 정보가 등록되어 있습니다.\n이 정보를 확인하고 보완하시겠습니까?`)) {
        setEditingVacancyId(existing.id);
        setEditingNeighborhood(existing.neighborhood);
        setDetectedAddress(existing.address || "");
        setDetectedLandmark(existing.landmark || "");
        setShowSurveyInput(true);
        return;
      }
    }

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(pinLocation.lng, pinLocation.lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const addr = result[0].address.address_name;
        setDetectedAddress(addr);
        
        const ps = new kakao.maps.services.Places();
        ps.keywordSearch(addr.split(' ').slice(-1)[0], (data, status) => {
          if (status === kakao.maps.services.Status.OK) {
            setDetectedLandmark(data[0].place_name);
          }
          setShowSurveyInput(true);
        }, { location: new kakao.maps.LatLng(pinLocation.lat, pinLocation.lng), radius: 500 });
      }
    });
  };

  const handleSave = async (data: Partial<Vacancy>) => {
    setIsLoading(true);
    try {
      const addressToUse = detectedAddress || "주소 정보 없음";
      const addrParts = addressToUse.split(' ');
      const neighborhood = editingNeighborhood ||
        addrParts.find(p => p.endsWith('동') || p.endsWith('가')) ||
        addrParts[addrParts.length - 1] ||
        "기타";

      const result = await saveVacancy({
        id: editingVacancyId,
        landmark: data.landmark || detectedLandmark || "신규 공실",
        address: addressToUse,
        floor: data.floor || "1층",
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        neighborhood: neighborhood,
        userId: currentUser?.id,
        images: data.images,
        deposit: data.deposit,
        monthlyRent: data.monthlyRent,
        managementFee: data.managementFee,
        surveyRemarks: data.surveyRemarks,
        realtorName: data.realtorName,
        realtorPhone: data.realtorPhone,
        area: data.area || "정보 대기 중",
        vacancyPeriod: data.vacancyPeriod,
        status: data.status,
        hiddenReason: data.hiddenReason,
        hiddenComment: data.hiddenComment,
        mergedIntoId: data.mergedIntoId,
        rejectionReason: data.rejectionReason,
        lastModifiedBy: currentUser?.real_name,
        displayId: editingVacancyId ? allVacancies.find(v => v.id === editingVacancyId)?.display_id : null,
      });

      if (result.id) {
        alert(`${currentUser?.real_name}님, 성공적으로 저장되었습니다! 🚀`);
        setIsPinpointing(false);
        loadData();
      } else {
        alert(`저장에 실패했습니다.\n사유: ${result.error || "권한이 없거나 이미 수정된 데이터입니다."}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`시스템 오류가 발생했습니다: ${err?.message || String(err)}`);
    } finally {
      setIsLoading(false);
      setShowSurveyInput(false);
      setEditingVacancyId(null);
      setEditingNeighborhood("");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberDong) return;
    setIsLoading(true);
    try {
      const result = await saveTeamMember({
        real_name: newMemberForm.name,
        phone: newMemberForm.phone,
        role: "SURVEYOR",
        city: newMemberDong.city,
        gu: newMemberDong.gu,
        dong: newMemberDong.dong,
      });

      if (result.id) {
        alert(`${newMemberForm.name} 조사원이 등록되었습니다!\nID: ${result.id}\n(초기 비밀번호는 ID와 동일합니다)`);
        setShowAddMember(false);
        setNewMemberForm({ name: "", phone: "", password: "", salary: 200 });
        loadTeam();
      } else {
        alert(`등록 실패: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");

  const handleChangePassword = async () => {
    if (!currentUser || !newPw) return;
    setIsLoading(true);
    try {
      const { error } = await updateTeamMemberPassword(currentUser.id, newPw);
      
      if (error) throw new Error(error);
      alert("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      handleLogout();
    } catch (err: any) {
      alert(`변경 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
      setShowChangePw(false);
    }
  };



  const renderVacancyList = (title: string, icon: React.ReactNode, filter: (v: DbVacancy) => boolean, color: string) => {
    // 권한 필터링: CEO/OPS 전체, 일반 단원은 본인 등록 건 OR 본인 담당 동(Neighborhood) 건
    const authorized = allVacancies.filter(v => {
      const isAuthorized = (
        currentUser?.role === "CEO" || 
        currentUser?.role === "OPS" || 
        v.registered_by === currentUser?.id || 
        v.neighborhood === currentUser?.dong
      );
      return isAuthorized && filter(v);
    });

    // 정렬 적용
    const sorted = [...authorized].sort((a, b) => {
      if (sortOrder === 'latest') {
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-1.5 rounded-full ${color}`} />
            <h3 className="text-xl font-black text-slate-950 tracking-tight">{title} <span className="ml-2 text-sm text-slate-400 font-bold">({sorted.length})</span></h3>
          </div>
        </div>
        
        {sorted.length === 0 ? (
          <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-10 text-center">
            <p className="text-xs font-bold text-slate-400 italic">현재 이 카테고리에 공실이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map(v => {
              const dateObj = new Date(v.updated_at || v.created_at);
              const timeStr = `${dateObj.getMonth()+1}/${dateObj.getDate()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              
              return (
                <div key={v.id} className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-50 flex items-center justify-between group hover:border-slate-300 transition-all cursor-pointer" onClick={() => {
                  setEditingVacancyId(v.id);
                  setEditingNeighborhood(v.neighborhood || "");
                  setDetectedAddress(v.address || "");
                  setDetectedLandmark(v.landmark || "");
                  setShowSurveyInput(true);
                }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color.replace('bg-', 'bg-').replace('-500', '-50')} ${color.replace('bg-', 'text-')}`}>
                      {icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-base font-black text-slate-950 leading-tight">{v.landmark || "신규 제보"}</h4>
                        {v.display_id && (
                          <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded-md tracking-tighter">
                            {v.display_id}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">{v.address}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{timeStr}</span>
                    <ArrowRight size={16} className="text-slate-200 group-hover:text-slate-400 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck size={120} className="text-slate-900" />
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-amber-500 mb-8 shadow-xl">
              <Lock size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tighter mb-10">툇마루단 전용 채널 🔐</h1>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">아이디</label>
                  <input 
                    type="text" 
                    autoComplete="off"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-950 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">비밀번호</label>
                  <div className="relative">
                    <style>{`
                      input::-ms-reveal,
                      input::-ms-clear,
                      input::-webkit-password-reveal-button {
                        display: none;
                      }
                    `}</style>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-950 focus:border-amber-500 outline-none transition-all pr-14"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className={`w-full py-6 rounded-2xl text-lg font-black shadow-xl flex items-center justify-center gap-3 transition-all ${isLoading ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-950 text-white hover:bg-slate-900 active:scale-95'}`}
              >
                {isLoading ? "인증 중..." : <>채널 접속하기 <ArrowRight size={20} /></>}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        {activeView === "management" && (
          <motion.div 
            key="management-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-slate-50 flex flex-col"
          >
            <div className="bg-white p-8 pb-6 shadow-sm flex items-center justify-between flex-shrink-0 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 tracking-tight">툇마루단 관리페이지</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentUser?.formattedName}</p>
                </div>
              </div>
              <button onClick={() => setActiveView("map")} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <ArrowRight size={20} className="rotate-180" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-12 custom-scroll no-scrollbar pb-32">
              {/* 1. Profile Card */}
              <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[1.5rem] flex items-center justify-center text-slate-950">
                      <User size={40} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{currentUser?.real_name} <span className="text-sm font-bold text-slate-400 ml-1">{currentUser?.calculatedRank}</span></h3>
                      <p className="text-amber-500/80 text-xs font-bold tracking-widest uppercase">📍 {currentUser?.city} {currentUser?.gu} {currentUser?.dong}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowChangePw(true)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    비밀번호 변경
                  </button>
                </div>
              </div>


              {/* 2. Vacancy Lifecycle Management (Grouped Lists) */}
              <div className="space-y-12">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">분류별 공실 관리</p>
                  <div className="flex bg-slate-200 p-1 rounded-xl items-center gap-1">
                    <button 
                      onClick={() => setSortOrder('latest')} 
                      className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${sortOrder === 'latest' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                    >최신순</button>
                    <button 
                      onClick={() => setSortOrder('created')} 
                      className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${sortOrder === 'created' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                    >등록순</button>
                  </div>
                </div>

                {renderVacancyList(
                  "확인 완료 공실", 
                  <Check size={24} />, 
                  v => !!(v.images && (v.images as any).length > 0 && (v.status === 'available' || !v.status)), 
                  "bg-emerald-500"
                )}

                {renderVacancyList(
                  "확인 필요 공실", 
                  <AlertTriangle size={24} />, 
                  v => (!v.images || (v.images as any).length === 0) && (v.status === 'available' || !v.status), 
                  "bg-amber-500"
                )}

                {renderVacancyList(
                  "비공개 공실", 
                  <EyeOff size={24} />, 
                  v => v.status === 'hidden' || v.status === 'rejected', 
                  "bg-slate-500"
                )}

                {renderVacancyList(
                  "입점 완료 공실", 
                  <Sparkles size={24} />, 
                  v => v.status === 'completed', 
                  "bg-blue-500"
                )}

                {renderVacancyList(
                  "통합된 공실", 
                  <GitMerge size={24} />, 
                  v => v.status === 'merged', 
                  "bg-purple-500"
                )}
              </div>

              {/* 3. 인사기록부 (CEO/OPS 전용) */}
              {(currentUser?.role === "CEO" || currentUser?.role === "OPS") && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1.5 bg-blue-500 rounded-full" />
                    <h3 className="text-xl font-black text-slate-950 tracking-tight">인사기록 및 급여관리</h3>
                  </div>
                  <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">성명/직급</th>
                            <th className="px-6 py-4">아이디</th>
                            <th className="px-6 py-4">소속</th>
                            <th className="px-6 py-4">급여</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {teamMembers.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-black text-slate-950">{m.real_name} <span className="text-blue-500 ml-1">{calculateRank(m.hire_date)}</span></td>
                              <td className="px-6 py-4 font-bold text-slate-400">`{m.id}`</td>
                              <td className="px-6 py-4 font-bold text-slate-500">{m.gu} {m.dong}</td>
                              <td className="px-6 py-4 font-black text-emerald-600">{m.base_salary.toLocaleString()}만</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}


              {/* 4. 조직도 (최하단 계층형) */}
              <div className="space-y-6">
                <button 
                  onClick={() => setExpandedOrg(!expandedOrg)}
                  className="w-full p-8 bg-slate-100 rounded-[2rem] flex items-center justify-between group hover:bg-slate-200 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-950 shadow-sm">
                      <Users size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-black text-slate-950">조직도 확인하기</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neighborhood Beacon Hierarchy Chart</p>
                    </div>
                  </div>
                  {expandedOrg ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>

                {expandedOrg && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                  >
                    {/* Hierarchy visualization */}
                    <div className="flex flex-col items-center">
                      {/* CEO Node */}
                      <div className="bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-2xl border border-white/10 text-center min-w-[240px]">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">CEO</p>
                        <h4 className="text-2xl font-black">{teamMembers.find(m => m.role === "CEO")?.real_name || "최보람"}</h4>
                      </div>
                      <div className="h-12 w-0.5 bg-gradient-to-b from-slate-200 to-transparent" />
                      
                      {/* OPS Node */}
                      <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-2xl text-center min-w-[240px]">
                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">운영팀장</p>
                        <h4 className="text-2xl font-black">{teamMembers.find(m => m.role === "OPS")?.real_name || "김팀장"}</h4>
                      </div>
                      <div className="h-12 w-0.5 bg-gradient-to-b from-blue-200 to-transparent" />
                    </div>

                    {/* Nationwide Expansion */}
                    <div className="space-y-4 max-w-4xl mx-auto w-full">
                      {Object.entries(regionsData as any).map(([cityCode, cityData]: [string, any]) => {
                        const isCityExpanded = expandedCities.includes(cityCode);
                        return (
                          <div key={cityCode} className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                            <button 
                              onClick={() => setExpandedCities(isCityExpanded ? expandedCities.filter(c => c !== cityCode) : [...expandedCities, cityCode])}
                              className={`w-full p-6 flex items-center justify-between transition-colors ${isCityExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <MapPin size={20} className="text-slate-400" />
                                <span className="font-black text-slate-950">{cityData.name}</span>
                              </div>
                              {isCityExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {isCityExpanded && (
                              <div className="p-4 pt-0 grid grid-cols-1 gap-4">
                                {Object.entries(cityData.gus).map(([guCode, guData]: [string, any]) => {
                                  const isGuExpanded = expandedGus.includes(guCode);
                                  return (
                                    <div key={guCode} className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                                      <button 
                                        onClick={() => setExpandedGus(isGuExpanded ? expandedGus.filter(g => g !== guCode) : [...expandedGus, guCode])}
                                        className="w-full p-4 flex items-center justify-between hover:bg-slate-100/50"
                                      >
                                        <span className="font-bold text-slate-700 text-sm">{guData.name}</span>
                                        {isGuExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      </button>

                                      {isGuExpanded && (
                                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          {Object.entries(guData.dongs).map(([dongCode, dongName]: [string, any]) => {
                                            const members = teamMembers.filter(m => m.dong === dongName && m.gu === guData.name && m.city === cityData.name);
                                            return (
                                              <div key={dongCode} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                                <div className="flex items-center justify-between mb-3">
                                                  <h6 className="font-black text-slate-950 text-xs">{dongName}</h6>
                                                  {(currentUser?.role === "CEO" || currentUser?.role === "OPS") && (
                                                    <button 
                                                      onClick={() => {
                                                        setNewMemberDong({ city: cityData.name, gu: guData.name, dong: dongName });
                                                        setShowAddMember(true);
                                                      }}
                                                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                      <UserPlus size={14} />
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {members.length > 0 ? members.map(m => (
                                                    <div key={m.id} className="bg-slate-900 text-white px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1">
                                                      {m.real_name[0]} {m.real_name}
                                                    </div>
                                                  )) : (
                                                    <span className="text-[9px] text-slate-300 font-bold italic">담당자 없음</span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              </div>

              {/* 5. Logout */}
              <div className="pt-12 border-t border-slate-200">
                <button 
                  onClick={handleLogout}
                  className="w-full py-6 bg-rose-50 text-rose-600 rounded-[2rem] text-sm font-black flex items-center justify-center gap-3 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <LogOut size={20} /> 시스템 로그아웃 (안전하게 종료)
                </button>
                <p className="mt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Neighborhood Beacon Security Channel
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating View Toggle */}
      <div className="absolute top-28 left-6 right-6 z-[100] flex justify-center pointer-events-none">
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/95 backdrop-blur-md p-2 rounded-[2rem] shadow-2xl border border-white/20 flex gap-2 pointer-events-auto">
          <button onClick={() => setActiveView("map")} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeView === "map" ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <MapIcon size={20} /> 지도 보기
          </button>
          <button onClick={() => setActiveView("management")} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeView === "management" ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <Users size={20} /> 관리페이지
          </button>
        </motion.div>
      </div>

      <button 
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
              setPinLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
          }
        }}
        className="absolute right-8 bottom-32 z-[100] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 border border-slate-100 pointer-events-auto"
      >
        <LocateFixed size={24} />
      </button>

      <div className="absolute inset-0 z-0">
        <Map
          center={pinLocation}
          style={{ width: "100%", height: "100%" }}
          level={3}
          onClick={(_, mouseEvent) => {
            if (isPinpointing) {
              setPinLocation({
                lat: mouseEvent.latLng.getLat(),
                lng: mouseEvent.latLng.getLng(),
              });
            }
          }}
        >
          {allVacancies.map((v) => (
            <MapMarker
              key={v.id}
              position={{ lat: v.lat, lng: v.lng }}
              image={{
                src: v.images && v.images.length > 0 
                  ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iIzEwYjk4MSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPHBhdGggZD0iTTEyIDIwTDE4IDI2TDI4IDE0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=" 
                  : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iI0Y1OUUwQiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iOCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+",
                size: { width: 30, height: 30 },
                options: { offset: { x: 15, y: 15 } }
              }}
              onClick={() => {
                setPinLocation({ lat: v.lat, lng: v.lng });
                setEditingVacancyId(v.id);
                setEditingNeighborhood(v.neighborhood || "");
                setDetectedAddress(v.address || "");
                setDetectedLandmark(v.landmark || "");
                setShowSurveyInput(true);
              }}
            />
          ))}

          {isPinpointing && (
            <MapMarker 
              position={pinLocation} 
              draggable={true} 
              onDragEnd={(marker) => setPinLocation({ lat: marker.getPosition().getLat(), lng: marker.getPosition().getLng() })}
              image={{
                src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA2MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMzAgNzRMMTQgNTJDNyA0MyAzIDM1IDMgMjdDMyAxMiAxNSAwIDMwIDBDNDUgMCA1NyAxMiA1NyAyN0M1NyAzNSA1MyA0MyA0NiA1MkwzMCA3NFoiIGZpbGw9IiMwMjA2MTciIHN0cm9rZT0iI0Y1OUUwQiIgc3Ryb2tlLXdpZHRoPSI1Ii8+CiAgPGNpcmNsZSBjeD0iMzAiIGN5PSIyNyIgcj0iMTIiIGZpbGw9IiNGNTlFMEIiLz4KPC9zdmc+",
                size: { width: 50, height: 65 },
                options: { offset: { x: 25, y: 65 } }
              }}
            />
          )}
        </Map>
      </div>

      <div className="absolute bottom-12 left-0 right-0 px-8 flex justify-center z-[100] pointer-events-none">
        <AnimatePresence mode="wait">
          {!isPinpointing ? (
            <motion.button 
              key="start"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={() => {
                setEditingVacancyId(null);
                setEditingNeighborhood("");
                setDetectedAddress("");
                setDetectedLandmark("");
                setIsPinpointing(true);
              }}
              className="bg-slate-950 text-white px-10 py-6 rounded-[2.5rem] text-xl font-black shadow-2xl flex items-center gap-4 pointer-events-auto"
            >
              <Building2 size={24} className="text-amber-500" /> 신규 공실 조사하기
            </motion.button>
          ) : (
            <motion.div 
              key="confirm"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="flex items-center gap-4"
            >
              <button onClick={() => setIsPinpointing(false)} className="bg-white text-slate-400 px-8 py-6 rounded-[2.5rem] text-lg font-black shadow-xl pointer-events-auto border-2 border-slate-100">취소</button>
              <button onClick={confirmLocation} className="bg-amber-500 text-slate-950 px-12 py-6 rounded-[2.5rem] text-xl font-black shadow-2xl flex items-center gap-4 pointer-events-auto border-4 border-white">
                <Check size={28} strokeWidth={4} /> 위치 확정 및 데이터 입력
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSurveyInput && (
          <SurveyInput 
            allVacancies={allVacancies}
            initialData={editingVacancyId 
              ? { ...(allVacancies.find(v => v.id === editingVacancyId) as any), lat: pinLocation.lat, lng: pinLocation.lng }
              : { address: detectedAddress, landmark: detectedLandmark, lat: pinLocation.lat, lng: pinLocation.lng }
            }
            onClose={() => {
              setShowSurveyInput(false);
              setEditingVacancyId(null);
            }}
            onSave={handleSave}
            onEditLocation={() => {
              setShowSurveyInput(false);
              setIsPinpointing(true);
            }}
          />
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 담당자 추가 모달 */}
      <AnimatePresence>
        {showAddMember && newMemberDong && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMember(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-950">조사원 신규 등록</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{newMemberDong.city} {newMemberDong.gu} {newMemberDong.dong}</p>
                </div>
              </div>

              <form onSubmit={handleAddMember} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">성함</label>
                    <input required type="text" value={newMemberForm.name} onChange={e => setNewMemberForm({...newMemberForm, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-950 focus:border-blue-500 outline-none transition-all" placeholder="박조사" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">연락처</label>
                    <input required type="text" value={newMemberForm.phone} onChange={e => setNewMemberForm({...newMemberForm, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-950 focus:border-blue-500 outline-none transition-all" placeholder="010-0000-0000" />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowAddMember(false)} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black">취소</button>
                  <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-600/20">등록 완료</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 비밀번호 변경 모달 */}
      <AnimatePresence>
        {showChangePw && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChangePw(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl">
              <h3 className="text-2xl font-black text-slate-950 mb-6">비밀번호 변경</h3>
              <div className="space-y-4">
                <input 
                  type="password" 
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-950 focus:border-amber-500 outline-none transition-all"
                />
                <button 
                  onClick={handleChangePassword}
                  className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black shadow-xl"
                >
                  변경하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


