/* 角色、店招、商家信标与广告牌、宝箱、粒子、云、车、行人 */
import * as THREE from 'three';

const FONT = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif';
export function canvasTex(w, h, draw, nearest = false) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 4;
  return t;
}
const hexCss = (c) => '#' + c.toString(16).padStart(6, '0');

/* ---------- 方块小人 ---------- */
const U = 1.8 / 32;
const faceCache = new Map();
function faceTex(skin, hair) {
  const k = skin + '_' + hair; if (faceCache.has(k)) return faceCache.get(k);
  const t = canvasTex(8, 8, (g) => {
    g.fillStyle = hexCss(skin); g.fillRect(0, 0, 8, 8); g.fillStyle = hexCss(hair); g.fillRect(0, 0, 8, 2); g.fillRect(0, 2, 1, 2); g.fillRect(7, 2, 1, 2);
    g.fillStyle = '#ffffff'; g.fillRect(1, 4, 2, 1); g.fillRect(5, 4, 2, 1); g.fillStyle = '#2a2f45'; g.fillRect(2, 4, 1, 1); g.fillRect(5, 4, 1, 1);
    g.fillStyle = '#b06a50'; g.fillRect(3, 6, 2, 1);
  }, true); faceCache.set(k, t); return t;
}
const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w * U, h * U, d * U), mat); m.position.set(x * U, y * U, z * U); m.castShadow = true; return m; }
export function makeCharacter({ hoodie = 0x1f7a5a, pants = 0x2f3d50, skin = 0xf1c9a5, hair = 0x2b2b2b, hat = null } = {}) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const hairM = lam(hair), skinM = lam(skin), hoodM = lam(hoodie), pantM = lam(pants), shoeM = lam(0x2a2a2a);
  const headMats = [hairM, hairM, hairM, skinM, new THREE.MeshLambertMaterial({ map: faceTex(skin, hair) }), hairM];
  const head = new THREE.Mesh(new THREE.BoxGeometry(8 * U, 8 * U, 8 * U), headMats); head.position.y = 28 * U; head.castShadow = true; body.add(head);
  body.add(box(8, 12, 4, hoodM, 0, 18, 0));
  const limb = (x, y, top, bot, topH, botH) => { const g = new THREE.Group(); g.position.set(x * U, y * U, 0); g.add(box(4, topH, 4, top, 0, -topH / 2, 0)); g.add(box(4, botH, 4, bot, 0, -topH - botH / 2, 0)); body.add(g); return g; };
  const armL = limb(-6, 24, hoodM, skinM, 9, 3), armR = limb(6, 24, hoodM, skinM, 9, 3);
  const legL = limb(-2, 12, pantM, shoeM, 10, 2), legR = limb(2, 12, pantM, shoeM, 10, 2);
  const hatG = new THREE.Group(); hatG.position.y = 32 * U; head.add(hatG); hatG.position.set(0, 4 * U, 0);
  const api = {
    root, head, armL, armR, legL, legR, t: Math.random() * 10,
    setHoodie(c) { hoodM.color.setHex(c); },
    setHat(type) {
      while (hatG.children.length) hatG.remove(hatG.children[0]);
      const add = (w, h, d, c, x, y, z) => hatG.add(box(w, h, d, lam(c), x, y, z));
      if (type === 'chef') { add(9, 2, 9, 0xf4f4f4, 0, 1, 0); add(8, 6, 8, 0xffffff, 0, 5, 0); }
      if (type === 'party') { add(6, 3, 6, 0xff5fa2, 0, 1.5, 0); add(4, 3, 4, 0xffd23f, 0, 4.5, 0); add(2, 3, 2, 0x5fd0ff, 0, 7.5, 0); }
      if (type === 'ears') { add(2, 6, 1, 0x9c6b3f, -3, 3, 0); add(2, 6, 1, 0x9c6b3f, 3, 3, 0); add(1, 4, 1.2, 0xe8b9a0, -3, 3, 0.1); add(1, 4, 1.2, 0xe8b9a0, 3, 3, 0.1); }
      if (type === 'crown') { add(9, 2, 9, 0xf2c230, 0, 1, 0); for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [0, 4], [0, -4], [4, 0], [-4, 0]]) add(1.5, 2, 1.5, 0xf2c230, x, 3, z); add(2, 2, 1, 0xe23b3b, 0, 1, 4.6); }
      if (type === 'cap') { add(8.6, 2, 8.6, 0x2b6cb0, 0, 0.6, 0); add(8, 1, 4, 0x2b6cb0, 0, 0, 6); }
      hatG.position.y = 4 * U; hatG.position.y = 4 * U;
    },
    animate(dt, speed) {
      this.t += dt * Math.min(12, 4 + speed * 1.4); const a = Math.sin(this.t) * Math.min(0.9, speed / 4);
      armL.rotation.x = a; armR.rotation.x = -a; legL.rotation.x = -a; legR.rotation.x = a;
      body.position.y = speed > 0.3 ? Math.abs(Math.cos(this.t)) * 0.04 : 0;
    },
  };
  hatG.position.y = 4 * U;
  if (hat) api.setHat(hat);
  return api;
}

/* ---------- 真实店招：所有 OSM 商家的名字挂在它们楼的临街墙面上 ---------- */
const KIND_COLOR = (k) => /restaurant|fast_food|bubble_tea|bakery/.test(k) ? '#b8352a' : /cafe/.test(k) ? '#6b3f22' : /bank|pharmacy|clinic|dentist|chemist/.test(k) ? '#1f7a5a' : /supermarket|grocery|greengrocer|butcher|seafood/.test(k) ? '#c46a12' : '#2b4a6f';
export function buildShopSigns(world, D, skip) {
  const SLOT_W = 256, SLOT_H = 48, PER = 8; const placed = []; const items = [];
  const meas = document.createElement('canvas').getContext('2d'); meas.font = `700 26px ${FONT}`;
  for (const poi of D.pois) {
    if (poi.kind === 'station' || (skip && skip(poi))) continue;
    const f = world.findFront(poi.x, poi.y); if (!f || f.H < 5 || (f.info && f.info.house)) continue;
    const name = (poi.zh || poi.name).slice(0, 18);
    const px = Math.min(SLOT_W, Math.ceil(meas.measureText(name).width) + 26); const w = px / SLOT_H * 0.8, h = 0.8;
    const along = f.dx ? f.wz : f.wx, fixed = f.dx ? f.wx : f.wz;
    let y = null;
    for (const yy of [Math.max(4.25, (f.info ? f.info.f : 0) + 0.25), 5.25, 6.25]) {
      if (yy + h > f.H - 0.2) break;
      if (!placed.some(p => p.dx === f.dx && p.dz === f.dz && Math.abs(p.fixed - fixed) < 0.5 && Math.abs(p.y - yy) < 0.5 && Math.abs(p.along - along) < (p.w + w) / 2 + 0.2)) { y = yy; break; }
    }
    if (y == null) continue;
    placed.push({ dx: f.dx, dz: f.dz, fixed, along, y, w }); items.push({ f, name, px, w, h, y, kind: poi.kind });
  }
  const rows = Math.ceil(items.length / PER); const tex = canvasTex(SLOT_W * PER, Math.max(1, rows) * SLOT_H, (g) => {
    items.forEach((it, k) => {
      const sx = (k % PER) * SLOT_W, sy = Math.floor(k / PER) * SLOT_H;
      g.fillStyle = KIND_COLOR(it.kind); g.fillRect(sx, sy, it.px, SLOT_H);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(sx, sy, it.px, 4); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(sx, sy + SLOT_H - 4, it.px, 4);
      g.fillStyle = '#fff'; g.font = `700 26px ${FONT}`; g.textBaseline = 'middle'; g.fillText(it.name, sx + 13, sy + SLOT_H / 2 + 1);
    });
  });
  const pos = [], uv = [], ind = []; const TW = SLOT_W * PER, TH = Math.max(1, rows) * SLOT_H;
  items.forEach((it, k) => {
    const { f } = it; const nx = f.dx, nz = f.dz; const rx = nz, rz = -nx;
    const cx = f.wx + nx * 0.06, cz = f.wz + nz * 0.06;
    const u0 = ((k % PER) * SLOT_W) / TW, u1 = ((k % PER) * SLOT_W + it.px) / TW, v1 = 1 - (Math.floor(k / PER) * SLOT_H) / TH, v0 = v1 - SLOT_H / TH;
    const b = pos.length / 3;
    pos.push(cx - rx * it.w / 2, it.y, cz - rz * it.w / 2, cx + rx * it.w / 2, it.y, cz + rz * it.w / 2, cx + rx * it.w / 2, it.y + it.h, cz + rz * it.w / 2, cx - rx * it.w / 2, it.y + it.h, cz - rz * it.w / 2);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1); ind.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ind);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2 }));
  return { mesh: m, count: items.length };
}

/* ---------- 赞助商：信标光柱 + 广告牌 + 悬浮招牌 ---------- */
function logoTex(sp) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = sp.color; g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke();
    g.font = `120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sp.logo, 128, 136);
  });
}
function billboardTex(sp) {
  return canvasTex(1024, 400, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, sp.color); gr.addColorStop(1, '#1b2a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 12; i++) g.fillRect(i * 96 - 40, 0, 30, h);
    g.font = `200px ${FONT}`; g.textBaseline = 'middle'; g.fillText(sp.logo, 40, 210);
    g.fillStyle = '#fff'; g.font = `800 84px ${FONT}`; g.fillText(sp.name, 290, 120);
    g.fillStyle = '#ffe28a'; g.font = `900 104px ${FONT}`; g.fillText(sp.offer, 290, 235);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `600 40px ${FONT}`; g.fillText(sp.slogan, 292, 330);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(w - 170, 14, 156, 50); g.fillStyle = '#fff'; g.font = `600 30px ${FONT}`; g.fillText('演示广告', w - 154, 40);
  });
}
export function buildSponsor(world, sp, scene) {
  const f = world.findFront(sp.poi.x, sp.poi.y); if (!f) return null;
  const grp = new THREE.Group(); scene.add(grp);
  const gx = f.groundX + f.dx * 1.5, gz = f.groundZ + f.dz * 1.5;
  const col = new THREE.Color(sp.color);
  // 光柱
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 160, 10, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.set(gx, 80, gz); grp.add(beam);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 160, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  core.position.copy(beam.position); grp.add(core);
  // 底座
  const base = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [0, 0, 0, 0, 0, 0].map(() => new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 })));
  base.position.set(gx, 0.5, gz); base.castShadow = true; grp.add(base);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); glass.position.copy(base.position); grp.add(glass);
  // 悬浮招牌
  const logo = new THREE.Sprite(new THREE.SpriteMaterial({ map: logoTex(sp), depthWrite: false })); logo.scale.set(3.2, 3.2, 1); logo.position.set(gx, Math.max(6, Math.min(f.H, 14)) + 3.5, gz); grp.add(logo);
  // 广告牌：矮楼放楼顶边缘，高楼挂墙上
  const bw = 8, bh = 3.1; const nx = f.dx, nz = f.dz;
  const onRoof = f.H < 10; const by = onRoof ? f.H + 0.8 : 6.2;
  const board = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: billboardTex(sp) })); face.position.z = 0.16; board.add(face);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, bh + 0.4, 0.3), lam(0x2a2f38)); frame.castShadow = true; board.add(frame);
  if (onRoof) for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), lam(0x2a2f38)); post.position.set(s * bw * 0.35, -bh / 2 - 0.35, 0); board.add(post); }
  board.position.set(f.wx - nx * (onRoof ? 1.2 : -0.2), by + bh / 2, f.wz - nz * (onRoof ? 1.2 : -0.2));
  board.rotation.y = Math.atan2(nx, nz); grp.add(board);
  return { grp, beam, core, logo, base, x: gx, z: gz, front: f, t: Math.random() * 6 };
}

/* ---------- 宝箱 ---------- */
let chestTexCache = null;
function chestTex() {
  if (chestTexCache) return chestTexCache;
  const mk = (top) => canvasTex(16, 16, (g) => {
    g.fillStyle = '#9a6a35'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#7d5226'; for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    g.fillStyle = '#4a2e14'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    if (!top) { g.fillStyle = '#f2c230'; g.fillRect(6, 0, 4, 5); g.fillStyle = '#b8901c'; g.fillRect(7, 3, 2, 1); }
  }, true);
  chestTexCache = { side: mk(true), front: mk(false) }; return chestTexCache;
}
let glowTex = null;
function glow() { return glowTex || (glowTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(255,230,120,.95)'); r.addColorStop(0.4, 'rgba(255,200,60,.45)'); r.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); })); }
export function makeChest(color) {
  const t = chestTex(); const g = new THREE.Group();
  const side = new THREE.MeshLambertMaterial({ map: t.side }), front = new THREE.MeshLambertMaterial({ map: t.front });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.9), [side, side, side, side, front, side]); body.position.y = 0.31; body.castShadow = true; g.add(body);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.62, -0.45); g.add(lidPivot);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.28, 0.92), [side, side, side, side, front, side]); lid.position.set(0, 0.14, 0.45); lid.castShadow = true; lidPivot.add(lid);
  if (color) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.12, 0.94), new THREE.MeshLambertMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.3 })); band.position.y = 0.5; g.add(band); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); halo.scale.set(2.8, 2.8, 1); halo.position.y = 0.5; g.add(halo);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0xffe066 })); star.position.y = 1.7; g.add(star);
  return { g, lidPivot, halo, star };
}

/* ---------- 方块粒子 ---------- */
export class Particles {
  constructor(scene, n = 400) {
    this.n = n; this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; scene.add(this.mesh);
    this.p = Array.from({ length: n }, () => ({ life: 0 })); this.m = new THREE.Matrix4(); this.c = new THREE.Color(); this.i = 0;
    for (let k = 0; k < n; k++) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(k, this.m); this.mesh.setColorAt(k, this.c.set(0xffffff)); }
  }
  burst(x, y, z, count, colors, power = 6) {
    for (let k = 0; k < count; k++) {
      const p = this.p[this.i]; const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.8;
      Object.assign(p, { x, y, z, vx: Math.cos(a) * power * (0.3 + Math.random() * 0.7), vy: power * up * 1.3, vz: Math.sin(a) * power * (0.3 + Math.random() * 0.7), life: 1 + Math.random() * 0.6, s: 0.6 + Math.random() * 0.9 });
      this.mesh.setColorAt(this.i, this.c.set(colors[k % colors.length])); this.i = (this.i + 1) % this.n;
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let any = false;
    for (let k = 0; k < this.n; k++) {
      const p = this.p[k]; if (p.life <= 0) continue; any = true;
      p.life -= dt; p.vy -= 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.07) { p.y = 0.07; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
      const s = p.life > 0 ? p.s * Math.min(1, p.life * 2) : 0; this.m.makeScale(s, s, s); this.m.setPosition(p.x, p.y, p.z); this.mesh.setMatrixAt(k, this.m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- 方块云 ---------- */
export function makeClouds(scene) {
  const tex = canvasTex(64, 64, (g) => {
    let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    g.clearRect(0, 0, 64, 64); g.fillStyle = '#ffffff';
    for (let k = 0; k < 26; k++) { const x = Math.floor(r() * 64), y = Math.floor(r() * 64), w = 3 + Math.floor(r() * 9), h = 2 + Math.floor(r() * 5); for (const [ox, oy] of [[0, 0], [-64, 0], [0, -64], [-64, -64]]) g.fillRect(x + ox, y + oy, w, h); }
  }, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 110; scene.add(m); return { mesh: m, tex };
}

/* ---------- 路上的车 ---------- */
export function makeCars(world, D, scene, count = 16) {
  const r = world;
  const inside = (p) => p[0] > r.X0 + 2 && p[0] < r.X0 + r.W - 2 && p[1] > r.Z0 + 2 && p[1] < r.Z0 + r.L - 2;
  const lines = D.roads.filter(rd => !rd.tunnel && (rd.cls === 'major' || rd.cls === 'mid')).map(rd => rd.p.filter(inside)).filter(p => p.length > 1);
  const len = (p) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };
  const pool = lines.filter(p => len(p) > 80); if (!pool.length) return [];
  const COLORS = [0xe23b3b, 0x2b6cb0, 0xf2f2f2, 0x222222, 0xf2c230, 0x1f7a5a, 0x8a8f96, 0xff7a2f];
  const cars = [];
  for (let k = 0; k < count; k++) {
    const path = pool[k % pool.length], L = len(path); const g = new THREE.Group();
    const c = COLORS[k % COLORS.length];
    const bodyM = lam(c); const add = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); };
    add(1.8, 0.7, 4, bodyM, 0, 0.65, 0); add(1.6, 0.6, 2.1, lam(0x2c3e55), 0, 1.3, -0.2); add(1.62, 0.12, 2.12, bodyM, 0, 1.64, -0.2);
    for (const [x, z] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) add(0.25, 0.6, 0.6, lam(0x1a1a1a), x, 0.3, z);
    add(0.4, 0.2, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff3c0 }), -0.55, 0.75, 2.01); add(0.4, 0.2, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff3c0 }), 0.55, 0.75, 2.01);
    scene.add(g); cars.push({ g, path, L, s: Math.random() * L, dir: k % 2 ? 1 : -1, v: 7 + Math.random() * 5 });
  }
  const at = (path, s) => { for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (s <= l || i === path.length - 1) { const t = Math.min(1, s / l); return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, dx: (b[0] - a[0]) / l, dz: (b[1] - a[1]) / l }; } s -= l; } };
  return {
    list: cars,
    update(dt) {
      for (const c of cars) {
        c.s += c.v * c.dir * dt; if (c.s > c.L) { c.s = c.L; c.dir = -1; } if (c.s < 0) { c.s = 0; c.dir = 1; }
        const p = at(c.path, c.s); const fx = p.dx * c.dir, fz = p.dz * c.dir;
        c.g.position.set(p.x - fz * 2.4, 0, p.z + fx * 2.4); c.g.rotation.y = Math.atan2(fx, fz);
      }
    },
  };
}

/* ---------- 街上闲逛的行人 ---------- */
export function makePeds(world, scene, center, count = 22) {
  const HOOD = [0xe23b3b, 0x2b6cb0, 0xf2c230, 0x8e44ad, 0xff7a2f, 0x333333, 0xffffff, 0x16a085, 0xd35480];
  const HAIR = [0x2b2b2b, 0x2b2b2b, 0x4a3020, 0x7a5a30, 0xd9b45a];
  const walkable = (x, z) => world.solidH(x, z) === 0 && world.GOOD.has(world.groundAt(x, z));
  const clearLine = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5); for (let k = 0; k <= n; k++) if (!walkable(x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n)) return false; return true; };
  const peds = [];
  let tries = 0;
  while (peds.length < count && tries++ < 4000) {
    const x = center.x + (Math.random() - 0.5) * 360, z = center.z + (Math.random() - 0.5) * 300; if (!walkable(x, z)) continue;
    const ch = makeCharacter({ hoodie: HOOD[peds.length % HOOD.length], hair: HAIR[peds.length % HAIR.length], pants: Math.random() < 0.5 ? 0x2f3d50 : 0x4a4a4a });
    ch.root.position.set(x, 0, z); scene.add(ch.root); peds.push({ ch, tx: x, tz: z, wait: Math.random() * 3 });
  }
  return {
    list: peds,
    update(dt) {
      for (const p of peds) {
        const r = p.ch.root.position;
        if (p.wait > 0) { p.wait -= dt; p.ch.animate(dt, 0); if (p.wait <= 0) { for (let k = 0; k < 12; k++) { const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 18; const tx = r.x + Math.cos(a) * d, tz = r.z + Math.sin(a) * d; if (walkable(tx, tz) && clearLine(r.x, r.z, tx, tz)) { p.tx = tx; p.tz = tz; break; } } } continue; }
        const dx = p.tx - r.x, dz = p.tz - r.z, d = Math.hypot(dx, dz);
        if (d < 0.2) { p.wait = 1 + Math.random() * 4; continue; }
        const s = Math.min(d, 1.4 * dt); r.x += dx / d * s; r.z += dz / d * s; p.ch.root.rotation.y = Math.atan2(dx, dz); p.ch.animate(dt, 1.4);
      }
    },
  };
}
