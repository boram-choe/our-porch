const fs = require('fs'); const lines = fs.readFileSync('src/components/MyPage.tsx', 'utf8').split('\n'); lines.forEach((line, i) => { if(line.includes('상상 포인트')) console.log(${i-5} to :\n); });
