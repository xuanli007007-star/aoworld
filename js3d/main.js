/* 澳漂世界 3D · 入口 */
import * as THREE from 'three';
import { makeAtlas, tileMaterial } from './atlas.js';
import { buildWorld, buildMeshes, treeGeometries } from './world.js';
import { makeCharacter, buildShopSigns, buildSponsor, makeChest, Particles, makeClouds, makeCars, makePeds, canvasTex } from './props.js';
import { Player, Input } from './player.js';

const $ = (s) => document.querySelector(s);
const setLoad = (t) => { $('#load-text').textContent = t; };
const nextFrame = () => new Promise(r => setTimeout(r, 0));
const MOBILE = matchMedia('(pointer: coarse)').matches;

/* ---------- 声音（合成，不用素材） ---------- */
const Sfx = (() => {
  let ctx = null; const ac = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
  const tone = (f, t0, d, type = 'square', vol = 0.06) => { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, c.currentTime + t0); g.gain.setValueAtTime(vol, c.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + d); o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + d + 0.02); };
  return {
    unlock() { try { ac().resume(); } catch (e) {} },
    coin() { try { tone(988, 0, 0.08); tone(1319, 0.07, 0.18); } catch (e) {} },
    open() { try { tone(220, 0, 0.12, 'triangle', 0.12); tone(330, 0.08, 0.12, 'triangle', 0.1); tone(660, 0.18, 0.25, 'square', 0.05); } catch (e) {} },
    jump() { try { tone(440, 0, 0.08, 'square', 0.03); } catch (e) {} },
    stamp() { try { tone(523, 0, 0.1); tone(659, 0.08, 0.1); tone(784, 0.16, 0.2); } catch (e) {} },
  };
})();

/* ---------- 每日状态 ---------- */
const d0 = new Date(); const DAY = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
const DAY_KEY = 'ao3d_day_' + DAY;
let day = (() => { try { return JSON.parse(localStorage.getItem(DAY_KEY)) || null; } catch (e) { return null; } })() || { opened: [], stamps: [], bonus: false };
const saveDay = () => { try { localStorage.setItem(DAY_KEY, JSON.stringify(day)); } catch (e) {} };
const S = () => AO.Quest.state();
function stat(mid, k) { const s = S(); s.adStats = s.adStats || {}; s.adStats[mid] = s.adStats[mid] || { impressions: 0, chests: 0, visits: 0 }; s.adStats[mid][k]++; AO.Quest.save(); }
function strHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngOf(seed) { let s = seed || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/* ---------- 启动 ---------- */
setLoad('读取真实地图…');
const D = await (await fetch('data/boxhill.json')).json();
await nextFrame(); setLoad('把 Box Hill 变成方块…');
const world = buildWorld(D);

const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const HORIZON = 0xbfe2f7;
scene.background = canvasTex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4f9be0'); gr.addColorStop(0.65, '#9fd0f2'); gr.addColorStop(1, '#d8eef8'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); });
scene.fog = new THREE.Fog(HORIZON, 90, 340);
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
scene.add(new THREE.HemisphereLight(0xdcefff, 0x8a7a5a, 1.15));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.0); const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.38).normalize();
sun.castShadow = true; sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 300 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

await nextFrame(); setLoad('盖楼…');
const atlas = makeAtlas(); const mat = tileMaterial(atlas); const leafMat = tileMaterial(atlas, { alphaTest: 0.5 });
for (const g of buildMeshes(world)) { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); }
await nextFrame(); setLoad('种树…');
const tg = treeGeometries(); const tm = new THREE.Matrix4(), tq = new THREE.Quaternion(), tv = new THREE.Vector3(), ts = new THREE.Vector3(1, 1, 1);
tg.forEach((geo, v) => {
  const list = world.trees.filter(t => t.v === v); const im = new THREE.InstancedMesh(geo, leafMat, list.length);
  list.forEach((t, k) => { tq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot * Math.PI / 2); tv.set(t.x, 0, t.z); tm.compose(tv, tq, ts); im.setMatrixAt(k, tm); });
  im.castShadow = true; im.receiveShadow = true; scene.add(im);
});

/* 出生点：Main Street 步行街 */
function spawnPoint() {
  const inside = (p) => p[0] > world.X0 && p[0] < world.X0 + world.W && p[1] > world.Z0 && p[1] < world.Z0 + world.L;
  const ped = D.roads.find(r => r.cls === 'ped' && /main street/i.test(r.name || '') && r.p.some(inside));
  if (ped) { const pts = ped.p.filter(inside); const k = Math.max(1, Math.floor(pts.length / 2)); const m = pts[k], a = pts[k - 1]; return { x: m[0], z: m[1], yaw: Math.atan2(-(m[0] - a[0]), -(m[1] - a[1])) }; }
  return { x: 120, z: 10, yaw: 0.6 };
}
const SPAWN = spawnPoint();

await nextFrame(); setLoad('挂招牌…');
const sponsors = [];
for (const m of AO.CONTENT.merchants) {
  const poi = D.pois.find(p => new RegExp(m.poi, 'i').test(p.name)); if (!poi) continue;
  const sp = { ...m, poi }; const b = buildSponsor(world, sp, scene); if (b) { sp.b = b; sponsors.push(sp); }
}
const signs = buildShopSigns(world, D); scene.add(signs.mesh);
const clouds = makeClouds(scene);
const particles = new Particles(scene);
const cars = makeCars(world, D, scene, MOBILE ? 10 : 16);
const peds = makePeds(world, scene, SPAWN, MOBILE ? 14 : 22);

/* ---------- 每日宝箱：按日期生成，所有人当天位置一样 ---------- */
const chests = [];
(() => {
  const r = rngOf(strHash('boxhill-' + DAY));
  const ok = (x, z) => { if (world.solidH(x, z) !== 0) return false; const g = world.groundAt(x, z); if (!(world.GOOD.has(g) || g === 1 || g === 0)) return false; return !chests.some(c => Math.hypot(c.x - x, c.z - z) < 18) && Math.hypot(SPAWN.x - x, SPAWN.z - z) > 10; };
  const place = (cx, cz, rmin, rmax, sp, k) => { for (let t = 0; t < 400; t++) { const a = r() * Math.PI * 2, d = rmin + r() * (rmax - rmin); const x = Math.floor(cx + Math.cos(a) * d) + 0.5, z = Math.floor(cz + Math.sin(a) * d) + 0.5; if (ok(x, z)) { chests.push({ id: (sp ? sp.id : 'gold') + '-' + k, sp, x, z }); return; } } };
  for (const sp of sponsors) for (let k = 0; k < 3; k++) place(sp.b.x, sp.b.z, 12, 95, sp, k);
  for (let k = 0; k < 4; k++) place(SPAWN.x, SPAWN.z, 25, 210, null, k);
})();
for (const c of chests) {
  const o = makeChest(c.sp ? c.sp.color : null); o.g.position.set(c.x, 0, c.z); o.g.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2; scene.add(o.g); c.o = o;
  c.opened = day.opened.includes(c.id); if (c.opened) { o.lidPivot.rotation.x = -1.9; o.halo.visible = false; o.star.visible = false; }
}

/* ---------- 玩家 ---------- */
const char = makeCharacter({});
scene.add(char.root);
const player = new Player(world, char, camera);
player.place(SPAWN.x, SPAWN.z);
const input = new Input(renderer.domElement);

/* ---------- 装扮 ---------- */
const HOODIES = [['green', '电车绿', 0x1f7a5a, 0], ['red', '火锅红', 0xd8432f, 60], ['blue', '海港蓝', 0x2b6cb0, 60], ['yellow', '袋鼠黄', 0xf2c230, 80], ['purple', '奶茶紫', 0x8e44ad, 100], ['black', '墨尔本黑', 0x222222, 150]];
const HATS = [['none', '不戴', 0], ['cap', '棒球帽', 80], ['chef', '厨师帽', 120], ['party', '派对帽', 150], ['ears', '袋鼠耳朵', 200], ['crown', 'Box Hill 王冠', 500]];
const cos = () => { const s = S(); s.cos = s.cos || { owned: ['hood_green', 'hat_none'], hoodie: 'green', hat: 'none' }; return s.cos; };
function applyCos() { const c = cos(); const h = HOODIES.find(x => x[0] === c.hoodie) || HOODIES[0]; char.setHoodie(h[2]); char.setHat(c.hat === 'none' ? null : c.hat); }
applyCos();
function openShop() {
  const c = cos(); const el = $('#panel-shop'); el.classList.remove('hidden');
  const row = (kind, id, name, price, extra) => { const key = kind + '_' + id; const owned = c.owned.includes(key); const on = (kind === 'hood' ? c.hoodie : c.hat) === id; return `<button class="shop-item ${on ? 'on' : ''}" data-kind="${kind}" data-id="${id}" data-price="${price}">${extra}<b>${name}</b><span>${on ? '穿着' : owned ? '已拥有' : '💰 ' + price}</span></button>`; };
  $('#shop-body').innerHTML = `<p class="muted">开宝箱赚金币，换装扮。当前 💰 ${S().gold}</p><h4>卫衣</h4><div class="shop-grid">` + HOODIES.map(([id, n, col, pr]) => row('hood', id, n, pr, `<i class="sw" style="background:#${col.toString(16).padStart(6, '0')}"></i>`)).join('') + '</div><h4>帽子</h4><div class="shop-grid">' + HATS.map(([id, n, pr]) => row('hat', id, n, pr, `<i class="hat-ic">${{ none: '🙂', cap: '🧢', chef: '👨‍🍳', party: '🥳', ears: '🦘', crown: '👑' }[id]}</i>`)).join('') + '</div>';
  el.querySelectorAll('.shop-item').forEach(b => b.onclick = () => {
    const kind = b.dataset.kind, id = b.dataset.id, price = +b.dataset.price, key = kind + '_' + id;
    if (!c.owned.includes(key)) { if (S().gold < price) { AO.UI.toast('金币不够，去开宝箱吧'); return; } AO.Quest.applyEffects({ gold: -price }); c.owned.push(key); Sfx.coin(); AO.UI.toast('买到了：' + b.querySelector('b').textContent); }
    if (kind === 'hood') c.hoodie = id; else c.hat = id; AO.Quest.save(); applyCos(); hud(); openShop();
  });
}

/* ---------- HUD ---------- */
let navTarget = null;
function hud() {
  const opened = chests.filter(c => c.opened).length;
  $('#h-gold').textContent = S().gold; $('#h-chest').textContent = `${opened}/${chests.length}`; $('#h-stamp').textContent = `${day.stamps.length}/${sponsors.length}`;
  const cs = (S().coupons || []).filter(c => !c.used && Date.now() < c.expires).length; $('#h-bag-badge').textContent = cs; $('#h-bag-badge').classList.toggle('hidden', !cs);
}
function compass() {
  let tgt = navTarget, label = '';
  if (tgt) label = tgt.label;
  else { let best = null; for (const c of chests) if (!c.opened) { const d = Math.hypot(c.x - player.p.x, c.z - player.p.z); if (!best || d < best.d) best = { d, c }; } if (best) { tgt = { x: best.c.x, z: best.c.z }; label = best.c.sp ? `${best.c.sp.logo} 宝箱` : '金币宝箱'; } }
  const el = $('#compass');
  if (!tgt) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const d = Math.hypot(tgt.x - player.p.x, tgt.z - player.p.z);
  $('#c-arrow').style.transform = `rotate(${player.bearingTo(tgt.x, tgt.z)}rad)`;
  $('#c-text').textContent = `${label} · ${Math.round(d)} 米`;
  if (navTarget && d < 4) navTarget = null;
}

/* ---------- 开宝箱 → 广告卡 ---------- */
let busy = false;
function nearestChest() { let best = null; for (const c of chests) { if (c.opened) continue; const d = Math.hypot(c.x - player.p.x, c.z - player.p.z); if (d < 2.6 && (!best || d < best.d)) best = { c, d }; } return best && best.c; }
async function openChest(c) {
  if (busy || c.opened) return; busy = true; c.opened = true; day.opened.push(c.id); saveDay();
  c.anim = 0; c.o.halo.visible = false; c.o.star.visible = false; Sfx.open();
  particles.burst(c.x, 0.9, c.z, 60, c.sp ? [0xffd23f, 0xffffff, new THREE.Color(c.sp.color).getHex()] : [0xffd23f, 0xfff3a0, 0xffffff], 6);
  const r = Math.random(); const coins = Math.round(c.sp ? 15 + r * 15 : 10 + r * 15);
  const rewards = AO.Quest.applyEffects({ gold: coins }); setTimeout(() => Sfx.coin(), 300);
  let progress = '';
  if (c.sp) {
    stat(c.sp.id, 'chests'); stat(c.sp.id, 'impressions');
    const got = chests.filter(x => x.sp === c.sp && x.opened).length, tot = chests.filter(x => x.sp === c.sp).length;
    progress = got >= tot ? '🎉 集齐本店宝箱，优惠券已放进背包' : `本店宝箱 ${got}/${tot} · 集齐送优惠券`;
    if (got >= tot) rewards.push(...AO.Quest.applyEffects({ coupon: { id: c.sp.coupon } }));
  }
  if (chests.every(x => x.opened) && !day.bonus) { day.bonus = true; saveDay(); rewards.push(...AO.Quest.applyEffects({ gold: 100 })); progress += (progress ? '<br>' : '') + '🏆 今天的宝箱全开完了，额外 +100'; }
  hud();
  await new Promise(res => setTimeout(res, 650));
  showAd(c.sp, rewards, progress);
  busy = false;
}
function rewardLine(r) { if (r.kind === 'gold') return `💰 +${r.v}`; if (r.kind === 'coupon') return `🎟️ ${r.coupon.merchant} ${r.coupon.text}`; return ''; }
function showAd(sp, rewards, progress) {
  const el = $('#ad'); el.classList.remove('hidden'); el.style.setProperty('--sp', sp ? sp.color : '#c9962a');
  $('#ad-logo').textContent = sp ? sp.logo : '💰';
  $('#ad-name').textContent = sp ? sp.name : '金币宝箱';
  $('#ad-offer').textContent = sp ? sp.offer : '运气不错';
  $('#ad-slogan').textContent = sp ? sp.slogan : '集金币可以换装扮';
  $('#ad-progress').innerHTML = progress || '';
  $('#ad-rewards').innerHTML = rewards.map(rewardLine).filter(Boolean).map(t => `<span>${t}</span>`).join('');
  $('#ad-tag').classList.toggle('hidden', !sp);
  const go = $('#ad-go'); go.classList.toggle('hidden', !sp);
  go.onclick = () => { navTarget = { x: sp.b.x, z: sp.b.z, label: `去 ${sp.logo} ${sp.name}` }; close(); };
  const ok = $('#ad-ok'); let n = sp ? 3 : 0;
  const tick = () => { ok.disabled = n > 0; ok.textContent = n > 0 ? `${n} 秒后可关闭` : '收下'; if (n-- > 0) el._t = setTimeout(tick, 1000); };
  clearTimeout(el._t); tick();
  const close = () => { clearTimeout(el._t); el.classList.add('hidden'); hud(); };
  ok.onclick = close;
}
/* 走进商家信标打卡 */
function checkStamps() {
  for (const sp of sponsors) {
    if (day.stamps.includes(sp.id)) continue;
    if (Math.hypot(sp.b.x - player.p.x, sp.b.z - player.p.z) < 3.2) {
      day.stamps.push(sp.id); saveDay(); stat(sp.id, 'visits'); stat(sp.id, 'impressions');
      AO.Quest.applyEffects({ gold: 10 }); Sfx.stamp(); particles.burst(sp.b.x, 1.2, sp.b.z, 40, [new THREE.Color(sp.color).getHex(), 0xffffff], 5);
      AO.UI.toast(`${sp.logo} 在 ${sp.name} 打卡成功 · 💰 +10`); hud();
    }
  }
}

/* ---------- 标题页 ---------- */
let mode = 'title'; let orbit = 0;
$('#btn-start').onclick = () => {
  Sfx.unlock(); mode = 'play'; $('#title').classList.add('hidden'); $('#hud').classList.remove('hidden'); document.body.classList.add('playing');
  player.yaw = SPAWN.yaw; player.pitch = 0.32; player.dist = 10; player.updateCamera(0, true);
  try { if (!localStorage.getItem('ao3d_tip')) { $('#tip').classList.remove('hidden'); localStorage.setItem('ao3d_tip', '1'); } } catch (e) {}
};
$('#tip').onclick = () => $('#tip').classList.add('hidden');
for (const el of ['#title', '#hud', '#ad', '#tip', '#panel-shop', '#panel-bag', '#panel-coupon', '#btn-act']) for (const ev of ['touchstart', 'touchmove']) $(el).addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
$('#t-date').textContent = `今日宝箱 ${chests.length} 个 · ${chests.filter(c => c.opened).length} 个已开`;
$('#btn-act').onclick = () => { const c = nearestChest(); if (c) openChest(c); };
window.addEventListener('keydown', (e) => { if (e.code === 'KeyE' && mode === 'play') { const c = nearestChest(); if (c) openChest(c); } });
$('#h-bag').onclick = () => AO.UI.openBag();
$('#h-shop').onclick = openShop;
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $(b.dataset.close).classList.add('hidden'));
AO.Quest.flushPendingCoupons();
hud();

/* ---------- 主循环 ---------- */
const clock = new THREE.Clock(); let hudT = 0; let fpsN = 0, fpsT = 0;
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime;
  if (mode === 'title') {
    orbit += dt * 0.06; const R = 120; camera.position.set(SPAWN.x + Math.sin(orbit) * R, 85, SPAWN.z + Math.cos(orbit) * R); camera.lookAt(SPAWN.x, 0, SPAWN.z + 30);
    char.animate(dt, 0);
  } else {
    input.enabled = $('#ad').classList.contains('hidden');
    if (input.enabled) player.update(dt, input, { onJump: () => Sfx.jump() });
    const near = nearestChest(); $('#btn-act').classList.toggle('hidden', !near);
    checkStamps();
    hudT += dt; if (hudT > 0.1) { hudT = 0; compass(); }
  }
  const focus = mode === 'title' ? new THREE.Vector3(SPAWN.x, 0, SPAWN.z) : player.p;
  sun.position.set(focus.x + SUN_DIR.x * 120, SUN_DIR.y * 120, focus.z + SUN_DIR.z * 120); sun.target.position.set(focus.x, 0, focus.z);
  for (const c of chests) {
    if (c.anim != null && c.anim < 1) { c.anim = Math.min(1, c.anim + dt * 3); c.o.lidPivot.rotation.x = -1.9 * (1 - Math.pow(1 - c.anim, 3)); }
    if (!c.opened) { c.o.star.position.y = 1.7 + Math.sin(t * 3 + c.x) * 0.15; c.o.star.rotation.y = t * 2; c.o.halo.material.opacity = 0.7 + Math.sin(t * 4 + c.z) * 0.3; }
  }
  for (const sp of sponsors) { const b = sp.b; b.logo.position.y += Math.sin(t * 2 + b.t) * 0.004; b.beam.material.opacity = 0.32 + Math.sin(t * 3 + b.t) * 0.1; b.base.rotation.y = t * 0.6; }
  particles.update(dt); cars.update && cars.update(dt); peds.update(dt);
  clouds.tex.offset.x = t * 0.002;
  renderer.render(scene, camera);
  fpsN++; fpsT += dt; if (fpsT > 1) { window.__fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
}
if (/loop=timeout/.test(location.search)) setInterval(frame, 16); else renderer.setAnimationLoop(frame);
$('#loading').classList.add('hidden');
window.G = { world, player, chests, sponsors, openChest, scene, camera, renderer, signs, day, input, setMode: (m) => { if (m === 'play') $('#btn-start').click(); } };
