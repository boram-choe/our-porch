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
          className="relative bg-[#0f172a] text-white flex flex-col justify-between items-center overflow-hidden py-16 px-10"
          style={{
            width: '1080px',
            height: '1920px',
            fontFamily: "'Inter', 'Pretendard', sans-serif"
          }}
        >
          {/* Background Effects */}
          <div className="absolute top-0 right-0 w-full h-full bg-purple-600/30 rounded-full blur-[200px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-amber-500/20 rounded-full blur-[200px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

          {/* Content Box with Safe Area for IG Story */}
          <div className="relative z-10 w-full h-full bg-slate-900/70 backdrop-blur-2xl border-2 border-slate-700/60 rounded-[4.5rem] shadow-2xl flex flex-col p-12 justify-between items-center">
            
            {/* Top Section */}
            <div className="flex flex-col items-center justify-center w-full mt-6">
              <div className="flex items-center justify-center gap-4 mb-10 bg-slate-800/90 px-10 py-4 rounded-full border border-slate-600 shadow-xl">
                <Compass className="text-amber-400" size={38} />
                <span className="text-3xl font-black text-slate-200 tracking-widest">여긴뭐가 풍수타로</span>
              </div>
              <h1 className="text-[7rem] font-black text-white tracking-tight text-center leading-[1.15] drop-shadow-2xl">
                우리 집 주거<br/><span className="text-amber-400">풍수 진단서</span>
              </h1>
            </div>

            {/* Middle Section (Score + Grade) */}
            <div className="flex flex-col items-center w-full mt-8">
              <div className="bg-slate-950/80 px-16 py-12 rounded-[4.5rem] border border-amber-500/40 text-center shadow-2xl w-full flex flex-col items-center gap-6">
                <span className="text-4xl font-bold text-slate-400 uppercase tracking-widest">종합 점수</span>
                <p className="text-[9.5rem] font-black text-amber-400 leading-none drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                  {homeFsResult.score}<span className="text-7xl text-white ml-4 font-bold">점</span>
                </p>
                <div className="w-[80%] h-[2px] bg-slate-700/50 my-6" />
                <span className="text-3xl font-bold text-slate-400">주거 격식 등급</span>
                <p className="text-5xl font-black text-white">{homeFsResult.grade || "배산임수형 주거명당"}</p>
                <div className="inline-block mt-4 text-amber-400 font-black text-4xl px-10 py-4 bg-amber-500/10 rounded-full border border-amber-500/30">대길 (大吉)</div>
              </div>
            </div>

            {/* Character Section */}
            <div className="flex-1 flex flex-col items-center justify-center w-full gap-10 mt-8">
              <img src={mascot.src} alt={mascot.alt} className="w-[520px] h-[520px] object-contain drop-shadow-[0_40px_50px_rgba(0,0,0,0.7)]" />
              <div className="relative w-full bg-slate-800 text-[3.2rem] text-slate-100 px-14 py-16 rounded-[4rem] shadow-2xl text-center break-keep leading-[1.5] font-bold border border-slate-600">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-800 border-t border-l border-slate-600 rotate-45" />
                <span>{renderMessage(mascot.message)}</span>
              </div>
            </div>

            {/* Highlights (Remedy) */}
            <div className="w-full mt-10 mb-8">
              <div className="bg-purple-900/30 border-2 border-purple-500/40 rounded-[4rem] p-12 flex items-center gap-10">
                <div className="w-32 h-32 bg-purple-500/30 rounded-full flex items-center justify-center shrink-0 shadow-lg">
                  <Sparkles className="text-purple-300" size={60} />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-purple-300 mb-4">황금 개운 처방 ({getFortuneName(desiredFortune)})</p>
                  <p className="text-5xl font-black text-white break-keep leading-snug">{remedyTitle}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-between items-center px-6 mt-4">
              <p className="text-3xl font-bold text-slate-500 tracking-wider">
                #명당찾기 #우리집풍수
              </p>
              <p className="text-3xl font-black text-amber-500/70">
                gongsil.vercel.app
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
