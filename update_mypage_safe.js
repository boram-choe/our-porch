const fs = require('fs');
let content = fs.readFileSync('src/components/MyPage.tsx', 'utf8');

// 1. Add dbReports state
content = content.replace(
  'const [dbComments, setDbComments] = useState<any[]>([]);',
  'const [dbComments, setDbComments] = useState<any[]>([]);\n  const [dbReports, setDbReports] = useState<DbReport[]>([]);'
);

// 2. Fetch reports
content = content.replace(
  'const [votesRes, commentsRes] = await Promise.all([',
  'const [votesRes, commentsRes, reportsRes] = await Promise.all(['
);
content = content.replace(
  'supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false })',
  'supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),\n            supabase.from("reports").select("*").eq("user_id", userId).order("created_at", { ascending: false })'
);
content = content.replace(
  'if (commentsRes.data) setDbComments(commentsRes.data);',
  'if (commentsRes.data) setDbComments(commentsRes.data);\n          if (reportsRes.data) setDbReports(reportsRes.data as DbReport[]);'
);

// 3. Points logic
content = content.replace(
  'const totalEarnedPoints = (dbVotes.length * 50) + (dbComments.length * 50) + (approvedReports.length * 500);',
  'const approvedReportsCount = dbReports.filter(r => r.status === "resolved").length;\n  const totalEarnedPoints = (dbVotes.length * 50) + (dbComments.length * 50) + (approvedReports.length * 500) + (approvedReportsCount * 500);'
);

// 4. Update activityTimeline definition
const oldTimeline = `const activityTimeline = [
    ...dbVotes.map(v => {
      const matched = vacancies.find(vac => vac.id === v.vacancy_id);
      return {
        id: v.id,
        type: "vote" as const,
        title: v.comment || v.category,
        location: matched ? (matched.landmark || matched.address) : "우리동네 공간",
        timestamp: v.created_at,
        points: 50,
        vacancyId: v.vacancy_id
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
        vacancyId: c.vacancy_id
      };
    })
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());`;

const newTimeline = `const activityTimeline = [
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

content = content.replace(oldTimeline, newTimeline);

// 5. Update activityFilter hook
content = content.replace(
  'const [activityFilter, setActivityFilter] = useState<"all" | "vote" | "comment">("all");',
  'const [activityFilter, setActivityFilter] = useState<"all" | "vote" | "comment" | "report" | "vacancy">("all");'
);

// 6. Update filter buttons array
content = content.replace(
  '(["all", "vote", "comment"] as const).map((filter)',
  '(["all", "vote", "comment", "vacancy", "report"] as const).map((filter)'
);

// 7. Update button label
content = content.replace(
  '{filter === "all" ? "전체" : filter === "vote" ? "투표" : "의견"}',
  '{filter === "all" ? "전체" : filter === "vote" ? "투표" : filter === "comment" ? "의견" : filter === "vacancy" ? "공실등록" : "입점/정보제보"}'
);

// 8. Update UI rendering - icon
content = content.replace(
  '{item.type === "vote" ? (\\n',
  '{item.type === "vacancy" ? (\\n                          <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">\\n                            <Sparkles size={24} />\\n                          </div>\\n                        ) : item.type === "report" ? (\\n                          <div className="w-16 h-16 bg-purple-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">\\n                            <MessageSquare size={24} />\\n                          </div>\\n                        ) : item.type === "vote" ? (\\n'
);

// This regex replace is safer for adding the icons since the indentation might differ
const iconStr = `                      {item.type === "vote" ? (
                        <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Vote size={24} />
                        </div>
                      ) : item.type === "comment" ? (
                        <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <MessageSquare size={24} />
                        </div>
                      ) : null}`;

const newIconStr = `                      {item.type === "vacancy" ? (
                        <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles size={24} />
                        </div>
                      ) : item.type === "report" ? (
                        <div className="w-16 h-16 bg-purple-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <MessageSquare size={24} />
                        </div>
                      ) : item.type === "vote" ? (
                        <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Vote size={24} />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <MessageSquare size={24} />
                        </div>
                      )}`;
content = content.replace(iconStr, newIconStr);

// 9. Update pill label type
content = content.replace(
  'className={`text-[10px] font-black ${item.type === "comment" ? "text-blue-600 bg-blue-50" : "text-amber-600 bg-amber-50"} px-2 py-0.5 rounded-full border ${item.type === "comment" ? "border-blue-100" : "border-amber-100"} uppercase tracking-widest`}',
  'className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${item.type === "vacancy" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : item.type === "report" ? "text-purple-600 bg-purple-50 border-purple-100" : item.type === "comment" ? "text-blue-600 bg-blue-50 border-blue-100" : "text-amber-600 bg-amber-50 border-amber-100"}`}'
);

// 10. Update badge text
content = content.replace(
  '{item.type === "comment" ? "상상의견" : "상상투표"}',
  '{item.type === "comment" ? "상상의견" : item.type === "vote" ? "상상투표" : item.type === "vacancy" ? "공실등록" : "입점/정정제보"}'
);

// 11. Update Points text with status checking
content = content.replace(
  '<span className="text-amber-500 font-black text-sm bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">+{item.points}P</span>',
  `<span className={\`font-black text-sm px-3 py-1.5 rounded-xl border \${
                              (item as any).status === 'pending' || (item as any).status === 'available' || (item as any).status === 'completed' || (item as any).status === 'resolved' ? (
                                item.type === 'vacancy' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                item.type === 'report' ? 'bg-purple-50 text-purple-500 border-purple-100' :
                                'bg-amber-50 text-amber-500 border-amber-100'
                              ) : 'bg-slate-50 text-slate-400 border-slate-100'
                            }\`}>
                              +{item.points}P
                            </span>
                            {((item as any).status === 'pending') && <span className="text-[10px] text-slate-400 mt-1 block text-right">승인대기</span>}`
);


fs.writeFileSync('src/components/MyPage.tsx', content);
console.log('Successfully replaced all tokens safely.');
