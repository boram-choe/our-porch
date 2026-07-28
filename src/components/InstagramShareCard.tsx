import React from 'react';
import { Home, Compass, Target, Info, Sparkles, MapPin, Map } from 'lucide-react';
import { Vacancy } from '../data/dummyVacancies';

export interface InstagramShareCardProps {
  userProfile: any;
  homeFsResult: any;
  desiredFortune: string;
  matchedVacancy: Vacancy | null;
  mascot: { src: string; message: string; alt: string };
  remedyMascot: { src: string; message: string; alt: string };
  remedyTitle: string;
}

export const InstagramShareCard = React.forwardRef<HTMLDivElement, InstagramShareCardProps>(
  ({ userProfile, homeFsResult, desiredFortune, matchedVacancy, mascot, remedyMascot, remedyTitle }, ref) => {
    
    // Render the messages correctly handling newlines
    const renderMessage = (msg: string) => {
      // Remove neighborhood from message for privacy
      const neighborhood = userProfile?.home?.neighborhood || "";
      let cleanMsg = msg;
      if (neighborhood) {
        cleanMsg = cleanMsg.replace(new RegExp(neighborhood + "\\s*", "g"), "");
      }
      return cleanMsg.split('\n').map((line, i, arr) => (
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
      <div className="absolute top-0 left-0 opacity-0 pointer-events-none z-[-9999]" style={{ transform: 'scale(0.001)', transformOrigin: 'top left' }}>
        <div 
          ref={ref}
          id="instagram-share-card"
          className="relative bg-[#0f172a] text-white flex flex-col justify-between items-center overflow-hidden py-10 px-10"
          style={{
            width: '1080px',
            height: '1350px',
            fontFamily: "'Inter', 'Pretendard', sans-serif"
          }}
        >
          {/* Background Effects */}
          <div className="absolute top-0 right-0 w-full h-full bg-purple-600/30 rounded-full blur-[180px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-amber-500/20 rounded-full blur-[180px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

          {/* Content Box with Safe Area for IG Story */}
          <div className="relative z-10 w-full h-full bg-slate-900/70 backdrop-blur-xl border border-slate-700/60 rounded-[3.5rem] shadow-2xl flex flex-col p-10 justify-between items-center">
            
            {/* Top Section */}
            <div className="flex flex-col items-center justify-center w-full mt-2 mb-2">
              <div className="flex items-center justify-center gap-3 mb-6 bg-slate-800/90 px-8 py-3 rounded-full border border-slate-600 shadow-xl">
                <Compass className="text-amber-400" size={28} />
                <span className="text-2xl font-black text-slate-200 tracking-widest">여긴뭐가 풍수타로</span>
              </div>
              <h1 className="text-[5.5rem] font-black text-white tracking-tight text-center leading-[1.15] drop-shadow-2xl">
                우리 집 주거 <span className="text-amber-400">풍수 진단서</span>
              </h1>
            </div>

            {/* Middle Section (Score + Grade in Row) */}
            <div className="flex w-full mt-2 mb-2 gap-6">
              <div className="flex-1 bg-slate-950/80 p-8 rounded-[3rem] border border-amber-500/40 text-center shadow-2xl flex flex-col justify-center items-center gap-3">
                <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">종합 점수</span>
                <p className="text-[7.5rem] font-black text-amber-400 leading-none drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                  {homeFsResult.score}<span className="text-4xl text-white ml-2 font-bold">점</span>
                </p>
              </div>
              <div className="flex-1 bg-slate-950/80 p-8 rounded-[3rem] border border-amber-500/40 text-center shadow-2xl flex flex-col justify-center items-center gap-3">
                <span className="text-2xl font-bold text-slate-400">주거 격식 등급</span>
                <p className="text-[2.2rem] font-black text-white mt-1 break-keep leading-snug">{homeFsResult.grade || "배산임수형 주거명당"}</p>
                <div className="mt-2 text-amber-400 font-black text-2xl px-6 py-2 bg-amber-500/10 rounded-full border border-amber-500/30">대길 (大吉)</div>
              </div>
            </div>

            {/* Character Section (Side-by-side) */}
            <div className="w-full flex items-center justify-between gap-8 mt-2 mb-2 px-4">
              <img src={mascot.src} alt={mascot.alt} className="w-[340px] h-[340px] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] shrink-0" />
              <div className="relative flex-1 bg-slate-800 text-[2.2rem] text-slate-100 p-8 rounded-[3rem] shadow-2xl text-left break-keep leading-[1.6] font-bold border border-slate-600">
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 bg-slate-800 border-b border-l border-slate-600 rotate-45" />
                <span>{renderMessage(mascot.message)}</span>
              </div>
            </div>

            {/* Highlights (Remedy) */}
            <div className="w-full mt-2 mb-4">
              <div className="bg-purple-900/30 border-2 border-purple-500/40 rounded-[3rem] p-8 flex items-center gap-8">
                <div className="w-24 h-24 bg-purple-500/30 rounded-full flex items-center justify-center shrink-0 shadow-lg">
                  <Sparkles className="text-purple-300" size={44} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-purple-300 mb-2">황금 개운 처방 ({getFortuneName(desiredFortune)})</p>
                  <p className="text-[2.6rem] font-black text-white break-keep leading-snug">{remedyTitle}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-between items-center px-4 mt-2">
              <p className="text-[1.6rem] font-bold text-slate-500 tracking-wider">
                #명당찾기 #우리집풍수
              </p>
              <p className="text-[1.6rem] font-black text-amber-500/70">
                gongsil.vercel.app
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
