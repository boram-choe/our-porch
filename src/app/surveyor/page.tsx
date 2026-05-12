"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, MapPin, Search, Check, Building2, LogOut, Lock, ArrowRight, Zap } from "lucide-react";
import { Map, MapMarker } from "react-kakao-maps-sdk";
import { useKakaoLoader } from "react-kakao-maps-sdk";
import SurveyInput from "../../components/SurveyInput";
import { saveVacancy } from "../../lib/db";
import { Vacancy } from "../../data/dummyVacancies";

const SURVEYOR_ACCOUNTS = Array.from({ length: 10 }, (_, i) => ({
  id: `surveyor${String(i + 1).padStart(2, '0')}`,
  password: `gongsil${String(i + 1).padStart(2, '0')}!`,
  name: `툇마루단 ${i + 1}호`
}));

export default function SurveyorPage() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{id: string, name: string} | null>(null);
  
  const [pinLocation, setPinLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [isPinpointing, setIsPinpointing] = useState(false);
  const [showSurveyInput, setShowSurveyInput] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [detectedLandmark, setDetectedLandmark] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "4e959900c93f0a3268a637079835bb73",
    libraries: ["services"],
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const account = SURVEYOR_ACCOUNTS.find(acc => acc.id === loginId && acc.password === password);
    
    if (account) {
      setIsAuthenticated(true);
      setCurrentUser({ id: account.id, name: account.name });
      if (typeof window !== "undefined") {
        localStorage.setItem("gongsil_surveyor_session", JSON.stringify({ id: account.id, name: account.name }));
      }
    } else {
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("gongsil_surveyor_session");
      if (session) {
        const parsed = JSON.parse(session);
        setIsAuthenticated(true);
        setCurrentUser(parsed);
      }
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("gongsil_surveyor_session");
  };

  const confirmLocation = () => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(pinLocation.lng, pinLocation.lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const addr = result[0].address.address_name;
        setDetectedAddress(addr);
        
        // 근처 장소 키워드 검색으로 랜드마크 자동 감지
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
      const addrParts = detectedAddress.split(' ');
      const neighborhood = addrParts.find(p => p.endsWith('동') || p.endsWith('가')) || addrParts[addrParts.length - 1];

      const result = await saveVacancy({
        landmark: data.landmark || detectedLandmark || "신규 공실",
        address: detectedAddress,
        floor: data.floor || "1층",
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        neighborhood: neighborhood,
        userId: currentUser?.id, // 현재 로그인한 조사단 ID 기록
        imageUrl: data.imageUrl,
        deposit: data.deposit,
        monthlyRent: data.monthlyRent,
        managementFee: data.managementFee,
        surveyRemarks: data.surveyRemarks,
        realtorName: data.realtorName,
        realtorPhone: data.realtorPhone,
        area: data.area || "정보 대기 중",
      });

      if (result) {
        alert(`${currentUser?.name}님, 성공적으로 저장되었습니다! 🚀`);
        setIsPinpointing(false);
      } else {
        alert("저장에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error(err);
      alert("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setShowSurveyInput(false);
    }
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
            <h1 className="text-3xl font-black text-slate-950 tracking-tighter mb-2">툇마루단 전용 채널 🔐</h1>
            <p className="text-slate-400 text-sm font-bold mb-10 leading-relaxed uppercase tracking-widest">Neighborhood Beacon Surveyor Access</p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">아이디</label>
                  <input 
                    type="text" 
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="SURVEYOR ID"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-950 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">비밀번호</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-950 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
              </div>
              <button className="w-full py-6 bg-slate-950 text-white rounded-2xl text-lg font-black shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3">
                채널 접속하기 <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans overflow-hidden">
      {/* Header */}
      <div className="absolute top-8 left-6 right-6 z-[100] flex items-center justify-between pointer-events-none">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-100 pointer-events-auto">
          <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 shadow-lg"><Zap size={20} fill="currentColor" /></div>
          <div>
            <h2 className="text-sm font-black text-slate-950 leading-none">{currentUser?.name || "툇마루단"}</h2>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Live Survey Mode</p>
          </div>
        </motion.div>
        
        <button onClick={handleLogout} className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all pointer-events-auto border border-slate-100">
          <LogOut size={24} />
        </button>
      </div>

      {/* My Location Button */}
      <button 
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
              const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setPinLocation(newPos);
              // 지도 중심 이동은 Map의 center 프롭을 통해 자동 처리됨 (state 연동 시)
            }, (err) => {
              alert("위치 정보를 가져올 수 없습니다.");
            });
          }
        }}
        className="absolute right-8 bottom-32 z-[100] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-all pointer-events-auto border border-slate-100"
      >
        <MapPin size={24} />
      </button>

      {/* Map */}
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

      {/* Footer Controls */}
      <div className="absolute bottom-12 left-0 right-0 px-8 flex justify-center z-[100] pointer-events-none">
        <AnimatePresence mode="wait">
          {!isPinpointing ? (
            <motion.button 
              key="start"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={() => setIsPinpointing(true)}
              className="bg-slate-950 text-white px-10 py-6 rounded-[2.5rem] text-xl font-black shadow-2xl flex items-center gap-4 pointer-events-auto hover:bg-slate-800 transition-all active:scale-95"
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
              <button 
                onClick={() => setIsPinpointing(false)}
                className="bg-white text-slate-400 px-8 py-6 rounded-[2.5rem] text-lg font-black shadow-xl pointer-events-auto border-2 border-slate-100"
              >
                취소
              </button>
              <button 
                onClick={confirmLocation}
                className="bg-amber-500 text-slate-950 px-12 py-6 rounded-[2.5rem] text-xl font-black shadow-2xl flex items-center gap-4 pointer-events-auto border-4 border-white active:scale-95 transition-all"
              >
                <Check size={28} strokeWidth={4} /> 위치 확정 및 데이터 입력
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSurveyInput && (
          <SurveyInput 
            initialData={{ address: detectedAddress, landmark: detectedLandmark }}
            onClose={() => setShowSurveyInput(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
