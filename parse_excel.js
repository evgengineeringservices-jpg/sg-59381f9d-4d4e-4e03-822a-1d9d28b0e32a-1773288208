const XLSX = require('xlsx');
const workbook = XLSX.readFile('Estimate_Format.xlsx');
const data = XLSX.utils.sheet_to_json(workbook.Sheets['800(1) Clearing & Grab'], {header: 1});
console.log(JSON.stringify(data.slice(30, 60), null, 2));
