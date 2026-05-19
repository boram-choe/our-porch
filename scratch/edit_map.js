const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/MapInterface.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const targetLine = '                            <div className="bg-slate-950 p-4 rounded-2xl shadow-inner mt-3"><div className="flex items-center justify-between"><span className="text-xs font-black text-white">✨ {(v.currentVotes || []).sort((a,b)=>b.count-a.count)[0]?.brand || "상상 중"}</span><span className="text-xs font-bold text-amber-500">{(v.currentVotes || []).reduce((a,b)=>a+b.count,0)}표</span></div></div>';

const replacement = `                            <div className="bg-slate-950 p-4 rounded-2xl shadow-inner mt-3">
                              {(() => {
                                const myVotedBrand = typeof window !== "undefined" ? localStorage.getItem(\`gongsil_voted_vacancy_\${v.id}\`) : null;
                                const totalVotes = (v.currentVotes || []).reduce((a,b)=>a+b.count,0);
                                const myVoteItem = (v.currentVotes || []).find(item => item.brand === myVotedBrand);
                                const myVoteCount = myVoteItem ? myVoteItem.count : 1;
                                const brandLabel = myVotedBrand || ((v.currentVotes || []).sort((a,b)=>b.count-a.count)[0]?.brand) || "상상 중";
                                return (
                                  <div className="flex flex-col gap-1 text-left">
                                    <span className="text-xs font-black text-white">✨ 나의 상상: {brandLabel}</span>
                                    <span className="text-[10px] font-bold text-amber-500">({totalVotes}명 중 {myVoteCount}표 받았어요)</span>
                                  </div>
                                );
                              })()}
                            </div>`;

if (content.includes(targetLine)) {
  content = content.replace(targetLine, replacement);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log("Successfully replaced the label on MapInterface.tsx!");
} else {
  console.log("Target line not found! Maybe it already changed or has CRLF differences.");
  // Try CRLF replacement
  const targetCRLF = targetLine.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, replacement);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log("Successfully replaced (with CRLF) on MapInterface.tsx!");
  } else {
    // String search by clean content
    const cleanTarget = targetLine.replace(/\s+/g, ' ');
    console.log("Searching with flexible whitespaces...");
    // Let's do a substring replace
    let index = content.indexOf('✨ {(v.currentVotes || []).sort((a,b)=>b.count-a.count)[0]?.brand');
    if (index !== -1) {
      console.log("Found substring! Performing partial replacements...");
      // Let's replace the whole parent tag
      const startTag = '<div className="bg-slate-950 p-4 rounded-2xl shadow-inner mt-3">';
      const endTag = '</div></div>';
      let startIdx = content.lastIndexOf(startTag, index);
      let endIdx = content.indexOf(endTag, index) + endTag.length;
      if (startIdx !== -1 && endIdx !== -1) {
        const originalBlock = content.substring(startIdx, endIdx);
        content = content.replace(originalBlock, replacement);
        fs.writeFileSync(targetPath, content, 'utf8');
        console.log("Successfully replaced via block match!");
      }
    }
  }
}
