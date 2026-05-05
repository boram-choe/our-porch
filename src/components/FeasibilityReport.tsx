import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, Users, Home, CreditCard, 
  DollarSign, Calculator, ChevronRight, 
  ChevronLeft, CheckCircle2, Info
} from 'lucide-react';

const INDUSTRIES = {
  cafe: { name: '카페/음료', cogsRate: 0.35, opMargin: 0.20, icon: '☕' },
  restaurant: { name: '일반음식점', cogsRate: 0.40, opMargin: 0.15, icon: '🍱' },
  retail: { name: '일반소매업', cogsRate: 0.55, opMargin: 0.10, icon: '🛍️' },
};

const FeasibilityReport = () => {
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
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6 bg-white min-h-screen font-sans">
      {/* Header & Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Financial Analysis</h2>
            <h1 className="text-2xl font-bold text-slate-900">재무 타당성 시뮬레이션</h1>
          </div>
          <span className="text-sm text-slate-400 font-medium">Step {step} of 5</span>
        </div>
        <Progress value={step * 20} className="h-2 bg-slate-100" />
      </div>

      <div className="min-h-[400px]">
        {/* Step 1: Industry Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-blue-50 rounded-xl flex gap-3 items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800 leading-relaxed">
                업종에 따라 평균 원가율이 다릅니다. 창업하시려는 업종을 선택하시면 회계사 최보람의 데이터셋이 적용됩니다.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(INDUSTRIES).map(([key, value]) => (
                <div 
                  key={key}
                  onClick={() => setIndustry(key)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    industry === key ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{value.icon}</span>
                      <div>
                        <h3 className="font-bold text-slate-900">{value.name}</h3>
                        <p className="text-xs text-slate-500">평균 수익률 약 {(value.opMargin * 100)}%</p>
                      </div>
                    </div>
                    {industry === key && <CheckCircle2 className="text-blue-600 w-6 h-6" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Fixed Costs (Rent & Staff) */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Home className="w-4 h-4" /> 월 임대료
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pl-10 text-lg h-14 border-slate-200 rounded-xl focus:ring-blue-500"
                    value={rent} 
                    onChange={(e) => setRent(Number(e.target.value))} 
                  />
                  <span className="absolute left-4 top-4 text-slate-400 text-lg">₩</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4" /> 예상 인원
                  </Label>
                  <Input 
                    type="number" 
                    className="h-14 border-slate-200 rounded-xl"
                    value={staffCount} 
                    onChange={(e) => setStaffCount(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-bold text-slate-800">적용 시급</Label>
                  <Input 
                    type="number" 
                    className="h-14 border-slate-200 rounded-xl"
                    value={hourlyWage} 
                    onChange={(e) => setHourlyWage(Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Financing (Loan & Interest) */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> 총 차입금 (대출)
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    className="pl-10 text-lg h-14 border-slate-200 rounded-xl"
                    value={loan} 
                    onChange={(e) => setLoan(Number(e.target.value))} 
                  />
                  <span className="absolute left-4 top-4 text-slate-400 text-lg">₩</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> 연 이자율 (%)
                </Label>
                <Input 
                  type="number" 
                  step="0.1"
                  className="h-14 border-slate-200 rounded-xl"
                  value={interestRate} 
                  onChange={(e) => setInterestRate(Number(e.target.value))} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Goals */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center py-8">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="text-blue-600 w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">목표 월 순이익을 설정하세요</h2>
              <p className="text-slate-500 text-sm mt-2">차입금 상환 및 생활비 등을 고려한 실질 수익입니다.</p>
            </div>
            <div className="relative max-w-sm mx-auto">
              <Input 
                type="number" 
                className="text-center text-3xl font-bold h-20 border-b-4 border-t-0 border-x-0 border-blue-600 rounded-none focus:ring-0"
                value={targetProfit} 
                onChange={(e) => setTargetProfit(Number(e.target.value))} 
              />
            </div>
          </div>
        )}

        {/* Step 5: Final Report */}
        {step === 5 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-6">
              <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium">최종 분석 결과</p>
                <h2 className="text-2xl font-bold">월 목표 매출액</h2>
              </div>
              <div className="text-5xl font-black text-blue-400 tracking-tighter">
                {Math.round(analysis.requiredRevenue).toLocaleString()}<span className="text-2xl ml-1 text-white">원</span>
              </div>
              <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-xs">차입금 상환 기간</p>
                  <p className="text-lg font-bold">{Math.ceil(analysis.repaymentMonths)}개월</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">상환 후 월 기대수익</p>
                  <p className="text-lg font-bold text-green-400">{Math.round(analysis.monthlyOpProfit).toLocaleString()}원</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" /> 세부 고정비 내역
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">인건비 (월)</span>
                  <span className="font-medium">{Math.round(analysis.monthlyLabor).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">이자비용 (월)</span>
                  <span className="font-medium">{Math.round(analysis.monthlyInterest).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">임대료 (월)</span>
                  <span className="font-medium text-blue-600">{rent.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-8">
        {step > 1 && (
          <Button 
            variant="outline" 
            onClick={prevStep} 
            className="flex-1 h-14 rounded-xl border-slate-200 text-slate-600 font-bold"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> 이전
          </Button>
        )}
        <Button 
          onClick={step === 5 ? () => setStep(1) : nextStep} 
          className="flex-[2] h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
        >
          {step === 5 ? '다시 시작' : (
            <>다음 단계 <ChevronRight className="w-5 h-5 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
};

export default FeasibilityReport;
