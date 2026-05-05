import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Users, Home, CreditCard, 
  DollarSign, Calculator, ChevronRight, 
  ChevronLeft, CheckCircle2, Info, X
} from 'lucide-react';

const INDUSTRIES = {
  cafe: { name: '카페/음료', cogsRate: 0.35, opMargin: 0.20, icon: '☕' },
  restaurant: { name: '일반음식점', cogsRate: 0.40, opMargin: 0.15, icon: '🍱' },
  retail: { name: '일반소매업', cogsRate: 0.55, opMargin: 0.10, icon: '🛍️' },
};

const FeasibilityReport = ({ initialData }: { initialData?: { location: string; category: string } }) => {
  const [step, setStep] = useState(1);
  
  // Inputs State
  const [loan, setLoan] = useState(50000000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [rent, setRent] = useState(2000000);
  const [staffCount, setStaffCount] = useState(2);
  const [hourlyWage, setHourlyWage] = useState(9860);
  const [industry, setIndustry] = useState('cafe');
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
        
        {/* Custom Progress Bar */}
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
                <span className="font-black">회계사 최보람의 전문 데이터셋</span>이 실시간으로 적용됩니다.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(INDUSTRIES).map(([key, value]) => (
                <button 
                  key={key}
                  onClick={() => setIndustry(key)}
                  className={`p-6 rounded-[2rem] border-2 text-left transition-all ${
                    industry === key ? 'border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-900/5' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <span className="text-4xl filter drop-shadow-sm">{value.icon}</span>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">{value.name}</h3>
                        <p className="text-xs text-slate-500 font-bold">표준 영업이익률 약 {(value.opMargin * 100)}% 적용</p>
                      </div>
                    </div>
                    {industry === key && (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="text-white w-5 h-5" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
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
                    type="number" 
                    className="w-full pl-12 pr-6 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 focus:bg-white transition-all outline-none"
                    value={rent} 
                    onChange={(e) => setRent(Number(e.target.value))} 
                  />
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xl font-black">₩</span>
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
                    type="number" 
                    className="w-full pl-12 pr-6 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 focus:bg-white transition-all outline-none"
                    value={loan} 
                    onChange={(e) => setLoan(Number(e.target.value))} 
                  />
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xl font-black">₩</span>
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
                  type="number" 
                  className="w-full text-center text-5xl font-black h-24 bg-transparent border-b-4 border-blue-600 focus:border-blue-700 transition-all outline-none text-blue-600"
                  value={targetProfit} 
                  onChange={(e) => setTargetProfit(Number(e.target.value))} 
                />
                <div className="text-center mt-4 text-slate-300 font-black text-sm uppercase tracking-widest">Target Monthly Profit</div>
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
