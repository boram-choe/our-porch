const fs = require('fs');

// 1. Update db.ts
let dbContent = fs.readFileSync('src/lib/db.ts', 'utf8');

dbContent = dbContent.replace(
  `export async function submitDisputeReport(report: {
  vacancyId: string;
  userId: string;
  reportType: 'dispute' | 'movein';
  content: string;
}): Promise<{ id: string | null; error: string | null }> {
  const payload = {`,
  `export async function submitDisputeReport(report: {
  vacancyId: string;
  userId: string;
  reportType: 'dispute' | 'movein';
  content: string;
}): Promise<{ id: string | null; error: string | null }> {
  // Check for duplicate pending report
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('vacancy_id', report.vacancyId)
    .eq('status', 'pending')
    .limit(1);
    
  if (existing && existing.length > 0) {
    return { id: null, error: 'ALREADY_PENDING' };
  }

  const payload = {`
);
fs.writeFileSync('src/lib/db.ts', dbContent);
console.log('db.ts updated');


// 2. Update MapInterface.tsx
let mapContent = fs.readFileSync('src/components/MapInterface.tsx', 'utf8');

mapContent = mapContent.replace(
  `let isPotentialDuplicate = false;

  if (duplicate) {
    const msg = \`해당 건물 \${newSpaceFloor}층은 이미 공실 등록되어 투표 중 입니다.\\n혹시 추가하시려는 곳이 다른 호실인가요?\\n\\n[확인]을 누르시면 계속 추가하며, [취소]를 누르면 기존 투표 화면으로 이동합니다.\`;
    if (confirm(msg)) {
      isPotentialDuplicate = true;
    } else {
      setSelectedVacancy(duplicate);
      setIsPinpointing(false);
      setShowAddModal(false);
      return;
    }
  }`,
  `let isPotentialDuplicate = false;

  if (duplicate) {
    alert("해당 공간(건물/층)은 이미 누군가가 공실로 제보하여 툇마루단이 확인 중이거나 등록된 공간입니다.\\n\\n기존 공간 화면으로 이동합니다.");
    setSelectedVacancy(duplicate);
    setIsPinpointing(false);
    setShowAddModal(false);
    return;
  }`
);

// We should also remove surveyRemarks: isPotentialDuplicate from saveVacancy call.
mapContent = mapContent.replace(
  `surveyRemarks: isPotentialDuplicate ? "[신규 중복 확인 필요: 층이름만 같은지 점검]" : undefined`,
  `surveyRemarks: undefined`
);

fs.writeFileSync('src/components/MapInterface.tsx', mapContent);
console.log('MapInterface.tsx updated');

// 3. Update Building3D.tsx
let b3dContent = fs.readFileSync('src/components/Building3D.tsx', 'utf8');

b3dContent = b3dContent.replace(
  `const submitReport = async (type: string, content?: string) => {
    const reportTextRaw = content || (type === 'dispute' ? '다른 업종 입점' : '');`,
  `const submitReport = async (type: string, content?: string) => {
    const reportTextRaw = content || (type === 'dispute' ? '다른 업종 입점' : '');

    try {
      const userId = (typeof window !== "undefined" ? localStorage.getItem("gongsil_user_id") : null) || "anonymous_user";
      const result = await submitDisputeReport({
        vacancyId: vacancy.id,
        userId: userId,
        reportType: type as 'dispute' | 'movein',
        content: reportTextRaw
      });
      if (result.error === 'ALREADY_PENDING') {
        alert("해당 공간은 이미 누군가가 제보하여 툇마루단이 확인 중입니다.");
        return;
      }
    } catch (e) {
      console.warn("DB 에러:", e);
    }
`
);

b3dContent = b3dContent.replace(
  `    // 2. 관리자용 데이터베이스(reports)에 넘길 페이로드 추가
    const userId = (typeof window !== "undefined" ? localStorage.getItem("gongsil_user_id") : null) || "anonymous_user";
    await submitDisputeReport({
      vacancyId: vacancy.id,
      userId: userId,
      reportType: type as 'dispute' | 'movein',
      content: reportTextRaw
    });`,
  `    // (submitDisputeReport는 위에서 먼저 처리함)`
);
fs.writeFileSync('src/components/Building3D.tsx', b3dContent);
console.log('Building3D.tsx updated');
