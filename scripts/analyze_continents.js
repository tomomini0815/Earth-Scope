import fs from 'fs';
const world = JSON.parse(fs.readFileSync('src/data/world.geo.json', 'utf-8'));

// 全国のcontinentを抽出
const continents = {};
['africa', 'asia', 'europe', 'northAmerica', 'oceania', 'southAmerica'].forEach(c => {
  const content = fs.readFileSync('src/data/countries/' + c + '.ts', 'utf-8');
  // id: "xxx", ... continent: "yyy"
  const regex = /id:\s*"([^"]+)"[\s\S]*?continent:\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    continents[m[1]] = m[2];
  }
});

console.log('Loaded countries:', Object.keys(continents).length);

const mismatches = [];

for (const f of world.features) {
  const mapId = String(f.id);
  const name = f.properties?.name;
  const dbCont = continents[mapId];

  // ポリゴンの地理的重心
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  polys.forEach((p, idx) => {
    let sLat = 0, sLon = 0, count = 0;
    function walk(c) {
      if (typeof c[0] === 'number') {
        sLon += c[0]; sLat += c[1]; count++;
      } else {
        for (const child of c) walk(child);
      }
    }
    walk(p);
    const cLat = sLat / count;
    const cLon = sLon / count;

    mismatches.push({
      mapId,
      name,
      part: idx,
      partsTotal: polys.length,
      dbCont,
      cLat: Number(cLat.toFixed(1)),
      cLon: Number(cLon.toFixed(1)),
    });
  });
}

// データベースに無いもの、または地理的地域と異なるものを抽出
fs.writeFileSync('scratch_analysis.json', JSON.stringify(mismatches, null, 2));
console.log('Saved scratch_analysis.json');
