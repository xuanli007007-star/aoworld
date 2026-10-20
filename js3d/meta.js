/* 留存系统：连续签到、每日任务、Box Hill 美食图鉴、自己的小店 */
import * as THREE from 'three';
import { makeCharacter, canvasTex } from './props.js';

const $ = (s) => document.querySelector(s);
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
function strHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngOf(seed) { let s = seed || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const dayStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ---------- 美食卡分类 ---------- */
export const CATS = [
  { id: 'hotpot', name: '火锅麻辣', emoji: '🍲', color: '#d8432f', re: /hot ?pot|hotpot|火锅|mala|malatang|麻辣|spicy|chongqing/ },
  { id: 'noodle', name: '面点饺子', emoji: '🍜', color: '#e08a1e', re: /noodle|ramen|pho|面|dumpling|饺|bao\b|包子|lanzhou|wonton|mee/ },
  { id: 'bbq', name: '烧烤韩餐', emoji: '🍢', color: '#9b4a2a', re: /bbq|grill|charcoal|烧烤|skewer|korean|chicken|炸鸡/ },
  { id: 'drink', name: '奶茶咖啡', emoji: '🧋', color: '#8e44ad', re: /tea|bubble|coffee|cafe|café|茶|juice|kopi|espresso/ },
  { id: 'sweet', name: '甜品烘焙', emoji: '🍰', color: '#e05a8a', re: /bake|bakery|cake|dessert|sweet|甜|ice cream|gelato|donut|bread|pastry|bonbon/ },
  { id: 'fast', name: '快餐速食', emoji: '🍔', color: '#c9962a', re: /burger|pizza|kfc|mcdonald|subway|hungry jack|grill'd|kebab|fish and chips|fast/ },
  { id: 'asian', name: '亚洲风味', emoji: '🍱', color: '#1f7a8a', re: /sushi|japan|thai|viet|malay|indian|asian|korean|indonesia|singapore|laksa|curry/ },
  { id: 'chinese', name: '中餐小馆', emoji: '🥢', color: '#b33b2e', re: /.*/ },
];
const RARITY = { common: { name: '普通', w: 60 }, rare: { name: '稀有', w: 28 }, epic: { name: '史诗', w: 10 }, legend: { name: '传说', w: 2 } };
const FOOD_KIND = /restaurant|fast_food|cafe|bakery|bubble_tea|ice_cream|confectionery|food_court/;

/* ---------- 每日任务池 ---------- */
const MISSIONS = [
  { id: 'chest', text: '开 {n} 个宝箱', n: 3 },
  { id: 'stamp', text: '给 {n} 家商家打卡', n: 1 },
  { id: 'walk', text: '走 {n} 米', n: 600 },
  { id: 'talk', text: '和 {n} 位街坊说话', n: 3 },
  { id: 'card', text: '收集 {n} 张美食卡', n: 2 },
  { id: 'discover', text: '路过 {n} 家没去过的店', n: 2 },
  { id: 'shop', text: '去自己的小店收 {n} 次钱', n: 1 },
  { id: 'quest', text: '完成 {n} 个街坊任务', n: 1 },
];
const STREAK = [20, 30, 40, 50, 60, 80, 150]; // 第 7 天另送 5 张卡
/* ---------- 小店 ---------- */
export const SHOP_TYPES = [
  { id: 'tea', name: '奶茶店', emoji: '🧋', color: '#8e44ad' },
  { id: 'dumpling', name: '饺子馆', emoji: '🥟', color: '#e08a1e' },
  { id: 'hotpot', name: '火锅店', emoji: '🍲', color: '#d8432f' },
  { id: 'bakery', name: '面包店', emoji: '🥐', color: '#c9962a' },
];
const SHOP_MAX = 10;
const shopRate = (lv) => 30 * lv;             // 每小时金币
const shopCapH = (lv) => 3 + lv;              // 离线最多攒几小时
const shopCost = (lv) => Math.round(120 * Math.pow(lv, 1.6));

export function setupMeta({ world, scene, D, player, sponsors, spawn, sfx, particles, onNav, onChange }) {
  const S = () => AO.Quest.state();
  const M = () => { const s = S(); s.meta = s.meta || {}; const m = s.meta; m.cards = m.cards || {}; m.seen = m.seen || {}; m.streak = m.streak || { last: null, count: 0 }; m.sets = m.sets || {}; return m; };
  const save = () => AO.Quest.save();
  const today = () => dayStr(new Date());

  /* ===== 卡池：地图上真实的餐饮店 ===== */
  const sponsorRe = sponsors.map(sp => new RegExp(sp.poi.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  const byName = new Map();
  for (const p of D.pois) {
    if (!FOOD_KIND.test(p.kind)) continue; const key = (p.zh || p.name).trim().toLowerCase(); if (byName.has(key)) continue;
    const text = `${p.name} ${p.zh || ''} ${p.cuisine || ''} ${p.kind}`.toLowerCase();
    let cat = CATS.find(c => c.id !== 'chinese' && c.re.test(text)); if (!cat) cat = /cafe|bubble_tea/.test(p.kind) ? CATS[3] : /bakery|ice_cream|confectionery/.test(p.kind) ? CATS[4] : /fast_food/.test(p.kind) ? CATS[5] : CATS[7];
    const h = strHash(key); const isSp = sponsorRe.some(r => r.test(p.name));
    const rarity = isSp ? 'legend' : (h % 100 < 8 ? 'epic' : h % 100 < 32 ? 'rare' : 'common');
    const f = world.findFront(p.x, p.y); const gx = f ? f.groundX : p.x, gz = f ? f.groundZ : p.y;
    byName.set(key, { id: 'c' + h.toString(36), name: p.zh || p.name, en: p.zh ? p.name : '', cat: cat.id, rarity, cuisine: p.cuisine || '', x: gx, z: gz });
  }
  const cards = [...byName.values()];
  const cardById = new Map(cards.map(c => [c.id, c]));
  const catOf = (id) => CATS.find(c => c.id === id);

  function giveCard(c, how) {
    const m = M(); const first = !m.cards[c.id]; m.cards[c.id] = (m.cards[c.id] || 0) + 1; save();
    event('card');
    if (first) checkSet(c.cat);
    return { kind: 'card', card: c, first, how };
  }
  function drawCards(n, r = Math.random) {
    const out = [];
    for (let k = 0; k < n; k++) {
      let roll = r() * 100, rar = 'common';
      for (const [key, v] of Object.entries(RARITY).reverse()) { if (roll < v.w) { rar = key; break; } roll -= v.w; }
      let pool = cards.filter(c => c.rarity === rar); if (!pool.length) pool = cards;
      out.push(giveCard(pool[Math.floor(r() * pool.length)], 'pack'));
    }
    return out;
  }
  function checkSet(catId) {
    const m = M(); if (m.sets[catId]) return;
    const all = cards.filter(c => c.cat === catId); if (!all.length || !all.every(c => m.cards[c.id])) return;
    m.sets[catId] = true; AO.Quest.applyEffects({ gold: 150, exp: 60 }); save();
    const cat = catOf(catId); setTimeout(() => AO.UI.toast(`${cat.emoji} 集齐「${cat.name}」全套！💰 +150`, 3000), 800);
  }
  const uniqueCount = () => Object.keys(M().cards).filter(id => cardById.has(id)).length;

  /* ===== 每日任务 ===== */
  function daily() {
    const m = M(); const d = today();
    if (!m.daily || m.daily.date !== d) {
      const r = rngOf(strHash('missions-' + d)); const pool = MISSIONS.slice(); const pick = [];
      while (pick.length < 3) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      m.daily = { date: d, list: pick.map(x => ({ id: x.id, n: x.n, p: 0, claimed: false })), bonus: false }; save();
    }
    return m.daily;
  }
  function event(id, amount = 1) {
    const dl = daily(); let changed = false;
    for (const t of dl.list) if (t.id === id && t.p < t.n) { t.p = Math.min(t.n, t.p + amount); changed = true; if (t.p >= t.n) { sfx.stamp(); AO.UI.toast(`📅 每日任务完成：${mText(t)}，去领奖励`); } }
    if (changed) { save(); renderDailyBar(); }
  }
  const mText = (t) => MISSIONS.find(x => x.id === t.id).text.replace('{n}', t.n);
  function claimMission(i) {
    const dl = daily(); const t = dl.list[i]; if (!t || t.p < t.n || t.claimed) return;
    t.claimed = true; const fx = AO.Quest.applyEffects({ gold: 30, exp: 20 }); let extra = [];
    if (dl.list.every(x => x.claimed) && !dl.bonus) { dl.bonus = true; extra = AO.Quest.applyEffects({ gold: 50 }).concat(drawCards(3)); }
    save(); sfx.coin(); renderDailyBar(); onChange && onChange();
    return fx.concat(extra);
  }

  /* ===== 连续签到 ===== */
  function streakState() {
    const m = M(); const d = today(); const y = dayStr(new Date(Date.now() - 864e5));
    const claimed = m.streak.last === d; const cont = m.streak.last === y || claimed;
    const next = claimed ? m.streak.count : (cont ? m.streak.count + 1 : 1);
    return { claimed, count: claimed ? m.streak.count : next - 1, next, broke: !cont && m.streak.count > 0 };
  }
  function claimStreak() {
    const st = streakState(); if (st.claimed) return null;
    const m = M(); m.streak = { last: today(), count: st.next };
    const idx = (st.next - 1) % 7; let fx = AO.Quest.applyEffects({ gold: STREAK[idx], exp: 10 });
    if (idx === 6) fx = fx.concat(drawCards(5));
    save(); sfx.coin(); onChange && onChange(); return fx;
  }

  /* ===== 自己的小店 ===== */
  const shopState = () => M().shop || null;
  function shopPending() {
    const sh = shopState(); if (!sh) return 0;
    const h = Math.min(shopCapH(sh.level), (Date.now() - sh.last) / 3.6e6);
    return Math.floor(h * shopRate(sh.level) * (1 + 0.02 * uniqueCount()));
  }
  // 摊位位置：Main Street 出生点附近一块空的步行街
  const stallPos = (() => {
    const ok = (x, z) => { for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (world.solidH(x + dx, z + dz) !== 0 || world.TREE[world.idx(...world.cell(x + dx, z + dz))]) return false; return world.GOOD.has(world.groundAt(x, z)); };
    for (let r = 6; r < 60; r++) for (let k = 0; k < r * 6; k++) { const a = k / (r * 6) * Math.PI * 2; const x = Math.floor(spawn.x + Math.cos(a) * r) + 0.5, z = Math.floor(spawn.z + Math.sin(a) * r) + 0.5; if (ok(x, z)) return { x, z }; }
    return { x: spawn.x + 6, z: spawn.z };
  })();
  const stall = new THREE.Group(); stall.position.set(stallPos.x, 0, stallPos.z); scene.add(stall);
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const boxM = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; stall.add(b); return b; };
  let customers = [];
  function buildStall() {
    while (stall.children.length) stall.remove(stall.children[0]);
    customers.forEach(c => scene.remove(c.root)); customers = [];
    const sh = shopState();
    if (!sh) { // 待出租的空摊位
      boxM(3, 0.1, 2, lam(0xcfc8b8), 0, 0.05, 0);
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 96, (g) => { g.fillStyle = '#fff4dc'; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#c9962a'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 90); g.fillStyle = '#7a5200'; g.font = `800 34px ${FONT}`; g.textAlign = 'center'; g.fillText('🏪 摊位招租', 128, 45); g.font = `500 22px ${FONT}`; g.fillText('走近开一家自己的店', 128, 78); }) }));
      sign.scale.set(1.9, 0.72, 1); sign.position.set(0, 2.2, 0); stall.add(sign); return;
    }
    const t = SHOP_TYPES.find(x => x.id === sh.type); const col = new THREE.Color(t.color); const lv = sh.level;
    const W = lv >= 6 ? 4.2 : 3.2;
    boxM(W, 1.05, 1, lam(0x8a5a30), 0, 0.52, 0.3);                     // 柜台
    boxM(W + 0.1, 0.1, 1.1, lam(0xf3efe6), 0, 1.1, 0.3);              // 台面
    boxM(W, 2.6, 0.2, lam(lv >= 4 ? 0xe8dbbf : 0xb9a07a), 0, 1.3, -0.9); // 后墙
    for (const s of [-1, 1]) boxM(0.15, 2.7, 0.15, lam(0x5a3a1a), s * (W / 2 - 0.08), 1.35, 0.75); // 柱子
    const awn = canvasTex(64, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : t.color; g.fillRect(i * 8, 0, 8, 16); } }, true);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.12, 1.9), [lam(t.color), lam(t.color), new THREE.MeshLambertMaterial({ map: awn }), lam(t.color), lam(t.color), lam(t.color)]); aw.position.set(0, 2.75, -0.05); aw.rotation.x = 0.12; aw.castShadow = true; stall.add(aw);
    const signTex = canvasTex(512, 128, (g) => { g.fillStyle = '#1b2a3a'; g.fillRect(0, 0, 512, 128); g.strokeStyle = t.color; g.lineWidth = 10; g.strokeRect(5, 5, 502, 118); g.font = `70px ${FONT}`; g.textBaseline = 'middle'; g.fillText(t.emoji, 22, 68); g.fillStyle = '#fff'; g.font = `800 48px ${FONT}`; g.fillText(sh.name.slice(0, 8), 110, 56); g.fillStyle = '#ffd23f'; g.font = `600 26px ${FONT}`; g.fillText(`Lv.${lv} · 店主 我`, 112, 100); });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(W, W / 4), new THREE.MeshBasicMaterial({ map: signTex })); sign.position.set(0, 3.35, 0.6); stall.add(sign);
    const sb = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, W / 4 + 0.1, 0.1), lam(0x2a2f38)); sb.position.set(0, 3.35, 0.53); stall.add(sb);
    // 柜台上的商品
    const goods = Math.min(6, 1 + Math.floor(lv / 2)); for (let i = 0; i < goods; i++) boxM(0.28, 0.32, 0.28, lam(col.clone().offsetHSL(0, 0, (i % 3) * 0.12 - 0.1).getHex()), -W / 2 + 0.45 + i * (W - 0.9) / Math.max(1, goods - 1), 1.31, 0.35);
    // 3 级起有桌椅，5 级起有霓虹灯，8 级起有二楼招牌
    if (lv >= 3) for (const s of [-1, 1]) { boxM(0.8, 0.08, 0.8, lam(0xf3efe6), s * 2.2, 0.75, 2.4); boxM(0.12, 0.72, 0.12, lam(0x5a3a1a), s * 2.2, 0.36, 2.4); boxM(0.4, 0.45, 0.4, lam(t.color), s * 2.2 + 0.7, 0.22, 2.4); }
    if (lv >= 5) { const neon = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: col })); neon.position.set(0, 3.95, 0.6); stall.add(neon); const n2 = neon.clone(); n2.position.y = 2.75; stall.add(n2); }
    if (lv >= 8) { const big = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (g) => { g.fillStyle = t.color; g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.fill(); g.lineWidth = 10; g.strokeStyle = '#ffd23f'; g.stroke(); g.font = `130px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.emoji, 128, 138); }) })); big.scale.set(1.8, 1.8, 1); big.position.set(0, 5, 0); stall.add(big); stall.userData.big = big; }
    // 排队的客人：等级越高越多
    const nC = Math.min(4, Math.floor(lv / 2)); const HOOD = [0xe23b3b, 0x2b6cb0, 0xf2c230, 0x16a085];
    for (let i = 0; i < nC; i++) { const ch = makeCharacter({ hoodie: HOOD[i % 4] }); ch.root.position.set(stallPos.x - 0.6 + (i % 2) * 1.2, 0, stallPos.z + 1.6 + Math.floor(i / 2) * 1.1); ch.root.rotation.y = Math.PI; scene.add(ch.root); customers.push(ch); }
  }
  buildStall();
  const coinSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill(); g.lineWidth = 8; g.strokeStyle = '#c99a1a'; g.stroke(); g.fillStyle = '#7a5200'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 64, 68); }), depthTest: false }));
  coinSprite.scale.set(0.9, 0.9, 1); coinSprite.renderOrder = 9; scene.add(coinSprite);

  function openShop(name, type) { const m = M(); m.shop = { type, name, level: 1, last: Date.now(), total: 0 }; save(); buildStall(); sfx.stamp(); particles.burst(stallPos.x, 1.5, stallPos.z, 50, [0xffd23f, 0xffffff], 5); onChange && onChange(); }
  function collect() {
    const v = shopPending(); const sh = shopState(); if (!sh || v <= 0) return 0;
    sh.last = Date.now(); sh.total = (sh.total || 0) + v; AO.Quest.applyEffects({ gold: v }); save();
    sfx.coin(); particles.burst(stallPos.x, 2, stallPos.z, Math.min(60, 10 + v / 5), [0xffd23f, 0xfff3a0], 4.5); event('shop'); onChange && onChange();
    return v;
  }
  function upgrade() {
    const sh = shopState(); if (!sh || sh.level >= SHOP_MAX) return false; const c = shopCost(sh.level);
    if (S().gold < c) { AO.UI.toast('金币不够，去开宝箱、做任务吧'); return false; }
    collect(); AO.Quest.applyEffects({ gold: -c }); sh.level += 1; save(); buildStall(); sfx.stamp(); particles.burst(stallPos.x, 2.5, stallPos.z, 60, [0xffd23f, 0xff5fa2, 0x5fd0ff], 6); onChange && onChange(); return true;
  }

  /* ===== 界面 ===== */
  function renderDailyBar() {
    const dl = daily(); const el = $('#dm-list'); if (!el) return;
    const done = dl.list.filter(t => t.claimed).length;
    el.innerHTML = dl.list.map(t => `<div class="dm-row ${t.claimed ? 'claimed' : t.p >= t.n ? 'ready' : ''}"><span>${t.claimed ? '✓' : t.p >= t.n ? '🎁' : '○'}</span>${mText(t)}<b>${t.id === 'walk' ? Math.floor(t.p) : t.p}/${t.n}</b></div>`).join('');
    $('#dm-head').textContent = `每日任务 ${done}/3`;
    $('#dm').classList.toggle('all', done === 3);
  }
  function rewardText(r) {
    if (r.kind === 'gold') return `💰 ${r.v > 0 ? '+' : ''}${r.v}`; if (r.kind === 'exp') return `经验 +${r.v}`; if (r.kind === 'level') return `🎉 升到 Lv.${r.v}`;
    if (r.kind === 'card') return `${catOf(r.card.cat).emoji} ${r.card.name}${r.first ? ' · 新卡' : ''}`; if (r.kind === 'coupon') return `🎟️ ${r.coupon.merchant} ${r.coupon.text}`;
    return '';
  }
  function openDaily() {
    const el = $('#panel-daily'); el.classList.remove('hidden');
    const st = streakState(); const dl = daily(); const cur = st.claimed ? st.count : st.next;
    const days = STREAK.map((g, i) => { const n = Math.floor((cur - 1) / 7) * 7 + i + 1; const got = st.claimed ? n <= st.count : n < st.next; const isToday = n === cur; return `<div class="sk-day ${got ? 'got' : ''} ${isToday ? 'today' : ''}"><div>第${n}天</div><b>${i === 6 ? '🎁' : '💰'}</b><span>${g}${i === 6 ? '+5卡' : ''}</span></div>`; }).join('');
    $('#daily-body').innerHTML = `
      <div class="sk-head">已连续签到 <b>${st.claimed ? st.count : st.next - 1}</b> 天${st.broke && !st.claimed ? '<span class="muted">（断签了，从第 1 天重新算）</span>' : ''}</div>
      <div class="sk-row">${days}</div>
      <button id="sk-claim" class="btn btn-primary" ${st.claimed ? 'disabled' : ''}>${st.claimed ? '今天已签到，明天再来' : '签到领奖励'}</button>
      <h4>每日任务 · 每天 0 点刷新</h4>
      ${dl.list.map((t, i) => `<div class="dt-row"><div><div class="dt-name">${mText(t)}</div><div class="dt-bar"><i style="width:${Math.round(100 * t.p / t.n)}%"></i></div></div><button class="btn ${t.claimed ? 'btn-ghost' : 'btn-primary'} sm" data-claim="${i}" ${t.p < t.n || t.claimed ? 'disabled' : ''}>${t.claimed ? '已领' : t.p >= t.n ? '领取' : '💰30'}</button></div>`).join('')}
      <p class="muted small">三个都领完，再送 💰50 和 3 张美食卡。</p>`;
    $('#sk-claim').onclick = async () => { const fx = claimStreak(); if (fx) { el.classList.add('hidden'); await AO.UI.rewards('签到成功 · 连续 ' + M().streak.count + ' 天', fx.map(x => ({ kind: 'raw', text: rewardText(x) }))); openDaily(); } };
    el.querySelectorAll('[data-claim]').forEach(b => b.onclick = async () => { const fx = claimMission(+b.dataset.claim); if (fx) { el.classList.add('hidden'); await AO.UI.rewards('每日任务奖励', fx.map(x => ({ kind: 'raw', text: rewardText(x) }))); openDaily(); } });
  }
  let albumCat = 'all';
  function openAlbum() {
    const el = $('#panel-album'); el.classList.remove('hidden'); const m = M();
    const got = uniqueCount();
    const tabs = [{ id: 'all', name: '全部', emoji: '📇' }].concat(CATS).map(c => { const all = cards.filter(x => c.id === 'all' || x.cat === c.id); if (!all.length) return ''; const have = all.filter(x => m.cards[x.id]).length; return `<button class="al-tab ${albumCat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.emoji} ${c.name}<small>${have}/${all.length}${m.sets[c.id] ? ' ✓' : ''}</small></button>`; }).join('');
    const list = cards.filter(x => albumCat === 'all' || x.cat === albumCat).sort((a, b) => (m.cards[b.id] ? 1 : 0) - (m.cards[a.id] ? 1 : 0) || ['legend', 'epic', 'rare', 'common'].indexOf(a.rarity) - ['legend', 'epic', 'rare', 'common'].indexOf(b.rarity));
    $('#album-body').innerHTML = `<div class="al-sum">已收集 <b>${got}</b> / ${cards.length} 家 Box Hill 美食 · 每张卡让小店收入 +2%</div><div class="al-tabs">${tabs}</div><div class="al-grid">${list.map(c => {
      const n = m.cards[c.id] || 0; const cat = catOf(c.cat);
      return n ? `<button class="fc r-${c.rarity}" data-card="${c.id}" style="--c:${cat.color}"><span class="fc-r">${RARITY[c.rarity].name}</span><span class="fc-e">${cat.emoji}</span><b>${c.name}</b>${n > 1 ? `<span class="fc-n">×${n}</span>` : ''}</button>`
        : `<button class="fc locked" data-card="${c.id}"><span class="fc-e">❔</span><b>未发现</b><small>${Math.round(Math.hypot(c.x - player.p.x, c.z - player.p.z))} 米外</small></button>`;
    }).join('')}</div><p class="muted small">走到真实的店门口会自动收集这张卡，宝箱和每日任务也会掉卡。</p>`;
    el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { albumCat = b.dataset.cat; openAlbum(); });
    el.querySelectorAll('[data-card]').forEach(b => b.onclick = () => openCard(cardById.get(b.dataset.card)));
  }
  function openCard(c) {
    const m = M(); const n = m.cards[c.id] || 0; const cat = catOf(c.cat); const el = $('#panel-card'); el.classList.remove('hidden');
    $('#card-body').innerHTML = `<div class="fc big r-${c.rarity} ${n ? '' : 'locked'}" style="--c:${cat.color}"><span class="fc-r">${RARITY[c.rarity].name}</span><span class="fc-e">${n ? cat.emoji : '❔'}</span><b>${n ? c.name : '还没发现'}</b>${n && c.en ? `<small>${c.en}</small>` : ''}<small>${cat.name}${c.cuisine ? ' · ' + c.cuisine.replace(/_/g, ' ').replace(/;/g, ' / ') : ''}</small></div>
      <p class="muted small center">${n ? `已拥有 ${n} 张` : '走到这家店门口就能收集'} · 距离 ${Math.round(Math.hypot(c.x - player.p.x, c.z - player.p.z))} 米</p>
      <div class="row"><button id="card-go" class="btn btn-primary">带我去这家店</button>${n > 1 ? '<button id="card-sell" class="btn btn-ghost">多余的换 💰10</button>' : ''}</div>`;
    $('#card-go').onclick = () => { el.classList.add('hidden'); $('#panel-album').classList.add('hidden'); onNav({ x: c.x, z: c.z, label: `去 ${cat.emoji} ${c.name}` }); };
    const sell = $('#card-sell'); if (sell) sell.onclick = () => { m.cards[c.id] -= 1; AO.Quest.applyEffects({ gold: 10 }); save(); sfx.coin(); openCard(c); onChange && onChange(); };
  }
  function openShopPanel() {
    const el = $('#panel-myshop'); el.classList.remove('hidden'); const sh = shopState();
    if (!sh) {
      $('#myshop-body').innerHTML = `<p>Main Street 上有个空摊位，开一家自己的店吧。店会一直帮你赚钱，记得常回来收钱。</p><div class="shop-grid">${SHOP_TYPES.map(t => `<button class="shop-item" data-type="${t.id}"><i class="hat-ic">${t.emoji}</i><b>${t.name}</b><span>免费开张</span></button>`).join('')}</div>`;
      el.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { const t = SHOP_TYPES.find(x => x.id === b.dataset.type); let name = (prompt('给你的店起个名字', '我的' + t.name) || '').trim(); if (!name) name = '我的' + t.name; openShop(name.slice(0, 10), t.id); el.classList.add('hidden'); AO.UI.toast(`${t.emoji} ${name} 开张了！`); onNav({ x: stallPos.x, z: stallPos.z, label: '回自己的小店' }); });
      return;
    }
    const t = SHOP_TYPES.find(x => x.id === sh.type); const p = shopPending(); const bonus = Math.round(2 * uniqueCount());
    $('#myshop-body').innerHTML = `
      <div class="ms-head" style="--c:${t.color}"><span>${t.emoji}</span><div><b>${sh.name}</b><small>Lv.${sh.level} ${t.name} · 累计赚了 💰${sh.total || 0}</small></div></div>
      <div class="ms-stats"><div><b>${shopRate(sh.level)}</b><span>每小时</span></div><div><b>+${bonus}%</b><span>美食卡加成</span></div><div><b>${shopCapH(sh.level)}h</b><span>最多攒</span></div></div>
      <div class="ms-pending">店里攒了 <b>💰 ${p}</b>${p >= Math.floor(shopCapH(sh.level) * shopRate(sh.level)) ? '<span class="muted">（攒满了，快去收）</span>' : ''}</div>
      <p class="muted small">要走到 Main Street 的摊位前才能收钱。</p>
      <div class="row"><button id="ms-go" class="btn btn-ghost">带我回店里</button><button id="ms-up" class="btn btn-primary" ${sh.level >= SHOP_MAX ? 'disabled' : ''}>${sh.level >= SHOP_MAX ? '已满级' : `升级 💰${shopCost(sh.level)}`}</button></div>
      <p class="muted small">升级加收入、加存钱上限，3 级有桌椅，5 级有霓虹灯，8 级有大招牌，客人也会越来越多。</p>`;
    $('#ms-go').onclick = () => { el.classList.add('hidden'); onNav({ x: stallPos.x, z: stallPos.z, label: '回自己的小店' }); };
    $('#ms-up').onclick = () => { if (upgrade()) { AO.UI.toast(`🎉 小店升到 Lv.${shopState().level}`); openShopPanel(); } };
  }

  /* ===== 每帧 ===== */
  let lastP = null, checkT = 0, walkAcc = 0;
  daily(); renderDailyBar();
  return {
    cards, stallPos, drawCards, event, rewardText, openDaily, openAlbum, openShopPanel, streakState, collect, shopPending, uniqueCount,
    nearStall: () => Math.hypot(stallPos.x - player.p.x, stallPos.z - player.p.z) < 3.6,
    hasShop: () => !!shopState(),
    update(dt, t, playing) {
      // 走路里程
      if (playing) { if (lastP) { const d = Math.hypot(player.p.x - lastP.x, player.p.z - lastP.z); if (d < 3) { walkAcc += d; if (walkAcc >= 10) { event('walk', walkAcc); walkAcc = 0; } } } lastP = { x: player.p.x, z: player.p.z }; }
      // 路过真实的店：发现新卡
      checkT += dt;
      if (playing && checkT > 0.3) {
        checkT = 0; const m = M();
        for (const c of cards) { if (m.cards[c.id] || m.seen[c.id]) continue; if (Math.abs(c.x - player.p.x) > 7 || Math.abs(c.z - player.p.z) > 7) continue; if (Math.hypot(c.x - player.p.x, c.z - player.p.z) > 6.5) continue;
          m.seen[c.id] = 1; const r = giveCard(c, 'walk'); event('discover'); sfx.coin(); particles.burst(c.x, 1.4, c.z, 24, [0xffffff, new THREE.Color(catOf(c.cat).color).getHex()], 3.5);
          AO.UI.toast(`📇 发现美食卡：${catOf(c.cat).emoji} ${c.name}（${RARITY[c.rarity].name}）`, 2400); onChange && onChange(); break; }
      }
      // 小店头上的金币提示
      const p = shopPending(); coinSprite.visible = p > 0; coinSprite.position.set(stallPos.x, 4.6 + Math.sin(t * 3) * 0.15 + (shopState() && shopState().level >= 8 ? 1.4 : 0), stallPos.z);
      for (const c of customers) c.animate(dt, 0);
      if (stall.userData.big) stall.userData.big.position.y = 5 + Math.sin(t * 2) * 0.1;
    },
  };
}
