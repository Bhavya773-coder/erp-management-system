import * as xlsx from 'xlsx';
import fs from 'fs';

try {
    const fileBuffer = fs.readFileSync('c:\\Users\\admin\\Downloads\\Arcadian_Works_ERP-main (1)\\Arcadian_Works_ERP-main\\server\\file-1777464757116-268709400.xlsx');
    const workbook = xlsx.read(fileBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
} catch (e) {
    console.error(e);
}
