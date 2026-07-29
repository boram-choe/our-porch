const fs = require('fs');
const lines = fs.readFileSync('src/components/Building3D.tsx', 'utf8').split('\n');
const startIdx = lines.findIndex(l => l.includes('votingStep === "category" ? ('));
if (startIdx > -1) {
  for(let i = startIdx + 70; i < startIdx + 110; i++) {
    console.log(i + 1 + ': ' + lines[i]);
  }
}
