const fs = require('fs');

let b3dContent = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

// 1. Remove "현재 이웃들의 상상 TOP 3"
// From: {/* 이웃들의 상상 TOP 3 (대분류 기준 집계) */}
// To: {/* 중개사 정보 */}

const top3Start = b3dContent.indexOf('{/* 이웃들의 상상 TOP 3 (대분류 기준 집계) */}');
const top3End = b3dContent.indexOf('{/* 중개사 정보 */}');

if (top3Start !== -1 && top3End !== -1) {
  b3dContent = b3dContent.substring(0, top3Start) + b3dContent.substring(top3End);
}

// 2. Wrap "직접 상상해볼까요?" in shiny border
// Let's replace the whole block from {/* 질문 헤더 수정 */} up to </motion.button>}
// Actually just replace the header and the grid wrapper.
b3dContent = b3dContent.replace(
  `{/* 질문 헤더 수정 */}
 <div className="text-center my-2">
 <h4 className="text-base font-black text-amber-400 tracking-tight leading-none mb-1">
 직접 상상해볼까요?
 </h4>
 <p className="text-[10px] font-bold text-slate-400">동네에 필요한 공간을 하나 꾹 눌러주세요</p>
 </div>`,
  `{/* 질문 헤더 수정 */}
 <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] relative overflow-hidden mb-2 mt-4">
    <div className="absolute inset-0 border-[3px] border-amber-400 rounded-[2.5rem] animate-pulse pointer-events-none opacity-80" />
 <div className="text-center mb-6 relative z-10">
 <h4 className="text-xl font-black text-amber-400 tracking-tight leading-none mb-2 drop-shadow-md">
 직접 상상해볼까요?
 </h4>
 <p className="text-xs font-bold text-slate-300">동네에 필요한 공간을 하나 꾹 눌러주세요</p>
 </div>`
);

b3dContent = b3dContent.replace(
  `{/* 3x3 Grid 끝 */}
 <div className="grid grid-cols-3 gap-3">
 {CATEGORIES.map((cat) => (`,
  `{/* 3x3 Grid 끝 */}
 <div className="grid grid-cols-3 gap-3 relative z-10">
 {CATEGORIES.map((cat) => (`
);

b3dContent = b3dContent.replace(
  ` </button>
 ))}
 </div>
 </motion.div>`,
  ` </button>
 ))}
 </div>
 </div>
 </motion.div>`
);

// 3. Add auto-scroll behavior
if (!b3dContent.includes('const mainScrollRef = useRef<HTMLDivElement>(null);')) {
  b3dContent = b3dContent.replace(
    `const [galleryIndex, setGalleryIndex] = useState(0);`,
    `const [galleryIndex, setGalleryIndex] = useState(0);\n  const mainScrollRef = useRef<HTMLDivElement>(null);
    
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({
          top: window.innerHeight * 0.35,
          behavior: 'smooth'
        });
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);`
  );

  b3dContent = b3dContent.replace(
    `<div className="relative w-full h-full overflow-y-auto no-scrollbar bg-slate-950 flex flex-col">`,
    `<div ref={mainScrollRef} className="relative w-full h-full overflow-y-auto no-scrollbar bg-slate-950 flex flex-col scroll-smooth">`
  );
}

fs.writeFileSync('src/components/Building3D.tsx', b3dContent);
console.log('Building3D.tsx updated successfully.');
