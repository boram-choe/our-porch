import React from 'react';
import { Home, Compass, Target, Info, Sparkles, MapPin, Map } from 'lucide-react';
import { Vacancy } from '../types';

export interface InstagramShareCardProps {
  userProfile: any;
  homeFsResult: any;
  desiredFortune: string;
  matchedVacancy: Vacancy | null;
  mascot: { src: string; message: string; alt: string };
  remedyMascot: { src: string; message: string; alt: string };
  getShortAreaName: (name: string) => string;
  remedyTitle: string;
}

export const InstagramShareCard = React.forwardRef<HTMLDivElement, InstagramShareCardProps>(
  ({ userProfile, homeFsResult, desiredFortune, matchedVacancy, mascot, remedyMascot, getShortAreaName, remedyTitle }, ref) => {
    
    // Render the messages correctly handling newlines
    const renderMessage = (msg: string) => {
      return msg.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
          {line}
          {i !== arr.length - 1 && <br />}
        </React.Fragment>
      ));
    };

    const getFortuneName = (df: string) => {
      switch (df) {
        case "wealth": case "south": case "southeast": case "west": case "southwest": return "재물운";
        case "mentors": case "east": case "northeast": case "northwest": return "성공운/귀인운";
        default: return "안정운/화목운";
      }
    };

    const fortuneName = getFortuneName(desiredFortune);

    return (
      <div 
        ref={ref}
        id="instagram-share-card"
        className="fixed top-0 left-[-9999px] z-[-50] bg-[#0f172a] text-white flex flex-col justify-between overflow-hidden"
        style={{
          width: '1080px',
          height: '1920px',
          fontFamily: "'Inter', 'Pretendard', sans-serif"
        }}
      >
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-purple-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-amber-500/10 rounded-full blur-[150px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        {/* Header - Page 1 info */}
        <div className="relative z-10 px-20 pt-24 pb-16 flex flex-col items-center border-b border-slate-800/80 bg-slate-900/50">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner mb-8">
            <Home size={56} />
          </div>
          <p className="text-3xl font-bold text-slate-400 mb-4 tracking-wider uppercase">우리 집 주거 풍수 진단서</p>
          <h1 className="text-6xl font-black text-white mb-10 tracking-tight text-center leading-tight">
            {userProfile?.home?.neighborhood || "우리 동네"} <span className="text-amber-400">주거 풍수 점수</span>
          </h1>
          
          <div className="flex items-center gap-12 bg-slate-950/80 p-10 rounded-[3rem] border border-amber-500/20 shadow-2xl">
            <div className="text-center">
              <span className="text-2xl font-bold text-slate-400 uppercase tracking-wider block mb-2">종합 점수</span>
              <p className="text-7xl font-black text-amber-400 break-keep">
                {homeFsResult.score}<span className="text-5xl ml-2 text-white">점</span>
              </p>
            </div>
            <div className="w-[2px] h-24 bg-slate-800" />
            <div className="flex flex-col items-center">
              <img src={mascot.src} alt={mascot.alt} className="w-48 h-48 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] mb-6" />
              <div className="relative w-[600px] bg-slate-800 text-3xl text-slate-200 px-10 py-8 rounded-[2rem] shadow-xl text-center break-keep leading-relaxed font-bold">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-800 border-t border-l border-slate-700 rotate-45" />
                <span>{renderMessage(mascot.message)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body - Page 2 & 3 & 4 */}
        <div className="relative z-10 flex-1 px-20 py-16 flex flex-col gap-12">
          
          {/* Page 2 - Geo */}
          {homeFsResult.geo && (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-[3rem] p-12 flex gap-8 items-center shadow-2xl">
              <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Compass size={56} />
              </div>
              <div className="flex-1">
                <h4 className="text-4xl font-bold text-white tracking-tight mb-4">지형 지세 요약</h4>
                <div className="flex gap-4 mb-4">
                  <span className="px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold rounded-2xl text-2xl">{homeFsResult.geo.water}</span>
                  <span className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-2xl">{homeFsResult.geo.mountain}</span>
                </div>
                <p className="text-2xl text-slate-300 font-medium leading-relaxed">{homeFsResult.geo.description}</p>
              </div>
            </div>
          )}

          {/* Page 4 - Remedy */}
          <div className="bg-gradient-to-br from-slate-900/90 to-purple-900/30 backdrop-blur-md border border-purple-500/30 rounded-[3rem] p-12 flex flex-col gap-10 shadow-2xl">
            <div className="flex items-center gap-6 pb-8 border-b border-purple-500/20">
              <div className="w-24 h-24 rounded-2xl bg-purple-950/50 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                <Sparkles size={56} />
              </div>
              <div>
                <h4 className="text-4xl font-bold text-white tracking-tight mb-2">황금 개운 처방 ({fortuneName})</h4>
                <p className="text-2xl text-purple-300/80 font-bold">우리 집의 부족한 기운을 채워보세요!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-10">
              <img src={remedyMascot.src} alt={remedyMascot.alt} className="w-56 h-56 object-contain drop-shadow-2xl" />
              <div className="relative flex-1 bg-slate-950/60 border border-purple-500/30 text-3xl text-slate-200 px-10 py-10 rounded-[2rem] shadow-xl text-left break-keep leading-relaxed font-medium">
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-slate-950 border-b border-l border-purple-500/30 rotate-45" />
                <h5 className="text-4xl font-black text-amber-400 mb-6 flex items-center gap-3">
                  <Target className="w-8 h-8" /> 처방: {remedyTitle}
                </h5>
                <span className="text-slate-300">{renderMessage(remedyMascot.message)}</span>
              </div>
            </div>
          </div>

          {/* Page 5 - Lucky Spot */}
          {matchedVacancy && (
            <div className="bg-slate-900/60 backdrop-blur-md border border-amber-500/30 rounded-[3rem] p-12 flex gap-8 items-center shadow-2xl border-b-8 border-b-amber-500">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shrink-0 shadow-[0_0_40px_rgba(245,158,11,0.4)]">
                <MapPin size={48} strokeWidth={3} />
              </div>
              <div className="flex-1">
                <h4 className="text-3xl font-bold text-amber-400 tracking-tight mb-3 uppercase flex items-center gap-3">
                  <Map size={32} />
                  내 주변 행운 스팟 (명당)
                </h4>
                <p className="text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                  {matchedVacancy.landmark} <span className="text-3xl text-slate-400 font-bold ml-2">({matchedVacancy.floor})</span>
                </p>
                <p className="text-2xl text-slate-400 font-medium">{matchedVacancy.address}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="relative z-10 py-10 text-center bg-slate-950 border-t border-slate-800">
          <p className="text-3xl font-black text-slate-500 tracking-widest flex items-center justify-center gap-4">
            <Compass className="w-8 h-8 text-amber-500" /> 여긴뭐가.kr 풍수타로 결과
          </p>
        </div>

      </div>
    );
  }
);
