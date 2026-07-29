const fs = require('fs');
let content = fs.readFileSync('src/components/SurveyInput.tsx', 'utf8');

const oldList = `            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {[
                { id: 'available', label: '공실 가능', icon: '✅' },
                { id: 'completed', label: '입점 완료', icon: '✨' },
                { id: 'merged', label: '통합 처리', icon: '🔗' },
                { id: 'rejected', label: '비공개/반려', icon: '🔒' }
              ].map`;

const newList = `            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
              {[
                { id: 'pending', label: '확인필요공실', icon: '⏳' },
                { id: 'available', label: '확인완료공실', icon: '✅' },
                { id: 'completed', label: '입점완료공실', icon: '✨' },
                { id: 'merged', label: '통합된공실', icon: '🔗' },
                { id: 'rejected', label: '비공개공실', icon: '🔒' }
              ].map`;

if (content.includes(oldList)) {
  content = content.replace(oldList, newList);
  fs.writeFileSync('src/components/SurveyInput.tsx', content);
  console.log('Replaced status list successfully.');
} else {
  console.log('Failed to find the old list exactly.');
}
