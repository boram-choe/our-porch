const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Update props to include vacancies and onUpdateVacancy
content = content.replace(
  'export default function AdminDashboard({ onBack }: { onBack: () => void }) {',
  `import { saveVacancy } from "@/lib/db";\nexport default function AdminDashboard({ \n  onBack, \n  vacancies = [],\n  onUpdateVacancy \n}: { \n  onBack: () => void,\n  vacancies?: any[],\n  onUpdateVacancy?: (v: any) => void\n}) {`
);

// We need to add the pending vacancies UI at the top of the dashboard content
const pendingVacanciesUI = `
        {/* Pending Vacancies Section */}
        {vacancies.filter(v => v.status === 'pending').length > 0 && (
          <div className="bg-amber-50 p-8 rounded-[3rem] shadow-sm border border-amber-200">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-amber-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  제보된 공실 승인 대기 ({vacancies.filter(v => v.status === 'pending').length}건)
               </h3>
            </div>
            <div className="space-y-4">
              {vacancies.filter(v => v.status === 'pending').map(v => (
                <div key={v.id} className="bg-white p-5 rounded-3xl border border-amber-100 flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="font-black text-slate-900">{v.landmark} <span className="text-xs text-slate-400">({v.floor})</span></h4>
                    <p className="text-xs font-bold text-slate-500">{v.address}</p>
                    <p className="text-[10px] text-slate-400 mt-1">제보자 ID: {v.registered_by?.substring(0, 8)}...</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('이 공실을 정상 공실로 확정하시겠습니까?\\n확정 시 제보자에게 500P가 지급됩니다.')) {
                        const res = await saveVacancy({
                          ...v,
                          userId: v.registered_by,
                          status: 'available'
                        });
                        if (!res.error && onUpdateVacancy) {
                          onUpdateVacancy({ ...v, status: 'available' });
                          alert('정상 공실로 확정되었습니다. 제보자에게 500P가 지급됩니다.');
                        } else {
                          alert('확정 처리 중 오류가 발생했습니다: ' + res.error);
                        }
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap"
                  >
                    정상 공실 확정
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overview Cards */}`;

content = content.replace('{/* Overview Cards */}', pendingVacanciesUI);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
console.log('Modified AdminDashboard.tsx');
