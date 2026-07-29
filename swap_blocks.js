const fs = require('fs');

const content = fs.readFileSync('src/components/Building3D.tsx', 'utf8');
const lines = content.split('\n');

const b1Start = lines.findIndex(l => l.includes('{/* 서울시 상권 분석 추천 배너 추가 */}'));
let b1End = -1;
for (let i = b1Start; i < lines.length; i++) {
  if (lines[i].includes('{/* 질문 헤더 수정 */}')) {
    // End of block 1 is right before this empty line
    b1End = i - 2; 
    break;
  }
}

const b2Start = lines.findIndex(l => l.includes('{/* 질문 헤더 수정 */}'));
let b2End = -1;
for (let i = b2Start; i < lines.length; i++) {
  if (lines[i].includes('</motion.div>')) {
    // End of block 2 is the line before </motion.div> which is the closing </div>
    b2End = i - 1;
    break;
  }
}

if (b1Start > -1 && b1End > -1 && b2Start > -1 && b2End > -1) {
  const block1 = lines.slice(b1Start, b1End + 1).join('\n');
  const block2 = lines.slice(b2Start, b2End + 1).join('\n');
  
  // Create a new array
  const before = lines.slice(0, b1Start);
  const after = lines.slice(b2End + 1);
  
  const newLines = [...before, block2, '', block1, ...after];
  
  fs.writeFileSync('src/components/Building3D.tsx', newLines.join('\n'));
  console.log('Swapped successfully.');
} else {
  console.log('Could not find boundaries.', b1Start, b1End, b2Start, b2End);
}
