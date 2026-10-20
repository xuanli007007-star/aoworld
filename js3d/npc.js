/* 街坊 NPC 与任务：把任务内容里的锚点放到方块世界里，处理对话、到点、追踪 */
import * as THREE from 'three';
import { makeCharacter, canvasTex } from './props.js';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
function nameTex(n) {
  return canvasTex(256, 72, (g, w, h) => {
    g.fillStyle = 'rgba(20,30,45,.78)'; const r = 14; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, r); g.fill();
    g.fillStyle = '#ffd23f'; g.font = `800 28px ${FONT}`; g.textAlign = 'center'; g.fillText(n.name, w / 2, 34);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `500 17px ${FONT}`; g.fillText(n.role.slice(0, 14), w / 2, 58);
  });
}
function markTex(ch, color) {
  return canvasTex(128, 128, (g) => {
    g.font = `900 104px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = '#1b2a3a'; g.strokeText(ch, 64, 68); g.fillStyle = color; g.fillText(ch, 64, 68);
  });
}

export function setupQuests({ world, scene, player, D, onChange, onTalkStart, onTalkEnd, onTalk, onQuestDone }) {
  const C = AO.CONTENT;
  /* 锚点 → 坐标，并挪到最近可以站人的地面 */
  const centroid = (poly) => { const n = poly.length; const s = poly.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]); return { x: s[0] / n, y: s[1] / n }; };
  const free = (x, z) => {
    if (world.solidH(x, z) === 0) return { x, z };
    for (let r = 1; r < 90; r++) for (let k = 0; k < r * 8; k++) { const a = k / (r * 8) * Math.PI * 2; const tx = Math.floor(x + Math.cos(a) * r) + 0.5, tz = Math.floor(z + Math.sin(a) * r) + 0.5; if (world.solidH(tx, tz) === 0 && world.GOOD.has(world.groundAt(tx, tz))) return { x: tx, z: tz }; }
    return { x, z };
  };
  const resolve = (at) => {
    let p = null;
    if (at.xy) p = { x: at.xy[0], y: at.xy[1] };
    else if (at.poi) { const o = D.pois.find(q => new RegExp(at.poi, 'i').test(q.name) || (q.zh && new RegExp(at.poi, 'i').test(q.zh))); if (o) p = { x: o.x, y: o.y }; }
    else if (at.building) { const b = D.buildings.find(b => b.name && new RegExp(at.building, 'i').test(b.name)); if (b) p = centroid(b.p); }
    else if (at.npc) { const n = C.npcs.find(n => n.id === at.npc); if (n && n.x != null) return { x: n.x, z: n.y }; }
    if (!p) { console.warn('anchor not found', at); p = { x: 0, y: 0 }; }
    // 在建筑里的点，先找它的店门
    if (world.solidH(p.x, p.y) > 0) { const f = world.findFront(p.x, p.y); if (f) p = { x: f.groundX, y: f.groundZ }; }
    const q = free(p.x + (at.dx || 0) * 0.3, p.y + (at.dy || 0) * 0.3); return q;
  };
  for (const n of C.npcs) { const p = resolve(n.at); n.x = p.x; n.y = p.z; }
  for (const q of C.quests) for (const s of q.steps) {
    if (s.type === 'goto') { const p = resolve(s.at); s.x = p.x; s.y = p.z; }
    if (s.type === 'collect') for (const pt of s.points) { const p = resolve(pt.at); pt.x = p.x; pt.y = p.z; }
  }

  /* NPC 方块人 */
  const EX = markTex('!', '#ffd23f'), QU = markTex('?', '#7ec8ff');
  const npcs = C.npcs.map(n => {
    const ch = makeCharacter({ hoodie: n.color, hair: 0x3a2b20 }); ch.root.position.set(n.x, world.solidH(n.x, n.y), n.y); ch.root.rotation.y = Math.random() * 6; scene.add(ch.root);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex(n), depthTest: true })); tag.scale.set(2.2, 0.62, 1); tag.position.set(0, 2.45, 0); ch.root.add(tag);
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: EX, depthTest: false })); mark.scale.set(0.9, 0.9, 1); mark.position.set(0, 3.25, 0); mark.renderOrder = 10; ch.root.add(mark);
    return { n, ch, tag, mark, t: Math.random() * 6 };
  });

  /* 任务目标的金色光柱 */
  const tgtBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 40, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  const tgtRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  tgtRing.rotation.x = -Math.PI / 2; tgtBeam.visible = tgtRing.visible = false; scene.add(tgtBeam, tgtRing);

  let tracked = null, busy = false, arriveT = 0;
  function refreshMarks() {
    for (const o of npcs) {
      const act = AO.Quest.activeStepFor(o.n.id), av = AO.Quest.availableFor(o.n.id);
      o.mark.visible = !!(act || av.length); o.mark.material.map = act ? QU : EX;
    }
    onChange && onChange();
  }
  function trackedQuest() { const act = AO.Quest.activeQuests(); return act.find(q => q.id === tracked) || act[0] || null; }
  /* 当前追踪的目标：{text, x, z} */
  function guide() {
    const q = trackedQuest();
    if (!q) {
      let best = null; for (const o of npcs) { const av = AO.Quest.availableFor(o.n.id); if (!av.length) continue; const main = av.some(q => q.type === 'main'); const d = Math.hypot(o.n.x - player.p.x, o.n.y - player.p.z) - (main ? 10000 : 0); if (!best || d < best.d) best = { o, d }; }
      return best ? { text: `找${best.o.n.name}接任务`, x: best.o.n.x, z: best.o.n.y, talk: true } : null;
    }
    const ts = AO.Quest.targets().filter(t => t.q.id === q.id); if (!ts.length) return { text: q.title + '：' + AO.Quest.objectiveText(q) };
    const px = player.p.x, pz = player.p.z;
    ts.sort((a, b) => Math.hypot(a.x - px, a.y - pz) - Math.hypot(b.x - px, b.y - pz));
    const t = ts[0]; return { text: AO.Quest.objectiveText(q), x: t.x, z: t.y, talk: !!t.talk };
  }
  function nearestNpc(r = 3.2) { let best = null; for (const o of npcs) { const d = Math.hypot(o.n.x - player.p.x, o.n.y - player.p.z); if (d < r && (!best || d < best.d)) best = { o, d }; } return best && best.o; }

  async function talk(o) {
    if (busy) return; busy = true; onTalkStart && onTalkStart();
    onTalk && onTalk(o.n);
    const n = o.n; o.ch.root.rotation.y = Math.atan2(player.p.x - n.x, player.p.z - n.y);
    try {
      const act = AO.Quest.activeStepFor(n.id);
      if (act) await runStep(n, act.q, act.step);
      else {
        const av = AO.Quest.availableFor(n.id);
        if (av.length) await offer(n, av[0]);
        else { const lines = n.idle || ['……']; const i = AO.Quest.talkCount(n.id) % lines.length; AO.Quest.noteTalk(n.id); await AO.UI.say(n, lines[i]); }
      }
    } catch (e) { console.error(e); }
    AO.UI.close(); busy = false; refreshMarks(); onTalkEnd && onTalkEnd();
  }
  async function offer(n, q) {
    await AO.UI.say(n, q.intro);
    const i = await AO.UI.choose(n, q.ask || '接下这个任务吗？', [{ text: q.acceptText || '接了' }, { text: '我再想想' }]);
    if (i !== 0) { await AO.UI.say(n, q.declineText || '行，想好了再来。'); return; }
    AO.Quest.start(q.id); AO.UI.toast('接到任务：' + q.title); tracked = q.id;
    const step = AO.Quest.currentStep(q);
    if (step && (step.type === 'talk' || step.type === 'choice') && step.npc === n.id) await runStep(n, q, step);
  }
  async function runStep(n, q, step) {
    if (step.type === 'talk') {
      if (step.requires && !AO.Quest.hasItems(step.requires)) { await AO.UI.say(n, step.missing || '东西还没齐。'); return; }
      await AO.UI.say(n, step.lines || []);
      const fx = AO.Quest.applyEffects(step.effects); if (fx.length) AO.UI.toast(AO.UI.fxChips(fx));
      await finish(n, q);
    } else if (step.type === 'choice') {
      const i = await AO.UI.choose(n, step.prompt, step.options); const o = step.options[i];
      let fx = AO.Quest.applyEffects(o.effects), retry = !!o.retry;
      if (o.roll) { const ok = Math.random() < AO.Quest.rollChance(o.roll); const br = ok ? o.roll.success : o.roll.fail; await AO.UI.say(n, br.text); fx = fx.concat(AO.Quest.applyEffects(br.effects)); if (!ok && br.retry) retry = true; }
      else if (o.result) await AO.UI.say(n, o.result);
      if (fx.length) AO.UI.toast(AO.UI.fxChips(fx));
      if (!retry) await finish(n, q);
    }
  }
  async function finish(n, q) {
    const r = AO.Quest.advance(q.id);
    if (r.done) { onQuestDone && onQuestDone(q); if (q.done) await AO.UI.say(n || AO.Quest.npc(q.giver), q.done); AO.UI.close(); await AO.UI.rewards('任务完成：' + q.title, r.rewards); }
    else { const next = AO.Quest.currentStep(q); if (n && next && (next.type === 'talk' || next.type === 'choice') && next.npc === n.id) await runStep(n, q, next); }
    refreshMarks();
  }
  async function arrivals(evs) {
    busy = true; onTalkStart && onTalkStart();
    try {
      for (const ev of evs) {
        if (ev.type === 'goto') { if (ev.step.onArrive) await AO.UI.say(null, ev.step.onArrive); const fx = AO.Quest.applyEffects(ev.step.effects); if (fx.length) AO.UI.toast(AO.UI.fxChips(fx)); AO.UI.close(); await finish(null, ev.q); }
        else { const fx = AO.Quest.applyEffects(ev.point.effects); await AO.UI.say(null, { who: 'sys', text: ev.point.line || ('✓ ' + ev.point.label) }); if (fx.length) AO.UI.toast(AO.UI.fxChips(fx)); AO.UI.close(); if (ev.all) await finish(null, ev.q); }
      }
    } catch (e) { console.error(e); }
    AO.UI.close(); busy = false; refreshMarks(); onTalkEnd && onTalkEnd();
  }

  refreshMarks();
  return {
    npcs, talk, nearestNpc, guide, refreshMarks, get busy() { return busy; }, track(id) { tracked = id; },
    update(dt, t, canArrive) {
      for (const o of npcs) { o.mark.position.y = 3.25 + Math.sin(t * 3 + o.t) * 0.12; o.ch.animate(dt, 0); }
      const g = guide();
      if (g && g.x != null && !g.talk) { tgtBeam.visible = tgtRing.visible = true; tgtBeam.position.set(g.x, 20, g.z); tgtRing.position.set(g.x, 0.06, g.z); tgtRing.scale.setScalar(1 + Math.sin(t * 4) * 0.12); }
      else tgtBeam.visible = tgtRing.visible = false;
      arriveT += dt;
      if (canArrive && !busy && arriveT > 0.2) { arriveT = 0; const evs = AO.Quest.arrive(player.p.x, player.p.z); if (evs.length) arrivals(evs); }
    },
  };
}
