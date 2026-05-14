"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Landmark, Layers, CircleDollarSign, MessageSquare, User, Phone, Check, Camera, Plus, Trash2, Clock, History, MapPin } from "lucide-react";
import { Vacancy } from "../data/dummyVacancies";
import { uploadImage } from "../lib/db";

interface SurveyInputProps {
  allVacancies: any[];
  initialData?: any;
  onClose: () => void;
  onSave: (data: Partial<Vacancy>) => void;
  onEditLocation?: () => void;
}

// 거리 계산 (Haversine formula)
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

// 금액 콤마 포맷팅
const formatCurrency = (val: number | string) => {
  const num = Number(val);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat('ko-KR').format(num);
};

// 억 단위 환산 표시
const getEokDisplay = (manWon: number | string) => {
  const num = Number(manWon);
  if (isNaN(num) || num < 10000) return null;
  const eok = Math.floor(num / 10000);
  const remainder = num % 10000;
  return `${eok}억 ${remainder > 0 ? formatCurrency(remainder) + "만" : ""}`;
};

// 입력 필드 컴포넌트 (포커스 유지 위해 외부 분리)
const InputField = ({ label, icon: Icon, value, onChange, type = "text", placeholder, suffix }: any) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
          <Icon size={18} /> {label}
        </label>
        {type === "number" && value >= 10000 && (
          <motion.span 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-100"
          >
            약 {getEokDisplay(value)}
          </motion.span>
        )}
      </div>
      <div className="relative group">
        <input
          type={type === "number" ? "text" : type}
          value={type === "number" ? (value === 0 ? "" : formatCurrency(value)) : value}
          onChange={(e) => {
            if (type === "number") {
              const val = e.target.value.replace(/,/g, '');
              if (val === "" || /^\d+$/.test(val)) {
                onChange(val === "" ? 0 : Number(val));
              }
            } else {
              onChange(e.target.value);
            }
          }}
          placeholder={placeholder}
          className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 px-8 font-bold text-slate-950 focus:outline-none focus:border-amber-500 transition-all text-lg group-hover:border-slate-200"
        />
        {suffix && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 uppercase tracking-widest">{suffix}</span>
        )}
      </div>
    </div>
  );
};

export default function SurveyInput({ allVacancies, initialData, onClose, onSave, onEditLocation }: SurveyInputProps) {
  const [formData, setFormData] = useState<Partial<Vacancy>>({
    id: initialData?.id,
    lat: initialData?.lat,
    lng: initialData?.lng,
    address: initialData?.address || "",
    landmark: initialData?.landmark || "",
    floor: initialData?.floor || "1층",
    deposit: initialData?.deposit || 0,
    monthlyRent: initialData?.monthlyRent || 0,
    managementFee: initialData?.managementFee || 0,
    surveyRemarks: initialData?.surveyRemarks || "",
    realtorName: initialData?.realtorName || "",
    realtorPhone: initialData?.realtorPhone || "",
    images: Array.isArray(initialData?.images) 
      ? initialData.images 
      : (typeof initialData?.images === 'string' ? (initialData.images as string).split(',').filter(Boolean) : []),
    area: initialData?.area || "",
    vacancyPeriod: initialData?.vacancyPeriod || "잘 모르겠어요",
    status: initialData?.status || "available",
    hiddenReason: initialData?.hiddenReason || "",
    hiddenComment: initialData?.hiddenComment || "",
    mergedIntoId: initialData?.merged_into_id || initialData?.mergedIntoId || "",
    rejectionReason: initialData?.rejectionReason || initialData?.rejection_reason || "",
  });

  const [isUploading, setIsUploading] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = formData.images || [];
    const remainingSlots = 5 - currentImages.length;
    const filesToUpload = files.slice(0, remainingSlots);

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const slotIndex = currentImages.length + i;
      
      setIsUploading(slotIndex);
      try {
        const url = await uploadImage(file);
        if (url) {
          setFormData(prev => ({
            ...prev,
            images: [...(prev.images || []), url]
          }));
        }
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    setIsUploading(null);
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  // 가장 인접한 공실 찾기
  const nearestVacancy = allVacancies
    .filter(v => v.id !== formData.id && v.status !== 'merged')
    .map(v => ({ ...v, distance: getDistance(formData.lat || 0, formData.lng || 0, v.lat, v.lng) }))
    .sort((a, b) => a.distance - b.distance)[0];

  const handleSave = () => {
    // 통합 처리 시 유효성 검사
    if (formData.status === 'merged') {
      const targetId = formData.mergedIntoId?.trim();
      if (!targetId || targetId.length !== 10 || isNaN(Number(targetId))) {
        alert("올바른 10자리 공실 ID를 입력해주세요.");
        return;
      }
      const targetExists = allVacancies.find(v => v.display_id === targetId);
      if (!targetExists) {
        alert("존재하지 않는 공실 ID입니다. 다시 확인해주세요.");
        return;
      }
    }

    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-12 pb-8 border-b border-slate-50 relative flex-shrink-0">
          <div className="flex items-center gap-6 mb-3">
            <div className="w-16 h-16 bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-xl border-2 border-white/10">
              <Building2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-black text-slate-950 tracking-tighter leading-none">툇마루단 현장 조사 ✨</h2>
                {initialData?.display_id && (
                  <span className="px-2 py-1 bg-slate-950 text-white text-[9px] font-black rounded-lg tracking-tighter h-fit">
                    ID: {initialData.display_id}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{formData.address || "신규 공실 등록"}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-12 right-12 text-slate-300 hover:text-slate-600 transition-colors">
            <X size={32} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scroll no-scrollbar">
          {/* 이미지 섹션 */}
          <div className="space-y-6">
            <label className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
              <Camera size={18} /> 현장 사진 (최대 5장)
            </label>
            <div className="grid grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="relative aspect-square bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden group hover:border-amber-500 transition-all">
                  {formData.images?.[idx] ? (
                    <>
                      <img src={formData.images[idx]} className="w-full h-full object-cover" alt={`공실 사진 ${idx + 1}`} />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => removeImage(idx)} className="bg-red-500 text-white p-3 rounded-xl shadow-xl hover:scale-110 transition-all">
                          <Trash2 size={20} />
                        </button>
                      </div>
                      {idx === 0 && <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-1 rounded-md">대표</span>}
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      {isUploading === idx ? (
                        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus size={32} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        onChange={handleFileChange}
                        disabled={isUploading !== null}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-400 text-center italic mt-3">첫 번째 사진이 투표 화면 배경으로 사용됩니다.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-4">
            <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-200">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">핀 위치 수정</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{formData.lat?.toFixed(6)}, {formData.lng?.toFixed(6)}</p>
                </div>
              </div>
              <button 
                onClick={onEditLocation}
                className="px-6 py-3 bg-slate-950 text-white text-[11px] font-black rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
              >
                지도에서 위치 수정하기 →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <InputField label="랜드마크 명칭" icon={Landmark} value={formData.landmark} onChange={(v: string) => setFormData({...formData, landmark: v})} placeholder="예: 무악재역 인근 건물" />
            <InputField label="해당 층수" icon={Layers} value={formData.floor} onChange={(v: string) => setFormData({...formData, floor: v})} placeholder="예: 1층" />
            <InputField label="전용 면적" icon={Building2} value={formData.area} onChange={(v: string) => setFormData({...formData, area: v})} placeholder="예: 약 30평 / 99㎡" />
          </div>

          <div className="space-y-6">
            <label className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
              <Clock size={18} /> 공실 기간 (현장 확인 필요)
            </label>
            <div className="grid grid-cols-4 gap-3">
              {["방금 비었음", "공실된지 좀 됐어요", "공실된지 오래됐어요", "잘 모르겠어요"].map(d => (
                <button 
                  key={d} 
                  onClick={() => setFormData({...formData, vacancyPeriod: d})}
                  className={`py-4 rounded-2xl text-[10px] font-black border-2 transition-all ${formData.vacancyPeriod === d ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-4"><div className="h-10 w-2 bg-blue-500 rounded-full" /><h3 className="text-2xl font-black text-slate-950 tracking-tight">임대 조건</h3></div>
            <div className="grid grid-cols-3 gap-6">
              <InputField label="보증금" icon={CircleDollarSign} type="number" value={formData.deposit} onChange={(v: number) => setFormData({...formData, deposit: v})} suffix="만원" />
              <InputField label="월세" icon={CircleDollarSign} type="number" value={formData.monthlyRent} onChange={(v: number) => setFormData({...formData, monthlyRent: v})} suffix="만원" />
              <InputField label="관리비" icon={CircleDollarSign} type="number" value={formData.managementFee} onChange={(v: number) => setFormData({...formData, managementFee: v})} suffix="만원" />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-4"><div className="h-10 w-2 bg-rose-500 rounded-full" /><h3 className="text-2xl font-black text-slate-950 tracking-tight">공간 상태 관리</h3></div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'available', label: '공실 가능', icon: '✅' },
                { id: 'completed', label: '입점 완료', icon: '✨' },
                { id: 'merged', label: '통합 처리', icon: '🔗' },
                { id: 'rejected', label: '비공개/반려', icon: '🔒' }
              ].map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setFormData({...formData, status: s.id})}
                  className={`py-5 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${formData.status === s.id ? 'bg-slate-950 border-slate-950 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[12px] font-black">{s.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {formData.status === 'merged' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="p-8 bg-purple-50 rounded-[2.5rem] border-2 border-purple-100 space-y-6">
                    {nearestVacancy && (
                      <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">가장 인접한 공실 추천</span>
                          <span className="text-[9px] font-bold text-slate-400 italic">약 {Math.round(nearestVacancy.distance)}m 거리</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-purple-600 text-white text-[10px] font-black rounded-lg">{nearestVacancy.display_id}</span>
                          <span className="font-black text-slate-950 text-sm">{nearestVacancy.landmark}</span>
                        </div>
                        <button 
                          onClick={() => setFormData({...formData, mergedIntoId: nearestVacancy.display_id})}
                          className="w-full mt-2 py-2 bg-purple-50 text-purple-600 text-[10px] font-black rounded-xl hover:bg-purple-600 hover:text-white transition-all"
                        >
                          이 공실 ID로 자동 입력하기
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-purple-400 uppercase tracking-widest px-1">통합할 대상 공실 ID (10자리)</label>
                      <input
                        type="text"
                        value={formData.mergedIntoId || ""}
                        onChange={(e) => setFormData({...formData, mergedIntoId: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})}
                        placeholder="통합될 공실의 10자리 ID를 입력해주세요."
                        className="w-full bg-white border-2 border-purple-100 rounded-2xl py-4 px-6 font-bold text-slate-950 focus:outline-none focus:border-purple-500 transition-all text-sm"
                      />
                      <p className="text-[10px] text-purple-600 font-bold ml-1">※ 동일한 공간에 대한 중복 제보인 경우 하나로 통합 관리됩니다.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {formData.status === 'rejected' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="p-8 bg-rose-50 rounded-[2.5rem] border-2 border-rose-100 space-y-6">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-rose-400 uppercase tracking-widest px-1">비공개/반려 사유 선택</label>
                      <div className="flex flex-wrap gap-2">
                        {["공실아님", "임대인요청", "정보부족", "기타"].map(r => (
                          <button 
                            key={r} 
                            onClick={() => setFormData({...formData, rejectionReason: r})}
                            className={`px-6 py-3 rounded-full text-[12px] font-black border-2 transition-all ${formData.rejectionReason === r ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-white border-white text-slate-400 hover:border-slate-200'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-rose-400 uppercase tracking-widest px-1">상세 사유 입력 (제보자에게 안내됨)</label>
                      <textarea
                        value={formData.hiddenComment || ""}
                        onChange={(e) => setFormData({...formData, hiddenComment: e.target.value})}
                        placeholder="등록한 사람에게 전달될 상세 사유를 입력해주세요."
                        className="w-full bg-white border-2 border-rose-100 rounded-2xl py-4 px-6 font-bold text-slate-950 focus:outline-none focus:border-rose-500 transition-all text-sm min-h-[100px]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {formData.status === 'completed' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">✨</div>
                <p className="text-sm font-bold text-emerald-700 leading-relaxed">
                  임대차계약이 완료된 공간입니다. <br/>
                  저장 시 사용자에게 <span className="font-black text-emerald-900">'어떤 공간이 입점될 예정입니다. 많이 기대해주세요'</span> 메시지가 표시됩니다.
                </p>
              </motion.div>
            )}
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-4"><div className="h-10 w-2 bg-amber-500 rounded-full" /><h3 className="text-2xl font-black text-slate-950 tracking-tight">툇마루단 소견</h3></div>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
                <MessageSquare size={18} /> 한줄평 (비고)
              </label>
              <textarea
                value={formData.surveyRemarks || ""}
                onChange={(e) => setFormData({...formData, surveyRemarks: e.target.value})}
                placeholder="공실의 특징을 한줄로 요약해 주세요 (예: 층고가 높고 채광이 좋음)"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] py-6 px-8 font-bold text-slate-950 focus:outline-none focus:border-amber-500 transition-all text-lg min-h-[160px]"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-4"><div className="h-10 w-2 bg-teal-500 rounded-full" /><h3 className="text-2xl font-black text-slate-950 tracking-tight">부동산 정보</h3></div>
            <div className="grid grid-cols-2 gap-6">
              <InputField label="담당 공인중개사" icon={User} value={formData.realtorName} onChange={(v: string) => setFormData({...formData, realtorName: v})} placeholder="예: 김민수 공인중개사" />
              <InputField label="중개사 연락처" icon={Phone} value={formData.realtorPhone} onChange={(v: string) => setFormData({...formData, realtorPhone: v})} placeholder="예: 02-123-3456" />
            </div>
          </div>
        </div>

        {/* History Log */}
        {initialData?.updatedAt && (
          <div className="px-12 py-6 bg-slate-50 border-y border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History size={16} className="text-slate-400" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">수정 이력 로그</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black text-slate-950">
                  {initialData.lastModifiedBy || "시스템/사용자"} 
                  <span className="text-slate-400 ml-2 font-bold">
                    {new Date(initialData.updatedAt).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-12 pt-6 border-t border-slate-50 flex-shrink-0">
          <button 
            onClick={handleSave}
            className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] text-xl font-black shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            조사 데이터 저장하기 <Check size={32} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
