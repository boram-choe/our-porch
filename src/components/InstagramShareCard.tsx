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
        className="fixed top-0 left-0 z-[-50] bg-[#0f172a] text-white flex flex-col justify-center items-center overflow-hidden"
        style={{
          width: '1080px',
          height: '1080px',
          fontFamily: "'Inter', 'Pretendard', sans-serif"
        }}
      >
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-full h-full bg-purple-600/20 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-amber-500/10 rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Content Box */}
        <div className="relative z-10 w-[940px] h-[940px] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[4rem] shadow-2xl flex flex-col p-12">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-3xl font-bold text-slate-400 mb-2 tracking-wider flex items-center gap-3">
                <Home className="text-amber-400" size={32} />
                우리 집 주거 풍수 진단서
              </p>
              <h1 className="text-6xl font-black text-white tracking-tight">
                {userProfile?.home?.neighborhood || "우리 동네"}
              </h1>
            </div>
            <div className="bg-slate-950/80 px-8 py-6 rounded-3xl border border-amber-500/30 text-center shadow-xl">
              <span className="text-xl font-bold text-slate-400 uppercase tracking-widest block mb-2">종합 점수</span>
              <p className="text-6xl font-black text-amber-400">
                {homeFsResult.score}<span className="text-4xl text-white ml-2">점</span>
              </p>
            </div>
          </div>

          {/* Main Character & Message */}
          <div className="flex-1 flex flex-col items-center justify-center mb-8">
            <img src={mascot.src} alt={mascot.alt} className="w-80 h-80 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] mb-8" />
            <div className="relative w-[85%] bg-slate-800 text-4xl text-slate-100 px-12 py-8 rounded-[2.5rem] shadow-2xl text-center break-keep leading-snug font-bold border border-slate-700">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-800 border-t border-l border-slate-700 rotate-45" />
              <span>{renderMessage(mascot.message)}</span>
            </div>
          </div>

          {/* Highlights (Remedy & Spot) */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-3xl p-8 flex items-center gap-6">
              <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="text-purple-400" size={40} />
              </div>
              <div>
                <p className="text-xl font-bold text-purple-300 mb-2">황금 개운 처방 ({getFortuneName(desiredFortune)})</p>
                <p className="text-3xl font-black text-white">{remedyTitle}</p>
              </div>
            </div>

            {matchedVacancy ? (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-3xl p-8 flex items-center gap-6">
                <div className="w-20 h-20 bg-amber-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <MapPin className="text-amber-400" size={40} />
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-300 mb-2">내 주변 명당 스팟</p>
                  <p className="text-3xl font-black text-white truncate w-[300px]">{matchedVacancy.landmark}</p>
                </div>
              </div>
            ) : (
               <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 flex items-center gap-6">
                <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center shrink-0">
                  <Compass className="text-slate-400" size={40} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-400 mb-2">풍수타로</p>
                  <p className="text-3xl font-black text-white">여긴뭐가.kr</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
