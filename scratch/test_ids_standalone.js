
const fs = require('fs');
const path = require('path');
const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'regions.json'), 'utf8'));

function generateSpaceId(city, gu, dong, serial) {
  const cityEntry = Object.entries(regions).find(([_, data]) => 
    data.name.includes(city) || city.includes(data.name)
  );
  const c = cityEntry ? cityEntry[0] : "99";

  let g = "99";
  let d = "99";

  if (cityEntry) {
    const guEntry = Object.entries(cityEntry[1].gus).find(([_, data]) => 
      data.name.includes(gu) || gu.includes(data.name)
    );
    if (guEntry) {
      g = guEntry[0];
      const dongEntry = Object.entries(guEntry[1].dongs).find(([_, name]) => 
        name.includes(dong) || dong.includes(name)
      );
      if (dongEntry) {
        d = dongEntry[0];
      }
    }
  }

  const s = String(serial).padStart(4, '0');
  return `${c}${g}${d}${s}`;
}

console.log('--- Space ID Generation Test ---');
console.log('Seoul, Seodaemun-gu, Chunghyeon-dong:', generateSpaceId("서울", "서대문구", "충현동", 1));
console.log('Busan, Haeundae-gu, U-dong:', generateSpaceId("부산", "해운대구", "우동", 5));
console.log('Unknown Region:', generateSpaceId("판타지", "마을", "신비동", 1));
