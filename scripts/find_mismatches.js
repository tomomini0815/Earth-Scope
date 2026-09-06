import fs from 'fs';
const data = JSON.parse(fs.readFileSync('scratch_analysis.json', 'utf-8'));

// 1. France part 0 (French Guiana) -> lat 3.5, lon -53.4 (South America) while France is europe
// 2. Russia -> Siberia/Far East is in Asia
// 3. Turkey -> Anatolia is Asia
// 4. Egypt -> Sinai is Asia
// 5. Denmark / Greenland -> Greenland is North America
// 6. UK / Falkland -> Falkland is South America
// 7. USA -> Hawaii (Oceania / North America)
// 8. Spain -> Canary Islands (Africa) - if any
// 9. Portugal -> Azores / Madeira - if any

for (const item of data) {
  // 緯度経度から地理的大陸を判定
  const lat = item.cLat;
  const lon = item.cLon;
  let geoCont = 'unknown';
  if (lat >= -60 && lat <= 15 && lon >= -90 && lon <= -30) geoCont = 'south-america';
  else if (lat >= 5 && lat <= 85 && lon >= -180 && lon <= -40) geoCont = 'north-america';
  else if (lat >= 35 && lat <= 75 && lon >= -25 && lon <= 45) geoCont = 'europe';
  else if (lat >= -35 && lat <= 38 && lon >= -20 && lon <= 55) geoCont = 'africa';
  else if (lat >= -50 && lat <= 5 && lon >= 110 && lon <= 180) geoCont = 'oceania';
  else if (lat >= -10 && lat <= 80 && lon >= 45 && lon <= 180) geoCont = 'asia';

  if (item.dbCont && geoCont !== 'unknown' && item.dbCont !== geoCont) {
    console.log(`Mismatch: ${item.mapId} ${item.name} (part ${item.part}/${item.partsTotal}) dbCont=${item.dbCont} vs geoCont=${geoCont} at [${lat}, ${lon}]`);
  }
}
