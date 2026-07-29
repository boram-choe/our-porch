const fs = require('fs');
let content = fs.readFileSync('src/components/MyPage.tsx', 'utf8');

// 1. Add dbReports state
content = content.replace(
  'const [dbComments, setDbComments] = useState<any[]>([]);',
  `const [dbComments, setDbComments] = useState<any[]>([]);
  const [dbReports, setDbReports] = useState<DbReport[]>([]);`
);

// 2. Add fetch for dbReports in loadSupabaseActivity
content = content.replace(
  'const [votesRes, commentsRes] = await Promise.all([',
  `const [votesRes, commentsRes, reportsRes] = await Promise.all([`
);
content = content.replace(
  'supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false })',
  `supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
            supabase.from("reports").select("*").eq("user_id", userId).order("created_at", { ascending: false })`
);
content = content.replace(
  'if (commentsRes.data) setDbComments(commentsRes.data);',
  `if (commentsRes.data) setDbComments(commentsRes.data);\n          if (reportsRes.data) setDbReports(reportsRes.data as DbReport[]);`
);

// 3. Update activityTimeline mapping
const timelineReplacement = `const activityTimeline = [
    ...dbVotes.map(v => {
      const matched = vacancies.find(vac => vac.id === v.vacancy_id);
      return {
        id: v.id,
        type: "vote" as const,
        title: v.comment || v.category,
        location: matched ? (matched.landmark || matched.address) : "우리동네 공간",
        timestamp: v.created_at,
        points: 50,
        vacancyId: v.vacancy_id,
        status: "resolved"
      };
    }),
    ...dbComments.map(c => {
      const matched = vacancies.find(vac => vac.id === c.vacancy_id);
      return {
        id: c.id,
        type: "comment" as const,
        title: c.content,
        location: matched ? (matched.landmark || matched.address) : "우리동네 공간",
        timestamp: c.created_at,
        points: 50,
        vacancyId: c.vacancy_id,
        status: "resolved"
      };
    }),
    ...reportedVacancies.map(v => {
      return {
        id: v.id,
        type: "vacancy" as const,
        title: "새로운 공실 제보",
        location: v.landmark || v.address || "우리동네 공간",
        timestamp: v.created_at,
        points: 500,
        vacancyId: v.id,
        status: v.status
      };
    }),
    ...dbReports.map(r => {
      const matched = vacancies.find(vac => vac.id === r.vacancy_id);
      return {
        id: r.id,
        type: "report" as const,
        title: r.report_type === 'movein' ? '입점정보 제보' : '정정 제보',
        location: matched ? (matched.landmark || matched.address) : "우리동네 공간",
        timestamp: r.created_at,
        points: 500,
        vacancyId: r.vacancy_id,
        status: r.status
      };
    })
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());`;

content = content.replace(
  /const activityTimeline = \[[\s\S]*?\]\.sort\(\(a, b\) => new Date\(b\.timestamp\)\.getTime\(\) - new Date\(a\.timestamp\)\.getTime\(\)\);/,
  timelineReplacement
);

// 4. Update points calculation
content = content.replace(
  'const totalEarnedPoints = (dbVotes.length * 50) + (dbComments.length * 50) + (approvedReports.length * 500);',
  `const approvedReportsCount = dbReports.filter(r => r.status === "resolved").length;
  const totalEarnedPoints = (dbVotes.length * 50) + (dbComments.length * 50) + (approvedReports.length * 500) + (approvedReportsCount * 500);`
);

// 5. Update activityFilter type and default
content = content.replace(
  'const [activityFilter, setActivityFilter] = useState<"all" | "vote" | "comment">("all");',
  `const [activityFilter, setActivityFilter] = useState<"all" | "vote" | "comment" | "report" | "vacancy">("all");`
);

// 6. Update filter buttons UI
content = content.replace(
  /\{\(\["all", "vote", "comment"\] as const\)\.map\(\(filter\) => \([\s\S]*?\}\)/,
  `{(["all", "vote", "comment", "vacancy", "report"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={\`px-4 py-2 rounded-lg text-xs font-black transition-all \${
                      activityFilter === filter
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }\`}
                  >
                    {filter === "all" ? "전체" : filter === "vote" ? "투표" : filter === "comment" ? "의견" : filter === "vacancy" ? "공실등록" : "정보제보"}
                  </button>
                ))}`
);

// 7. Update activity items rendering
const reportRender = `
                      {item.type === "vacancy" && (
                        <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles size={24} />
                        </div>
                      )}
                      {item.type === "report" && (
                        <div className="w-16 h-16 bg-purple-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <MessageSquare size={24} />
                        </div>
                      )}
`;
content = content.replace(
  /\{item\.type === "comment" && \([\s\S]*?<\/div>\n                      \)\}/,
  `{item.type === "comment" && (
                        <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <MessageSquare size={24} />
                        </div>
                      )}
${reportRender}`
);

content = content.replace(
  /\{item\.type === "comment" \? "상상의견" : "상상투표"\}/,
  `{item.type === "comment" ? "상상의견" : item.type === "vote" ? "상상투표" : item.type === "vacancy" ? "공실등록" : "입점/정정제보"}`
);

content = content.replace(
  /<span className="text-amber-500 font-black text-sm bg-amber-50 px-3 py-1\.5 rounded-xl border border-amber-100">\+{item\.points}P<\/span>/,
  `<span className={\`font-black text-sm px-3 py-1.5 rounded-xl border \${
    item.status === 'pending' || item.status === 'available' || item.status === 'completed' || item.status === 'resolved' ? (
      item.type === 'vacancy' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
      item.type === 'report' ? 'bg-purple-50 text-purple-500 border-purple-100' :
      'bg-amber-50 text-amber-500 border-amber-100'
    ) : 'bg-slate-50 text-slate-400 border-slate-100'
  }\`}>
    +{item.points}P
  </span>
  {(item.status === 'pending') && <span className="text-[10px] text-slate-400 mt-1 block text-right">승인대기</span>}`
);

content = content.replace(
  /className={`text-\[10px\] font-black (.*?)\`}/,
  `className={\`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest \${
    item.type === 'vacancy' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
    item.type === 'report' ? 'text-purple-600 bg-purple-50 border-purple-100' :
    item.type === 'comment' ? 'text-blue-600 bg-blue-50 border-blue-100' :
    'text-amber-600 bg-amber-50 border-amber-100'
  }\`}`
);


fs.writeFileSync('src/components/MyPage.tsx', content);
console.log('Successfully updated MyPage.tsx');
