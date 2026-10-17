/* 任务引擎：玩家存档、任务状态、步骤推进、效果结算
 * 步骤类型：talk(找 NPC 说话) / choice(选择，可带判定) / goto(到达某点) / collect(按任意顺序到达多个点) */
window.AO = window.AO || {};
AO.Quest = (function () {
  const SAVE = 'ao_save_v1';
  const ATTRS = [['eng', '英语'], ['net', '人脉'], ['mood', '心态'], ['luck', '运气']];
  const defaults = () => ({ attrs: { eng: 3, net: 1, mood: 5, luck: 3 }, gold: 500, level: 1, exp: 0, items: {}, flags: {}, quests: {}, log: [] });
  let S = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.attrs && s.quests) return s; } catch (e) {} return defaults(); }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} }
  function reset() { S = defaults(); save(); }
  const C = () => AO.CONTENT;
  const npc = (id) => C().npcs.find(n => n.id === id);
  const quest = (id) => C().quests.find(q => q.id === id);
  const status = (qid) => (S.quests[qid] || {}).status || 'none';
  function canStart(q) {
    if (status(q.id) !== 'none') return false;
    const r = q.requires || {};
    if ((r.quests || []).some(id => status(id) !== 'done')) return false;
    if ((r.flags || []).some(f => !S.flags[f])) return false;
    if ((r.anyFlags || []).length && !r.anyFlags.some(f => S.flags[f])) return false;
    if ((r.notFlags || []).some(f => S.flags[f])) return false;
    return true;
  }
  const availableFor = (npcId) => C().quests.filter(q => q.giver === npcId && canStart(q));
  const activeQuests = () => C().quests.filter(q => status(q.id) === 'active');
  const doneQuests = () => C().quests.filter(q => status(q.id) === 'done');
  function currentStep(q) { const st = S.quests[q.id]; return st && st.status === 'active' ? q.steps[st.step] : null; }
  function activeStepFor(npcId) {
    for (const q of activeQuests()) { const step = currentStep(q); if (step && (step.type === 'talk' || step.type === 'choice') && step.npc === npcId) return { q, step }; }
    return null;
  }
  function start(qid) { S.quests[qid] = { status: 'active', step: 0, progress: {} }; save(); return quest(qid); }
  /* 推进一步；返回 {done:true, rewards:[...]} 或 {done:false} */
  function advance(qid) {
    const st = S.quests[qid], q = quest(qid);
    st.step += 1; st.progress = {};
    if (st.step >= q.steps.length) { st.status = 'done'; const rewards = applyEffects(q.rewards); S.log.push({ t: Date.now(), q: q.id }); save(); return { done: true, rewards }; }
    save(); return { done: false };
  }
  const needExp = (l) => 50 + (l - 1) * 40;
  function applyEffects(fx) {
    const out = [];
    if (!fx) return out;
    for (const [k, name] of ATTRS) if (typeof fx[k] === 'number' && fx[k]) { S.attrs[k] = Math.max(0, Math.min(15, S.attrs[k] + fx[k])); out.push({ kind: 'attr', key: k, name, v: fx[k] }); }
    if (fx.gold) { S.gold += fx.gold; out.push({ kind: 'gold', v: fx.gold }); }
    if (fx.exp) { S.exp += fx.exp; out.push({ kind: 'exp', v: fx.exp }); while (S.exp >= needExp(S.level)) { S.exp -= needExp(S.level); S.level += 1; out.push({ kind: 'level', v: S.level }); } }
    (fx.items || []).forEach(id => { S.items[id] = (S.items[id] || 0) + 1; out.push({ kind: 'item', id }); });
    (fx.removeItems || []).forEach(id => { if (S.items[id]) { S.items[id] -= 1; if (!S.items[id]) delete S.items[id]; } });
    (fx.flags || []).forEach(f => { S.flags[f] = true; });
    (fx.unflags || []).forEach(f => { delete S.flags[f]; });
    if (fx.coupon) { const id = 'coupon_' + fx.coupon.id; S.items[id] = (S.items[id] || 0) + 1; out.push({ kind: 'coupon', coupon: fx.coupon, id }); }
    save(); return out;
  }
  function rollChance(roll) { const v = S.attrs[roll.stat] || 0; return Math.max(0.08, Math.min(0.92, 0.3 + v * 0.055 + (roll.mod || 0))); }
  const hasItems = (list) => (list || []).every(id => S.items[id] > 0);
  /* 当前所有位置型目标，供地图画标记和追踪 */
  function targets() {
    const out = [];
    for (const q of activeQuests()) {
      const st = S.quests[q.id], step = currentStep(q); if (!step) continue;
      if (step.type === 'goto') out.push({ q, step, x: step.x, y: step.y, label: step.label, radius: step.radius || 10 });
      else if (step.type === 'collect') step.points.forEach((p, i) => { if (!(st.progress.done || []).includes(i)) out.push({ q, step, x: p.x, y: p.y, label: p.label, radius: step.radius || 10, index: i }); });
      else if (step.type === 'talk' || step.type === 'choice') { const n = npc(step.npc); if (n) out.push({ q, step, x: n.x, y: n.y, label: step.label || `去找${n.name}`, radius: 6, npc: n, talk: true }); }
    }
    return out;
  }
  /* 玩家到达 (x,y)：返回触发的事件，由世界场景播放对话后再 advance */
  function arrive(x, y) {
    const evs = [];
    for (const t of targets()) {
      if (t.talk) continue;
      if (Math.hypot(t.x - x, t.y - y) > t.radius) continue;
      if (t.step.type === 'goto') evs.push({ type: 'goto', q: t.q, step: t.step });
      else { const st = S.quests[t.q.id]; st.progress.done = st.progress.done || []; st.progress.done.push(t.index); save(); const all = st.progress.done.length >= t.step.points.length; evs.push({ type: 'collect', q: t.q, step: t.step, point: t.step.points[t.index], all }); }
    }
    return evs;
  }
  function objectiveText(q) {
    const step = currentStep(q); if (!step) return '';
    if (step.type === 'collect') { const done = ((S.quests[q.id].progress || {}).done || []).length; return `${step.label}（${done}/${step.points.length}）`; }
    if (step.type === 'goto') return step.label;
    const n = npc(step.npc); return step.label || `去找${n ? n.name : ''}`;
  }
  function itemDef(id) {
    const items = C().items || {};
    if (items[id]) return items[id];
    if (id.startsWith('coupon_')) { const c = (C().coupons || {})[id.slice(7)]; return c ? { name: c.merchant + ' · ' + c.text, emoji: '🎟️', desc: c.note || '线下核销即将开放', coupon: true } : { name: '优惠券', emoji: '🎟️', coupon: true }; }
    return { name: id, emoji: '📦' };
  }
  function talkCount(npcId) { return (S.quests._talks || {})[npcId] || 0; }
  function noteTalk(npcId) { S.quests._talks = S.quests._talks || {}; S.quests._talks[npcId] = (S.quests._talks[npcId] || 0) + 1; save(); }
  return { ATTRS, state: () => S, save, reset, npc, quest, status, canStart, availableFor, activeQuests, doneQuests, currentStep, activeStepFor, start, advance, applyEffects, rollChance, hasItems, targets, arrive, objectiveText, itemDef, needExp, talkCount, noteTalk,
    allQuests: () => C().quests };
})();

/* 把内容里的锚点（poi/building/npc/xy）解析成米坐标，并挪到最近可走的格子 */
AO.resolveContent = function (D, grid) {
  const C = AO.CONTENT;
  const centroid = (poly) => { const n = poly.length; const s = poly.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]); return { x: s[0] / n, y: s[1] / n }; };
  const findPoi = (re) => D.pois.find(p => re.test(p.name) || (p.zh && re.test(p.zh)));
  const findBuilding = (re) => D.buildings.find(b => b.name && re.test(b.name));
  const free = (x, y) => { const c = grid.toCell(x, y); const f = grid.nearestFree(c.cx, c.cy, 60); return f ? grid.toWorld(f.cx, f.cy) : { x, y }; };
  const resolve = (at) => {
    if (!at) return null;
    let p = null;
    if (at.xy) p = { x: at.xy[0], y: at.xy[1] };
    else if (at.poi) { const o = findPoi(new RegExp(at.poi, 'i')); if (o) p = { x: o.x, y: o.y }; }
    else if (at.building) { const b = findBuilding(new RegExp(at.building, 'i')); if (b) p = centroid(b.p); }
    else if (at.npc) { const n = C.npcs.find(n => n.id === at.npc); if (n && n.x != null) p = { x: n.x, y: n.y }; }
    if (!p) { console.warn('anchor not found', at); p = { x: 0, y: 0 }; }
    p = { x: p.x + (at.dx || 0), y: p.y + (at.dy || 0) };
    return at.exact ? p : free(p.x, p.y);
  };
  for (const n of C.npcs) { const p = resolve(n.at); n.x = p.x; n.y = p.y; }
  for (const q of C.quests) for (const s of q.steps) {
    if (s.type === 'goto') { const p = resolve(s.at); s.x = p.x; s.y = p.y; }
    if (s.type === 'collect') for (const pt of s.points) { const p = resolve(pt.at); pt.x = p.x; pt.y = p.y; }
  }
};
