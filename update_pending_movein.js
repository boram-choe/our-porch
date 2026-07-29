const fs = require('fs');

let content = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

// 1. Add hasPendingMovein state and useEffect to check Supabase
content = content.replace(
  `const [showPointsToast, setShowPointsToast] = useState(false);`,
  `const [showPointsToast, setShowPointsToast] = useState(false);
  const [hasPendingMovein, setHasPendingMovein] = useState(false);

  useEffect(() => {
    async function checkPendingMovein() {
      const { data } = await supabase
        .from('reports')
        .select('id')
        .eq('vacancy_id', vacancy.id)
        .eq('report_type', 'movein')
        .eq('status', 'pending')
        .limit(1);
      
      if (data && data.length > 0) {
        setHasPendingMovein(true);
        setVotingStep("results");
      }
    }
    checkPendingMovein();
  }, [vacancy.id]);`
);

// We need to make sure supabase is imported in Building3D.tsx.
// Let's check if it is imported, and if not, inject it.
if (!content.includes(`import { supabase } from "@/lib/supabase";`)) {
  content = content.replace(
    `import { saveVote, saveVacancy, submitDisputeReport } from "@/lib/db";`,
    `import { saveVote, saveVacancy, submitDisputeReport } from "@/lib/db";
import { supabase } from "@/lib/supabase";`
  );
}

// 2. Change the previous alert message in submitReport
content = content.replace(
  `alert("해당 공간은 이미 누군가가 제보하여 툇마루단이 확인 중입니다.");`,
  `alert("해당 공간은 입점 제보를 받아 툇마루단이 확인 중입니다.");`
);

// 3. Show the banner if hasPendingMovein is true
// We can insert this right after `<div className="w-full max-w-[400px] mx-auto text-center mt-10">`
const bannerHTML = `
      {hasPendingMovein && (
        <div className="bg-amber-100 text-amber-800 p-3 rounded-2xl mb-4 font-bold text-xs flex items-center justify-center gap-2 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600" />
          해당 공간은 입점 제보를 받아 툇마루단이 확인 중입니다.
        </div>
      )}
`;

content = content.replace(
  `{/* 현재 상상 투표/코멘트 렌더 (하단 스크롤 공간 확보 위해 padding-bottom pb-36) */}`,
  `{/* 현재 상상 투표/코멘트 렌더 (하단 스크롤 공간 확보 위해 padding-bottom pb-36) */}
   <div className="w-full px-4 relative z-20 flex-shrink-0 flex flex-col justify-start -mb-2">
      ${bannerHTML}
   </div>`
);

fs.writeFileSync('src/components/Building3D.tsx', content);
console.log("Updated Building3D.tsx");
