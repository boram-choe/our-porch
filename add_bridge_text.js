const fs = require('fs');

const content = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

const targetStr = `</div>
 </div>

 {/* 서울시 상권 분석 추천 배너 추가 */}`;

const replaceStr = `</div>
 </div>

 <div className="text-center my-6 relative">
    <div className="absolute top-1/2 left-0 w-[15%] md:w-[25%] h-px bg-gradient-to-r from-transparent to-blue-500/20" />
    <div className="absolute top-1/2 right-0 w-[15%] md:w-[25%] h-px bg-gradient-to-l from-transparent to-blue-500/20" />
    <p className="text-[11px] md:text-xs font-bold text-slate-400 leading-relaxed relative z-10 px-4">
      지금 딱 떠오르는 아이디어가 없다면?<br/>
      <span className="text-blue-400 font-black">서울시 상권분석 데이터가 추천하는 공간</span>은 어떠세요?
    </p>
 </div>

 {/* 서울시 상권 분석 추천 배너 추가 */}`;

if (content.includes(targetStr)) {
  fs.writeFileSync('src/components/Building3D.tsx', content.replace(targetStr, replaceStr));
  console.log('Bridge text added successfully.');
} else {
  console.log('Target string not found.');
}
