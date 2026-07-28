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
      <div 
        ref={ref}
        id="instagram-share-card"
        className="fixed top-0 left-0 z-[-50] bg-[#0f172a] text-white flex flex-col justify-center items-center overflow-hidden"
        style={{
          width: '1080px',
          height: '1920px',
          fontFamily: "'Inter', 'Pretendard', sans-serif"
        }}
      >
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-full h-full bg-purple-600/20 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-amber-500/10 rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Content Box with Safe Area for IG Story */}
        <div className="relative z-10 w-[940px] h-[1500px] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[4rem] shadow-2xl flex flex-col p-12">
          
          {/* Header */}
          <div className="flex flex-col items-center justify-center mb-10 mt-8">
            <div className="flex items-center justify-center gap-4 mb-8 bg-slate-800/80 px-8 py-3.5 rounded-full border border-slate-700 shadow-lg">
              <Compass className="text-amber-400" size={32} />
              <span className="text-2xl font-black text-slate-200 tracking-widest">여긴뭐가 풍수타로</span>
            </div>
            <h1 className="text-[6.5rem] font-black text-white tracking-tight mb-8 text-center leading-tight flex items-center justify-center gap-6 w-full">
              <Home className="text-amber-400 shrink-0" size={70} />
              우리집 주거 풍수 진단서
            </h1>
            <div className="bg-slate-950/80 px-16 py-8 rounded-[3rem] border border-amber-500/30 text-center shadow-xl flex items-center gap-8">
              <span className="text-3xl font-bold text-slate-400 uppercase tracking-widest block">종합 점수</span>
              <div className="w-1 h-12 bg-slate-700 rounded-full" />
              <p className="text-[6.5rem] font-black text-amber-400 leading-none">
                {homeFsResult.score}<span className="text-5xl text-white ml-2 font-bold">점</span>
              </p>
            </div>
          </div>

          {/* Main Character & Message */}
          <div className="flex-1 flex flex-col items-center justify-center mb-8 gap-10">
            <img src={mascot.src} alt={mascot.alt} className="w-[450px] h-[450px] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" />
            <div className="relative w-[90%] bg-slate-800 text-5xl text-slate-100 px-14 py-12 rounded-[3rem] shadow-2xl text-center break-keep leading-[1.4] font-bold border border-slate-700">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-800 border-t border-l border-slate-700 rotate-45" />
              <span>{renderMessage(mascot.message)}</span>
            </div>
          </div>

          {/* Highlights (Remedy & Spot) */}
          <div className="flex flex-col gap-6 mt-8">
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-[2.5rem] p-10 flex items-center gap-8">
              <div className="w-24 h-24 bg-purple-500/20 rounded-3xl flex items-center justify-center shrink-0">
                <Sparkles className="text-purple-400" size={50} />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-purple-300 mb-3">황금 개운 처방 ({getFortuneName(desiredFortune)})</p>
                <p className="text-4xl font-black text-white">{remedyTitle}</p>
              </div>
            </div>

            {matchedVacancy ? (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-[2.5rem] p-10 flex items-center gap-8">
                <div className="w-24 h-24 bg-amber-500/20 rounded-3xl flex items-center justify-center shrink-0">
                  <MapPin className="text-amber-400" size={50} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-amber-300 mb-3">내 주변 명당 스팟</p>
                  <p className="text-4xl font-black text-white truncate max-w-[650px]">{matchedVacancy.landmark}</p>
                </div>
              </div>
            ) : (
               <div className="bg-slate-800/50 border border-slate-700 rounded-[2.5rem] p-10 flex items-center gap-8">
                <div className="w-24 h-24 bg-slate-700 rounded-3xl flex items-center justify-center shrink-0">
                  <Compass className="text-slate-400" size={50} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-slate-400 mb-3">주거 격식 등급</p>
                  <p className="text-4xl font-black text-white flex items-center justify-between">
                    <span>{homeFsResult.grade || "배산임수형 주거명당"}</span>
                    <span className="text-amber-400 font-black text-3xl px-6 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/20">대길 (大吉)</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer info at the very bottom */}
        <div className="absolute bottom-16 w-full text-center">
          <p className="text-3xl font-bold text-slate-500/70 tracking-widest mb-3">
            #명당찾기 #풍수타로 #우리집풍수
          </p>
          <p className="text-2xl font-bold text-slate-600/70">
            🔍 gongsil.vercel.app
          </p>
        </div>
      </div>
    );
  }
);
