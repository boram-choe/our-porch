const fs = require('fs');

// 1. Update AdminDashboard.tsx
let adminContent = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

if (!adminContent.includes('const [pendingReports, setPendingReports] = useState<any[]>([]);')) {
  adminContent = adminContent.replace(
    'const [loading, setLoading] = useState(true);',
    'const [loading, setLoading] = useState(true);\n  const [pendingReports, setPendingReports] = useState<any[]>([]);\n  const [moveinInputs, setMoveinInputs] = useState<Record<string, string>>({});'
  );

  if (!adminContent.includes('import { supabase } from "@/lib/supabase";')) {
    adminContent = adminContent.replace(
      'import { saveVacancy } from "@/lib/db";',
      'import { saveVacancy } from "@/lib/db";\nimport { supabase } from "@/lib/supabase";'
    );
  }

  adminContent = adminContent.replace(
    'getNeighborhoodReport(dong)',
    `supabase.from('reports').select('*').eq('status', 'pending').eq('report_type', 'movein')
        .then(({ data }) => setPendingReports(data || []));

      getNeighborhoodReport(dong)`
  );

  const pendingReportsUI = `
        {/* Pending Move-in Reports Section */}
        {pendingReports.length > 0 && (
          <div className="bg-purple-50 p-8 rounded-[3rem] shadow-sm border border-purple-200 mb-8">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-slate-900 flex items-center gap-2">
                 <Sparkles size={18} className="text-purple-500" />
                 입점 제보 확인 대기 ({pendingReports.length}건)
               </h3>
            </div>
            <div className="space-y-4">
              {pendingReports.map(report => {
                const matchedVacancy = vacancies.find(v => v.id === report.vacancy_id);
                return (
                  <div key={report.id} className="bg-white p-5 rounded-3xl border border-purple-100 flex flex-col gap-3 shadow-sm">
                    <div>
                      <p className="font-black text-slate-900">{matchedVacancy?.landmark || '알 수 없는 공간'} 입점 제보</p>
                      <p className="text-xs text-slate-500 mt-1">제보내용: {report.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="입점 확정할 매장명/업종 입력" 
                        className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
                        value={moveinInputs[report.id] || ''}
                        onChange={(e) => setMoveinInputs({...moveinInputs, [report.id]: e.target.value})}
                      />
                      <button
                        onClick={async () => {
                          if (!moveinInputs[report.id]) {
                            alert("입점 매장명/업종을 입력해주세요.");
                            return;
                          }
                          // 1. Update report status
                          await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
                          // 2. Update vacancy status to completed and append move-in info
                          if (matchedVacancy && onUpdateVacancy) {
                            onUpdateVacancy(matchedVacancy.id, { 
                              status: 'completed', 
                              surveyRemarks: \`[입점 확정] \${moveinInputs[report.id]}\` 
                            });
                          }
                          setPendingReports(prev => prev.filter(r => r.id !== report.id));
                        }}
                        className="px-4 py-2 bg-purple-600 text-white font-black text-[10px] rounded-xl hover:bg-purple-700 transition-colors"
                      >
                        입점 확정
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
`;

  adminContent = adminContent.replace(
    '{/* Pending Vacancies Section */}',
    pendingReportsUI + '\n        {/* Pending Vacancies Section */}'
  );

  fs.writeFileSync('src/components/AdminDashboard.tsx', adminContent);
  console.log('AdminDashboard.tsx updated');
}


// 2. Update Building3D.tsx
let b3dContent = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

// Disable voting if completed
b3dContent = b3dContent.replace(
  `const [votingStep, setVotingStep] = useState<"category" | "detail" | "results">(
    (hasVoted || userProfile?.isGuest) ? "results" : "category"
  );`,
  `const [votingStep, setVotingStep] = useState<"category" | "detail" | "results">(
    (hasVoted || userProfile?.isGuest || vacancy.status === 'completed') ? "results" : "category"
  );`
);

// Show Confirmed banner instead of Pending banner if completed
const newBannerHTML = `
      {hasPendingMovein && vacancy.status !== 'completed' && (
        <div className="bg-amber-100 text-amber-800 p-3 rounded-2xl mb-4 font-bold text-xs flex items-center justify-center gap-2 border border-amber-200 shadow-sm">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          해당 공간은 입점 제보를 받아 툇마루단이 확인 중입니다.
        </div>
      )}
      {vacancy.status === 'completed' && (
        <div className="bg-emerald-500 text-white p-4 rounded-2xl mb-4 font-black text-sm flex flex-col items-center justify-center gap-1 shadow-lg border border-emerald-400">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-100" />
            <span>이 공간은 새로운 이웃이 찾아왔어요! 🎉</span>
          </div>
          <span className="text-emerald-100 text-xs font-bold mt-1 text-center bg-emerald-600/50 px-3 py-1.5 rounded-xl border border-emerald-400/50">
            {vacancy.surveyRemarks || "입점 확정"}
          </span>
        </div>
      )}
`;

b3dContent = b3dContent.replace(
  `{hasPendingMovein && (
        <div className="bg-amber-100 text-amber-800 p-3 rounded-2xl mb-4 font-bold text-xs flex items-center justify-center gap-2 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600" />
          해당 공간은 입점 제보를 받아 툇마루단이 확인 중입니다.
        </div>
      )}`,
  newBannerHTML
);

// If completed, maybe hide the report buttons entirely? (or at least move-in report)
b3dContent = b3dContent.replace(
  `{/* 오류 정정 및 정보 제보 버튼군 */}`,
  `{/* 오류 정정 및 정보 제보 버튼군 */}
        {vacancy.status !== 'completed' && (`
);
b3dContent = b3dContent.replace(
  `   <p className="text-[10px] text-slate-400 mt-2 font-bold max-w-[200px]">
        제보된 정보는 툇마루단의 팩트체크 후 반영되며 500P가 지급됩니다.
      </p>
    </div>`,
  `   <p className="text-[10px] text-slate-400 mt-2 font-bold max-w-[200px]">
        제보된 정보는 툇마루단의 팩트체크 후 반영되며 500P가 지급됩니다.
      </p>
    </div>
    )}`
);

fs.writeFileSync('src/components/Building3D.tsx', b3dContent);
console.log('Building3D.tsx updated');


// 3. Update MapInterface.tsx (Ticker color for 2 weeks)
// Wait, currently we do: rep.status === 'completed' ? "bg-emerald-500 ..."
// We can check if it's within 14 days!
let mapContent = fs.readFileSync('src/components/MapInterface.tsx', 'utf8');

if (!mapContent.includes('const isRecentlyCompleted = rep.status === \'completed\' &&')) {
  mapContent = mapContent.replace(
    `const multiFloor = group.length > 1;
              const isHighlightedFs = highlightFengShuiId && group.some(v => v.id === highlightFengShuiId);
              return (`,
    `const multiFloor = group.length > 1;
              const isHighlightedFs = highlightFengShuiId && group.some(v => v.id === highlightFengShuiId);
              const isRecentlyCompleted = rep.status === 'completed' && rep.updated_at && (new Date().getTime() - new Date(rep.updated_at).getTime() < 14 * 24 * 60 * 60 * 1000);
              return (`
  );

  mapContent = mapContent.replace(
    `rep.status === 'completed' ? "bg-emerald-500 text-white border-white scale-105" :`,
    `rep.status === 'completed' ? (isRecentlyCompleted ? "bg-emerald-500 text-white border-white scale-110 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse" : "bg-slate-700 text-slate-300 border-slate-600") :`
  );

  mapContent = mapContent.replace(
    `rep.status === 'completed' ? <Sparkles size={24} /> :`,
    `rep.status === 'completed' ? <Check size={24} /> :` // Use check or sparkles
  );
  
  fs.writeFileSync('src/components/MapInterface.tsx', mapContent);
  console.log('MapInterface.tsx updated');
}
