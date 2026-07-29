const fs = require('fs');

let b3dContent = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

// 1. Fix glowing border for 직접 상상해볼까요
const targetHeader = `{/* 질문 헤더 수정 */}
 <div className="text-center my-2">
 <h4 className="text-base font-black text-amber-400 tracking-tight leading-none mb-1">
 직접 상상해볼까요?
 </h4>
 <p className="text-[10px] font-bold text-slate-400">동네에 필요한 공간을 하나 꾹 눌러주세요</p>
 </div>`;

const newHeader = `{/* 질문 헤더 수정 */}
 <div id="vote-section" className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.25)] relative overflow-hidden mb-2 mt-6">
    <div className="absolute inset-0 border-[3px] border-amber-400 rounded-[2.5rem] animate-pulse pointer-events-none opacity-80" />
 <div className="text-center mb-6 relative z-10">
 <h4 className="text-xl font-black text-amber-400 tracking-tight leading-none mb-2 drop-shadow-md">
 직접 상상해볼까요?
 </h4>
 <p className="text-xs font-bold text-slate-300">동네에 필요한 공간을 하나 꾹 눌러주세요</p>
 </div>`;

if (b3dContent.includes(targetHeader)) {
  b3dContent = b3dContent.replace(targetHeader, newHeader);
  console.log('Replaced header.');
} else {
  console.log('Header target not found.');
}

const targetGridEnd = ` </button>
 ))}
 </div>
 </motion.div>`;

const newGridEnd = ` </button>
 ))}
 </div>
 </div>
 </motion.div>`;

if (b3dContent.includes(targetGridEnd)) {
  b3dContent = b3dContent.replace(targetGridEnd, newGridEnd);
  console.log('Replaced grid end.');
} else {
  console.log('Grid end target not found.');
}


// 2. Update scroll animation
const oldEffect = `  useEffect(() => {
    const timer = setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({
          top: window.innerHeight * 0.35,
          behavior: 'smooth'
        });
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);`;

const newEffect = `  useEffect(() => {
    const timer = setTimeout(() => {
      if (mainScrollRef.current) {
        const el = document.getElementById('vote-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          mainScrollRef.current.scrollTo({
            top: window.innerHeight * 0.5,
            behavior: 'smooth'
          });
        }
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);`;

if (b3dContent.includes(oldEffect)) {
  b3dContent = b3dContent.replace(oldEffect, newEffect);
  console.log('Replaced useEffect.');
} else {
  console.log('useEffect target not found.');
}

fs.writeFileSync('src/components/Building3D.tsx', b3dContent);
console.log('Done Building3D.tsx updates.');
