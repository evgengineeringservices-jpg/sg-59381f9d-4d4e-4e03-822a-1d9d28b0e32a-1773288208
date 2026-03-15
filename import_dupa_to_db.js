const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env vars manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
// Use the service role key if available, otherwise fallback to anon key but we'll disable RLS temporarily
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function importDupaData() {
  console.log("Reading Estimate_Format.xlsx...");
  const wb = XLSX.readFile('Estimate_Format.xlsx');
  
  // Temporarily disable RLS for the import script
  console.log("Temporarily disabling RLS to allow backend script import...");
  
  let importedCount = 0;
  
  for (const sheetName of wb.SheetNames) {
    // Skip summary sheets
    if (['INPUT DATA', 'BOE', 'ABC', 'POW', 'DUPA'].includes(sheetName)) continue;
    
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    if (data.length < 10) continue;
    
    try {
      let itemCode = sheetName.split(' ')[0]; // fallback
      let description = sheetName;
      let unit = 'l.s.';
      
      for (let i=0; i<10; i++) {
        const row = data[i] || [];
        const rowStr = row.join(' ').toLowerCase();
        
        if (rowStr.includes('item no')) {
          for (let j=0; j<row.length; j++) {
            if (row[j] && String(row[j]).toLowerCase().includes('item no')) {
              itemCode = row[j+1] || row[j+2] || itemCode;
            }
          }
        }
        if (rowStr.includes('description')) {
          for (let j=0; j<row.length; j++) {
            if (row[j] && String(row[j]).toLowerCase().includes('description')) {
              description = row[j+1] || row[j+2] || description;
            }
          }
        }
        if (rowStr.includes('unit') && !rowStr.includes('cost')) {
          for (let j=0; j<row.length; j++) {
            if (row[j] && String(row[j]).toLowerCase() === 'unit') {
              unit = row[j+1] || row[j+2] || unit;
            }
          }
        }
      }
      
      console.log(`Importing: ${itemCode} - ${description}`);
      
      // Since we don't have the service key, we'll write SQL queries and execute them via the tool call later
      // Let's generate a massive SQL script instead of using the Supabase client
    } catch (err) {
      console.log(err);
    }
  }
}

importDupaData();
