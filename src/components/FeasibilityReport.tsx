import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Users, Home, CreditCard, 
  DollarSign, Calculator, ChevronRight, 
  ChevronLeft, CheckCircle2, Info, X,
  ArrowDown, PieChart, Activity, Wallet,
  Receipt, Landmark, Tool
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

const FeasibilityReport = ({ initialData }: { initialData?: { location: string; category: string } }) => {
  const [step, setStep] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // 툇마루단 조사 데이터 적용
  const spaceInfo = useMemo(() => getSpaceConditions(initialData?.location || ''), [initialData?.location]);

  // Inputs State
  const [loan, setLoan] = useState(50000000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [staffCount, setStaffCount] = useState(2);
  const [hourlyWage, setHourlyWage] = useState(9860);
  const [targetProfit, setTargetProfit] = useState(3000000);

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
  
  const [loan, setLoan] = useState(50000000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [staffCount, setStaffCount] = useState(2);
  const [hourlyWage, setHourlyWage] = useState(10030); // 1만원 시대 반영
  const [targetProfit, setTargetProfit] = useState(3000000);

  // Calculations
  const analysis = useMemo(() => {
    const data = INDUSTRIES[industry as keyof typeof INDUSTRIES];
    const monthlyInterest = (loan * (interestRate / 100)) / 12;
    const grossSalary = staffCount * hourlyWage * 209; // 주휴수당 포함 급여
    const monthlyLabor = grossSalary * 1.11; // 4대 보험 및 부대비용(약 11%) 포함 실부담액
    
    // 고정비 (임대료, 관리비, 인건비, 이자)
    const fixedCosts = {
      rent: rent,
      maintenance: maintenance,
      labor: monthlyLabor,
      interest: monthlyInterest
    };
    const totalFixed = Object.values(fixedCosts).reduce((a, b) => a + b, 0);

    // 목표 매출액 역산 (매출 = (목표이익 + 고정비) / (1 - 변동비율))
    const totalVarRate = Object.values(data.variableRates).reduce((a, b) => a + b, 0);
    const requiredRevenue = (targetProfit + totalFixed) / (1 - totalVarRate);

    // 변동비 세부 산출
    const variableCosts = {
      material: requiredRevenue * data.variableRates.material,
      card: requiredRevenue * data.variableRates.card,
      utility: requiredRevenue * data.variableRates.utility,
      platform: requiredRevenue * data.variableRates.platform
    };
    const totalVar = Object.values(variableCosts).reduce((a, b) => a + b, 0);

    const preTaxProfit = requiredRevenue - totalFixed - totalVar;

    // 세금 산출
    const vat = requiredRevenue * 0.1; // 부가세 (단순화)
    const monthlyIncomeTax = calculateIncomeTax(preTaxProfit * 12) / 12;
    const totalTax = vat + monthlyIncomeTax;

    const netIncome = preTaxProfit - totalTax;

    // 초기 투자비용
    const initialInvestment = {
      deposit: deposit,
      interior: spaceInfo.size * data.initialInvestmentPerPyung,
      equipment: (spaceInfo.size * data.initialInvestmentPerPyung) * 0.4,
      inventory: requiredRevenue * 0.3,
      other: 5000000
    };
    const totalInvestment = Object.values(initialInvestment).reduce((a, b) => a + b, 0);

    return {
      requiredRevenue,
      fixedCosts, totalFixed,
      variableCosts, totalVar,
      preTaxProfit,
      tax: { vat, incomeTax: monthlyIncomeTax, total: totalTax },
      netIncome,
      initialInvestment, totalInvestment,
      repaymentMonths: totalInvestment / netIncome
    };
  }, [loan, interestRate, staffCount, hourlyWage, industry, targetProfit, spaceInfo]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const formatMan = (val: number) => (val / 10000).toLocaleString();

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 bg-white min-h-screen font-sans text-slate-900">
      {/* Header & Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Financial Assessment</h2>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              재무 타당성 분석 <br/>
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
                  <input type="number" className="w-full px-6 text-xl font-black h-14 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] focus:border-blue-600 focus:bg-white outline-none text-center" value={hourlyWage} onChange={(e) => setHourlyWage(Number(e.target.value))} />
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
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" /> 총 초기 차입금 (대출)</label>
                <div className="relative"><input type="text" className="w-full pl-6 pr-16 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 outline-none text-right" value={(loan / 10000).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setLoan(val * 10000); }} /><span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-black">만원</span></div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> 예상 연 이자율 (%)</label>
                <input type="number" step="0.1" className="w-full px-6 text-2xl font-black h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-blue-600 outline-none" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-10 py-4">
            <div className="text-center space-y-4">
              <div className="bg-blue-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-blue-200"><DollarSign className="text-white w-10 h-10" /></div>
              <div className="space-y-2"><h2 className="text-2xl font-black text-slate-900 leading-tight">월 목표 순이익을 설정하세요</h2><p className="text-slate-400 text-[13px] font-medium leading-relaxed">이자/세금 제외 모든 비용을 공제한 <br/>실질적인 '나의 수입' 목표입니다.</p></div>
            </div>
            <div className="max-w-sm mx-auto"><div className="relative"><input type="text" className="w-full text-center text-5xl font-black h-24 bg-transparent border-b-4 border-blue-600 focus:border-blue-700 outline-none text-blue-600" value={(targetProfit / 10000).toLocaleString()} onChange={(e) => { const val = Number(e.target.value.replace(/,/g, '')); if(!isNaN(val)) setTargetProfit(val * 10000); }} /><div className="text-center mt-4 text-slate-400 font-black text-sm uppercase tracking-widest">만원</div></div></div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            {/* 최종 공식 헤더 */}
            <div className="bg-slate-950 p-6 rounded-[2rem] text-white shadow-2xl border border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator size={100} /></div>
               <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">CPA Final Assessment</p>
               <h2 className="text-lg font-black mb-4">비즈니스 재무 리포트</h2>
               
               <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 font-bold">월 매출</p>
                    <p className="text-lg font-black">{formatMan(analysis.requiredRevenue)}</p>
                  </div>
                  <div className="text-slate-600 font-black">−</div>
                  <div className="text-center group cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'fixed' ? null : 'fixed')}>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 justify-center">고정비 <ArrowDown size={8} /></p>
                    <p className="text-lg font-black text-rose-400">{formatMan(analysis.totalFixed)}</p>
                  </div>
                  <div className="text-slate-600 font-black">−</div>
                  <div className="text-center group cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'var' ? null : 'var')}>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 justify-center">변동비 <ArrowDown size={8} /></p>
                    <p className="text-lg font-black text-amber-400">{formatMan(analysis.totalVar)}</p>
                  </div>
               </div>
               
               <div className="flex items-center justify-between mt-4 bg-white/5 p-4 rounded-xl">
                  <div className="text-center group cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'tax' ? null : 'tax')}>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 justify-center">세금 <ArrowDown size={8} /></p>
                    <p className="text-lg font-black text-slate-400">{formatMan(analysis.tax.total)}</p>
                  </div>
                  <div className="text-slate-600 font-black">=</div>
                  <div className="text-right">
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Net Monthly Profit</p>
                    <p className="text-3xl font-black text-green-400">{formatMan(analysis.netIncome)}<span className="text-sm ml-1 text-white/50">만원</span></p>
                  </div>
               </div>
            </div>

            {/* 상세 드릴다운 내역 */}
            <div className="space-y-3">
              {expandedSection === 'fixed' && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2"><Home size={14} className="text-blue-600" /> 세부 고정비 내역</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>임대료 (툇마루 조사값)</span><span className="font-bold">{formatMan(analysis.fixedCosts.rent)}만원</span></div>
                    <div className="flex justify-between text-sm"><span>관리비 (툇마루 조사값)</span><span className="font-bold">{formatMan(analysis.fixedCosts.maintenance)}만원</span></div>
                    <div className="flex justify-between text-sm"><span>인건비 ({staffCount}명 / 보험료·주휴 포함)</span><span className="font-bold">{formatMan(analysis.fixedCosts.labor)}만원</span></div>
                    <div className="flex justify-between text-sm"><span>금융비용 (대출 이자)</span><span className="font-bold">{formatMan(analysis.fixedCosts.interest)}만원</span></div>
                  </div>
                </div>
              )}
              {expandedSection === 'var' && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2"><PieChart size={14} className="text-amber-600" /> 세부 변동비 내역 (매출 비례)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>원부재료비 ({Math.round(INDUSTRIES[industry as keyof typeof INDUSTRIES].variableRates.material * 100)}%)</span><span className="font-bold">{formatMan(analysis.variableCosts.material)}만원</span></div>
                    <div className="flex justify-between text-sm"><span>카드/결제 수수료 (1.5%)</span><span className="font-bold">{formatMan(analysis.variableCosts.card)}만원</span></div>
                    <div className="flex justify-between text-sm"><span>광고/플랫폼 수수료 ({Math.round(INDUSTRIES[industry as keyof typeof INDUSTRIES].variableRates.platform * 100)}%)</span><span className="font-bold">{formatMan(analysis.variableCosts.platform)}만원</span></div>
                    <div className="flex justify-between text-sm"><span>수도/광열비 (변동분)</span><span className="font-bold">{formatMan(analysis.variableCosts.utility)}만원</span></div>
                  </div>
                </div>
              )}
              {expandedSection === 'tax' && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2"><Receipt size={14} className="text-slate-600" /> 세금 산출 근거</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>부가가치세 (매출의 약 10%)</span><span className="font-bold">{formatMan(analysis.tax.vat)}만원</span></div>
                    <div className="flex justify-between text-sm"><span>종합소득세 (누진세율 적용)</span><span className="font-bold">{formatMan(analysis.tax.incomeTax)}만원</span></div>
                    <p className="text-[10px] text-slate-400 mt-2">* 부가가치세는 매입 세액 공제에 따라 달라질 수 있습니다.</p>
                  </div>
                </div>
              )}
            </div>

            {/* 초기 투자비용 정보 */}
            <div className="p-5 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-4">
               <div className="flex justify-between items-center group cursor-pointer" onClick={() => setExpandedSection(expandedSection === 'investment' ? null : 'investment')}>
                  <h4 className="text-xs font-black text-blue-700 uppercase flex items-center gap-2"><Wallet size={14} /> 예상 초기 투자비용</h4>
                  <p className="text-sm font-black text-blue-900">{formatMan(analysis.totalInvestment)}만원 <ArrowDown size={10} className={`inline transition-transform ${expandedSection === 'investment' ? 'rotate-180' : ''}`} /></p>
               </div>
               {expandedSection === 'investment' && (
                 <div className="space-y-2 pt-2 border-t border-blue-200">
                    <div className="flex justify-between text-xs"><span>임대 보증금 (회수 가능 자산)</span><span className="font-bold">{formatMan(deposit)}만원</span></div>
                    <div className="flex justify-between text-xs"><span>인테리어 ({spaceInfo.size}평 기준)</span><span className="font-bold">{formatMan(analysis.initialInvestment.interior)}만원</span></div>
                    <div className="flex justify-between text-xs"><span>주방/매장 장비 및 설비</span><span className="font-bold">{formatMan(analysis.initialInvestment.equipment)}만원</span></div>
                    <div className="flex justify-between text-xs"><span>초도 재고 물량</span><span className="font-bold">{formatMan(analysis.initialInvestment.inventory)}만원</span></div>
                    <div className="flex justify-between text-xs"><span>기타 (마케팅/가맹비 등)</span><span className="font-bold">{formatMan(analysis.initialInvestment.other)}만원</span></div>
                 </div>
               )}
            </div>
            
            <div className="p-4 text-center">
              <p className="text-[11px] text-slate-400 font-medium">분석 결과 회수 기간: 약 <span className="text-blue-600 font-black">{Math.ceil(analysis.repaymentMonths)}개월</span></p>
            </div>
          </div>
        )}
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
