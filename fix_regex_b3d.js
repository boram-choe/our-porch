const fs = require('fs');
let content = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

const regex1 = /\{\/\* 질문 헤더 수정 \*\/\}\s*<div className=\"text-center my-2\">\s*<h4 className=\"text-base font-black text-amber-400 tracking-tight leading-none mb-1\">\s*직접 상상해볼까요\?\s*<\/h4>\s*<p className=\"text-\[10px\] font-bold text-slate-400\">동네에 필요한 공간을 하나 꾹 눌러주세요<\/p>\s*<\/div>/g;

const replace1 = `{/* 질문 헤더 수정 */}
 <div id="vote-section" className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.25)] relative overflow-hidden mb-2 mt-6">
    <div className="absolute inset-0 border-[3px] border-amber-400 rounded-[2.5rem] animate-pulse pointer-events-none opacity-80" />
 <div className="text-center mb-6 relative z-10">
 <h4 className="text-xl font-black text-amber-400 tracking-tight leading-none mb-2 drop-shadow-md">
 직접 상상해볼까요?
 </h4>
 <p className="text-xs font-bold text-slate-300">동네에 필요한 공간을 하나 꾹 눌러주세요</p>
 </div>`;

const regex2 = /<\/button>\s*\}\)\}\s*<\/div>\s*<\/motion\.div>\s*\)\s*:\s*votingStep === "detail" \? \(/g;

const replace2 = `</button>
 ))}
 </div>
 </div>
 </motion.div>
 ) : votingStep === "detail" ? (`;

if (regex1.test(content) || regex2.test(content)) {
  content = content.replace(regex1, replace1);
  content = content.replace(regex2, replace2);
  fs.writeFileSync('src/components/Building3D.tsx', content);
  console.log('Regex replacements succeeded.');
} else {
  console.log('Regex match failed.');
}
