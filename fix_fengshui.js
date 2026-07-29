const fs = require('fs');
let content = fs.readFileSync('src/components/FengShuiTarot.tsx', 'utf8');

// Fix handlePickCard
content = content.replace(
  /const targetScenario = scenariosPool\.find\(s => s\.id === selectedScenarioId\);\s*const matchedTheme = targetScenario \? targetScenario\.fortuneType : desiredFortune;/,
  `// 선택한 카드의 기운(테마)을 기반으로 분석
      const matchedTheme = cardThemes[cardIdx];`
);

// Fix step 2 rendering
content = content.replace(
  /const matchedTheme = tarotMode === "neighborhood"[\s\S]*?\? \(scenariosPool\.find\(s => s\.id === selectedScenarioId\)\?\.fortuneType \|\| desiredFortune\)[\s\S]*?: cardThemes\[idx\];/,
  `const matchedTheme = cardThemes[idx];`
);

fs.writeFileSync('src/components/FengShuiTarot.tsx', content);
console.log('Fixed FengShuiTarot.tsx');
