
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const provinceCodes = {
  "서울특별시": "11",
  "부산광역시": "26",
  "대구광역시": "27",
  "인천광역시": "28",
  "광주광역시": "29",
  "대전광역시": "30",
  "울산광역시": "31",
  "세종특별자치시": "36",
  "경기도": "41",
  "강원특별자치도": "42",
  "강원도": "42", // 호환성
  "충청북도": "43",
  "충청남도": "44",
  "전북특별자치도": "45",
  "전라북도": "45", // 호환성
  "전라남도": "46",
  "경상북도": "47",
  "경상남도": "48",
  "제주특별자치도": "50"
};

const filePath = path.join(__dirname, '..', '전국_행정동_목록_2024.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const regions = {};

data.forEach(row => {
  const city = row['시도'];
  const gu = row['시군구'];
  const dong = row['행정동'];

  if (!city || !gu || !dong) return;

  const cityCode = provinceCodes[city] || "99"; // Fallback if missing
  
  if (!regions[cityCode]) {
    regions[cityCode] = {
      name: city,
      gus: {}
    };
  }

  // Find or create Gu code
  let guCode = Object.keys(regions[cityCode].gus).find(code => regions[cityCode].gus[code].name === gu);
  if (!guCode) {
    const nextGuNum = Object.keys(regions[cityCode].gus).length + 1;
    guCode = String(nextGuNum).padStart(2, '0');
    regions[cityCode].gus[guCode] = {
      name: gu,
      dongs: {}
    };
  }

  // Find or create Dong code
  let dongCode = Object.keys(regions[cityCode].gus[guCode].dongs).find(code => regions[cityCode].gus[guCode].dongs[code] === dong);
  if (!dongCode) {
    const nextDongNum = Object.keys(regions[cityCode].gus[guCode].dongs).length + 1;
    dongCode = String(nextDongNum).padStart(2, '0');
    regions[cityCode].gus[guCode].dongs[dongCode] = dong;
  }
});

const outputPath = path.join(__dirname, '..', 'public', 'data', 'regions.json');
fs.writeFileSync(outputPath, JSON.stringify(regions, null, 2));

console.log('Successfully generated public/data/regions.json');
console.log(`Total cities: ${Object.keys(regions).length}`);
