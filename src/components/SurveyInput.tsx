"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Building2, Landmark, Layers, CircleDollarSign, MessageSquare, User, Phone, Check, Camera, Plus, Trash2 } from "lucide-react";
import { Vacancy } from "../data/dummyVacancies";

interface SurveyInputProps {
  initialData?: Partial<Vacancy>;
  onClose: () => void;
  onSave: (data: Partial<Vacancy>) => void;
}

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
    imageUrl: initialData?.imageUrl || "",
  });

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const InputField = ({ label, icon: Icon, value, onChange, type = "text", placeholder, suffix }: any) => (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <Icon size={14} /> {label}
      </label>
      <div className="relative group">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-950 focus:outline-none focus:border-amber-500 transition-all text-sm group-hover:border-slate-200"
        />
        {suffix && (
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase tracking-widest">{suffix}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-10 pb-6 border-b border-slate-50 relative flex-shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl border-2 border-white/10">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950 tracking-tighter">툇마루단 현장 조사 ✨</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{formData.address || "신규 공실 등록"}</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-10 right-10 text-slate-300 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scroll no-scrollbar">
          {/* 이미지 섹션 */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <Camera size={14} /> 현장 사진 (URL)
            </label>
            <div className="relative aspect-video bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden group hover:border-amber-500 transition-all">
              {formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} className="w-full h-full object-cover" alt="공실 사진" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => setFormData({...formData, imageUrl: ""})} className="bg-red-500 text-white p-3 rounded-2xl shadow-xl hover:scale-110 transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                   <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-slate-300"><Plus size={28} /></div>
                   <input 
                    type="text" 
                    placeholder="이미지 주소를 입력하세요..." 
                    className="w-3/4 bg-transparent text-center text-xs font-bold text-slate-400 focus:outline-none"
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                   />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <InputField label="랜드마크 명칭" icon={Landmark} value={formData.landmark} onChange={(v: string) => setFormData({...formData, landmark: v})} placeholder="예: 무악재역 인근 건물" />
            <InputField label="해당 층수" icon={Layers} value={formData.floor} onChange={(v: string) => setFormData({...formData, floor: v})} placeholder="예: 1층" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2"><div className="h-6 w-1.5 bg-blue-500 rounded-full" /><h3 className="text-xl font-black text-slate-950 tracking-tight">임대 조건</h3></div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="보증금" icon={CircleDollarSign} type="number" value={formData.deposit} onChange={(v: number) => setFormData({...formData, deposit: v})} suffix="만원" />
              <InputField label="월세" icon={CircleDollarSign} type="number" value={formData.monthlyRent} onChange={(v: number) => setFormData({...formData, monthlyRent: v})} suffix="만원" />
              <InputField label="관리비" icon={CircleDollarSign} type="number" value={formData.managementFee} onChange={(v: number) => setFormData({...formData, managementFee: v})} suffix="만원" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2"><div className="h-6 w-1.5 bg-amber-500 rounded-full" /><h3 className="text-xl font-black text-slate-950 tracking-tight">툇마루단 소견</h3></div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <MessageSquare size={14} /> 한줄평 (비고)
              </label>
              <textarea
                value={formData.surveyRemarks}
                onChange={(e) => setFormData({...formData, surveyRemarks: e.target.value})}
                placeholder="공실의 특징을 한줄로 요약해 주세요 (예: 층고가 높고 채광이 좋음)"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 px-6 font-bold text-slate-950 focus:outline-none focus:border-amber-500 transition-all text-sm min-h-[120px]"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2"><div className="h-6 w-1.5 bg-teal-500 rounded-full" /><h3 className="text-xl font-black text-slate-950 tracking-tight">부동산 정보</h3></div>
            <div className="grid grid-cols-2 gap-6">
              <InputField label="공인중개사 이름" icon={User} value={formData.realtorName} onChange={(v: string) => setFormData({...formData, realtorName: v})} placeholder="예: 김민수 공인중개사" />
              <InputField label="중개사 연락처" icon={Phone} value={formData.realtorPhone} onChange={(v: string) => setFormData({...formData, realtorPhone: v})} placeholder="예: 010-1234-5678" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 pt-6 border-t border-slate-50 flex-shrink-0">
          <button 
            onClick={handleSave}
            className="w-full py-6 bg-slate-950 text-white rounded-[2.5rem] text-xl font-black shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            조사 데이터 저장하기 <Check size={24} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
