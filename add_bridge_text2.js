const fs = require('fs');

const content = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

const regex = /\{\/\* 서울시 상권 분석 추천 배너 추가 \*\/\}/g;

const replaceStr = `<div className="flex flex-col items-center justify-center my-6 relative w-full">
    <div className="absolute top-1/2 left-0 w-[15%] md:w-[25%] h-px bg-gradient-to-r from-transparent to-blue-500/20" />
    <div className="absolute top-1/2 right-0 w-[15%] md:w-[25%] h-px bg-gradient-to-l from-transparent to-blue-500/20" />
    <p className="text-[12px] md:text-sm font-bold text-slate-400 leading-relaxed text-center relative z-10 px-4">
      지금 딱 떠오르는 아이디어가 없다면?<br/>
      <span className="text-blue-400 font-black">서울시 상권분석 데이터가 추천하는 공간</span>은 어떠세요?
    </p>
 </div>

 {/* 서울시 상권 분석 추천 배너 추가 */}`;

if (regex.test(content)) {
  fs.writeFileSync('src/components/Building3D.tsx', content.replace(regex, replaceStr));
  console.log('Bridge text added successfully.');
} else {
  console.log('Target string not found.');
}
