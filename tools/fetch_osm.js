/* 从 OpenStreetMap (Overpass API) 拉取一个街区的数据，预处理成游戏用的本地米坐标 JSON
 * 用法: node tools/fetch_osm.js boxhill
 * 数据来源 © OpenStreetMap contributors, ODbL */
const fs = require('fs');
const path = require('path');

const AREAS = {
  boxhill: {
    name: 'Box Hill', city: '墨尔本', center: { lat: -37.8190, lon: 145.1212 },
    bbox: { s: -37.8225, w: 145.1165, n: -37.8158, e: 145.1265 },
  },
};
const key = process.argv[2] || 'boxhill';
const area = AREAS[key];
if (!area) { console.error('unknown area'); process.exit(1); }
const { s, w, n, e } = area.bbox;
const bb = `${s},${w},${n},${e}`;
const query = `[out:json][timeout:90];
(
  way["building"](${bb});
  relation["building"](${bb});
  way["highway"](${bb});
  way["railway"~"^(rail|platform)$"](${bb});
  way["leisure"~"^(park|garden|pitch|playground)$"](${bb});
  way["landuse"~"^(grass|recreation_ground|cemetery)$"](${bb});
  way["amenity"="parking"](${bb});
  way["natural"="water"](${bb});
  node["shop"]["name"](${bb});
  node["amenity"~"^(restaurant|cafe|fast_food|bank|pharmacy|library|bar|pub|dentist|clinic|bubble_tea)$"]["name"](${bb});
  node["railway"="station"](${bb});
  node["public_transport"="station"](${bb});
);
out body; >; out skel qt;`;

const lat0 = area.center.lat, lon0 = area.center.lon;
const mPerLat = 110574, mPerLon = 111320 * Math.cos(lat0 * Math.PI / 180);
const toXY = (lon, lat) => [ +(((lon - lon0) * mPerLon).toFixed(1)), +((-(lat - lat0) * mPerLat).toFixed(1)) ]; // y 向南为正

async function main() {
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  let osm = null, lastErr = null;
  for (const url of endpoints) {
    try {
      console.log('querying', url);
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'User-Agent': 'aoworld-prototype/0.1 (+https://github.com/xuanli007007-star)' } });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120).replace(/\s+/g, ' '));
      osm = await res.json(); break;
    } catch (e) { lastErr = e; console.log('  failed:', e.message); }
  }
  if (!osm) throw lastErr;
  const nodes = new Map(), ways = new Map(), rels = [];
  for (const el of osm.elements) {
    if (el.type === 'node') nodes.set(el.id, el);
    else if (el.type === 'way') ways.set(el.id, el);
    else if (el.type === 'relation') rels.push(el);
  }
  const coords = (way) => way.nodes.map(id => nodes.get(id)).filter(Boolean).map(nd => toXY(nd.lon, nd.lat));
  const out = { area: { key, name: area.name, city: area.city, center: area.center, bbox: area.bbox,
      attribution: '© OpenStreetMap contributors' },
    buildings: [], roads: [], rails: [], areas: [], pois: [] };

  const buildingHeight = (t) => {
    if (t.height) { const h = parseFloat(t.height); if (h) return Math.min(h, 60); }
    if (t['building:levels']) { const l = parseFloat(t['building:levels']); if (l) return Math.min(l * 3.3, 60); }
    const b = t.building;
    if (/apartments|residential|hotel|office|commercial/.test(b || '')) return b === 'apartments' ? 12 : 6;
    if (/retail|shop/.test(b || '')) return 4.5;
    if (/house|detached|semidetached|terrace|bungalow/.test(b || '')) return 4;
    if (/roof|carport|shed|garage/.test(b || '')) return 2.5;
    return 5;
  };
  const kindOf = (t) => t.shop ? 'shop:' + t.shop : t.amenity ? 'amenity:' + t.amenity : t.railway === 'station' || t.public_transport === 'station' ? 'station' : t.building ? 'building:' + t.building : 'other';

  const addBuilding = (poly, t, id) => {
    if (poly.length < 4) return;
    out.buildings.push({ id, p: poly, h: +buildingHeight(t).toFixed(1), name: t.name || t['name:zh'] || null, zh: t['name:zh'] || null, kind: kindOf(t), b: t.building || 'yes' });
  };
  const relBuildingWays = new Set();
  for (const r of rels) {
    if (!r.tags || !r.tags.building) continue;
    for (const m of r.members) if (m.type === 'way' && m.role !== 'inner') {
      const wy = ways.get(m.ref); if (!wy) continue; relBuildingWays.add(m.ref);
      const c = coords(wy); if (c.length > 2 && (c[0][0] !== c[c.length - 1][0] || c[0][1] !== c[c.length - 1][1])) c.push(c[0]);
      addBuilding(c, { ...r.tags, ...(wy.tags || {}) }, r.id);
    }
  }
  const roadWidth = (hw) => ({ motorway: 16, trunk: 16, primary: 14, secondary: 11, tertiary: 9, residential: 7, unclassified: 7, living_street: 6, service: 4.5, pedestrian: 7, footway: 2.2, path: 2, cycleway: 2.2, steps: 2 })[hw] || 5;
  const roadClass = (hw) => /motorway|trunk|primary/.test(hw) ? 'major' : /secondary|tertiary/.test(hw) ? 'mid' : /residential|unclassified|living/.test(hw) ? 'minor' : hw === 'service' ? 'service' : hw === 'pedestrian' ? 'ped' : 'path';
  for (const wy of ways.values()) {
    const t = wy.tags || {}; const c = coords(wy); if (c.length < 2) continue;
    if (t.building && !relBuildingWays.has(wy.id)) { addBuilding(c, t, wy.id); continue; }
    if (t.highway) { if (/proposed|construction|corridor/.test(t.highway)) continue;
      out.roads.push({ p: c, cls: roadClass(t.highway), hw: t.highway, w: roadWidth(t.highway), name: t.name || null, tunnel: !!t.tunnel, bridge: !!t.bridge }); continue; }
    if (t.railway === 'rail') { out.rails.push({ p: c, tunnel: !!t.tunnel }); continue; }
    if (t.railway === 'platform') { out.areas.push({ p: c, kind: 'platform' }); continue; }
    if (t.leisure || t.landuse) { out.areas.push({ p: c, kind: t.leisure === 'pitch' ? 'pitch' : 'green', name: t.name || null }); continue; }
    if (t.amenity === 'parking') { out.areas.push({ p: c, kind: 'parking' }); continue; }
    if (t.natural === 'water') { out.areas.push({ p: c, kind: 'water' }); continue; }
  }
  for (const nd of nodes.values()) {
    const t = nd.tags; if (!t || !t.name) continue;
    if (!(t.shop || t.amenity || t.railway === 'station' || t.public_transport === 'station')) continue;
    const [x, y] = toXY(nd.lon, nd.lat);
    out.pois.push({ x, y, name: t.name, zh: t['name:zh'] || null, kind: kindOf(t), cuisine: t.cuisine || null });
  }
  // 地图范围（米）
  const all = [...out.buildings.flatMap(b => b.p), ...out.roads.flatMap(r => r.p)];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  out.area.extent = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  const file = path.join(__dirname, '..', 'data', key + '.json');
  fs.writeFileSync(file, JSON.stringify(out));
  const kinds = {}; out.pois.forEach(p => { kinds[p.kind] = (kinds[p.kind] || 0) + 1; });
  console.log(`buildings ${out.buildings.length}, roads ${out.roads.length}, rails ${out.rails.length}, areas ${out.areas.length}, pois ${out.pois.length}`);
  console.log('named buildings:', out.buildings.filter(b => b.name).map(b => b.name).slice(0, 25).join(' | '));
  console.log('poi kinds:', Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + ' ' + v).join(', '));
  console.log('extent', out.area.extent, 'size', (fs.statSync(file).size / 1024).toFixed(0) + 'KB');
}
main().catch(e => { console.error(e); process.exit(1); });
