import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  TrendingUp, Users, Home, CreditCard, 
  DollarSign, Calculator, ChevronRight, 
  ChevronLeft, CheckCircle2, Info, X,
  ArrowDown, PieChart, Activity, Wallet,
  Receipt, Landmark, Wrench
} from 'lucide-react';

// 업종별 전문 데이터셋 (회계사/AI 결합 데이터)
const INDUSTRIES = {
  '카페/음료': { 
    name: '베이커리 카페', 
    category: { large: '음식점업', medium: '커피/음료', small: '베이커리 카페' },
    cogsRate: 0.35, opMargin: 0.20, icon: '☕',
    variableRates: { material: 0.30, card: 0.015, utility: 0.03, platform: 0.05 },
    initialInvestmentPerPyung: 2500000 // 평당 250만원
  },
  '일반음식점': { 
    name: '파스타 전문점', 
    category: { large: '음식점업', medium: '서양식', small: '파스타 전문점' },
    cogsRate: 0.40, opMargin: 0.15, icon: '🍝',
    variableRates: { material: 0.35, card: 0.015, utility: 0.04, platform: 0.12 },
    initialInvestmentPerPyung: 3000000
  },
  '일식': { 
    name: '일식 전문점', 
    category: { large: '음식점업', medium: '일식', small: '초밥/라멘' },
    cogsRate: 0.42, opMargin: 0.18, icon: '🍣',
    variableRates: { material: 0.38, card: 0.015, utility: 0.03, platform: 0.08 },
    initialInvestmentPerPyung: 3500000
  },
  '치킨/피자': { 
    name: '프랜차이즈 치킨', 
    category: { large: '음식점업', medium: '치킨/피자', small: '치킨전문점' },
    cogsRate: 0.50, opMargin: 0.12, icon: '🍗',
    variableRates: { material: 0.45, card: 0.015, utility: 0.03, platform: 0.15 },
    initialInvestmentPerPyung: 2200000
  },
  '일반소매업': { 
    name: '디저트 편집샵', 
    category: { large: '소매업', medium: '식품소매', small: '디저트 편집샵' },
    cogsRate: 0.55, opMargin: 0.10, icon: '🍰',
    variableRates: { material: 0.50, card: 0.015, utility: 0.02, platform: 0.03 },
    initialInvestmentPerPyung: 1800000
  },
  '헤어살롱': { 
    name: '헤어 살롱', 
    category: { large: '서비스업', medium: '미용서비스', small: '헤어 살롱' },
    cogsRate: 0.25, opMargin: 0.25, icon: '💇',
    variableRates: { material: 0.15, card: 0.015, utility: 0.05, platform: 0.02 },
    initialInvestmentPerPyung: 2800000
  }
};

// 툇마루단 조사 데이터 기반 공간별 임대조건 매퍼
const getSpaceConditions = (locationName: string) => {
  const conditions: Record<string, { deposit: number; rent: number; maintenance: number; size: number }> = {
    '여의도동 1층': { deposit: 50000000, rent: 2500000, maintenance: 300000, size: 15 },
    '서초동 지상': { deposit: 30000000, rent: 1800000, maintenance: 200000, size: 12 },
    '망원동 상가': { deposit: 20000000, rent: 1200000, maintenance: 100000, size: 10 },
  };
  return conditions[locationName] || { deposit: 30000000, rent: 2000000, maintenance: 200000, size: 15 };
};

// 소득세 계산 함수 (누진세율 적용)
const calculateIncomeTax = (annualProfit: number) => {
  if (annualProfit <= 12000000) return annualProfit * 0.06;
  if (annualProfit <= 46000000) return 720000 + (annualProfit - 12000000) * 0.15;
  if (annualProfit <= 88000000) return 5820000 + (annualProfit - 46000000) * 0.24;
  return 15900000 + (annualProfit - 88000000) * 0.35;
};

const FeasibilityReport = ({ initialData }: { initialData?: { location: string; category: string; vacancy?: any } }) => {
  const [step, setStep] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // 툇마루단 조사 데이터 적용 (vacancy 객체가 있으면 실제 데이터 사용, 없으면 매퍼/기본값 사용)
  const spaceInfo = useMemo(() => {
    if (initialData?.vacancy) {
      return {
        deposit: (initialData.vacancy.deposit || 0) * 10000,
        rent: (initialData.vacancy.monthlyRent || 0) * 10000,
        maintenance: (initialData.vacancy.managementFee || 0) * 10000,
        size: 15 // 면적 정보가 없는 경우 기본 15평 적용
      };
    }
    return getSpaceConditions(initialData?.location || '');
  }, [initialData?.location, initialData?.vacancy]);

  // Inputs State

  const initialUserIndustry = useMemo(() => {
    const cat = initialData?.category || '';
    if (INDUSTRIES[cat as keyof typeof INDUSTRIES]) return cat;
    if (cat.includes('카페') || cat.includes('커피')) return '카페/음료';
    if (cat.includes('음식') || cat.includes('파스타')) return '일반음식점';
    if (cat.includes('일식') || cat.includes('초밥')) return '일식';
    if (cat.includes('치킨')) return '치킨/피자';
    if (cat.includes('미용') || cat.includes('헤어')) return '헤어살롱';
    return '일반소매업';
  }, [initialData?.category]);

  const [industry, setIndustry] = useState(initialUserIndustry);

  // Inputs State (툇마루 데이터로 초기화하되 수정 가능)
  const [deposit, setDeposit] = useState(spaceInfo.deposit);
  const [rent, setRent] = useState(spaceInfo.rent);
  const [maintenance, setMaintenance] = useState(spaceInfo.maintenance);
  
  const [myCapital, setMyCapital] = useState(50000000); // 사장님 보유 자금
  const [interestRate, setInterestRate] = useState(5.5);
  const [staffCount, setStaffCount] = useState(2);
  const [hourlyWage, setHourlyWage] = useState(10030); // 1만원 시대 반영
  const [targetRevenue, setTargetRevenue] = useState(30000000); // 월 목표 매출액
  const [avgOrderValue, setAvgOrderValue] = useState(15000); // 평균 단가
  const [dailyOrders, setDailyOrders] = useState(60); // 일 주문 수

  // 지연된 값 (성능 최적화용)
  const deferredMyCapital = useDeferredValue(myCapital);
  const deferredInterestRate = useDeferredValue(interestRate);
  const deferredRevenue = useDeferredValue(targetRevenue);
  const deferredStaff = useDeferredValue(staffCount);
  const deferredWage = useDeferredValue(hourlyWage);
  const deferredDeposit = useDeferredValue(deposit);
  const deferredRent = useDeferredValue(rent);
  const deferredMaint = useDeferredValue(maintenance);

  // Calculations
  const analysis = useMemo(() => {
    const data = INDUSTRIES[industry as keyof typeof INDUSTRIES];
    
    // 1. 초기 투자비 산출 (보증금 포함)
    const initialInvestment = {
      interior: spaceInfo.size * data.initialInvestmentPerPyung,
      equipment: (spaceInfo.size * data.initialInvestmentPerPyung) * 0.4,
      inventory: deferredRevenue * 0.3,
      other: 5000000
    };
    const totalInvestment = Object.values(initialInvestment).reduce((a, b) => a + b, 0) + deferredDeposit;
    
    // 2. 필요 차입금 산출 (총 투자비 - 내 자금)
    const calculatedLoan = Math.max(0, totalInvestment - deferredMyCapital);
    const monthlyInterest = (calculatedLoan * (deferredInterestRate / 100)) / 12;
    
    const grossSalary = deferredStaff * deferredWage * 209; // 주휴수당 포함 급여
    const monthlyLabor = grossSalary * 1.11; // 4대 보험 및 부대비용(약 11%) 포함 실부담액
    
    // 고정비 (임대료, 관리비, 인건비, 이자)
    const fixedCosts = {
      rent: deferredRent,
      maintenance: deferredMaint,
      labor: monthlyLabor,
      interest: monthlyInterest
    };
    const totalFixed = Object.values(fixedCosts).reduce((a, b) => a + b, 0);

    // 변동비 산출 (매출액 기반)
    const totalVarRate = Object.values(data.variableRates).reduce((a, b) => a + b, 0);
    const totalVar = deferredRevenue * totalVarRate;

    const variableCosts = {
      material: deferredRevenue * data.variableRates.material,
      card: deferredRevenue * data.variableRates.card,
      utility: deferredRevenue * data.variableRates.utility,
      platform: deferredRevenue * data.variableRates.platform
    };

    // 세전 영업이익 (매출 - 고정비 - 변동비)
    const preTaxProfit = deferredRevenue - totalFixed - totalVar;

    // 세금 산출
    const vat = deferredRevenue * 0.1; // 부가세
    const monthlyIncomeTax = calculateIncomeTax(Math.max(0, preTaxProfit) * 12) / 12;
    const totalTax = vat + monthlyIncomeTax;

    const netIncome = preTaxProfit - totalTax;

    return {
      targetRevenue: deferredRevenue,
      fixedCosts, totalFixed,
      variableCosts, totalVar,
      preTaxProfit,
      tax: { vat, incomeTax: monthlyIncomeTax, total: totalTax },
      netIncome,
      initialInvestment, totalInvestment,
      calculatedLoan,
      repaymentMonths: netIncome > 0 ? totalInvestment / netIncome : Infinity
    };
  }, [deferredMyCapital, deferredInterestRate, deferredStaff, deferredWage, industry, deferredRevenue, deferredDeposit, deferredRent, deferredMaint, spaceInfo]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const formatMan = (val: number) => (val / 10000).toLocaleString();

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 bg-white min-h-screen font-sans text-slate-900">
      {/* Header & Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              창업 수익 미리보기 <br/>
              <span className="text-blue-600 text-lg">{initialData?.location || "이 공간"}의 비즈니스 시나리오</span>
            </h1>
          </div>
          <span className="text-xs text-slate-400 font-black tracking-widest">STEP {step}/5</span>
        </div>
        
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${step * 20}%` }} />
        </div>
      </div>

      <div className="min-h-[450px]">
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
                    <button key={item.id} onClick={() => setIndustry(item.id)} className={`p-6 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden ${isSelected ? 'border-blue-600 bg-blue-50/50 shadow-xl' : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-[9px] font-black text-white rounded-bl-xl tracking-widest uppercase">{item.label}</div>
                      <div className="flex items-center gap-5">
                        <span className="text-4xl">{data.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">{data.name} {isSelected && <CheckCircle2 className="text-blue-600 w-4 h-4" />}</h3>
                          <div className="flex gap-1.5 mt-1">
                            {Object.values(data.category).map((c, i) => <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{c}</span>)}
                          </div>
                          <p className={`text-xs mt-3 font-bold ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>표준 영업이익률 약 <span className="text-sm font-black">{(data.opMargin * 100)}%</span> 적용</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            {/* 상단: 인건비 설정 */}
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">운영 인력 설정</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users className="w-3 h-3 text-blue-600" /> 예상 고용 인원</label>
                  <input type="number" className="w-full px-6 text-xl font-black h-14 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] focus:border-blue-600 focus:bg-white outline-none text-center" value={staffCount} onChange={(e) => setStaffCount(Number(e.target.value))} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">시간당 시급</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="w-full px-6 text-xl font-black h-14 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] focus:border-blue-600 focus:bg-white outline-none text-right pr-12" 
                      value={Number(hourlyWage).toLocaleString()} 
                      onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setHourlyWage(val); }} 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">원</span>
                  </div>
                  <p className="text-[10px] text-rose-500 font-bold px-1">* 2026년 최저시급은 10,030원입니다.</p>
                </div>
              </div>
            </div>

            {/* 하단: 임대 조건 설정 (툇마루 데이터 연동) */}
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Home size={14} /> 임대 조건 설정
                </h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  * 본 정보는 <span className="font-black text-blue-600">툇마루단이 직접 현장을 확인</span>하고 입력한 내역입니다. <br/>
                  협상 예정인 금액이 있다면 직접 수정해 보세요.
                </p>
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">보증금</label>
                  <div className="relative">
                    <input type="text" className="w-full pl-4 pr-12 h-12 bg-white border border-slate-200 rounded-xl text-right font-black text-slate-800" value={(deposit / 10000).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setDeposit(val * 10000); }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">만원</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">월 임대료</label>
                    <div className="relative">
                      <input type="text" className="w-full pl-4 pr-12 h-12 bg-white border border-slate-200 rounded-xl text-right font-black text-slate-800" value={(rent / 10000).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setRent(val * 10000); }} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">만원</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">월 관리비</label>
                    <div className="relative">
                      <input type="text" className="w-full pl-4 pr-12 h-12 bg-white border border-slate-200 rounded-xl text-right font-black text-slate-800" value={(maintenance / 10000).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setMaintenance(val * 10000); }} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">만원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-slate-900 leading-tight">자금 조달 계획을 세워보세요</h2>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed">사장님의 자금과 필요한 대출 규모를 <br/>확인하여 현실적인 이자 비용을 산출합니다.</p>
            </div>

            <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-4 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2"><Wallet size={14} /> 예상 총 초기 투자비</span>
                <span className="text-lg font-black text-blue-900">{(analysis.totalInvestment / 10000).toLocaleString()}만원</span>
              </div>
              <p className="text-[10px] text-blue-500 font-bold">* 보증금 {Math.round(deposit/10000).toLocaleString()}만원이 포함된 금액입니다.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600" /> 사장님 보유 자금 (내 자금)</label>
                <div className="relative">
                  <input type="text" className="w-full pl-6 pr-16 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 outline-none text-right" value={(myCapital / 10000).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setMyCapital(val * 10000); }} />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-black">만원</span>
                </div>
              </div>

              <div className="flex justify-center -my-2"><div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xs">▼</div></div>

              <div className="p-6 bg-slate-900 rounded-[2rem] space-y-3 shadow-xl">
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Landmark size={14} className="text-amber-500" /> 부족한 필요 차입금</span>
                   <span className="text-xl font-black text-amber-500">{(analysis.calculatedLoan / 10000).toLocaleString()}만원</span>
                 </div>
                 <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest shrink-0">예상 연 이자율</label>
                    <div className="flex-1 relative">
                      <input type="number" step="0.1" className="w-full bg-transparent text-white text-right font-black outline-none border-b border-slate-700 pb-1" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} />
                      <span className="absolute right-0 bottom-1 text-[11px] font-bold text-slate-500 ml-1">%</span>
                    </div>
                 </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3">
                <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  실제 차입 규모와 이자율은 금융기관과의 상담을 통해 결정됩니다. <br/>
                  <span className="text-blue-600 font-bold">위 수치는 신용점수 850점 기준의 예상치</span>이며, <br/>
                  소상공인 정책자금 지원 여부에 따라 변동될 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 py-2">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-slate-900 leading-tight">월 목표 매출액을 설정하세요</h2>
              <p className="text-slate-400 text-[12px] font-medium leading-relaxed">단가와 주문 수를 고려하여 <br/>현실적인 매출 목표를 세워보세요.</p>
            </div>

            {/* 매출액 메인 입력 */}
            <div className="max-w-xs mx-auto text-center border-b-2 border-slate-100 pb-4">
              <div className="relative">
                <input type="text" className="w-full text-center text-4xl font-black h-16 bg-transparent outline-none text-blue-600" value={(targetRevenue / 10000).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setTargetRevenue(val * 10000); }} />
                <span className="text-sm font-black text-slate-400 ml-2">만원</span>
              </div>
            </div>

            {/* 매출 계산기 헬퍼 */}
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Calculator size={14} className="text-blue-600" />
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">매출 시뮬레이션 헬퍼</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">평균 객단가 (원)</label>
                  <input type="text" className="w-full h-12 bg-white border border-slate-200 rounded-xl text-center font-black text-slate-800" value={Number(avgOrderValue).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setAvgOrderValue(val); }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">일 평균 주문수 (건)</label>
                  <input type="text" className="w-full h-12 bg-white border border-slate-200 rounded-xl text-center font-black text-slate-800" value={Number(dailyOrders).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setDailyOrders(val); }} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-slate-500">예상 월 매출 (30일 기준)</span>
                  <button onClick={() => setTargetRevenue(avgOrderValue * dailyOrders * 30)} className="text-sm font-black text-blue-600 hover:underline">
                    {((avgOrderValue * dailyOrders * 30) / 10000).toLocaleString()}만원 적용하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (() => {
          // 수치 일치성을 위해 모든 항목을 만원 단위로 먼저 반올림
          const rFixed = {
            rent: Math.round(analysis.fixedCosts.rent / 10000),
            maintenance: Math.round(analysis.fixedCosts.maintenance / 10000),
            labor: Math.round(analysis.fixedCosts.labor / 10000),
            interest: Math.round(analysis.fixedCosts.interest / 10000)
          };
          const totalFixedRounded = rFixed.rent + rFixed.maintenance + rFixed.labor + rFixed.interest;

          const rVar = {
            material: Math.round(analysis.variableCosts.material / 10000),
            card: Math.round(analysis.variableCosts.card / 10000),
            utility: Math.round(analysis.variableCosts.utility / 10000),
            platform: Math.round(analysis.variableCosts.platform / 10000)
          };
          const totalVarRounded = rVar.material + rVar.card + rVar.utility + rVar.platform;

          const rTax = {
            vat: Math.round(analysis.tax.vat / 10000),
            incomeTax: Math.round(analysis.tax.incomeTax / 10000)
          };
          const totalTaxRounded = rTax.vat + rTax.incomeTax;

          const netIncomeRounded = Math.round(analysis.targetRevenue / 10000) - totalFixedRounded - totalVarRounded - totalTaxRounded;

          return (
            <div className="space-y-6">
              {/* 최종 손익 흐름 헤더 */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-100 border border-blue-50 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
                
                <div className="relative space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900">창업 수익 미리보기</h3>
                    </div>
                    <div className="bg-blue-600 px-4 py-1 rounded-full"><span className="text-[10px] font-black text-white uppercase">재무전문가 분석</span></div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* 월 매출 */}
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-600">월 목표 매출액</span>
                      <span className="text-xl font-black text-slate-900">{(Math.round(analysis.targetRevenue / 10000)).toLocaleString()} <span className="text-xs">만원</span></span>
                    </div>

                    {/* 고정비 */}
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group cursor-pointer hover:bg-rose-50 transition-colors" onClick={() => setExpandedSection(expandedSection === 'fixed' ? null : 'fixed')}>
                      <span className="text-sm font-bold text-slate-600 flex items-center gap-2">(-) 고정비 <ArrowDown size={12} className={expandedSection === 'fixed' ? 'rotate-180' : ''} /></span>
                      <span className="text-xl font-black text-rose-600">{totalFixedRounded.toLocaleString()} <span className="text-xs">만원</span></span>
                    </div>

                    {/* 변동비 */}
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group cursor-pointer hover:bg-rose-50 transition-colors" onClick={() => setExpandedSection(expandedSection === 'variable' ? null : 'variable')}>
                      <span className="text-sm font-bold text-slate-600 flex items-center gap-2">(-) 변동비 <ArrowDown size={12} className={expandedSection === 'variable' ? 'rotate-180' : ''} /></span>
                      <span className="text-xl font-black text-amber-600">{totalVarRounded.toLocaleString()} <span className="text-xs">만원</span></span>
                    </div>

                    {/* 세금 */}
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group cursor-pointer hover:bg-rose-50 transition-colors" onClick={() => setExpandedSection(expandedSection === 'tax' ? null : 'tax')}>
                      <span className="text-sm font-bold text-slate-600 flex items-center gap-2">(-) 예상 세금 <ArrowDown size={12} className={expandedSection === 'tax' ? 'rotate-180' : ''} /></span>
                      <span className="text-xl font-black text-slate-500">{totalTaxRounded.toLocaleString()} <span className="text-xs">만원</span></span>
                    </div>

                    <div className="flex justify-center -my-1"><div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 text-white font-black text-sm">=</div></div>

                    {/* 최종 순수익 */}
                    <div className="bg-blue-600 p-6 rounded-3xl shadow-lg shadow-blue-200 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                      <p className="text-[11px] font-black text-blue-100 uppercase tracking-widest mb-1">예상 월 순수익</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-black text-white">{netIncomeRounded.toLocaleString()}</span>
                        <span className="text-lg font-bold text-blue-100">만원 / 월</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 상세 드릴다운 내역 */}
              <div className="space-y-3">
                {expandedSection === 'fixed' && (
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4 animate-in slide-in-from-top-2">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Home size={14} className="text-blue-600" /> 세부 고정비 내역</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>임대료</span><span className="font-bold">{rFixed.rent.toLocaleString()}만원</span></div>
                      <div className="flex justify-between text-sm"><span>관리비</span><span className="font-bold">{rFixed.maintenance.toLocaleString()}만원</span></div>
                      <div className="flex justify-between text-sm"><span>인건비 (4대보험/주휴 포함)</span><span className="font-bold">{rFixed.labor.toLocaleString()}만원</span></div>
                      <div className="flex justify-between text-sm"><span>금융비용 (대출이자)</span><span className="font-bold">{rFixed.interest.toLocaleString()}만원</span></div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-blue-600"><span>고정비 합계</span><span>{totalFixedRounded.toLocaleString()}만원</span></div>
                    </div>
                  </div>
                )}
                {expandedSection === 'variable' && (
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4 animate-in slide-in-from-top-2">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-amber-600" /> 세부 변동비 내역</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>재료비 (원가율 반영)</span><span className="font-bold">{rVar.material.toLocaleString()}만원</span></div>
                      <div className="flex justify-between text-sm"><span>카드수수료</span><span className="font-bold">{rVar.card.toLocaleString()}만원</span></div>
                      <div className="flex justify-between text-sm"><span>수도광열비 (공과금)</span><span className="font-bold">{rVar.utility.toLocaleString()}만원</span></div>
                      <div className="flex justify-between text-sm"><span>플랫폼/배달수수료</span><span className="font-bold">{rVar.platform.toLocaleString()}만원</span></div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-amber-600"><span>변동비 합계</span><span>{totalVarRounded.toLocaleString()}만원</span></div>
                    </div>
                  </div>
                )}
                {expandedSection === 'tax' && (
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4 animate-in slide-in-from-top-2">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Receipt size={14} className="text-slate-600" /> 예상 세금 내역</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>부가가치세 (예상분)</span><span className="font-bold">{rTax.vat.toLocaleString()}만원</span></div>
                      <div className="flex justify-between text-sm"><span>종합소득세 (누진율 반영)</span><span className="font-bold">{rTax.incomeTax.toLocaleString()}만원</span></div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-600"><span>세금 합계</span><span>{totalTaxRounded.toLocaleString()}만원</span></div>
                    </div>
                  </div>
                )}

                {/* 초기 투자비용 정보 (반올림 적용) */}
                <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-4">
                   <div className="flex justify-between items-center group cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'investment' ? null : 'investment')}>
                      <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2"><Wallet size={14} /> 예상 초기 투자비용</h4>
                      <p className="text-lg font-black text-blue-900">{Math.round(analysis.totalInvestment / 10000).toLocaleString()}만원 <ArrowDown size={14} className={`inline transition-transform ${expandedSection === 'investment' ? 'rotate-180' : ''}`} /></p>
                   </div>
                   {expandedSection === 'investment' && (
                     <div className="space-y-3 pt-4 border-t border-blue-200 animate-in slide-in-from-top-2">
                        <div className="flex justify-between text-sm"><span>임대 보증금 (회수 가능 자산)</span><span className="font-bold">{Math.round(deposit / 10000).toLocaleString()}만원</span></div>
                        <div className="flex justify-between text-sm"><span>인테리어 ({spaceInfo.size}평 기준)</span><span className="font-bold">{Math.round(analysis.initialInvestment.interior / 10000).toLocaleString()}만원</span></div>
                        <div className="flex justify-between text-sm"><span>주방/매장 장비 및 설비</span><span className="font-bold">{Math.round(analysis.initialInvestment.equipment / 10000).toLocaleString()}만원</span></div>
                        <div className="flex justify-between text-sm"><span>초도 재고 물량</span><span className="font-bold">{Math.round(analysis.initialInvestment.inventory / 10000).toLocaleString()}만원</span></div>
                        <div className="flex justify-between text-sm"><span>기타 (마케팅/가맹비 등)</span><span className="font-bold">{Math.round(analysis.initialInvestment.other / 10000).toLocaleString()}만원</span></div>
                     </div>
                   )}
                </div>
                
                <div className="py-6 text-center border-t border-slate-100">
                  <p className="text-[12px] text-slate-400 font-medium">재무전문가 분석 결과 회수 기간: 약 <span className="text-blue-600 font-black text-lg">{Math.ceil(analysis.repaymentMonths)}개월</span></p>
                  <p className="text-[10px] text-slate-300 mt-1">* 업종별 평균 감가상각 및 시장 상황에 따라 변동될 수 있습니다.</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4 pb-10">
        {step > 1 && (
          <button onClick={prevStep} className="flex-1 h-16 rounded-[1.5rem] border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><ChevronLeft size={20} /> 이전</button>
        )}
        <button onClick={step === 5 ? () => setStep(1) : nextStep} className={`flex-[2] h-16 rounded-[1.5rem] font-black text-white transition-all flex items-center justify-center gap-2 shadow-xl ${step === 5 ? 'bg-blue-600 shadow-blue-900/20' : 'bg-slate-950 shadow-slate-900/20'}`}>
          {step === 5 ? '시나리오 다시 설계하기' : <>다음 단계로 진행 <ChevronRight size={20} /></>}
        </button>
      </div>
    </div>
  );
};

export default FeasibilityReport;
