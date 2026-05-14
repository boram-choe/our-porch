
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '전국_행정동_목록_2024.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('First row sample:', data[0]);
} else {
    console.log('No data found in the sheet.');
}
