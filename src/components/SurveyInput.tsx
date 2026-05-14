"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Building2, Landmark, Layers, CircleDollarSign, MessageSquare, User, Phone, Check, Camera, Plus, Trash2, Clock } from "lucide-react";
import { Vacancy } from "../data/dummyVacancies";
import { uploadImage } from "../lib/db";

interface SurveyInputProps {
  initialData?: Partial<Vacancy>;
  onClose: () => void;
  onSave: (data: Partial<Vacancy>) => void;
}

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

export default function SurveyInput({ initialData, onClose, onSave }: SurveyInputProps) {
  const [formData, setFormData] = useState<Partial<Vacancy>>({
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
    duration: initialData?.duration || "잘 모르겠음",
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

  const handleSave = () => {
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
              <h2 className="text-3xl font-black text-slate-950 tracking-tighter">툇마루단 현장 조사 ✨</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{formData.address || "신규 공실 등록"}</p>
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
              {["3개월 미만", "3~6개월", "6개월 이상", "잘 모르겠음"].map(d => (
                <button 
                  key={d} 
                  onClick={() => setFormData({...formData, duration: d})}
                  className={`py-4 rounded-2xl text-xs font-black border-2 transition-all ${formData.duration === d ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}
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
