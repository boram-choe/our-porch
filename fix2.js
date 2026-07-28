const fs = require('fs');
let content = fs.readFileSync('src/components/MyPage.tsx', 'utf8');

const targetLines = [
'                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">',
'                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-amber-500/10">',
'                        <Star size={20} className="text-amber-600" />',
'                      </div>',
'                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">상상 포인트</p>',
'                      <div className="flex flex-col items-start gap-1">',
'                        <p className="text-xl font-black text-slate-900">{totalPoints} P</p>',
'                        <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">5,000P부터 사용 가능</span>',
'                      </div>',
'                    </div>'
];

const replacement = `<button 
                      onClick={() => setActiveTab("store")}
                      className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-left hover:border-amber-300 hover:scale-[1.02] active:scale-95 transition-all w-full cursor-pointer flex flex-col items-start group"
                    >
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-amber-500/10 group-hover:bg-amber-200 transition-all">
                        <Star size={20} className="text-amber-600" />
                      </div>
                      <div className="flex items-center justify-between w-full mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">상상 포인트</p>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <p className="text-xl font-black text-slate-900">{totalPoints} P</p>
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md group-hover:bg-amber-100 transition-all">5,000P부터 사용 가능</span>
                      </div>
                    </button>`;

let lines = content.split('\n');
let startIndex = -1;
for (let i = 0; i < lines.length - targetLines.length; i++) {
  let match = true;
  for (let j = 0; j < targetLines.length; j++) {
    if (lines[i+j].trim() !== targetLines[j].trim()) {
      match = false;
      break;
    }
  }
  if (match) {
    startIndex = i;
    break;
  }
}

if (startIndex !== -1) {
  lines.splice(startIndex, targetLines.length, replacement);
  fs.writeFileSync('src/components/MyPage.tsx', lines.join('\n'));
  console.log('Replaced successfully');
} else {
  console.log('Target not found');
}
