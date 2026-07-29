const fs = require('fs');

// 1. Update Building3D.tsx
let b3dContent = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

// Remove TOP 3 Section
const top3Start = `{/* 현재 이웃들의 상상 TOP 3 (투표된 항목) */}`;
const top3End = `{/* 추가 메모 */}`;

const startIndex = b3dContent.indexOf(top3Start);
const endIndex = b3dContent.indexOf(top3End);

if (startIndex !== -1 && endIndex !== -1) {
  b3dContent = b3dContent.substring(0, startIndex) + b3dContent.substring(endIndex);
}

// Add shiny border to 직접 상상해볼까요 and grid
b3dContent = b3dContent.replace(
  `{/* 직접 상상해볼까요? */}`,
  `<div className="bg-slate-900/40 p-5 rounded-[2.5rem] border border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] relative overflow-hidden mb-6">
    <div className="absolute inset-0 border-[3px] border-amber-400 rounded-[2.5rem] animate-pulse pointer-events-none opacity-60" />
    {/* 직접 상상해볼까요? */}`
);

b3dContent = b3dContent.replace(
  `{/* 3x3 Grid 끝 */}
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (`,
  `{/* 3x3 Grid 끝 */}
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (`
); // just checking format

b3dContent = b3dContent.replace(
  `              </button>
              ))}
            </div>
          </motion.div>
        ) : votingStep === "detail" ? (`,
  `              </button>
              ))}
            </div>
          </div>
          </motion.div>
        ) : votingStep === "detail" ? (`
);

fs.writeFileSync('src/components/Building3D.tsx', b3dContent);
console.log('Building3D.tsx updated');

// 2. Update SpaceCurator.tsx
let scContent = fs.readFileSync('src/components/SpaceCurator.tsx', 'utf8');

// Add state for store name
if (!scContent.includes('const [moveinStoreName, setMoveinStoreName] = useState("");')) {
  scContent = scContent.replace(
    'const [isSubmitting, setIsSubmitting] = useState(false);',
    'const [isSubmitting, setIsSubmitting] = useState(false);\n  const [moveinStoreName, setMoveinStoreName] = useState("");'
  );
}

// Add input field in "입점 완료" case
scContent = scContent.replace(
  `{selectedStatus === "completed" && (
            <div className="mt-8 bg-emerald-50 border border-emerald-100 p-5 rounded-[1.5rem] flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <Sparkles size={20} fill="currentColor" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 mb-1 text-sm">임대차계약이 완료된 공간입니다.</h4>
                <p className="text-xs text-emerald-700/80 font-bold leading-relaxed">
                  저장 시 사용자에게 '어떤 공간이 입점될 예정입니다. 많이 기대해주세요' 메시지가 표시됩니다.
                </p>
              </div>
            </div>
          )}`,
  `{selectedStatus === "completed" && (
            <div className="mt-8 bg-emerald-50 border border-emerald-100 p-5 rounded-[1.5rem] flex items-start gap-4 flex-col sm:flex-row">
              <div className="flex gap-4 items-start w-full">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <Sparkles size={20} fill="currentColor" />
                </div>
                <div className="flex-1 w-full">
                  <h4 className="font-bold text-emerald-900 mb-1 text-sm">임대차계약이 완료된 공간입니다.</h4>
                  <p className="text-xs text-emerald-700/80 font-bold leading-relaxed mb-3">
                    사용자에게 노출될 입점 매장명 또는 업종을 아래에 입력해주세요.
                  </p>
                  <input
                    type="text"
                    placeholder="예: 스타벅스 남가좌점"
                    value={moveinStoreName}
                    onChange={(e) => setMoveinStoreName(e.target.value)}
                    className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-900 placeholder-emerald-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all"
                  />
                </div>
              </div>
            </div>
          )}`
);

// Append moveinStoreName to surveyRemarks if status is completed
scContent = scContent.replace(
  `const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const res = await saveVacancy({
        ...vacancy,
        userId: vacancy.registered_by,
        status: selectedStatus,
        surveyRemarks: localRemarks
      });`,
  `const handleSave = async () => {
    if (selectedStatus === "completed" && !moveinStoreName.trim()) {
      alert("입점될 매장명이나 업종을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      let finalRemarks = localRemarks;
      if (selectedStatus === "completed") {
        finalRemarks = \`[입점 확정] \${moveinStoreName.trim()}\`;
      }
      const res = await saveVacancy({
        ...vacancy,
        userId: vacancy.registered_by,
        status: selectedStatus,
        surveyRemarks: finalRemarks
      });`
);

fs.writeFileSync('src/components/SpaceCurator.tsx', scContent);
console.log('SpaceCurator.tsx updated');
