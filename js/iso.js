/* 等距投影与几何工具 */
window.AO = window.AO || {};
AO.ISO = (function () {
  const S = 4;            // 每米像素
  const HZ = 0.7;         // 高度缩放（屏幕像素 = 米 * S * HZ）
  function toScreen(x, y) { return { sx: (x - y) * S, sy: (x + y) * S * 0.5 }; }
  function toWorld(sx, sy) { return { x: (sx / S + 2 * sy / S) / 2, y: (2 * sy / S - sx / S) / 2 }; }
  function heightPx(h) { return h * S * HZ; }

  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function bounds(poly) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of poly) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    return { minX, minY, maxX, maxY };
  }
  // Liang–Barsky：把折线裁到矩形内，返回多段
  function clipSeg(p0, p1, r) {
    let t0 = 0, t1 = 1; const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const checks = [[-dx, p0[0] - r.minX], [dx, r.maxX - p0[0]], [-dy, p0[1] - r.minY], [dy, r.maxY - p0[1]]];
    for (const [p, q] of checks) {
      if (p === 0) { if (q < 0) return null; continue; }
      const t = q / p;
      if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
    }
    return [[p0[0] + t0 * dx, p0[1] + t0 * dy], [p0[0] + t1 * dx, p0[1] + t1 * dy]];
  }
  function clipPolyline(pts, r) {
    const out = []; let cur = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = clipSeg(pts[i], pts[i + 1], r);
      if (!seg) { if (cur.length > 1) out.push(cur); cur = []; continue; }
      if (!cur.length) cur.push(seg[0]);
      else { const last = cur[cur.length - 1]; if (Math.abs(last[0] - seg[0][0]) > 0.01 || Math.abs(last[1] - seg[0][1]) > 0.01) { if (cur.length > 1) out.push(cur); cur = [seg[0]]; } }
      cur.push(seg[1]);
    }
    if (cur.length > 1) out.push(cur);
    return out;
  }
  function polyLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // 调色板
  const PALETTE = {
    ground: 0xe9e2d0, green: 0xa9cf8f, pitch: 0x97c47f, parking: 0xd3cec4, platform: 0xbdb7ab, water: 0x8ec5e8,
    road: { major: 0xd8d2c4, mid: 0xdcd6c9, minor: 0xe1dbcf, service: 0xe5e0d5, ped: 0xe7d8bd, path: 0xece6da },
    roadEdge: 0xc9c2b2, rail: 0x5e5a55, railLight: 0x8c877f,
    shopColors: [0xf0c9a3, 0xe8a98b, 0xf4dfb2, 0xd9c7a0, 0xe6b8b0, 0xcfd6b0],
    house: 0xf3e6cf, houseRoof: 0xb9775a, tall: 0xbcc7d3, tallRoof: 0xd9dfe5, landmark: 0xcfc3d9, landmarkRoof: 0xe4ddd2,
    station: 0x7d8792, stationRoof: 0x5f6973, civic: 0xd7c6a8, civicRoof: 0xb49a6c, outline: 0x6b5a4a,
  };
  function buildingColors(b) {
    const kind = b.kind || '', name = (b.name || '').toLowerCase();
    if (/box hill central|sky one|whitehorse towers|east central|panorama/.test(name)) return { wall: PALETTE.landmark, roof: PALETTE.landmarkRoof };
    if (/town hall|library|centrelink|taxation|church|school|salvation|goverment|government/.test(name) || /civic|public|church|school/.test(kind)) return { wall: PALETTE.civic, roof: PALETTE.civicRoof };
    if (kind === 'station' || /train_station|station/.test(kind)) return { wall: PALETTE.station, roof: PALETTE.stationRoof };
    if (b.h >= 10) return { wall: PALETTE.tall, roof: PALETTE.tallRoof };
    if (/shop|retail|commercial|amenity/.test(kind) || b.b === 'retail' || b.b === 'commercial') {
      const c = PALETTE.shopColors[hashStr(String(b.id)) % PALETTE.shopColors.length];
      return { wall: c, roof: shade(c, 0.82) };
    }
    return { wall: PALETTE.house, roof: PALETTE.houseRoof };
  }
  function shade(color, f) {
    const r = Math.min(255, ((color >> 16) & 255) * f), g = Math.min(255, ((color >> 8) & 255) * f), b = Math.min(255, (color & 255) * f);
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }
  const KIND_ZH = {
    'amenity:restaurant': '餐厅', 'amenity:fast_food': '快餐', 'amenity:cafe': '咖啡', 'amenity:bank': '银行', 'amenity:pharmacy': '药房',
    'amenity:library': '图书馆', 'amenity:bar': '酒吧', 'amenity:pub': '酒馆', 'amenity:dentist': '牙医', 'amenity:clinic': '诊所', 'amenity:bubble_tea': '奶茶',
    'shop:supermarket': '超市', 'shop:hairdresser': '理发', 'shop:bakery': '面包店', 'shop:mobile_phone': '手机店', 'shop:gift': '礼品', 'shop:tobacco': '烟草',
    'shop:houseware': '家居', 'shop:clothes': '服装', 'shop:convenience': '便利店', 'shop:jewelry': '珠宝', 'shop:optician': '眼镜', 'shop:beauty': '美容',
    'shop:massage': '按摩', 'shop:travel_agency': '旅行社', 'shop:butcher': '肉店', 'shop:greengrocer': '果蔬', 'shop:alcohol': '酒水', 'shop:books': '书店',
    'shop:department_store': '百货', 'shop:mall': '商场', 'shop:electronics': '电器', 'shop:chemist': '药妆', 'shop:variety_store': '杂货', 'station': '火车站',
  };
  function kindZh(kind) { if (KIND_ZH[kind]) return KIND_ZH[kind]; const t = (kind || '').split(':')[1] || kind; return t ? t.replace(/_/g, ' ') : '地点'; }
  const CUISINE_ZH = { chinese: '中餐', sichuan: '川菜', cantonese: '粤菜', hotpot: '火锅', japanese: '日料', korean: '韩餐', vietnamese: '越南菜', thai: '泰餐', malaysian: '马来菜',
    dumpling: '饺子', noodle: '面馆', bubble_tea: '奶茶', pizza: '披萨', burger: '汉堡', coffee_shop: '咖啡', sushi: '寿司', ramen: '拉面', dessert: '甜品', taiwanese: '台菜', indian: '印度菜', asian: '亚洲菜', bakery: '烘焙' };
  function cuisineZh(c) { if (!c) return ''; return c.split(';').map(x => CUISINE_ZH[x.trim()] || x.trim().replace(/_/g, ' ')).join(' · '); }

  return { S, toScreen, toWorld, heightPx, pointInPoly, bounds, clipPolyline, polyLength, hashStr, PALETTE, buildingColors, shade, kindZh, cuisineZh };
})();
