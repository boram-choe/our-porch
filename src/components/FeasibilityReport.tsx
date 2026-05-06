import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Users, Home, CreditCard, 
  DollarSign, Calculator, ChevronRight, 
  ChevronLeft, CheckCircle2, Info, X
} from 'lucide-react';

const INDUSTRIES = {
  '카페/음료': { 
    name: '베이커리 카페', 
    category: { large: '음식점업', medium: '커피/음료', small: '베이커리 카페' },
    cogsRate: 0.35, opMargin: 0.20, icon: '☕' 
  },
  '일반음식점': { 
    name: '파스타 전문점', 
    category: { large: '음식점업', medium: '서양식', small: '파스타 전문점' },
    cogsRate: 0.40, opMargin: 0.15, icon: '🍝' 
  },
  '일식': { 
    name: '일식 전문점', 
    category: { large: '음식점업', medium: '일식', small: '초밥/라멘' },
    cogsRate: 0.42, opMargin: 0.18, icon: '🍣' 
  },
  '치킨/피자': { 
    name: '프랜차이즈 치킨', 
    category: { large: '음식점업', medium: '치킨/피자', small: '치킨전문점' },
    cogsRate: 0.50, opMargin: 0.12, icon: '🍗' 
  },
  '일반소매업': { 
    name: '디저트 편집샵', 
    category: { large: '소매업', medium: '식품소매', small: '디저트 편집샵' },
    cogsRate: 0.55, opMargin: 0.10, icon: '🍰' 
  },
  '헤어살롱': { 
    name: '헤어 살롱', 
    category: { large: '서비스업', medium: '미용서비스', small: '헤어 살롱' },
    cogsRate: 0.25, opMargin: 0.25, icon: '💇' 
  }
};

const FeasibilityReport = ({ initialData }: { initialData?: { location: string; category: string } }) => {
  const [step, setStep] = useState(1);
  
  // Inputs State
  const [loan, setLoan] = useState(50000000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [rent, setRent] = useState(2000000);
  const [staffCount, setStaffCount] = useState(2);
  const [hourlyWage, setHourlyWage] = useState(9860);

  const initialUserIndustry = useMemo(() => {
    const cat = initialData?.category || '';
    if (INDUSTRIES[cat as keyof typeof INDUSTRIES]) return cat;
    
    // 키워드 기반 유사 매칭
    if (cat.includes('카페') || cat.includes('커피')) return '카페/음료';
    if (cat.includes('음식') || cat.includes('파스타')) return '일반음식점';
    if (cat.includes('일식') || cat.includes('초밥')) return '일식';
    if (cat.includes('치킨')) return '치킨/피자';
    if (cat.includes('미용') || cat.includes('헤어')) return '헤어살롱';
    return '일반소매업';
  }, [initialData?.category]);

  const [industry, setIndustry] = useState(initialUserIndustry);
  const [targetProfit, setTargetProfit] = useState(3000000);

  // Calculations
  const analysis = useMemo(() => {
    const selectedIndustry = INDUSTRIES[industry as keyof typeof INDUSTRIES];
    const monthlyInterest = (loan * (interestRate / 100)) / 12;
    const monthlyLabor = staffCount * hourlyWage * 209;
    const totalFixedCost = rent + monthlyLabor + monthlyInterest;
    const requiredRevenue = (targetProfit + totalFixedCost) / (1 - selectedIndustry.cogsRate);
    const monthlyOpProfit = requiredRevenue * selectedIndustry.opMargin;
    const repaymentMonths = monthlyOpProfit > 0 ? loan / monthlyOpProfit : Infinity;

    return {
      monthlyInterest, monthlyLabor, totalFixedCost,
      requiredRevenue, monthlyOpProfit, repaymentMonths,
      industryName: selectedIndustry.name
    };
  }, [loan, interestRate, rent, staffCount, hourlyWage, industry, targetProfit]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 bg-white min-h-screen font-sans text-slate-900">
      {/* Header & Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Financial Analysis</h2>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              재무 타당성 분석 <br/>
              <span className="text-blue-600 text-lg">{initialData?.location || "이 공간"}의 비즈니스 시나리오</span>
            </h1>
          </div>
          <span className="text-xs text-slate-400 font-black tracking-widest">STEP {step}/5</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${step * 20}%` }}
          />
        </div>
      </div>

      <div className="min-h-[420px]">
        {/* Step 1: Industry Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="p-5 bg-blue-50 rounded-[1.5rem] flex gap-4 items-start border border-blue-100">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                <Info className="w-4 h-4 text-white" />
              </div>
              <p className="text-[13px] text-blue-800 leading-relaxed font-medium">
                업종에 따라 평균 원가율과 수익 구조가 다릅니다. <br/>
                <span className="font-black text-blue-950">회계사의 전문성과 AI의 데이터를 결합</span>하여 <br/>내게 딱 필요한 리포트를 제공해드립니다.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">비즈니스 모델 비교 선택</p>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: initialUserIndustry, label: '나의 선택', isUser: true },
                  { id: '헤어살롱', label: '지역 투표 1위', isUser: false }
                ].map((item) => {
                  const data = INDUSTRIES[item.id as keyof typeof INDUSTRIES];
                  const isSelected = industry === item.id;
                  return (
                    <button 
                      key={item.id}
                      onClick={() => setIndustry(item.id)}
                      className={`p-6 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden ${
                        isSelected ? 'border-blue-600 bg-blue-50/50 shadow-xl' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-[9px] font-black text-white rounded-bl-xl tracking-widest uppercase">
                        {item.label}
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="text-4xl">{data.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                            {data.name}
                            {isSelected && <CheckCircle2 className="text-blue-600 w-4 h-4" />}
                          </h3>
                          <div className="flex gap-1.5 mt-1">
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{data.category.large}</span>
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{data.category.medium}</span>
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{data.category.small}</span>
                          </div>
                          <p className={`text-xs mt-3 font-bold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                            표준 영업이익률 약 <span className="text-sm font-black">{(data.opMargin * 100)}%</span> 적용
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 font-medium px-1 leading-relaxed">
                * 지역 1위 업종은 해당 공간 인근 이웃들이 가장 필요로 하는 업종 데이터입니다. <br/>
                어떤 비즈니스 시나리오로 분석을 진행할지 선택해 주세요.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Fixed Costs */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-600" /> 예상 월 임대료
                </label>
                <div className="relative group">
                  <input 
                    type="text" 
                    className="w-full pl-6 pr-16 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 focus:bg-white transition-all outline-none text-right"
                    value={(rent / 10000).toLocaleString()} 
                    onChange={(e) => {
                      const val = Number(e.target.value.replace(/,/g, ''));
                      if(!isNaN(val)) setRent(val * 10000);
                    }} 
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-black">만원</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3 text-blue-600" /> 예상 고용 인원
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-6 text-xl font-black h-14 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] focus:border-blue-600 focus:bg-white transition-all outline-none text-center"
                    value={staffCount} 
                    onChange={(e) => setStaffCount(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    적용 시간당 시급
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-6 text-xl font-black h-14 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] focus:border-blue-600 focus:bg-white transition-all outline-none text-center"
                    value={hourlyWage} 
                    onChange={(e) => setHourlyWage(Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Financing */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" /> 총 초기 차입금 (대출)
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full pl-6 pr-16 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 focus:bg-white transition-all outline-none text-right"
                    value={(loan / 10000).toLocaleString()} 
                    onChange={(e) => {
                      const val = Number(e.target.value.replace(/,/g, ''));
                      if(!isNaN(val)) setLoan(val * 10000);
                    }} 
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-black">만원</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> 예상 연 이자율 (%)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full px-6 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 focus:bg-white transition-all outline-none"
                  value={interestRate} 
                  onChange={(e) => setInterestRate(Number(e.target.value))} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Goals */}
        {step === 4 && (
          <div className="space-y-10 py-4">
            <div className="text-center space-y-4">
              <div className="bg-blue-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-blue-200">
                <DollarSign className="text-white w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">월 목표 순이익을 설정하세요</h2>
                <p className="text-slate-400 text-[13px] font-medium leading-relaxed">이자와 세금, 생활비를 고려한 <br/>실질적인 '나의 수입' 목표입니다.</p>
              </div>
            </div>
            <div className="max-w-sm mx-auto">
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full text-center text-5xl font-black h-24 bg-transparent border-b-4 border-blue-600 focus:border-blue-700 transition-all outline-none text-blue-600"
                  value={(targetProfit / 10000).toLocaleString()} 
                  onChange={(e) => {
                    const val = Number(e.target.value.replace(/,/g, ''));
                    if(!isNaN(val)) setTargetProfit(val * 10000);
                  }} 
                />
                <div className="text-center mt-4 text-slate-400 font-black text-sm uppercase tracking-widest">만원</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Final Report */}
        {step === 5 && (
          <div className="space-y-8">
            <div className="bg-slate-950 p-8 rounded-[2.5rem] space-y-8 relative overflow-hidden shadow-2xl shadow-slate-900/40 border border-slate-800">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                <Calculator size={120} className="text-white" />
              </div>
              
              <div className="relative z-10 space-y-2">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">CPA Final Assessment</p>
                <h2 className="text-xl font-black text-white">필요 월 목표 매출액</h2>
              </div>
              
              <div className="relative z-10">
                <div className="text-5xl font-black text-white tracking-tighter flex items-end gap-2">
                  {Math.round(analysis.requiredRevenue).toLocaleString()}
                  <span className="text-xl mb-2 text-slate-500">원</span>
                </div>
              </div>
              
              <div className="relative z-10 pt-8 border-t border-white/10 grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Payback Period</p>
                  <p className="text-xl font-black text-white">약 {Math.ceil(analysis.repaymentMonths)}개월</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Expected Profit</p>
                  <p className="text-xl font-black text-green-400">{Math.round(analysis.monthlyOpProfit).toLocaleString()}원</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-5">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 uppercase tracking-widest">
                <Calculator className="w-4 h-4 text-blue-600" /> 세부 고정비 리스트
              </h3>
              <div className="space-y-4">
                {[
                  { label: '인건비 (월 기준)', val: analysis.monthlyLabor, color: 'slate-600' },
                  { label: '이자비용 (월 기준)', val: analysis.monthlyInterest, color: 'slate-600' },
                  { label: '임대료 (월 기준)', val: rent, color: 'blue-600' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <span className="text-xs font-bold text-slate-400">{item.label}</span>
                    <span className={`text-sm font-black text-${item.color}`}>
                      {Math.round(item.val).toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4 pb-10">
        {step > 1 && (
          <button 
            onClick={prevStep} 
            className="flex-1 h-16 rounded-[1.5rem] border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} /> 이전
          </button>
        )}
        <button 
          onClick={step === 5 ? () => setStep(1) : nextStep} 
          className={`flex-[2] h-16 rounded-[1.5rem] font-black text-white transition-all flex items-center justify-center gap-2 shadow-xl ${
            step === 5 ? 'bg-blue-600 shadow-blue-900/20' : 'bg-slate-950 shadow-slate-900/20'
          }`}
        >
          {step === 5 ? (
            '시나리오 다시 설계하기'
          ) : (
            <>다음 단계로 진행 <ChevronRight size={20} /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default FeasibilityReport;
