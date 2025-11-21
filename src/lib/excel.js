import ExcelJS from "exceljs";

export async function processExcel(arrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheet = workbook.worksheets[0];

  // Find header row
  let headerRowIndex = -1;
  sheet.eachRow((row, rowNum) => {
    if (row.getCell(1).value === "Flight No.") headerRowIndex = rowNum;
  });

  if (headerRowIndex === -1) throw new Error("Header row not found");

  const flightsMap = new Map();

  for (let i = headerRowIndex + 1; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const flight = row.getCell(1).value;
    const effFrom = excelToDate(row.getCell(2).value);
    const effTo = excelToDate(row.getCell(3).value);
    const freq = row.getCell(4).value;

    const departure = row.getCell(8).value; // IATA code
    const arriving = row.getCell(10).value;

    if (!flight || !effFrom || !effTo || !freq || !departure || !arriving) continue;

    for (let d = new Date(effFrom.getTime()); d <= effTo; d.setDate(d.getDate() + 1)) {
      const weekday = (d.getDay() + 6) % 7;

      if (weekday < freq.length && freq[weekday] !== "_") {
        const dateStr = formatDate(d);
        const key = `${departure}|${arriving}`;

        if (!flightsMap.has(key)) flightsMap.set(key, new Set());
        flightsMap.get(key).add(dateStr);
      }
    }
  }

  const flights = [];

  for (const [key, dateSet] of flightsMap.entries()) {
    const [departure, arriving] = key.split("|");
    const dates = Array.from(dateSet).sort();

    flights.push({ departure, arriving, dates });
  }

  return { flights };
}

function excelToDate(val) {
  if (!val) return null;

  if (val instanceof Date) return val;

  if (typeof val === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + val * 86400000);
  }

  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d) ? null : d;
  }

  return null;
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}
