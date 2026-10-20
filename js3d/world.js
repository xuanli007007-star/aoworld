/* 把 OpenStreetMap 数据变成 1 米一格的方块世界（高度场），再合并成网格 */
import * as THREE from 'three';
import { T, SCALE, tileXY } from './atlas.js';

function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }
function rngOf(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const TOWER_RE = /sky one|panorama|east central|moores|avani|sky square|whitehorse towers/;
const CIVIC_RE = /town hall|library|centrelink|taxation|church|school|salvation|goverment|government|medical|surgery/;

function styleFor(b, cx, cz, area) {
  const r = rngOf(hash(Number(b.id) || 7));
  const name = (b.name || '').toLowerCase(), bt = b.b || 'yes', kind = b.kind || '';
  const core = Math.hypot(cx - 120, cz - 30) < 260;
  if (b.h >= 20 || TOWER_RE.test(name)) { const w = pick(r, [T.GLASS, T.GLASS, T.OFFICE]); return { f: 4, b0: T.SHOP, b1: w, rs: w, top: pick(r, [T.ROOF, T.GLASSROOF]), edge: w, roof: 'flat' }; }
  if (CIVIC_RE.test(name) || /civic|public|church|school|hospital/.test(bt)) { const w = pick(r, [T.SANDSTONE, T.BRICK, T.BRICK2]); return { f: 0, b0: w, b1: w, rs: w, top: T.METAL, edge: w, roof: 'flat' }; }
  if (/station|train/.test(kind + bt)) return { f: 0, b0: T.CONCRETE, b1: T.CONCRETE, rs: T.CONCRETE, top: T.METAL, edge: T.CONCRETE, roof: 'flat' };
  if (/garage|shed|roof|carport/.test(bt)) { const w = pick(r, [T.METAL, T.BOARD]); return { f: 0, b0: w, b1: w, rs: w, top: T.METAL, edge: T.METAL, roof: 'none' }; }
  if (bt === 'apartments' || b.h >= 10) { const w = pick(r, [T.APT, T.APT, T.OFFICE]); const g = pick(r, [T.CONCRETE, T.RENDER, T.SHOP]); return { f: 3, b0: g, b1: w, rs: T.CONCRETE, top: T.ROOF, edge: T.CONCRETE, roof: 'flat' }; }
  if (/retail|commercial|shop|supermarket|kiosk/.test(bt) || /shop|amenity/.test(kind) || (bt === 'yes' && core)) {
    const w = pick(r, area > 800 ? [T.APT, T.OFFICE, T.BRICK2] : [T.BRICK, T.BRICK2, T.RENDER, T.APT]); return { f: 4, b0: pick(r, [T.SHOP, T.SHOP2, T.AWNING]), b1: w, rs: w, top: T.ROOF, edge: w, roof: 'flat' };
  }
  if (area > 450) { const w = pick(r, [T.APT, T.OFFICE, T.BRICK2, T.BRICK]); return { f: 0, b0: w, b1: w, rs: w, top: pick(r, [T.ROOF, T.METAL]), edge: w, roof: 'flat' }; }
  const w = pick(r, [T.BOARD, T.BOARD, T.BRICK, T.RENDER, T.BRICK2]);
  const rf = pick(r, [T.TERRACOTTA, T.TERRACOTTA, T.METAL]);
  return { f: 0, b0: w, b1: w, rs: rf, top: rf, edge: rf, roof: 'hip', house: true };
}

export function buildWorld(D) {
  const c = D.area.center, bb = D.area.bbox;
  const mPerLat = 110574, mPerLon = 111320 * Math.cos(c.lat * Math.PI / 180);
  const minX = (bb.w - c.lon) * mPerLon, maxX = (bb.e - c.lon) * mPerLon, minZ = -(bb.n - c.lat) * mPerLat, maxZ = -(bb.s - c.lat) * mPerLat;
  const X0 = Math.floor(minX), Z0 = Math.floor(minZ), W = Math.ceil(maxX) - X0, L = Math.ceil(maxZ) - Z0, N = W * L;
  const G = new Uint8Array(N).fill(T.GRASS), H = new Uint8Array(N), WH = new Uint8Array(N), TT = new Uint8Array(N), BI = new Uint16Array(N), TREE = new Uint8Array(N);
  const inb = (ix, iz) => ix >= 0 && iz >= 0 && ix < W && iz < L;

  function fillPoly(poly, cb) {
    let zmin = Infinity, zmax = -Infinity; for (const p of poly) { if (p[1] < zmin) zmin = p[1]; if (p[1] > zmax) zmax = p[1]; }
    const iz0 = Math.max(0, Math.floor(zmin - Z0)), iz1 = Math.min(L - 1, Math.floor(zmax - Z0)); const xs = [];
    for (let iz = iz0; iz <= iz1; iz++) {
      const zc = Z0 + iz + 0.5; xs.length = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > zc) !== (zj > zc)) xs.push(xi + (zc - zi) * (xj - xi) / (zj - zi)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.max(0, Math.ceil(xs[k] - X0 - 0.5)), e = Math.min(W - 1, Math.floor(xs[k + 1] - X0 - 0.5)); for (let ix = a; ix <= e; ix++) cb(iz * W + ix); }
    }
  }
  function stamp(pts, r, cb, dash) {
    const r2 = r * r; let dist = 0;
    for (let s = 1; s < pts.length; s++) {
      const [x0, z0] = pts[s - 1], [x1, z1] = pts[s]; const len = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.ceil(len / 0.5));
      for (let k = 0; k <= n; k++) {
        const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n; const dd = dist + len * k / n;
        if (dash && Math.floor(dd / 3) % 2) continue;
        const ia = Math.floor(x - r - X0), ib = Math.floor(x + r - X0), ja = Math.floor(z - r - Z0), jb = Math.floor(z + r - Z0);
        for (let iz = ja; iz <= jb; iz++) for (let ix = ia; ix <= ib; ix++) { if (!inb(ix, iz)) continue; const dx = X0 + ix + 0.5 - x, dz = Z0 + iz + 0.5 - z; if (dx * dx + dz * dz <= r2) cb(iz * W + ix); }
      }
      dist += len;
    }
  }
  /* 地面 */
  const AREA = { green: T.PARK, pitch: T.PARK, parking: T.PARKING, platform: T.PLATFORM, water: T.WATER };
  for (const a of D.areas) if (AREA[a.kind] != null) fillPoly(a.p, i => { G[i] = AREA[a.kind]; });
  const roads = D.roads.filter(r => !r.tunnel);
  const street = r => r.cls === 'major' || r.cls === 'mid' || r.cls === 'minor';
  for (const r of roads) if (street(r)) stamp(r.p, r.w / 2 + 2.2, i => { if (G[i] !== T.ASPHALT && G[i] !== T.PAVING) G[i] = T.SIDEWALK; });
  for (const r of roads) if (r.cls === 'path') stamp(r.p, 1, i => { if (G[i] === T.GRASS || G[i] === T.PARK) G[i] = T.PATH; });
  for (const r of roads) if (r.cls === 'ped') stamp(r.p, r.w / 2, i => { G[i] = T.PAVING; });
  for (const r of roads) if (r.cls === 'service') stamp(r.p, r.w / 2, i => { if (G[i] !== T.PAVING) G[i] = T.ASPHALT; });
  for (const r of roads) if (street(r)) stamp(r.p, r.w / 2, i => { G[i] = T.ASPHALT; });
  for (const r of roads) if (r.cls === 'major' || r.cls === 'mid') stamp(r.p, 0.45, i => { G[i] = T.LINE; }, true);
  for (const rl of D.rails) if (!rl.tunnel) stamp(rl.p, 1.8, i => { G[i] = T.RAIL; });

  /* 建筑：矮的先画，高楼后画覆盖 */
  const binfo = [];
  const blist = D.buildings.filter(b => b.p.length > 3).slice().sort((a, b) => a.h - b.h);
  for (const b of blist) {
    const cx = b.p.reduce((s, p) => s + p[0], 0) / b.p.length, cz = b.p.reduce((s, p) => s + p[1], 0) / b.p.length;
    let area = 0; for (let i = 0, j = b.p.length - 1; i < b.p.length; j = i++) area += (b.p[j][0] + b.p[i][0]) * (b.p[j][1] - b.p[i][1]); area = Math.abs(area / 2);
    const info = styleFor(b, cx, cz, area); info.name = b.name; binfo.push(info);
    const id = binfo.length; const h = info.house ? (b.h > 5 ? Math.round(b.h) - 2 : 3) : Math.max(3, Math.min(60, Math.round(b.h)));
    fillPoly(b.p, i => { BI[i] = id; WH[i] = h; });
  }
  /* 到建筑边缘的距离，用来做阶梯屋顶和女儿墙 */
  const dist = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
  for (let iz = 0; iz < L; iz++) for (let ix = 0; ix < W; ix++) {
    const i = iz * W + ix; if (!BI[i]) continue;
    const edge = ix === 0 || iz === 0 || ix === W - 1 || iz === L - 1 || BI[i - 1] !== BI[i] || BI[i + 1] !== BI[i] || BI[i - W] !== BI[i] || BI[i + W] !== BI[i];
    if (edge) { dist[i] = 1; q[qt++] = i; }
  }
  while (qh < qt) { const i = q[qh++]; for (const j of [i - 1, i + 1, i - W, i + W]) { if (j < 0 || j >= N || BI[j] !== BI[i] || dist[j]) continue; dist[j] = Math.min(250, dist[i] + 1); q[qt++] = j; } }
  for (let i = 0; i < N; i++) {
    if (!BI[i]) { TT[i] = G[i]; continue; }
    const info = binfo[BI[i] - 1];
    if (info.roof === 'hip') { H[i] = WH[i] + Math.min(dist[i], 3); TT[i] = info.top; }
    else if (info.roof === 'flat') { H[i] = WH[i] + (dist[i] === 1 ? 1 : 0); TT[i] = dist[i] === 1 ? info.edge : info.top; }
    else { H[i] = WH[i]; TT[i] = info.top; }
  }
  /* 树：公园、草地和街边 */
  const trees = []; const tr = rngOf(20261020);
  const occ = new Uint8Array(N);
  const clearAround = (ix, iz, rad) => { for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) { const jx = ix + dx, jz = iz + dz; if (!inb(jx, jz)) return false; const j = jz * W + jx; if (H[j] || occ[j] || G[j] === T.RAIL) return false; } return true; };
  for (let iz = 3; iz < L - 3; iz++) for (let ix = 3; ix < W - 3; ix++) {
    const i = iz * W + ix; if (H[i]) continue; const g = G[i];
    let p = g === T.PARK ? 0.025 : g === T.GRASS ? 0.004 : 0;
    if (g === T.SIDEWALK && (G[i + 2] === T.ASPHALT || G[i - 2] === T.ASPHALT || G[i + 2 * W] === T.ASPHALT || G[i - 2 * W] === T.ASPHALT)) p = 0.035;
    if (!p || tr() > p) continue;
    if (!clearAround(ix, iz, g === T.SIDEWALK ? 1 : 2)) continue;
    let near = false; for (let dz = -5; dz <= 5 && !near; dz++) for (let dx = -5; dx <= 5; dx++) if (occ[(iz + dz) * W + ix + dx] === 2) { near = true; break; }
    if (near) continue;
    occ[i] = 2; TREE[i] = 1; trees.push({ x: X0 + ix + 0.5, z: Z0 + iz + 0.5, v: tr() < 0.5 ? 0 : 1, rot: Math.floor(tr() * 4) });
  }

  const idx = (ix, iz) => iz * W + ix;
  const cell = (x, z) => [Math.floor(x - X0), Math.floor(z - Z0)];
  function solidH(x, z) { const ix = Math.floor(x - X0), iz = Math.floor(z - Z0); if (!inb(ix, iz)) return 255; const i = iz * W + ix; return TREE[i] ? Math.max(H[i], 7) : H[i]; }
  const GOOD = new Set([T.SIDEWALK, T.PAVING, T.ASPHALT, T.PARKING, T.LINE, T.PATH]);
  /* 给一个地点找"店门"：所在建筑朝向街道的那面墙，以及墙外的地面格 */
  function findFront(x, z) {
    const [ix, iz] = cell(x, z); if (!inb(ix, iz)) return null; const i = idx(ix, iz);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]; let best = null;
    if (BI[i]) {
      for (const [dx, dz] of dirs) for (let s = 1; s <= 90; s++) {
        const jx = ix + dx * s, jz = iz + dz * s; if (!inb(jx, jz)) break; const j = idx(jx, jz);
        if (!BI[j]) { const score = s + (GOOD.has(G[j]) ? 0 : 20); if (!best || score < best.score) best = { score, gx: jx, gz: jz, bx: jx - dx, bz: jz - dz, dx, dz }; break; }
      }
    } else {
      for (const [dx, dz] of dirs) for (let s = 1; s <= 10; s++) {
        const jx = ix + dx * s, jz = iz + dz * s; if (!inb(jx, jz)) break; const j = idx(jx, jz);
        if (BI[j]) { if (!best || s < best.score) best = { score: s, bx: jx, bz: jz, gx: jx - dx, gz: jz - dz, dx: -dx, dz: -dz }; break; }
      }
    }
    if (!best) return null;
    const b = idx(best.bx, best.bz);
    best.H = H[b]; best.WH = WH[b]; best.info = binfo[BI[b] - 1];
    best.wx = best.dx ? X0 + best.bx + (best.dx > 0 ? 1 : 0) : X0 + best.bx + 0.5;
    best.wz = best.dz ? Z0 + best.bz + (best.dz > 0 ? 1 : 0) : Z0 + best.bz + 0.5;
    best.groundX = X0 + best.gx + 0.5; best.groundZ = Z0 + best.gz + 0.5;
    return best;
  }
  function viewH(x, z) { const ix = Math.floor(x - X0), iz = Math.floor(z - Z0); return inb(ix, iz) ? H[iz * W + ix] : 0; }
  return { viewH, X0, Z0, W, L, G, H, WH, TT, BI, TREE, binfo, trees, inb, idx, cell, solidH, findFront, groundAt: (x, z) => { const [ix, iz] = cell(x, z); return inb(ix, iz) ? G[idx(ix, iz)] : T.DIRT; }, GOOD };
}

/* ---------- 网格 ---------- */
class Quads {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.tile = []; this.col = []; this.ind = []; this.n = 0; }
  add(v, n, uv, tile, shade) {
    const [tx, ty] = tileXY(tile);
    for (let k = 0; k < 4; k++) { this.pos.push(v[k][0], v[k][1], v[k][2]); this.nor.push(n[0], n[1], n[2]); this.uv.push(uv[k][0], uv[k][1]); this.tile.push(tx, ty); const s = shade[k]; this.col.push(s, s, s); }
    const b = this.n; this.ind.push(b, b + 1, b + 2, b, b + 2, b + 3); this.n += 4;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('atile', new THREE.Float32BufferAttribute(this.tile, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.ind, 1) : new THREE.Uint16BufferAttribute(this.ind, 1));
    g.computeBoundingSphere(); return g;
  }
}
export function buildMeshes(world, CH = 64) {
  const { X0, Z0, W, L, H, WH, TT, BI, binfo } = world; const out = [];
  for (let cz0 = 0; cz0 < L; cz0 += CH) for (let cx0 = 0; cx0 < W; cx0 += CH) {
    const cx1 = Math.min(W, cx0 + CH), cz1 = Math.min(L, cz0 + CH), w = cx1 - cx0, l = cz1 - cz0; const Q = new Quads();
    /* 顶面：贪心合并相同高度和贴图的矩形 */
    const used = new Uint8Array(w * l);
    for (let z = 0; z < l; z++) for (let x = 0; x < w; x++) {
      if (used[z * w + x]) continue; const i = (cz0 + z) * W + cx0 + x; const h = H[i], t = TT[i];
      let x2 = x + 1; while (x2 < w && !used[z * w + x2] && H[i + x2 - x] === h && TT[i + x2 - x] === t) x2++;
      let z2 = z + 1; outer: while (z2 < l) { for (let k = x; k < x2; k++) { const j = (cz0 + z2) * W + cx0 + k; if (used[z2 * w + k] || H[j] !== h || TT[j] !== t) break outer; } z2++; }
      for (let zz = z; zz < z2; zz++) for (let k = x; k < x2; k++) used[zz * w + k] = 1;
      const xa = X0 + cx0 + x, xb = X0 + cx0 + x2, za = Z0 + cz0 + z, zb = Z0 + cz0 + z2; const [sx, sy] = SCALE[t];
      Q.add([[xa, h, za], [xa, h, zb], [xb, h, zb], [xb, h, za]], [0, 1, 0], [[xa / sx, -za / sy], [xa / sx, -zb / sy], [xb / sx, -zb / sy], [xb / sx, -za / sy]], t, [1, 1, 1, 1]);
    }
    /* 侧面：沿一行合并相同的墙段，再按楼层分段贴图 */
    const emit = (dir, fixed, a0, a1, y0, y1, bid, wh) => {
      const info = bid ? binfo[bid - 1] : null; const bands = [];
      if (!info) bands.push([-3, y1, T.DIRT, 0]);
      else { if (info.f > 0) bands.push([0, Math.min(info.f, wh), info.b0, 0]); bands.push([info.f, wh, info.b1, info.f]); bands.push([wh, y1, info.rs, wh]); }
      for (const [b0, b1, tile, vb] of bands) {
        const lo = Math.max(b0, y0), hi = Math.min(b1, y1); if (hi <= lo) continue; const [sx, sy] = SCALE[tile];
        const va = (lo - vb) / sy, vt = (hi - vb) / sy; const sb = lo <= 0 ? 0.62 : (lo === vb ? 0.88 : 1);
        let v, n, u;
        if (dir === 0) { v = [[fixed, lo, a1], [fixed, lo, a0], [fixed, hi, a0], [fixed, hi, a1]]; n = [1, 0, 0]; u = [-a1 / sx, -a0 / sx]; }
        else if (dir === 1) { v = [[fixed, lo, a0], [fixed, lo, a1], [fixed, hi, a1], [fixed, hi, a0]]; n = [-1, 0, 0]; u = [a0 / sx, a1 / sx]; }
        else if (dir === 2) { v = [[a0, lo, fixed], [a1, lo, fixed], [a1, hi, fixed], [a0, hi, fixed]]; n = [0, 0, 1]; u = [a0 / sx, a1 / sx]; }
        else { v = [[a1, lo, fixed], [a0, lo, fixed], [a0, hi, fixed], [a1, hi, fixed]]; n = [0, 0, -1]; u = [-a1 / sx, -a0 / sx]; }
        Q.add(v, n, [[u[0], va], [u[1], va], [u[1], vt], [u[0], vt]], tile, [sb, sb, 1, 1]);
      }
    };
    const side = (dir) => {
      const alongZ = dir < 2; const outerA = alongZ ? cx0 : cz0, outerB = alongZ ? cx1 : cz1, innerA = alongZ ? cz0 : cx0, innerB = alongZ ? cz1 : cx1;
      for (let o = outerA; o < outerB; o++) {
        let run = null;
        for (let k = innerA; k <= innerB; k++) {
          let key = null, hn = 0, i = 0;
          if (k < innerB) {
            const ix = alongZ ? o : k, iz = alongZ ? k : o; i = iz * W + ix;
            const nx = ix + (dir === 0 ? 1 : dir === 1 ? -1 : 0), nz = iz + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
            const edge = nx < 0 || nz < 0 || nx >= W || nz >= L;
            hn = edge ? -3 : H[nz * W + nx];
            if (H[i] > hn) key = ((BI[i] * 256 + WH[i]) * 512 + hn + 3) * 256 + H[i];
          }
          if (run && key === run.key) { run.end = k + 1; continue; }
          if (run) {
            const ix = alongZ ? o : run.start, iz = alongZ ? run.start : o;
            const fixed = alongZ ? X0 + ix + (dir === 0 ? 1 : 0) : Z0 + iz + (dir === 2 ? 1 : 0);
            const a0 = (alongZ ? Z0 : X0) + run.start, a1 = (alongZ ? Z0 : X0) + run.end;
            emit(dir, fixed, a0, a1, run.hn, run.h, run.bid, run.wh);
          }
          run = key != null ? { key, start: k, end: k + 1, hn, h: H[i], bid: BI[i], wh: WH[i] } : null;
        }
      }
    };
    side(0); side(1); side(2); side(3);
    if (Q.n) out.push(Q.geometry());
  }
  return out;
}

/* 树：方块树干 + 树叶团，两种样子，用实例化绘制 */
export function treeGeometries() {
  const variants = [{ th: 4, leaf: T.LEAVES }, { th: 5, leaf: T.LEAVES2 }];
  return variants.map(({ th, leaf }) => {
    const vox = new Map(); const key = (x, y, z) => x + ',' + y + ',' + z;
    for (let y = 0; y < th; y++) vox.set(key(0, y, 0), 'log');
    for (let y = th - 2; y <= th - 1; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (!(Math.abs(x) === 2 && Math.abs(z) === 2) && !(x === 0 && z === 0)) vox.set(key(x, y, z), 'leaf');
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) vox.set(key(x, th, z), 'leaf');
    for (const [x, z] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) vox.set(key(x, th + 1, z), 'leaf');
    const Q = new Quads();
    const F = [[[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]], [[0, 1, 0], [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]], [[0, -1, 0], [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]]], [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]]];
    for (const [k, type] of vox) {
      const [x, y, z] = k.split(',').map(Number);
      for (const [n, corners] of F) {
        const nb = vox.get(key(x + n[0], y + n[1], z + n[2])); if (nb && !(type === 'log' && nb === 'leaf')) continue;
        const tile = type === 'log' ? (n[1] ? T.LOGTOP : T.LOG) : leaf;
        const v = corners.map(([a, b, c]) => [x - 0.5 + a, y + b, z - 0.5 + c]);
        const sh = type === 'leaf' ? (n[1] < 0 ? 0.7 : 1) : 1;
        Q.add(v, n, [[0, 0], [1, 0], [1, 1], [0, 1]], tile, [sh, sh, sh, sh]);
      }
    }
    return Q.geometry();
  });
}
