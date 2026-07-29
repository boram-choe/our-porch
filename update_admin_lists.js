const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const pendingStart = content.indexOf('{/* Pending Vacancies Section */}');
const overviewCardsStart = content.indexOf('{/* Overview Cards */}');

if (pendingStart > -1 && overviewCardsStart > -1) {
  const newSection = `        {/* Vacancy Lists by Status */}
        <div className="space-y-6">
          {[
            { id: 'pending', title: '확인필요공실', color: 'amber' },
            { id: 'available', title: '확인완료공실', color: 'blue' },
            { id: 'completed', title: '입점완료공실', color: 'emerald' },
            { id: 'merged', title: '통합된공실', color: 'purple' },
            { id: 'rejected', title: '비공개공실', color: 'slate' }
          ].map(statusGroup => {
            const groupVacancies = vacancies.filter(v => v.status === statusGroup.id);
            if (groupVacancies.length === 0) return null;
            
            const colorClasses = {
              amber: 'bg-amber-50 border-amber-200 text-amber-900 text-amber-500',
              blue: 'bg-blue-50 border-blue-200 text-blue-900 text-blue-500',
              emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900 text-emerald-500',
              purple: 'bg-purple-50 border-purple-200 text-purple-900 text-purple-500',
              slate: 'bg-slate-50 border-slate-200 text-slate-900 text-slate-500'
            }[statusGroup.color];
            
            const bgClass = colorClasses.split(' ')[0];
            const borderClass = colorClasses.split(' ')[1];
            const textClass = colorClasses.split(' ')[2];
            const iconClass = colorClasses.split(' ')[3];
            
            return (
              <div key={statusGroup.id} className={\`\${bgClass} p-8 rounded-[3rem] shadow-sm border \${borderClass}\`}>
                <div className="flex items-center justify-between mb-6">
                   <h3 className={\`font-black \${textClass} flex items-center gap-2\`}>
                      <Sparkles size={18} className={iconClass} />
                      {statusGroup.title} ({groupVacancies.length}건)
                   </h3>
                </div>
                <div className="space-y-4">
                  {groupVacancies.map(v => (
                    <div key={v.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div>
                        <h4 className="font-black text-slate-900">{v.landmark} <span className="text-xs text-slate-400">({v.floor})</span></h4>
                        <p className="text-xs font-bold text-slate-500">{v.address}</p>
                        <p className="text-[10px] text-slate-400 mt-1">제보자 ID: {v.registered_by?.substring(0, 8)}...</p>
                      </div>
                      {statusGroup.id === 'pending' && (
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
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        `;

  const before = content.substring(0, pendingStart);
  const after = content.substring(overviewCardsStart);
  fs.writeFileSync('src/components/AdminDashboard.tsx', before + newSection + after);
  console.log('AdminDashboard updated successfully with all vacancy lists.');
} else {
  console.log('Could not find markers', pendingStart, overviewCardsStart);
}
