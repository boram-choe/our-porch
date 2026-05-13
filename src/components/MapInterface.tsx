"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Map, MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk";
import { useKakaoLoader } from "react-kakao-maps-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Building2, X, User, Sparkles, Lightbulb, Plus, ArrowRight, LocateFixed, Check, 
  Search, Navigation as NavigationIcon, Heart, MessageSquare, TrendingUp, Info, History, ChevronRight, Zap,
  Clock, Maximize, ShieldCheck, ShoppingBag, BarChart3, CreditCard, Settings, Home, Briefcase
} from "lucide-react";
import { Vacancy } from "@/data/dummyVacancies";
import Building3D from "./Building3D";
import MyPage from "./MyPage";
import AdminDashboard from "./AdminDashboard";
import SpaceCurator from "./SpaceCurator";
import SurveyInput from "./SurveyInput";
import { UserProfile, loadSavedProfile } from "./AuthOnboarding";
import { fetchVacancies, saveVacancy } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// ─── 위치 기반 필터링 ─────────────────────────────────────────────────────────
const FILTER_RADIUS_KM = 2.5; // 인증 위치 기준 반경 (인접 행정동 포함)

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SPACE_FEATURES = [
  { id: "terrace", label: "테라스", icon: "☀️" },
  { id: "glass", label: "통유리", icon: "🪟" },
  { id: "parking", label: "주차가능", icon: "🚗" },
  { id: "corner", label: "코너", icon: "📍" },
  { id: "high", label: "높은층고", icon: "⬆️" }
];

export default function MapInterface({ userProfile, onProfileUpdate }: { userProfile: UserProfile | null, onProfileUpdate: (updated: UserProfile | null) => void }) {
  const [loading, error] = useKakaoLoader({
    appkey: "4e959900c93f0a3268a637079835bb73",
    libraries: ["services"],
  });

  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [showMyPage, setShowMyPage] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [floorPickerGroup, setFloorPickerGroup] = useState<Vacancy[] | null>(null); // 같은 건물 다층 선택
  
  const mapRef = useRef<kakao.maps.Map>(null);

  const [feedIndex, setFeedIndex] = useState(0);
  const [localFeeds, setLocalFeeds] = useState<{user: string, text: string, color: string}[]>([]);

  const [isPinpointing, setIsPinpointing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCurator, setShowCurator] = useState(false);
  const [recommendedCategory, setRecommendedCategory] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  
  const [newSpaceFloor, setNewSpaceFloor] = useState("1층");
  const [newSpaceSize, setNewSpaceSize] = useState("약 15평");
  const [newSpaceDuration, setNewSpaceDuration] = useState("3개월 미만");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  const [pinLocation, setPinLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  
  const [detectedAddress, setDetectedAddress] = useState("");
  const [detectedLandmark, setDetectedLandmark] = useState("");
  const [landmarkDistance, setLandmarkDistance] = useState(0);
  const [isFamousLandmark, setIsFamousLandmark] = useState(false);

  const [isEntrepreneurMode, setIsEntrepreneurMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  // ─── 인증 위치 기반 공실 필터링 (반경 2.5km = 인증 동 + 인접 동) ───────────
  const filteredVacancies = useMemo(() => {
    if (!userProfile) return vacancies;
    const activeLoc =
      userProfile.activeLocationType === "work"
        ? userProfile.work || userProfile.home
        : userProfile.home;
    if (!activeLoc?.lat || !activeLoc?.lng) return vacancies;
    return vacancies.filter((v) =>
      haversineKm(activeLoc.lat, activeLoc.lng, v.lat, v.lng) <= FILTER_RADIUS_KM
    );
  }, [vacancies, userProfile]);

  // ─── 반경 내 공실 기반 실시간 피드 생성 ──────────────────────────────────────
  useEffect(() => {
    const dong = userProfile
      ? (userProfile.activeLocationType === "work"
          ? userProfile.work?.neighborhood
          : userProfile.home.neighborhood) || "우리동네"
      : "우리동네";

    const colors = ["bg-amber-600", "bg-purple-500", "bg-emerald-500", "bg-indigo-500", "bg-rose-500", "bg-lime-500"];

    if (filteredVacancies.length > 0) {
      // 실제 반경 내 공실 데이터로 피드 생성
      const feeds = filteredVacancies.slice(0, 4).map((v, i) => {
        const topVote = (v.currentVotes || []).sort((a, b) => b.count - a.count)[0];
        const totalVotes = (v.currentVotes || []).reduce((s, vt) => s + vt.count, 0);
        const name = v.landmark || v.address || `${dong} 공간`;

        let text = "";
        if (topVote && totalVotes > 0) {
          text = `${name}에 '${topVote.brand}' 입점을 원하는 이웃이 ${totalVotes}명이에요! ✨`;
        } else {
          const templates = [
            `${name}에 어떤 공간이 생기면 좋을지 투표해 주세요! 🗳️`,
            `${dong}의 새로운 가능성! ${name}이 기다리고 있어요 💡`,
            `${name} — 이곳의 첫 번째 상상 주인공이 되어보세요 🌟`,
            `${name}에 이웃들의 목소리가 모이고 있어요 🏘️`,
          ];
          text = templates[i % templates.length];
        }

        return { user: `${dong} 이웃`, text, color: colors[i % colors.length] };
      });
      setLocalFeeds(feeds);
    } else {
      // 반경 내 공실 없음 → 동네 이름 기반 일반 메시지
      setLocalFeeds([
        { user: `${dong} 주민`, text: `${dong}의 빈 공간을 발견하셨나요? 지도에 첫 번째로 등록해보세요! 📍`, color: "bg-amber-600" }
      ]);
    }
  }, [filteredVacancies, userProfile]);

  useEffect(() => {
    const done = localStorage.getItem("gongsil_tutorial_done");
    if (!done) {
      const timer = setTimeout(() => setShowTutorial(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // ─── 공실 선택 시 안내 토스트 자동 제거 ──────────────────────────────────────
  useEffect(() => {
    if (selectedVacancy) {
      setShowSuccessToast(null);
    }
  }, [selectedVacancy]);

  useEffect(() => {
    // 1. 현재 실시간 위치 감지 시도
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMapCenter({ lat: latitude, lng: longitude });
        },
        (err) => {
          console.warn("위치 정보를 가져올 수 없습니다. 프로필 위치를 사용합니다.", err);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    const profile = loadSavedProfile();
    if (profile) {
      const isOldVersion = !profile.home;
      let finalProfile = profile;
      
      if (isOldVersion) {
        const oldLat = (profile as any).lat || 37.5665;
        const oldLng = (profile as any).lng || 126.9780;
        const oldNeighborhood = (profile as any).neighborhood || "우리동네";
        
        finalProfile = {
          nickname: profile.nickname,
          activeLocationType: 'home',
          home: { neighborhood: oldNeighborhood, lat: oldLat, lng: oldLng }
        };
        localStorage.setItem("gongsil_user_profile", JSON.stringify(finalProfile));
      }

      onProfileUpdate(finalProfile);
      const activeLoc = finalProfile.activeLocationType === 'home' ? finalProfile.home : (finalProfile.work || finalProfile.home);
      
      if (activeLoc) {
        // 프로필 위치가 있더라도 실시간 위치 감지에 실패한 경우에만 프로필 위치로 이동 (또는 둘 다 반영)
        const dong = activeLoc.neighborhood || "우리동네";
        const animal = finalProfile.nickname?.split(' ')[1] || "이웃";

        // 피드는 filteredVacancies가 업데이트될 때 연동하여 재생성함 (아래 useEffect 참가)

        // Supabase에서 공실 불러오기 (동네 필터링)
        fetchVacancies(activeLoc.neighborhood).then(async (dbVacancies) => {
          if (dbVacancies.length > 0) {
            // 각 공실별로 실시간 투표 데이터를 가져와서 집계합니다.
            const vacanciesWithVotes = await Promise.all(dbVacancies.map(async (v) => {
              const { data: votes } = await supabase
                .from("votes")
                .select("category, category_icon")
                .eq("vacancy_id", v.id);

              // 업종별로 투표 수 집계
              const voteCounts: Record<string, { brand: string, count: number, categoryId: string }> = {};
              (votes || []).forEach(vote => {
                const brand = vote.category;
                if (!voteCounts[brand]) {
                  voteCounts[brand] = { brand, count: 0, categoryId: 'etc' };
                }
                voteCounts[brand].count += 1;
              });

              return {
                id: v.id,
                address: v.address || "",
                landmark: v.landmark,
                floor: v.floor || "1층",
                lat: v.lat,
                lng: v.lng,
                price: v.monthly_rent ? `월 ${v.monthly_rent}만원` : "정보 대기 중",
                size: v.area || "정보 대기 중",
                status: "available" as const,
                tags: ["이웃발견"],
                images: v.images ? v.images.split(',') : [],
                imageUrl: v.images ? v.images.split(',')[0] : v.image_url,
                deposit: v.deposit,
                monthlyRent: v.monthly_rent,
                managementFee: v.management_fee,
                surveyRemarks: v.survey_remarks,
                realtorName: v.realtor_name,
                realtorPhone: v.realtor_phone,
                area: v.area,
                currentVotes: Object.values(voteCounts),
              };
            }));

            setVacancies(vacanciesWithVotes);
          } else {
            setVacancies([]);
          }
        }).catch(() => {
          setVacancies([]);
        });
      }
    }

    setVotedIds([]);

    const timer = setInterval(() => {
      setFeedIndex((prev) => prev + 1);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const switchLocation = (type: 'home' | 'work') => {
    if (!userProfile) return;
    
    if (type === 'work' && !userProfile.work) {
      if (confirm("아직 '나의 일터'가 설정되지 않았어요.\n지금 마이페이지에서 설정하시겠어요?")) {
        setShowMyPage(true);
      }
      return;
    }

    const newProfile = { ...userProfile, activeLocationType: type };
    onProfileUpdate(newProfile);
    localStorage.setItem("gongsil_user_profile", JSON.stringify(newProfile));
    
    const target = type === 'home' ? userProfile.home : userProfile.work;
    if (target && mapRef.current) {
      mapRef.current.panTo(new kakao.maps.LatLng(target.lat, target.lng));
      setMapCenter({ lat: target.lat, lng: target.lng });
    }
  };

  const moveToMyLocation = () => {
    if (!mapRef.current) return;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const moveLatLng = new kakao.maps.LatLng(lat, lng);
          
          // 지도를 현재 GPS 위치로 부드럽게 이동
          mapRef.current?.panTo(moveLatLng);
          setMapCenter({ lat, lng });
        },
        (err) => {
          console.warn("GPS 위치를 가져올 수 없어 설정된 동네 위치로 이동합니다.", err);
          // GPS 실패 시 기존처럼 설정된 동네/일터 위치로 이동
          if (userProfile) {
            const activeLoc = userProfile.activeLocationType === 'home' ? userProfile.home : (userProfile.work || userProfile.home);
            mapRef.current?.panTo(new kakao.maps.LatLng(activeLoc.lat, activeLoc.lng));
            setMapCenter({ lat: activeLoc.lat, lng: activeLoc.lng });
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      // Geolocation 미지원 시 백업
      if (userProfile) {
        const activeLoc = userProfile.activeLocationType === 'home' ? userProfile.home : (userProfile.work || userProfile.home);
        mapRef.current?.panTo(new kakao.maps.LatLng(activeLoc.lat, activeLoc.lng));
        setMapCenter({ lat: activeLoc.lat, lng: activeLoc.lng });
      }
    }
  };

  const handleVacancyUpdate = (updated: Vacancy) => {
    setVacancies(vacancies.map(v => v.id === updated.id ? updated : v));
    if (!votedIds.includes(updated.id)) setVotedIds([...votedIds, updated.id]);
    setSelectedVacancy(updated);
  };

  // 핀 클릭: 같은 주소(동일 건물) 여러 층이면 층 선택, 1개면 바로 진입
  const handlePinClick = (clicked: Vacancy) => {
    // 주소 동일 여부와 30m 반경 거리 동시 판단 (대단지 아파트 내 다른 동 구분)
    const sameBuilding = filteredVacancies.filter(v => {
      const isClose = haversineKm(clicked.lat, clicked.lng, v.lat, v.lng) <= 0.03;
      const sameAddr = (clicked.address && v.address) ? v.address === clicked.address : true;
      return sameAddr && isClose;
    });
    if (sameBuilding.length > 1) {
      setFloorPickerGroup(sameBuilding);
    } else {
      setSelectedVacancy(clicked);
    }
  };

  const startDiscovery = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      setPinLocation({ lat: center.getLat(), lng: center.getLng() });
    }
    setIsPinpointing(true);
    setSelectedVacancy(null);
  };

  const confirmLocation = () => {
    const { lat, lng } = pinLocation;
    const geocoder = new kakao.maps.services.Geocoder();
    const ps = new kakao.maps.services.Places();

    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const addrData = result[0];
        setDetectedAddress(addrData.address.address_name);
        
        let buildingName = addrData.road_address?.building_name || "";
        
        ps.keywordSearch("우체국 은행 지하철역 정류장 도서관 공원 병원 학교 마트 시청 경찰서 아파트 단지", (famousData: any, famousStatus: any) => {
          ps.keywordSearch("빌딩 빌라 오피스텔", (buildingData: any, buildingStatus: any) => {
            let bestName = "";
            let minDistance = 999;
            let isFamous = false;

            if (famousStatus === kakao.maps.services.Status.OK && famousData.length > 0) {
              const closest = famousData[0];
              const dist = parseInt(closest.distance);
              if (dist < 150) {
                bestName = closest.place_name.replace(/\s/g, "");
                minDistance = dist;
                isFamous = true;
              }
            }

            if (!bestName && buildingStatus === kakao.maps.services.Status.OK && buildingData.length > 0) {
              const closestBuilding = buildingData[0];
              const dist = parseInt(closestBuilding.distance);
              if (dist < 60) { 
                bestName = closestBuilding.place_name.replace(/\s/g, "");
                minDistance = dist;
                isFamous = false; 
              }
            }

            if (!bestName && buildingName) {
              bestName = buildingName;
              minDistance = 0;
              isFamous = false;
            }

            if (bestName.includes("시청")) bestName = "서울시청";

            ps.keywordSearch("편의점 카페 약국 은행 부동산", (nearbyData: any, nearbyStatus: any) => {
              if (!bestName && nearbyStatus === kakao.maps.services.Status.OK && nearbyData.length > 0) {
                const nearest = nearbyData[0];
                const dist = parseInt(nearest.distance);
                if (dist < 40) {
                  bestName = `${nearest.place_name} 근처`;
                  minDistance = dist;
                  isFamous = false;
                }
              }

              setDetectedLandmark(bestName);
              setLandmarkDistance(minDistance);
              setIsFamousLandmark(isFamous);
              
              setIsPinpointing(false);
              setShowAddModal(true);
            }, { location: new kakao.maps.LatLng(lat, lng), radius: 50, sort: kakao.maps.services.SortBy.DISTANCE });
          }, { location: new kakao.maps.LatLng(lat, lng), radius: 250, sort: kakao.maps.services.SortBy.DISTANCE });
        }, { location: new kakao.maps.LatLng(lat, lng), radius: 400, sort: kakao.maps.services.SortBy.DISTANCE });
      }
    });
  };

  const addNewSpace = async () => {
    // 중복 방어 (안전장치 — UI에서이미 차단)
    const dup = vacancies.find(v => {
      const isClose = haversineKm(pinLocation.lat, pinLocation.lng, v.lat, v.lng) <= 0.03;
      const sameAddr = (detectedAddress && v.address) ? v.address === detectedAddress : true;
      return sameAddr && isClose && v.floor === newSpaceFloor;
    });
    if (dup) return;

    const featureTags = selectedFeatures.map(f => SPACE_FEATURES.find(sf => sf.id === f)?.label || "");
    const addrParts = detectedAddress.split(' ');
    const neighborhood = addrParts.length > 2 ? addrParts[addrParts.length - 2] : addrParts[0];
    
    let prefix = detectedLandmark || neighborhood;
    
    if (detectedLandmark) {
      if (isFamousLandmark) {
        if (detectedLandmark.includes("아파트") || detectedLandmark.includes("단지")) {
          if (landmarkDistance < 40) {
            prefix = `${detectedLandmark} 상가`;
          } else {
            prefix = `${detectedLandmark} 인근`;
          }
        } else {
          if (detectedLandmark.includes("출구") || detectedLandmark.includes("정류장") || landmarkDistance < 50) {
            prefix = `${detectedLandmark} 앞`;
          } else {
            prefix = `${detectedLandmark} 인근`;
          }
        }
      } else {
        prefix = detectedLandmark;
      }
    }
    
    const finalName = `${prefix} ${newSpaceFloor} 공간`;
    const userId = localStorage.getItem("gongsil_user_id") || undefined;

    // 로컬 상태 즉시 업데이트 (UX 빠름)
    const newV: Vacancy = {
      id: `v-${Date.now()}`,
      address: detectedAddress,
      landmark: finalName,
      floor: newSpaceFloor,
      lat: pinLocation.lat,
      lng: pinLocation.lng,
      price: "정보 대기 중",
      size: `${newSpaceSize} (${newSpaceFloor})`,
      status: "available",
      tags: [...featureTags, "이웃발견"],
      currentVotes: []
    };
    setVacancies([newV, ...vacancies]);
    setShowAddModal(false);
    setSelectedFeatures([]);
    setShowSuccessToast(`'${newV.landmark}' 공간이 성공적으로 등록되었습니다!`);
    setTimeout(() => setShowSuccessToast(null), 4000);

    // Supabase에 비동기 저장
    try {
      await saveVacancy({
        landmark: finalName,
        address: detectedAddress,
        floor: newSpaceFloor,
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        neighborhood,
        userId,
      });
    } catch (e) {
      console.warn("공실 Supabase 저장 실패:", e);
    }
  };


  const votedVacancies = filteredVacancies.filter(v => votedIds.includes(v.id));

  // ─ 중복 공실 판정: 같은 주소 + 30m 반경 이내 + 같은 층 (대단지 아파트 내 동 구분) ────────────────────────────────
  const duplicateVacancy = showAddModal
    ? vacancies.find(v => {
        const isClose = haversineKm(pinLocation.lat, pinLocation.lng, v.lat, v.lng) <= 0.03;
        const sameAddr = (detectedAddress && v.address) ? v.address === detectedAddress : true;
        return sameAddr && isClose && v.floor === newSpaceFloor;
      })
    : undefined;
  const isDuplicate = !!duplicateVacancy;

  const mapMarkers = useMemo(() => {
    if (isPinpointing) return null;
    const seen = new Set<string>();
    const groups: Vacancy[][] = [];
    filteredVacancies.forEach(v => {
      if (seen.has(v.id)) return;
      const group = filteredVacancies.filter(other => {
        const isClose = haversineKm(v.lat, v.lng, other.lat, other.lng) <= 0.03;
        const sameAddr = (v.address && other.address) ? other.address === v.address : true;
        return sameAddr && isClose;
      });
      group.forEach(g => seen.add(g.id));
      groups.push(group);
    });
    return groups.map(group => {
      const rep = group[0];
      const hasVoted = group.some(v => votedIds.includes(v.id));
      const multiFloor = group.length > 1;
      return (
        <CustomOverlayMap key={`${rep.id}-${hasVoted}`} position={{ lat: rep.lat, lng: rep.lng }}>
          <button onClick={() => handlePinClick(rep)} className="relative group">
            <div className={`relative w-12 h-12 rounded-[1.5rem] flex items-center justify-center border-2 shadow-md transition-all duration-300 ${hasVoted ? "bg-amber-500 text-slate-950 border-white scale-110" : "bg-slate-950 text-white border-white/20 hover:border-white/50"}`}>
              <Lightbulb size={24} fill="currentColor" />
            </div>
            {multiFloor && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center shadow">
                <span className="text-[9px] font-black text-slate-950">{group.length}</span>
              </div>
            )}
          </button>
        </CustomOverlayMap>
      );
    });
  }, [filteredVacancies, isPinpointing, votedIds]);

  if (loading) return null;
  if (error) return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-950 text-white p-8 text-center">
      <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4 text-red-500">
        <span className="text-3xl">⚠️</span>
      </div>
      <h2 className="text-xl font-black mb-2">지도 로딩 실패</h2>
      <p className="text-slate-400 text-sm">카카오 JavaScript 키가 올바르지 않거나 허용된 도메인이 아닙니다.</p>
    </div>
  );

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans overflow-hidden subpixel-antialiased text-slate-900">
      <div className="absolute top-8 left-0 right-0 px-6 z-[100] pointer-events-none">
        <div className="flex items-center gap-4 w-full max-w-2xl mx-auto">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20"><Lightbulb size={20} fill="currentColor" /></div>
            <h1 className="text-base font-black text-white tracking-tighter">여긴뭐가</h1>
          </motion.div>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 pointer-events-auto">
            <div className="bg-slate-950/80 backdrop-blur-xl p-1.5 rounded-[1.8rem] border border-white/10 flex gap-1 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
              <button onClick={() => switchLocation('home')} className={`flex-1 py-3.5 rounded-2xl text-[13px] font-black transition-all flex items-center justify-center gap-2 ${userProfile?.activeLocationType === 'home' ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white"}`}><Home size={16} /> 우리 동네</button>
              <button onClick={() => switchLocation('work')} className={`flex-1 py-3.5 rounded-2xl text-[13px] font-black transition-all flex items-center justify-center gap-2 ${userProfile?.activeLocationType === 'work' ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white"}`}><Briefcase size={16} /> 나의 일터</button>
            </div>
          </motion.div>
          {/* 마이페이지 버튼 */}
          <motion.button 
            initial={{ x: 20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            onClick={() => setShowMyPage(true)} 
            className="w-14 h-14 bg-slate-950/80 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center text-white shadow-[0_20px_40px_rgba(0,0,0,0.4)] pointer-events-auto hover:bg-slate-800 transition-all"
          >
            <User size={24} />
          </motion.button>
        </div>

      </div>

      <div className="absolute inset-0 z-0">
        <Map center={mapCenter} style={{ width: "100%", height: "100%" }} level={3} ref={mapRef} onDragStart={() => setShowDashboard(false)}>
          {/* 주소 기준으로 같은 건물 공실을 하나의 핀으로 묶어 표시 */}
          {mapMarkers}
          {isPinpointing && (<MapMarker position={pinLocation} draggable={true} onDragEnd={(marker) => setPinLocation({ lat: marker.getPosition().getLat(), lng: marker.getPosition().getLng() })} image={{ src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA2MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMzAgNzRMMTQgNTJDNyA0MyAzIDM1IDMgMjdDMyAxMiAxNSAwIDMwIDBDNDUgMCA1NyAxMiA1NyAyN0M1NyAzNSA1MyA0MyA0NiA1MkwzMCA3NFoiIGZpbGw9IiMwMjA2MTciIHN0cm9rZT0iI0Y1OUUwQiIgc3Ryb2tlLXdpZHRoPSI1Ii8+CiAgPGNpcmNsZSBjeD0iMzAiIGN5PSIyNyIgcj0iMTIiIGZpbGw9IiNGNTlFMEIiLz4KICA8cGF0aCBkPSJNMzAgMTlMMzAgMzVNMjMgMjZMMzcgMjZNMjUgMjNMMzUgMjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAyMDYxNyIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+", size: { width: 50, height: 65 }, options: { offset: { x: 25, y: 65 } } }} />)}
        </Map>
      </div>

      <div className="absolute top-[88px] left-4 right-4 z-50 pointer-events-none transition-all duration-500">
        {localFeeds.length > 0 && (() => {
          const currentFeed = localFeeds[feedIndex % localFeeds.length];
          return (
            <div key={feedIndex} className="bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3 w-fit mx-auto pointer-events-auto animate-[fadeIn_0.5s_ease-out]">
              <div className={`w-8 h-8 rounded-xl ${currentFeed.color} flex items-center justify-center text-white shadow-sm`}><MessageSquare size={14} fill="currentColor" /></div>
              <div><p className="text-[11px] font-black text-slate-900 leading-tight tracking-tight"><span className="text-amber-600 mr-2">새소식</span>{currentFeed.text}</p></div>
            </div>
          );
        })()}
      </div>

      <div className="absolute right-6 bottom-56 flex flex-col gap-4 z-[100]">
        {!isPinpointing && (
          <motion.button 
            initial={{ scale: 0, x: 20 }} 
            animate={{ scale: 1, x: 0 }} 
            whileHover={{ scale: 1.05, y: -5 }}
            onClick={() => setShowCurator(true)} 
            className="h-16 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-[1.8rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 border-2 border-white/20 overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Sparkles size={22} className="text-amber-300 fill-amber-300 animate-pulse" />
            <span className="text-xs font-black tracking-tight whitespace-nowrap">나만의 취향 공간 찾기</span>
          </motion.button>
        )}
        {!isPinpointing && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={startDiscovery} className="w-16 h-16 bg-slate-950 text-amber-500 rounded-3xl shadow-2xl flex items-center justify-center border-[5px] border-amber-500 relative group overflow-hidden">
            <div className="absolute inset-0 bg-amber-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus size={36} strokeWidth={4} className="relative z-10 group-hover:text-slate-950 transition-colors" />
          </motion.button>
        )}
        {isPinpointing && (<motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsPinpointing(false)} className="w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all border-4 border-slate-50"><X size={32} /></motion.button>)}
        {!showDashboard && !isPinpointing && !selectedVacancy && (<motion.button initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }} onClick={() => setShowDashboard(true)} className="w-14 h-14 bg-amber-500 text-slate-950 rounded-2xl shadow-2xl flex flex-col items-center justify-center border-2 border-white"><History size={20} /><span className="text-[8px] font-black mt-0.5">상상목록</span></motion.button>)}
        <motion.button whileHover={{ scale: 1.1 }} onClick={moveToMyLocation} className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-900 border border-slate-100"><LocateFixed size={28} /></motion.button>
      </div>

      {!isPinpointing && !selectedVacancy && (
        <div className="absolute bottom-10 left-0 right-0 px-6 z-10 pointer-events-none">
          <motion.div initial={{ y: 300, opacity: 0 }} animate={{ y: showDashboard ? 0 : 350, opacity: showDashboard ? 1 : 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="max-w-xl mx-auto bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100 pointer-events-auto overflow-hidden relative">
             <button onClick={() => setShowDashboard(false)} className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full mb-4" />
             <div className="flex items-center justify-between mb-4 mt-2 relative z-10">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 shadow-lg"><History size={18} /></div><h2 className="text-base font-black text-slate-950 tracking-tight">나의 상상 조각들 <span className="text-amber-600 ml-1">{votedIds.length}</span></h2></div>
                <button className="text-[9px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-[0.2em] hover:text-amber-600 transition-all">전체 보기 <ChevronRight size={10} /></button>
             </div>
             {votedVacancies.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar relative z-10">
                   {votedVacancies.map(v => (
                        <div key={v.id} onClick={() => { setSelectedVacancy(v); mapRef.current?.panTo(new kakao.maps.LatLng(v.lat, v.lng)); }} className="min-w-[220px] bg-white p-5 rounded-[2rem] border-2 border-slate-50 hover:border-amber-300 transition-all cursor-pointer group shadow-sm hover:shadow-xl">
                           <div className="flex items-start justify-between mb-4"><span className="text-[8px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest">생생한 제보</span><ArrowRight size={14} className="text-slate-200 group-hover:text-amber-500 transition-all" /></div>
                           <h3 className="font-black text-slate-950 text-sm mb-1 tracking-tight line-clamp-1">{v.landmark}</h3>
                           <div className="bg-slate-950 p-4 rounded-2xl shadow-inner mt-3"><div className="flex items-center justify-between"><span className="text-[10px] font-black text-white">✨ {(v.currentVotes || []).sort((a,b)=>b.count-a.count)[0]?.brand || "상상 중"}</span><span className="text-[10px] font-bold text-amber-500">{(v.currentVotes || []).reduce((a,b)=>a+b.count,0)}표</span></div></div>
                        </div>
                   ))}
                </div>
             ) : (<div className="py-10 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200"><p className="text-xs font-black text-slate-400">지도의 핀을 눌러 첫 번째 상상을 시작하세요.</p></div>)}
          </motion.div>
        </div>
      )}

      {isPinpointing && (
        <div className="absolute bottom-20 left-0 right-0 px-8 flex justify-center z-[100] pointer-events-none">
           <motion.button onClick={confirmLocation} initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-amber-500 text-slate-950 px-12 py-6 rounded-[3rem] text-xl font-black shadow-[0_25px_50px_rgba(245,158,11,0.4)] flex items-center gap-5 border-4 border-white pointer-events-auto active:scale-95 transition-all"><Check size={32} strokeWidth={5} />이 위치 상상하기</motion.button>
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center p-6 overflow-y-auto pt-10 pb-20">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/90" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100">
               <div className="p-12 pt-16">
                 <div className="mb-12 relative">
                    <div className="absolute -top-6 -left-2 opacity-10 scale-150 pointer-events-none"><Building2 size={80} className="text-amber-500" /></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl border-2 border-white/10"><Building2 size={24} /></div>
                      <h2 className="text-3xl font-black text-slate-950 tracking-tighter">상상 공간 등록 ✨</h2>
                    </div>
                    <div className="flex items-center gap-2 ml-16"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{detectedLandmark || detectedAddress.split(' ').slice(-2).join(' ')}</p></div>
                 </div>
                 <div className="space-y-12">
                    <div><div className="flex items-center gap-3 mb-3"><div className="h-6 w-1.5 bg-amber-500 rounded-full" /><h3 className="text-xl font-black text-slate-950 tracking-tight">공간 추가</h3></div><p className="text-sm font-bold text-slate-400 leading-relaxed">새로운 상상을 더할 공간의 정보를 아래에서 선택해 주세요.</p></div>
                    <div className="space-y-12">
                       <div className="space-y-6">
                          <label className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-widest"><NavigationIcon size={14} /> 층수</label>
                          <div className="grid grid-cols-2 gap-4">
                            {["1층", "2층", "3층 이상", "지하"].map(f => {
                              const floorDup = vacancies.find(v => {
                                const isClose = haversineKm(pinLocation.lat, pinLocation.lng, v.lat, v.lng) <= 0.03;
                                const sameAddr = (detectedAddress && v.address) ? v.address === detectedAddress : true;
                                return sameAddr && isClose && v.floor === f;
                              });
                              return (
                                <button key={f} onClick={() => setNewSpaceFloor(f)}
                                  className={`relative flex flex-col items-center justify-center py-5 px-2 rounded-3xl border-2 transition-all shadow-sm font-black text-sm ${
                                    floorDup ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                    : newSpaceFloor === f ? "bg-slate-950 text-white border-slate-950 scale-105 ring-4 ring-amber-500/20"
                                    : "bg-white text-slate-900 border-slate-100 hover:border-slate-300"}`}
                                >
                                  {f}
                                  {floorDup && <span className="text-[8px] font-bold text-orange-400 mt-0.5">투표진행중</span>}
                                </button>
                              );
                            })}
                          </div>
                          {isDuplicate && (
                            <div className="flex items-start gap-3 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                              <span className="text-lg">⚠️</span>
                              <div>
                                <p className="text-sm font-black text-orange-700">해당 위치에는 이미 투표가 진행중입니다</p>
                                <p className="text-[11px] font-bold text-orange-500 leading-relaxed mt-0.5">
                                  <span className="font-black">{duplicateVacancy?.landmark || "이 공간"}</span>에서 이미 이웃들이 투표하고 있어요.<br/>
                                  해당 핀을 클릭하여 투표에 참여해보세요!
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                       <div className="space-y-6"><label className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-widest"><Maximize size={14} /> 규모</label><div className="grid grid-cols-3 gap-3">{[{ label: "아담해요", sub: "테이크아웃 추천" },{ label: "적당해요", sub: "5~6개 테이블" },{ label: "넓어요", sub: "단체 손님 가능" }].map(s => (<button key={s.label} onClick={() => setNewSpaceSize(s.label)} className={`flex flex-col items-center justify-center py-4 px-1 rounded-3xl border-2 transition-all shadow-sm ${newSpaceSize === s.label ? "bg-slate-950 text-white border-slate-950 scale-105" : "bg-white text-slate-900 border-slate-100 hover:border-slate-300"}`}><span className="text-[11px] font-black mb-1">{s.label}</span><span className={`text-[7px] font-bold ${newSpaceSize === s.label ? "text-amber-500" : "text-slate-400"}`}>{s.sub}</span></button>))}</div></div>
                       <div className="space-y-6"><label className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-widest"><Clock size={14} /> 공실 기간</label><div className="grid grid-cols-2 gap-4">{[{ label: "방금 비었음", sub: "최근까지 영업" },{ label: "좀 됐어요", sub: "한두 달 정도" },{ label: "오래됨", sub: "오랫동안 공실" },{ label: "잘 모르겠어요", sub: "정보 없음" }].map(d => (<button key={d.label} onClick={() => setNewSpaceDuration(d.label)} className={`flex flex-col items-center justify-center py-4 px-2 rounded-3xl border-2 transition-all shadow-sm ${newSpaceDuration === d.label ? "bg-slate-950 text-white border-slate-950 scale-105" : "bg-white text-slate-900 border-slate-100 hover:border-slate-300"}`}><span className="text-[12px] font-black mb-1">{d.label}</span><span className={`text-[8px] font-bold ${newSpaceDuration === d.label ? "text-amber-500" : "text-slate-400"}`}>{d.sub}</span></button>))}</div></div>
                       <div className="space-y-6"><label className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-widest"><Sparkles size={14} /> 특징 <span className="text-[10px] text-amber-600 ml-1">(중복 가능)</span></label><div className="flex flex-wrap gap-3">{SPACE_FEATURES.map((feat) => (<button key={feat.id} onClick={() => setSelectedFeatures(prev => prev.includes(feat.id) ? prev.filter(f => f !== feat.id) : [...prev, feat.id])} className={`px-5 py-3 rounded-full text-[12px] font-black border-2 transition-all flex items-center gap-2 shadow-sm ${selectedFeatures.includes(feat.id) ? "bg-amber-100 text-amber-700 border-amber-300 scale-105" : "bg-slate-50 text-slate-400 border-slate-50 hover:border-slate-200"}`}><span>{feat.icon}</span>{feat.label}</button>))}</div></div>
                    </div>
                 </div>
                 <div className="flex gap-5 mt-12">
                   <button onClick={() => setShowAddModal(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black rounded-3xl text-lg hover:bg-slate-100 transition-all">취소</button>
                    <button
                      onClick={isDuplicate ? () => {
                        setShowAddModal(false);
                        if (duplicateVacancy) {
                          setSelectedVacancy(duplicateVacancy);
                          mapRef.current?.panTo(new kakao.maps.LatLng(duplicateVacancy.lat, duplicateVacancy.lng));
                        }
                      } : addNewSpace}
                      className={`flex-1 py-6 font-black rounded-3xl text-lg shadow-xl active:scale-95 transition-all ${
                        isDuplicate ? "bg-orange-500 text-white" : "bg-amber-500 text-slate-950 hover:scale-[1.02]"
                      }`}
                    >
                      {isDuplicate ? "진행 중인 투표 보기 →" : "등록 완료"}
                    </button>
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* 층 선택 바텀시트 (같은 건물 다층) */}
        {floorPickerGroup && (
          <motion.div
            key="floor-picker"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[160] flex items-end justify-center"
          >
            <div className="absolute inset-0 bg-slate-900/80" onClick={() => setFloorPickerGroup(null)} />
            <motion.div
              initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative z-10 w-full max-w-lg mx-4 mb-8"
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                {/* 헤더 */}
                <div className="px-8 pt-8 pb-4">
                  <button onClick={() => setFloorPickerGroup(null)} className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full" />
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center">
                      <Building2 size={20} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">이 건물에서 {floorPickerGroup.length}개 층 투표 진행중</p>
                      <h3 className="text-base font-black text-slate-950 tracking-tight">투표할 층을 선택해주세요</h3>
                    </div>
                  </div>
                </div>
                {/* 층 목로 */}
                <div className="px-6 pb-8 space-y-3">
                  {[...(floorPickerGroup || [])]
                    .sort((a, b) => {
                      const order = ["1층", "2층", "3층 이상", "지하"];
                      return order.indexOf(a.floor) - order.indexOf(b.floor);
                    })
                    .map(v => {
                      const topVote = (v.currentVotes || []).sort((a, b) => b.count - a.count)[0];
                      const totalVotes = (v.currentVotes || []).reduce((s, vt) => s + vt.count, 0);
                      const hasVoted = votedIds.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          onClick={() => { setFloorPickerGroup(null); setSelectedVacancy(v); }}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-95 ${
                            hasVoted ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-100 hover:border-slate-300"
                          }`}
                        >
                          {/* 층 배지 */}
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-black ${
                            hasVoted ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-white"
                          }`}>
                            <span className="text-lg leading-none">{v.floor.replace("층", "")}</span>
                            <span className="text-[9px] font-bold opacity-60">층</span>
                          </div>
                          {/* 정보 */}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-black text-slate-950 tracking-tight">{v.landmark}</p>
                            {topVote && totalVotes > 0 ? (
                              <p className="text-[11px] font-bold text-amber-600 mt-0.5">1위 '{topVote.brand}' &middot; {totalVotes}표</p>
                            ) : (
                              <p className="text-[11px] font-bold text-slate-400 mt-0.5">첫 번째 투표를 남겨보세요!</p>
                            )}
                          </div>
                          {/* 투표 현황 */}
                          <div className="flex flex-col items-end gap-1">
                            {hasVoted && <span className="text-[9px] font-black text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">투표완료</span>}
                            <ChevronRight size={16} className="text-slate-300" />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVacancy && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[150] bg-slate-950">
            <Building3D 
              userProfile={userProfile}
              vacancy={selectedVacancy} 
              hasVoted={votedIds.includes(selectedVacancy.id)} 
              isEntrepreneurMode={isEntrepreneurMode}
              recommendedCategory={recommendedCategory}
              onModeSwitch={() => setIsEntrepreneurMode(true)}
              onVacancyUpdate={handleVacancyUpdate} 
              onClose={() => setSelectedVacancy(null)} 
            />
          </motion.div>
        )}
        {showMyPage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[170] shadow-2xl">
             <div className="absolute inset-0 bg-slate-900/90" onClick={() => setShowMyPage(false)} />
             <div className="absolute top-0 right-0 bottom-0 w-full max-w-lg bg-white overflow-y-auto shadow-2xl transition-all">
                <MyPage 
                  isEntrepreneurMode={isEntrepreneurMode}
                  onModeChange={setIsEntrepreneurMode}
                  onClose={() => setShowMyPage(false)}
                  onLogout={() => { localStorage.removeItem("gongsil_user_profile"); window.location.reload(); }} 
                  vacancies={vacancies}
                />
             </div>
          </motion.div>
        )}
        {showCurator && (
          <SpaceCurator 
            userProfile={userProfile}
            onClose={() => setShowCurator(false)} 
            onComplete={(category) => {
              setRecommendedCategory(category);
              setShowCurator(false);
              setShowSuccessToast(`'${category}' 취향을 찾았습니다! 이제 지도의 핀을 눌러 공간을 선택해주세요.`);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div initial={{ y: -100, opacity: 0, x: "-50%" }} animate={{ y: 40, opacity: 1, x: "-50%" }} exit={{ y: -100, opacity: 0, x: "-50%" }} className="fixed top-0 left-1/2 z-[300] bg-slate-900 px-8 py-5 rounded-[2rem] border border-slate-700 shadow-2xl flex items-center gap-4 min-w-[320px]">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]"><Check size={20} strokeWidth={4} /></div>
            <div><p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">상상 현실화 완료</p><p className="text-sm font-black text-white">{showSuccessToast}</p></div>
            <button onClick={() => setShowSuccessToast(null)} className="ml-4 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 첫 방문 안내 오버레이 */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            key="tutorial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[250] flex items-end justify-center"
          >
            {/* 배경 어둥 (반투명) */}
            <div
              className="absolute inset-0 bg-slate-900/80"
              onClick={() => {
                setShowTutorial(false);
                localStorage.setItem("gongsil_tutorial_done", "1");
              }}
            />

            {/* 안내 카드 */}
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260, delay: 0.1 }}
              className="relative z-10 w-full max-w-lg mx-4 mb-8"
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
                {/* 헤더 */}
                <div className="px-8 pt-8 pb-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-slate-950 rounded-xl flex items-center justify-center">
                      <Lightbulb size={16} className="text-amber-500" fill="currentColor" />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">이렇게 사용하세요</p>
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 tracking-tighter">우리 동네, 함께 채워가요 ✨</h2>
                </div>

                {/* 팁 카드 2개 */}
                <div className="px-6 pb-6 space-y-3">
                  {/* 팁 1 */}
                  <div className="flex items-start gap-4 bg-amber-50 rounded-2xl p-5">
                    <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                      <Plus size={22} strokeWidth={3} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">TIP 1 &middot; 공간 등록</p>
                      <p className="text-sm font-black text-slate-900 leading-snug">동네를 걸다 발견한 빈 공간,<br/>바로 지도에 꽀아보세요.</p>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">화면 오른쪽 ➕ 버튼을 눌러주세요</p>
                    </div>
                  </div>

                  {/* 팁 2 */}
                  <div className="flex items-start gap-4 bg-slate-50 rounded-2xl p-5">
                    <div className="w-11 h-11 bg-slate-950 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Lightbulb size={20} className="text-amber-500" fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">TIP 2 &middot; 업종 투표</p>
                      <p className="text-sm font-black text-slate-900 leading-snug">지도의 핀을 탭하면<br/>내가 원하는 업종을 바로 투표할 수 있어요.</p>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">여러 이웃의 주표가 모여 동네가 바뀌어요</p>
                    </div>
                  </div>
                </div>

                {/* 시작 버튼 */}
                <div className="px-6 pb-8">
                  <button
                    onClick={() => {
                      setShowTutorial(false);
                      localStorage.setItem("gongsil_tutorial_done", "1");
                    }}
                    className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black text-base shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    알겠어요, 시작하기
                    <ArrowRight size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
