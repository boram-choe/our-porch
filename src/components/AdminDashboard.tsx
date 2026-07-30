"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Map as MapIcon, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { getNeighborhoodReport, DemographicSummary } from "@/lib/db";

import { saveVacancy } from "@/lib/db";
import { supabase } from "@/lib/supabase";
export default function AdminDashboard({ 
  onBack, 
  vacancies = [],
  onUpdateVacancy 
}: { 
  onBack: () => void,
  vacancies?: any[],
  onUpdateVacancy?: (v: any) => void
}) {
  const [report, setReport] = useState<DemographicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [moveinInputs, setMoveinInputs] = useState<Record<string, string>>({});
  const [editingStoreName, setEditingStoreName] = useState<Record<string, string>>({});
  const [neighborhood, setNeighborhood] = useState("");

  useEffect(() => {
    const profileStr = localStorage.getItem("gongsil_user_profile");
    const profile = profileStr ? JSON.parse(profileStr) : null;
    const dong = profile?.home?.neighborhood || profile?.neighborhood || "우리동네";
    setNeighborhood(dong);

    supabase.from('reports').select('*').eq('status', 'pending').eq('report_type', 'movein')
        .then(({ data }) => setPendingReports(data || []));

      getNeighborhoodReport(dong)
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => {
        setReport({
          neighborhood: dong,
          totalVoters: 0,
          genderRatio: { male: 0, female: 0 },
          ageGroups: {},
          activityTimes: {},
          topCategories: [],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-bold text-sm">데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  if (!report) return null;

  const totalVotes = report.topCategories.reduce((a, b) => a + b.count, 0);
  const activityEntries = Object.entries(report.activityTimes).sort((a, b) => b[1] - a[1]);
  const ageEntries = Object.entries(report.ageGroups).sort((a, b) => b[1] - a[1]);
  const maxAge = Math.max(...ageEntries.map(([, v]) => v), 1);
  const maxActivity = Math.max(...activityEntries.map(([, v]) => v), 1);
  const totalGender = report.genderRatio.male + report.genderRatio.female;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between mb-8">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 bg-amber-500 px-4 py-1.5 rounded-full shadow-lg shadow-amber-500/20">
             <TrendingUp size={16} className="text-slate-950" />
             <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Village Insights</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight mb-1">{neighborhood} 상권 리포트</h1>
          <p className="text-slate-400 text-sm font-bold">주민들의 실제 투표 데이터로 만든 실시간 상권 분석</p>
        </div>
      </div>

      <div className="px-6 -translate-y-6 space-y-6 pb-24">
        
        
        {/* Pending Move-in Reports Section */}
        {pendingReports.length > 0 && (
          <div className="bg-purple-50 p-8 rounded-[3rem] shadow-sm border border-purple-200 mb-8">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-slate-900 flex items-center gap-2">
                 <Sparkles size={18} className="text-purple-500" />
                 입점 제보 확인 대기 ({pendingReports.length}건)
               </h3>
            </div>
            <div className="space-y-4">
              {pendingReports.map(report => {
                const matchedVacancy = vacancies.find(v => v.id === report.vacancy_id);
                return (
                  <div key={report.id} className="bg-white p-5 rounded-3xl border border-purple-100 flex flex-col gap-3 shadow-sm">
                    <div>
                      <p className="font-black text-slate-900">{matchedVacancy?.landmark || '알 수 없는 공간'} 입점 제보</p>
                      <p className="text-xs text-slate-500 mt-1">제보내용: {report.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="입점 확정할 매장명/업종 입력" 
                        className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
                        value={moveinInputs[report.id] || ''}
                        onChange={(e) => setMoveinInputs({...moveinInputs, [report.id]: e.target.value})}
                      />
                      <button
                        onClick={async () => {
                          if (!moveinInputs[report.id]) {
                            alert("입점 매장명/업종을 입력해주세요.");
                            return;
                          }
                          // 1. Update report status
                          await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
                          // 2. Update vacancy status to completed and append move-in info
                          if (matchedVacancy && onUpdateVacancy) {
                            const res = await saveVacancy({
                              ...matchedVacancy,
                              userId: matchedVacancy.registered_by,
                              status: 'completed',
                              surveyRemarks: `[입점 확정] ${moveinInputs[report.id]}`
                            });
                            if (!res.error) {
                              onUpdateVacancy({ 
                                ...matchedVacancy,
                                status: 'completed', 
                                surveyRemarks: `[입점 확정] ${moveinInputs[report.id]}` 
                              });
                            } else {
                              alert('오류가 발생했습니다: ' + res.error);
                            }
                          }
                          setPendingReports(prev => prev.filter(r => r.id !== report.id));
                        }}
                        className="px-4 py-2 bg-purple-600 text-white font-black text-[10px] rounded-xl hover:bg-purple-700 transition-colors"
                      >
                        입점 확정
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

                {/* Vacancy Lists by Status */}
        <div className="space-y-6">
          {[
            { id: 'pending', title: '확인필요공실', color: 'amber' },
            { id: 'available', title: '확인완료공실', color: 'blue' },
            { id: 'completed', title: '입점완료공실', color: 'emerald' },
            { id: 'merged', title: '통합된공실', color: 'purple' },
            { id: 'rejected', title: '비공개공실', color: 'slate' }
          ].map(statusGroup => {
            const groupVacancies = vacancies.filter(v => v.status === statusGroup.id);
            if (groupVacancies.length === 0) return null;
            
            const colorClasses = {
              amber: 'bg-amber-50 border-amber-200 text-amber-900 text-amber-500',
              blue: 'bg-blue-50 border-blue-200 text-blue-900 text-blue-500',
              emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900 text-emerald-500',
              purple: 'bg-purple-50 border-purple-200 text-purple-900 text-purple-500',
              slate: 'bg-slate-50 border-slate-200 text-slate-900 text-slate-500'
            }[statusGroup.color as 'amber' | 'blue' | 'emerald' | 'purple' | 'slate'] || 'bg-slate-50 border-slate-200 text-slate-900 text-slate-500';
            
            const bgClass = colorClasses.split(' ')[0];
            const borderClass = colorClasses.split(' ')[1];
            const textClass = colorClasses.split(' ')[2];
            const iconClass = colorClasses.split(' ')[3];
            
            return (
              <div key={statusGroup.id} className={`${bgClass} p-8 rounded-[3rem] shadow-sm border ${borderClass}`}>
                <div className="flex items-center justify-between mb-6">
                   <h3 className={`font-black ${textClass} flex items-center gap-2`}>
                      <Sparkles size={18} className={iconClass} />
                      {statusGroup.title} ({groupVacancies.length}건)
                   </h3>
                </div>
                <div className="space-y-4">
                  {groupVacancies.map(v => (
                    <div key={v.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-slate-900">{v.landmark} <span className="text-xs text-slate-400">({v.floor})</span></h4>
                            <p className="text-xs font-bold text-slate-500">{v.address}</p>
                            <p className="text-[10px] text-slate-400 mt-1">제보자 ID: {v.registered_by?.substring(0, 8)}...</p>
                          </div>
                          {statusGroup.id === 'pending' && (
                            <button
                              onClick={async () => {
                                if (confirm('이 공실을 정상 공실로 확정하시겠습니까?\\n확정 시 제보자에게 500P가 지급됩니다.')) {
                                  const res = await saveVacancy({
                                    ...v,
                                    userId: v.registered_by,
                                    status: 'available'
                                  });
                                  if (!res.error && onUpdateVacancy) {
                                    onUpdateVacancy({ ...v, status: 'available' });
                                    alert('정상 공실로 확정되었습니다. 제보자에게 500P가 지급됩니다.');
                                  } else {
                                    alert('확정 처리 중 오류가 발생했습니다: ' + res.error);
                                  }
                                }
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap"
                            >
                              정상 공실 확정
                            </button>
                          )}
                        </div>

                        {statusGroup.id === 'available' && (
                          <div className="mt-4 flex gap-2">
                            <input 
                              type="text" 
                              placeholder="입점 매장명 (예: 메가커피)"
                              className="flex-1 text-xs border border-blue-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                              value={editingStoreName[v.id] || ''}
                              onChange={(e) => setEditingStoreName({...editingStoreName, [v.id]: e.target.value})}
                            />
                            <button
                              onClick={async () => {
                                const newName = editingStoreName[v.id];
                                if (!newName) {
                                  alert("입점 매장명/업종을 입력해주세요.");
                                  return;
                                }
                                if (confirm(`'${newName}'(으)로 입점 확정 처리하시겠습니까?`)) {
                                  const res = await saveVacancy({
                                    ...v,
                                    userId: v.registered_by,
                                    status: 'completed',
                                    surveyRemarks: `[입점 확정] ${newName}`
                                  });
                                  if (!res.error && onUpdateVacancy) {
                                    onUpdateVacancy({ ...v, status: 'completed', surveyRemarks: `[입점 확정] ${newName}` });
                                    alert('입점 완료 처리되었습니다.');
                                  } else {
                                    alert('오류가 발생했습니다: ' + res.error);
                                  }
                                }
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap"
                            >
                              입점 확정
                            </button>
                          </div>
                        )}

                        {statusGroup.id === 'completed' && (
                          <div className="mt-4 flex gap-2">
                            <input 
                              type="text" 
                              placeholder="노출될 매장명 (예: 메가커피)"
                              className="flex-1 text-xs border border-emerald-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
                              value={editingStoreName[v.id] !== undefined ? editingStoreName[v.id] : (v.surveyRemarks?.match(/\[입점 확정\]\s*(.+)/)?.[1] || '')}
                              onChange={(e) => setEditingStoreName({...editingStoreName, [v.id]: e.target.value})}
                            />
                            <button
                              onClick={async () => {
                                const newName = editingStoreName[v.id];
                                if (!newName) {
                                  alert("매장명을 입력해주세요.");
                                  return;
                                }
                                const res = await saveVacancy({
                                  ...v,
                                  userId: v.registered_by,
                                  surveyRemarks: `[입점 확정] ${newName}`
                                });
                                if (!res.error && onUpdateVacancy) {
                                  onUpdateVacancy({ ...v, surveyRemarks: `[입점 확정] ${newName}` });
                                  alert('매장명이 업데이트되었습니다.');
                                } else {
                                  alert('저장 중 오류가 발생했습니다: ' + res.error);
                                }
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap"
                            >
                              저장
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Users size={20} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">누적 주민 참여</p>
             <p className="text-2xl font-black text-slate-900">{report.totalVoters}명</p>
             {report.totalVoters === 0 && <p className="text-[10px] text-slate-300 mt-1">첫 이웃을 기다리는 중</p>}
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare size={20} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">수집된 투표</p>
             <p className="text-2xl font-black text-slate-900">{totalVotes}건</p>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                 <Sparkles size={18} className="text-amber-500" />
                 원하는 업종 TOP {report.topCategories.length || "?"}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">실시간</span>
           </div>
           {report.topCategories.length === 0 ? (
             <div className="py-10 text-center">
               <p className="text-slate-300 text-sm font-bold">아직 투표 데이터가 없습니다</p>
               <p className="text-slate-200 text-xs mt-1">지도에서 공실에 투표해보세요!</p>
             </div>
           ) : (
             <div className="space-y-4">
               {report.topCategories.map((cat, idx) => (
                 <div key={cat.category}>
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-2">
                         <span className="w-5 h-5 bg-slate-950 text-white rounded-full text-[9px] font-black flex items-center justify-center">{idx + 1}</span>
                         <span className="text-sm font-bold text-slate-700">{cat.category}</span>
                       </div>
                       <span className="text-xs font-black text-amber-600">{cat.count}표</span>
                    </div>
                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                       <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${(cat.count / (report.topCategories[0]?.count || 1)) * 100}%` }}
                          className="h-full bg-amber-500 rounded-full" 
                       />
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Activity Time */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <h3 className="font-black text-slate-900 flex items-center gap-2 mb-6">
              <Clock size={18} className="text-amber-500" />
              동네 체류 골든 타임
           </h3>
           {activityEntries.length === 0 ? (
             <p className="text-slate-300 text-sm font-bold text-center py-4">데이터 수집 중...</p>
           ) : (
             <div className="grid grid-cols-1 gap-3">
               {activityEntries.map(([time, count], i) => {
                 const colors = ["bg-amber-400", "bg-slate-900", "bg-pink-500", "bg-blue-500"];
                 return (
                   <div key={time} className="flex items-center gap-4">
                     <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                     <span className="text-sm font-bold text-slate-700 w-20">{time}</span>
                     <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                       <motion.div
                         initial={{ width: 0 }} animate={{ width: `${(count / maxActivity) * 100}%` }}
                         className={`h-full ${colors[i % colors.length]} rounded-full`}
                       />
                     </div>
                     <span className="text-xs font-black text-slate-900">{count}명</span>
                   </div>
                 );
               })}
             </div>
           )}
        </div>

        {/* Age Groups */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
           <h3 className="font-black text-slate-900 flex items-center gap-2 mb-6">
              <Users size={18} className="text-indigo-500" />
              연령대 분포
           </h3>
           {ageEntries.length === 0 ? (
             <p className="text-slate-300 text-sm font-bold text-center py-4">데이터 수집 중...</p>
           ) : (
             <div className="space-y-3">
               {ageEntries.map(([age, count]) => (
                 <div key={age} className="flex items-center gap-4">
                   <span className="text-xs font-bold text-slate-600 w-12">{age}</span>
                   <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
                     <motion.div
                       initial={{ width: 0 }} animate={{ width: `${(count / maxAge) * 100}%` }}
                       className="h-full bg-indigo-500 rounded-full"
                     />
                   </div>
                   <span className="text-xs font-black text-slate-900">{count}명</span>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Gender */}
        {totalGender > 0 && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
             <h3 className="font-black text-slate-900 flex items-center gap-2 mb-6">
                <MapIcon size={18} className="text-pink-500" />
                성별 분포
             </h3>
             <div className="flex h-8 rounded-full overflow-hidden gap-1">
               <motion.div
                 initial={{ flex: 0 }} animate={{ flex: report.genderRatio.female }}
                 className="bg-pink-400 flex items-center justify-center rounded-full"
               >
                 <span className="text-[10px] font-black text-white px-2">
                   {Math.round((report.genderRatio.female / totalGender) * 100)}% 여성
                 </span>
               </motion.div>
               <motion.div
                 initial={{ flex: 0 }} animate={{ flex: report.genderRatio.male }}
                 className="bg-blue-400 flex items-center justify-center rounded-full"
               >
                 <span className="text-[10px] font-black text-white px-2">
                   {Math.round((report.genderRatio.male / totalGender) * 100)}% 남성
                 </span>
               </motion.div>
             </div>
          </div>
        )}

        {/* 데이터 부족 안내 */}
        {report.totalVoters < 5 && (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] text-center">
            <p className="text-amber-700 font-black text-sm mb-1">📊 데이터를 모으는 중이에요!</p>
            <p className="text-amber-600 text-xs font-bold leading-relaxed">
              이웃들을 초대해서 투표에 참여시키면<br/>더 정확한 상권 분석이 가능합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
