const fs = require('fs');
let content = fs.readFileSync('src/components/SurveyInput.tsx', 'utf8');

const regex = /<div className=\"grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3\">\s*\{\[\s*\{ id: 'available', label: '.*?', icon: '.*?' \},\s*\{ id: 'completed', label: '.*?', icon: '.*?' \},\s*\{ id: 'merged', label: '.*?', icon: '.*?' \},\s*\{ id: 'rejected', label: '.*?', icon: '.*?' \}\s*\]\.map/g;

const newList = `<div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
              {[
                { id: 'pending', label: '확인필요공실', icon: '⏳' },
                { id: 'available', label: '확인완료공실', icon: '✅' },
                { id: 'completed', label: '입점완료공실', icon: '✨' },
                { id: 'merged', label: '통합된공실', icon: '🔗' },
                { id: 'rejected', label: '비공개공실', icon: '🔒' }
              ].map`;

if (regex.test(content)) {
  content = content.replace(regex, newList);
  fs.writeFileSync('src/components/SurveyInput.tsx', content);
  console.log('Replaced successfully via regex.');
} else {
  console.log('Regex match failed.');
}
