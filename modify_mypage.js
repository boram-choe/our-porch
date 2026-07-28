const fs = require('fs');
let content = fs.readFileSync('src/components/MyPage.tsx', 'utf8');

// 1. Imports
content = content.replace(
  'import { fetchUserReports, DbReport } from "@/lib/db";',
  'import { fetchUserReports, DbReport } from "@/lib/db";\nimport { fetchGifticonRequests, purchaseGifticon, STORE_ITEMS, GifticonRequest } from "@/lib/gifticon";'
);

// 2. States
content = content.replace(
  'const [isLoadingActivity, setIsLoadingActivity] = useState(true);',
  'const [isLoadingActivity, setIsLoadingActivity] = useState(true);\n  const [gifticonRequests, setGifticonRequests] = useState<GifticonRequest[]>([]);\n  const [reportedVacancies, setReportedVacancies] = useState<any[]>([]);\n  const [isPurchasing, setIsPurchasing] = useState(false);'
);

// 3. activeTab typing
content = content.replace(
  'const [activeTab, setActiveTab] = useState<"profile" | "activity" | "reports" | "settings">',
  'const [activeTab, setActiveTab] = useState<"profile" | "activity" | "reports" | "store" | "settings">'
);

// 4. loadSupabaseActivity
content = content.replace(
  'const [votesRes, commentsRes] = await Promise.all([\n          supabase.from("votes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),\n          supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false })\n        ]);\n        if (votesRes.data) setDbVotes(votesRes.data);\n        if (commentsRes.data) setDbComments(commentsRes.data);',
  'const [votesRes, commentsRes, gifticonsRes, reportedRes] = await Promise.all([\n          supabase.from("votes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),\n          supabase.from("comments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),\n          fetchGifticonRequests(userId),\n          supabase.from("vacancies").select("*").eq("registered_by", userId)\n        ]);\n        if (votesRes.data) setDbVotes(votesRes.data);\n        if (commentsRes.data) setDbComments(commentsRes.data);\n        if (gifticonsRes) setGifticonRequests(gifticonsRes);\n        if (reportedRes.data) setReportedVacancies(reportedRes.data);'
);

// 5. totalPoints calc
content = content.replace(
  'const totalPoints = (dbVotes.length * 50) + (dbComments.length * 50);',
  'const approvedReports = reportedVacancies.filter(v => v.status === "available" || v.status === "completed");\n  const totalEarnedPoints = (dbVotes.length * 50) + (dbComments.length * 50) + (approvedReports.length * 500);\n  const totalSpentPoints = gifticonRequests.reduce((sum, req) => sum + req.price, 0);\n  const totalPoints = totalEarnedPoints - totalSpentPoints;'
);

// 6. Tabs Array
content = content.replace(
  '{(!isEntrepreneurMode ? ["profile", "activity", "reports", "settings"] : ["activity", "reports", "settings"]).map((tab) => (',
  '{(!isEntrepreneurMode ? ["profile", "activity", "reports", "store", "settings"] : ["activity", "reports", "store", "settings"]).map((tab) => ('
);

// 7. Tab Label
content = content.replace(
  '{tab === "profile" ? "내 정보" : tab === "activity" ? (isEntrepreneurMode ? "관심공간" : "활동 내역") : tab === "reports" ? "제보 & 알림" : "설정"}',
  '{tab === "profile" ? "내 정보" : tab === "activity" ? (isEntrepreneurMode ? "관심공간" : "활동 내역") : tab === "reports" ? "제보 & 알림" : tab === "store" ? "상상 스토어" : "설정"}'
);

// 8. Add Store Section right before settings tab logic
const storeSection = `
        {activeTab === "store" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <div className="flex items-center justify-between px-1">
               <h3 className="text-lg font-black text-slate-900">상상 스토어 🎁</h3>
               <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                 잔여 {totalPoints.toLocaleString()} P
               </span>
             </div>
             
             {/* 상점 아이템 */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {STORE_ITEMS.map((item) => (
                 <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="text-3xl">{item.image}</div>
                     <div>
                       <p className="text-sm font-black text-slate-900">{item.name}</p>
                       <p className="text-xs font-bold text-amber-500">{item.price.toLocaleString()} P</p>
                     </div>
                   </div>
                   <button 
                     onClick={async () => {
                       if (totalPoints < item.price) {
                         alert("포인트가 부족합니다!");
                         return;
                       }
                       if (confirm(\`'\${item.name}' 상품을 교환하시겠습니까?\\n차감 포인트: \${item.price}P\`)) {
                         setIsPurchasing(true);
                         const userId = localStorage.getItem("gongsil_user_id");
                         if (!userId) {
                           setIsPurchasing(false);
                           return;
                         }
                         const res = await purchaseGifticon(userId, item.id, item.name, item.price);
                         alert(res.message);
                         if (res.success) {
                           const newReqs = await fetchGifticonRequests(userId);
                           setGifticonRequests(newReqs);
                         }
                         setIsPurchasing(false);
                       }
                     }}
                     disabled={isPurchasing || totalPoints < item.price}
                     className="px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-95"
                   >
                     교환
                   </button>
                 </div>
               ))}
             </div>

             {/* 교환 내역 */}
             {gifticonRequests.length > 0 && (
               <div className="mt-8">
                 <h4 className="text-sm font-black text-slate-900 mb-4 px-1">기프티콘 교환 내역</h4>
                 <div className="space-y-3">
                   {gifticonRequests.map(req => (
                     <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                       <div>
                         <p className="text-xs font-black text-slate-900">{req.item_name}</p>
                         <p className="text-[10px] font-bold text-slate-400">{new Date(req.created_at).toLocaleString()}</p>
                       </div>
                       <div className="text-right">
                         <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">발송 완료</span>
                         <p className="text-[10px] font-bold text-slate-400 mt-1">-\${req.price.toLocaleString()} P</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </motion.div>
        )}

        {activeTab === "settings" && (
`;
content = content.replace('{activeTab === "settings" && (', storeSection);

fs.writeFileSync('src/components/MyPage.tsx', content);
console.log('MyPage.tsx updated successfully.');
