/* 世界场景：真实街区的 2.5D 渲染 + 可走动角色 */
window.AO = window.AO || {};
AO.WorldScene = class extends Phaser.Scene {
  constructor() { super('World'); }
  init(data) { this.city = (data && data.city) || AO.CITIES[0]; }
  preload() { this.load.json('area', 'data/boxhill.json'); }

  create() {
    const D = this.D = this.cache.json.get('area');
    const c = D.area.center, bb = D.area.bbox;
    const mPerLat = 110574, mPerLon = 111320 * Math.cos(c.lat * Math.PI / 180);
    this.rect = { minX: (bb.w - c.lon) * mPerLon, maxX: (bb.e - c.lon) * mPerLon, minY: -(bb.n - c.lat) * mPerLat, maxY: -(bb.s - c.lat) * mPerLat };
    this.cameras.main.setBackgroundColor('#d8d1be');
    this.labels = [];
    this.buildGrid();
    this.drawGround();
    this.drawBuildings();
    this.drawPois();
    this.makeHero();
    AO.resolveContent(this.D, this.grid);
    this.drawNpcs();
    this.setupCamera();
    this.setupInput();
    this.setupHud();
    AO.Quest.flushPendingCoupons();
    AO.UI.bind({ track: (qid) => this.trackQuest(qid) });
    AO.UI.updateHud();
    this.questRing = this.add.circle(0, 0, 10).setStrokeStyle(3, 0xf2b134).setDepth(-39).setVisible(false);
    this.tweens.add({ targets: this.questRing, scale: 1.6, alpha: 0.2, duration: 900, repeat: -1 });
    this.refreshQuestMarkers();
    this.arriveT = 0;
    this.setZoom(this.scale.width < 600 ? 1.15 : 1);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
  }

  /* ---------- 可走网格 ---------- */
  buildGrid() {
    const r = this.rect;
    this.grid = new AO.Grid(r.minX, r.minY, r.maxX, r.maxY, 2);
    for (const b of this.D.buildings) this.grid.blockPolygon(b.p);
    for (const rl of this.D.rails) if (!rl.tunnel) this.grid.blockPolyline(rl.p, 3);
    for (const a of this.D.areas) if (a.kind === 'water') this.grid.blockPolygon(a.p);
  }

  pts(poly) { return poly.map(([x, y]) => { const p = AO.ISO.toScreen(x, y); return new Phaser.Math.Vector2(p.sx, p.sy); }); }

  /* ---------- 地面：公园、停车场、道路、铁路、路名 ---------- */
  drawGround() {
    const ISO = AO.ISO, P = ISO.PALETTE, S = ISO.S, r = this.rect;
    const g = this.add.graphics().setDepth(-100);
    const pad = 12, clipRect = { minX: r.minX - pad, maxX: r.maxX + pad, minY: r.minY - pad, maxY: r.maxY + pad };
    g.fillStyle(P.ground, 1);
    g.fillPoints(this.pts([[clipRect.minX, clipRect.minY], [clipRect.maxX, clipRect.minY], [clipRect.maxX, clipRect.maxY], [clipRect.minX, clipRect.maxY]]), true);
    const areaColor = { green: P.green, pitch: P.pitch, parking: P.parking, platform: P.platform, water: P.water };
    for (const a of this.D.areas) { if (!areaColor[a.kind]) continue; g.fillStyle(areaColor[a.kind], 1); g.fillPoints(this.pts(a.p), true); }
    // 道路按等级从细到粗画，先描边再填色
    const order = ['path', 'service', 'ped', 'minor', 'mid', 'major'];
    const roads = this.D.roads.filter(rd => !rd.tunnel).map(rd => ({ ...rd, pieces: ISO.clipPolyline(rd.p, clipRect) }));
    for (const cls of order) {
      const list = roads.filter(rd => rd.cls === cls);
      if (cls !== 'path') for (const rd of list) { g.lineStyle(rd.w * S + 2, P.roadEdge, 1); for (const pc of rd.pieces) g.strokePoints(this.pts(pc), false); }
      for (const rd of list) { g.lineStyle(Math.max(2, rd.w * S), P.road[cls], 1); for (const pc of rd.pieces) g.strokePoints(this.pts(pc), false); }
    }
    for (const rd of roads) if (rd.cls === 'major') { g.lineStyle(1.5, 0xf5f0e4, 0.9); for (const pc of rd.pieces) g.strokePoints(this.pts(pc), false); }
    for (const rl of this.D.rails) {
      if (rl.tunnel) continue;
      const pieces = ISO.clipPolyline(rl.p, clipRect);
      g.lineStyle(3.2 * S, P.rail, 1); for (const pc of pieces) g.strokePoints(this.pts(pc), false);
      g.lineStyle(0.8 * S, P.railLight, 1); for (const pc of pieces) g.strokePoints(this.pts(pc), false);
    }
    // 路名：每个名字取最长的一段
    const byName = new Map();
    for (const rd of roads) { if (!rd.name || !/major|mid|minor|ped/.test(rd.cls)) continue; for (const pc of rd.pieces) { const L = ISO.polyLength(pc); const cur = byName.get(rd.name); if (!cur || L > cur.L) byName.set(rd.name, { L, pc }); } }
    for (const [name, { pc, L }] of byName) {
      if (L < 60) continue;
      let best = 0, bi = 0; for (let i = 1; i < pc.length; i++) { const d = Math.hypot(pc[i][0] - pc[i - 1][0], pc[i][1] - pc[i - 1][1]); if (d > best) { best = d; bi = i; } }
      const a = ISO.toScreen(pc[bi - 1][0], pc[bi - 1][1]), b = ISO.toScreen(pc[bi][0], pc[bi][1]);
      let ang = Math.atan2(b.sy - a.sy, b.sx - a.sx); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      this.add.text((a.sx + b.sx) / 2, (a.sy + b.sy) / 2, name, { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '11px', color: '#6b6358' }).setOrigin(0.5).setRotation(ang).setDepth(-50).setAlpha(0.9);
    }
  }

  /* ---------- 建筑：逐栋生成贴图，按脚底深度排序 ---------- */
  drawBuildings() {
    const ISO = AO.ISO, P = ISO.PALETTE;
    let n = 0;
    for (const b of this.D.buildings) {
      let poly = b.p; if (poly.length > 1 && poly[0][0] === poly[poly.length - 1][0] && poly[0][1] === poly[poly.length - 1][1]) poly = poly.slice(0, -1);
      if (poly.length < 3) continue;
      const bottom = poly.map(([x, y]) => ISO.toScreen(x, y));
      const hz = ISO.heightPx(b.h);
      const top = bottom.map(p => ({ sx: p.sx, sy: p.sy - hz }));
      let minSx = Infinity, maxSx = -Infinity, minSy = Infinity, maxSy = -Infinity;
      bottom.forEach(p => { if (p.sx < minSx) minSx = p.sx; if (p.sx > maxSx) maxSx = p.sx; if (p.sy > maxSy) maxSy = p.sy; });
      top.forEach(p => { if (p.sy < minSy) minSy = p.sy; });
      const w = Math.ceil(maxSx - minSx) + 4, h = Math.ceil(maxSy - minSy) + 4;
      if (w > 4000 || h > 4000 || w < 2 || h < 2) continue;
      const ox = -minSx + 2, oy = -minSy + 2;
      const col = ISO.buildingColors(b);
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const m = poly.length;
      const edges = []; for (let i = 0; i < m; i++) { const j = (i + 1) % m; edges.push({ i, j, sy: (bottom[i].sy + bottom[j].sy) / 2 }); }
      edges.sort((e1, e2) => e1.sy - e2.sy);
      for (const { i, j } of edges) {
        const dsx = bottom[j].sx - bottom[i].sx;
        const f = dsx >= 0 ? 0.88 : 0.72;
        g.fillStyle(ISO.shade(col.wall, f), 1);
        g.beginPath(); g.moveTo(bottom[i].sx + ox, bottom[i].sy + oy); g.lineTo(bottom[j].sx + ox, bottom[j].sy + oy);
        g.lineTo(top[j].sx + ox, top[j].sy + oy); g.lineTo(top[i].sx + ox, top[i].sy + oy); g.closePath(); g.fillPath();
        g.lineStyle(1, P.outline, 0.35); g.strokePath();
      }
      g.fillStyle(col.roof, 1); g.fillPoints(top.map(p => ({ x: p.sx + ox, y: p.sy + oy })), true);
      g.lineStyle(1, P.outline, 0.6); g.strokePoints(top.map(p => ({ x: p.sx + ox, y: p.sy + oy })), true);
      const key = 'b' + (b.id || n) + '_' + n;
      g.generateTexture(key, w, h); g.destroy();
      this.add.image(minSx - 2, minSy - 2, key).setOrigin(0, 0).setDepth(maxSy);
      n++;
      // 大建筑写名字
      if (b.name && (b.h >= 10 || this.polyArea(poly) > 900)) {
        const cx = top.reduce((t, p) => t + p.sx, 0) / m, cy = top.reduce((t, p) => t + p.sy, 0) / m;
        const t = this.add.text(cx, cy, b.zh ? `${b.zh}\n${b.name}` : b.name, { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '12px', fontStyle: '700', color: '#2f2620', align: 'center', stroke: '#ffffff', strokeThickness: 3 }).setOrigin(0.5).setDepth(maxSy + 0.5);
        this.labels.push({ obj: t, always: true, pri: 1 });
      }
    }
    this.buildingCount = n;
  }
  polyArea(poly) { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a / 2); }

  /* ---------- 商家标记 ---------- */
  poiColor(kind) {
    if (/restaurant|fast_food|bubble_tea|bakery/.test(kind)) return 0xe25c3b;
    if (/cafe/.test(kind)) return 0x8b5a2b;
    if (/bank|pharmacy|clinic|dentist|chemist/.test(kind)) return 0x3aa06b;
    if (/station/.test(kind)) return 0x1b2a3a;
    if (/shop/.test(kind)) return 0x2b7fb8;
    return 0x8a94a0;
  }
  drawPois() {
    if (!this.textures.exists('pin')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 7); g.fillTriangle(3, 12, 13, 12, 8, 19);
      g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 4);
      g.generateTexture('pin', 16, 20); g.destroy();
    }
    this.poiObjs = [];
    if (!this.D.pois.some(p => p.kind === 'station')) this.D.pois.unshift({ x: 0, y: 0, name: 'Box Hill Station', zh: 'Box Hill 火车站', kind: 'station' });
    for (const poi of this.D.pois) {
      const p = AO.ISO.toScreen(poi.x, poi.y);
      const pin = this.add.image(p.sx, p.sy, 'pin').setOrigin(0.5, 1).setDepth(10000).setTint(this.poiColor(poi.kind)).setScale(0.9);
      pin.setInteractive({ useHandCursor: true, pixelPerfect: false });
      pin.on('pointerup', () => { this.consumedTap = true; this.showPoi(poi); });
      const isStation = poi.kind === 'station';
      const lbl = this.add.text(p.sx, p.sy - 20, poi.zh ? poi.zh : poi.name, { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: isStation ? '13px' : '10px', fontStyle: isStation ? '800' : '400', color: '#1b2a3a', stroke: '#ffffff', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(10001);
      const pri = isStation ? 0 : /restaurant|cafe|bubble_tea|supermarket|bank|pharmacy/.test(poi.kind) ? 2 : 3;
      this.labels.push({ obj: lbl, always: isStation, pri });
      this.poiObjs.push({ poi, pin, lbl });
      if (isStation) this.station = poi;
    }
  }
  showPoi(poi) {
    const el = document.getElementById('poi');
    document.getElementById('poi-kind').textContent = AO.ISO.kindZh(poi.kind);
    document.getElementById('poi-name').textContent = poi.zh || poi.name;
    const sub = []; if (poi.zh && poi.name !== poi.zh) sub.push(poi.name); const cz = AO.ISO.cuisineZh(poi.cuisine); if (cz) sub.push(cz);
    document.getElementById('poi-sub').textContent = sub.join(' · ');
    el.classList.remove('hidden');
    this.currentPoi = poi;
  }

  /* ---------- 角色 ---------- */
  makePerson(key, hoodie, legsApart, hair) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ add: false });
    const R = (x, y, w, h, c) => { g.fillStyle(c, 1); g.fillRect(x, y, w, h); };
    R(3, 0, 8, 3, hair || 0x2b2b2b); R(3, 3, 8, 6, 0xf1c9a5); R(5, 5, 1, 1, 0x222222); R(8, 5, 1, 1, 0x222222);
    R(2, 9, 10, 9, hoodie); R(0, 10, 2, 6, hoodie); R(12, 10, 2, 6, hoodie); R(0, 16, 2, 2, 0xf1c9a5); R(12, 16, 2, 2, 0xf1c9a5);
    R(3, 18, 8, 5, 0x2f3d50);
    if (legsApart) { R(2, 23, 3, 3, 0x2f3d50); R(9, 23, 3, 3, 0x2f3d50); R(1, 26, 4, 2, 0x222222); R(9, 26, 4, 2, 0x222222); }
    else { R(3, 23, 3, 3, 0x2f3d50); R(8, 23, 3, 3, 0x2f3d50); R(3, 26, 3, 2, 0x222222); R(8, 26, 3, 2, 0x222222); }
    g.generateTexture(key, 14, 28); g.destroy();
  }
  makeHero() {
    this.makePerson('hero0', 0x1f7a5a, false); this.makePerson('hero1', 0x1f7a5a, true);
    const start = this.spawnPoint();
    const c = this.grid.toCell(start.x, start.y), free = this.grid.nearestFree(c.cx, c.cy, 80) || c;
    const w = this.grid.toWorld(free.cx, free.cy);
    this.hero = this.add.image(0, 0, 'hero0').setOrigin(0.5, 1).setScale(1.4);
    this.heroShadow = this.add.ellipse(0, 0, 18, 8, 0x000000, 0.22);
    this.heroGhost = this.add.image(0, 0, 'hero0').setOrigin(0.5, 1).setScale(1.4).setAlpha(0.38).setDepth(20000);
    this.hero.wx = w.x; this.hero.wy = w.y;
    this.placeHero();
    this.path = []; this.animT = 0; this.frame = 0;
  }
  /* ---------- NPC ---------- */
  drawNpcs() {
    const ISO = AO.ISO; this.npcObjs = [];
    const F = 'PingFang SC, Microsoft YaHei, sans-serif';
    for (const n of AO.CONTENT.npcs) {
      const key = 'npc_' + n.id; this.makePerson(key, n.color, false, 0x4a3b2f);
      const p = ISO.toScreen(n.x, n.y);
      const img = this.add.image(p.sx, p.sy, key).setOrigin(0.5, 1).setScale(1.4).setDepth(p.sy);
      const shadow = this.add.ellipse(p.sx, p.sy - 1, 18, 8, 0x000000, 0.22).setDepth(p.sy - 0.5);
      const name = this.add.text(p.sx, p.sy - 44, n.name, { fontFamily: F, fontSize: '11px', fontStyle: '700', color: '#ffffff', backgroundColor: 'rgba(27,42,58,.75)', padding: { x: 5, y: 2 } }).setOrigin(0.5, 1).setDepth(10002);
      const mark = this.add.text(p.sx, p.sy - 62, '', { fontFamily: F, fontSize: '24px', fontStyle: '900', color: '#f2b134', stroke: '#1b2a3a', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(10003);
      this.tweens.add({ targets: mark, y: mark.y - 6, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const tap = () => { this.consumedTap = true; this.goTalk(n); };
      img.setInteractive({ useHandCursor: true }).on('pointerup', tap);
      name.setInteractive({ useHandCursor: true }).on('pointerup', tap);
      this.npcObjs.push({ n, img, name, mark, shadow });
    }
  }
  refreshQuestMarkers() {
    for (const o of this.npcObjs) {
      const act = AO.Quest.activeStepFor(o.n.id), av = AO.Quest.availableFor(o.n.id);
      o.mark.setText(act ? '?' : av.length ? '!' : '').setColor(act ? '#7ec8ff' : '#f2b134');
    }
    this.updateTracker();
  }
  trackQuest(qid) { this.tracked = qid; this.updateTracker(); }
  updateTracker() {
    let q = AO.Quest.activeQuests().find(x => x.id === this.tracked) || AO.Quest.activeQuests()[0];
    if (!q) { AO.UI.tracker(null); this.questRing.setVisible(false); this.trackTarget = null; return; }
    this.tracked = q.id;
    const ts = AO.Quest.targets().filter(t => t.q.id === q.id);
    if (!ts.length) { AO.UI.tracker(q.title + '：' + AO.Quest.objectiveText(q)); this.questRing.setVisible(false); this.trackTarget = null; return; }
    ts.sort((a, b) => Math.hypot(a.x - this.hero.wx, a.y - this.hero.wy) - Math.hypot(b.x - this.hero.wx, b.y - this.hero.wy));
    const t = ts[0]; this.trackTarget = t;
    const p = AO.ISO.toScreen(t.x, t.y); this.questRing.setPosition(p.sx, p.sy).setVisible(true);
    AO.UI.tracker(`${q.title}：${AO.Quest.objectiveText(q)}`, Math.hypot(t.x - this.hero.wx, t.y - this.hero.wy));
  }
  goTalk(n) {
    if (this.talking) return;
    const d = Math.hypot(n.x - this.hero.wx, n.y - this.hero.wy);
    if (d <= 6) { this.talk(n); return; }
    this.pendingTalk = n;
    if (!this.walkTo(n.x, n.y + 3)) this.pendingTalk = null;
  }
  async talk(n) {
    if (this.talking) return;
    this.talking = true; this.path = []; this.pendingTalk = null;
    this.hero.setFlipX(AO.ISO.toScreen(n.x - this.hero.wx, n.y - this.hero.wy).sx < 0);
    try {
      const act = AO.Quest.activeStepFor(n.id);
      if (act) await this.runStep(n, act.q, act.step);
      else {
        const av = AO.Quest.availableFor(n.id);
        if (av.length) await this.offerQuest(n, av[0]);
        else { const lines = n.idle || ['……']; const i = AO.Quest.talkCount(n.id) % lines.length; AO.Quest.noteTalk(n.id); await AO.UI.say(n, lines[i]); }
      }
    } catch (e) { console.error(e); }
    AO.UI.close(); this.talking = false; this.refreshQuestMarkers(); AO.UI.updateHud();
  }
  async offerQuest(n, q) {
    await AO.UI.say(n, q.intro);
    const i = await AO.UI.choose(n, q.ask || '接下这个任务吗？', [{ text: q.acceptText || '接了' }, { text: '我再想想' }]);
    if (i !== 0) { await AO.UI.say(n, q.declineText || '行，想好了再来。'); return; }
    AO.Quest.start(q.id); AO.UI.toast('接到任务：' + q.title); this.trackQuest(q.id);
    const step = AO.Quest.currentStep(q);
    if (step && (step.type === 'talk' || step.type === 'choice') && step.npc === n.id) await this.runStep(n, q, step);
  }
  async runStep(n, q, step) {
    if (step.type === 'talk') {
      if (step.requires && !AO.Quest.hasItems(step.requires)) { await AO.UI.say(n, step.missing || '东西还没齐。'); return; }
      await AO.UI.say(n, step.lines || []);
      const fx = AO.Quest.applyEffects(step.effects); if (fx.length) AO.UI.toast(AO.UI.fxChips(fx));
      await this.finishStep(n, q);
    } else if (step.type === 'choice') {
      const i = await AO.UI.choose(n, step.prompt, step.options);
      const o = step.options[i];
      let fx = AO.Quest.applyEffects(o.effects), retry = !!o.retry;
      if (o.roll) {
        const ok = Math.random() < AO.Quest.rollChance(o.roll); const br = ok ? o.roll.success : o.roll.fail;
        await AO.UI.say(n, br.text); fx = fx.concat(AO.Quest.applyEffects(br.effects)); if (!ok && br.retry) retry = true;
      } else if (o.result) await AO.UI.say(n, o.result);
      if (fx.length) AO.UI.toast(AO.UI.fxChips(fx));
      AO.UI.updateHud();
      if (!retry) await this.finishStep(n, q);
    }
  }
  async finishStep(n, q) {
    const r = AO.Quest.advance(q.id);
    if (r.done) { if (q.done) await AO.UI.say(n || AO.Quest.npc(q.giver), q.done); AO.UI.close(); await AO.UI.rewards('任务完成：' + q.title, r.rewards); }
    else { const next = AO.Quest.currentStep(q); if (n && next && (next.type === 'talk' || next.type === 'choice') && next.npc === n.id) await this.runStep(n, q, next); }
    this.refreshQuestMarkers(); AO.UI.updateHud();
  }
  async handleArrivals(evs) {
    if (this.talking) return; this.talking = true; this.path = [];
    try {
      for (const ev of evs) {
        if (ev.type === 'goto') {
          if (ev.step.onArrive) await AO.UI.say(null, ev.step.onArrive);
          const fx = AO.Quest.applyEffects(ev.step.effects); if (fx.length) AO.UI.toast(AO.UI.fxChips(fx));
          AO.UI.close(); await this.finishStep(null, ev.q);
        } else {
          const fx = AO.Quest.applyEffects(ev.point.effects);
          await AO.UI.say(null, { who: 'sys', text: ev.point.line || ('✓ ' + ev.point.label) });
          if (fx.length) AO.UI.toast(AO.UI.fxChips(fx));
          AO.UI.close(); if (ev.all) await this.finishStep(null, ev.q);
        }
      }
    } catch (e) { console.error(e); }
    AO.UI.close(); this.talking = false; this.refreshQuestMarkers(); AO.UI.updateHud();
  }
  spawnPoint() {
    const r = this.rect, inside = (p) => p[0] > r.minX && p[0] < r.maxX && p[1] > r.minY && p[1] < r.maxY;
    const cands = this.D.roads.filter(rd => rd.cls === 'ped' && rd.p.some(inside));
    const pick = cands.find(rd => /main street/i.test(rd.name || '')) || cands.sort((a, b) => AO.ISO.polyLength(b.p) - AO.ISO.polyLength(a.p))[0];
    if (pick) { const pts = pick.p.filter(inside); const m = pts[Math.floor(pts.length / 2)]; return { x: m[0], y: m[1] }; }
    return this.station ? { x: this.station.x, y: this.station.y + 25 } : { x: 0, y: 0 };
  }
  placeHero() {
    const p = AO.ISO.toScreen(this.hero.wx, this.hero.wy);
    this.hero.setPosition(p.sx, p.sy).setDepth(p.sy + 0.01);
    this.heroShadow.setPosition(p.sx, p.sy - 1).setDepth(p.sy - 0.5);
    this.heroGhost.setPosition(p.sx, p.sy).setTexture(this.hero.texture.key).setFlipX(this.hero.flipX);
  }
  walkTo(x, y) {
    const r = this.rect;
    x = Phaser.Math.Clamp(x, r.minX + 1, r.maxX - 1); y = Phaser.Math.Clamp(y, r.minY + 1, r.maxY - 1);
    const path = this.grid.findPath(this.hero.wx, this.hero.wy, x, y);
    if (!path || path.length < 1) { this.toast('那边走不过去'); return false; }
    this.path = path.slice(1); if (!this.path.length) this.path = path;
    const end = this.path[this.path.length - 1]; const p = AO.ISO.toScreen(end.x, end.y);
    if (this.target) this.target.destroy();
    this.target = this.add.circle(p.sx, p.sy, 7).setStrokeStyle(2, 0x1f7a5a).setDepth(-40);
    this.tweens.add({ targets: this.target, scale: 0.3, alpha: 0, duration: 700, repeat: -1 });
    this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
    return true;
  }
  update(time, delta) {
    this.handlePinch();
    this.arriveT += delta;
    if (this.arriveT > 200 && !this.talking) {
      this.arriveT = 0;
      if (this.moving) { const evs = AO.Quest.arrive(this.hero.wx, this.hero.wy); if (evs.length) this.handleArrivals(evs); if (this.trackTarget) this.updateTracker(); }
    }
    if (!this.path || !this.path.length) {
      if (this.hero && this.hero.texture.key !== 'hero0') this.hero.setTexture('hero0');
      if (this.moving) { this.moving = false; if (this.pendingTalk) { const n = this.pendingTalk; this.pendingTalk = null; if (Math.hypot(n.x - this.hero.wx, n.y - this.hero.wy) <= 8) this.talk(n); else this.toast('走不到' + n.name + '那边'); } }
      return;
    }
    this.moving = true;
    const speed = (AO.Quest.state().flags.car ? 15 : 10) * delta / 1000; // 米/帧
    let remain = speed;
    while (remain > 0 && this.path.length) {
      const t = this.path[0]; const dx = t.x - this.hero.wx, dy = t.y - this.hero.wy; const d = Math.hypot(dx, dy);
      if (d <= remain) { this.hero.wx = t.x; this.hero.wy = t.y; remain -= d; this.path.shift(); }
      else { this.hero.wx += dx / d * remain; this.hero.wy += dy / d * remain; const s = AO.ISO.toScreen(dx, dy); if (Math.abs(s.sx) > 0.1) this.hero.setFlipX(s.sx < 0); remain = 0; }
    }
    this.placeHero();
    this.animT += delta; if (this.animT > 140) { this.animT = 0; this.frame ^= 1; this.hero.setTexture(this.frame ? 'hero1' : 'hero0'); this.heroGhost.setTexture(this.hero.texture.key); }
    if (!this.path.length && this.target) { this.target.destroy(); this.target = null; }
  }

  /* ---------- 相机与输入 ---------- */
  setupCamera() {
    const r = this.rect, ISO = AO.ISO;
    const corners = [[r.minX, r.minY], [r.maxX, r.minY], [r.maxX, r.maxY], [r.minX, r.maxY]].map(([x, y]) => ISO.toScreen(x, y));
    const minSx = Math.min(...corners.map(c => c.sx)) - 300, maxSx = Math.max(...corners.map(c => c.sx)) + 300;
    const minSy = Math.min(...corners.map(c => c.sy)) - 300, maxSy = Math.max(...corners.map(c => c.sy)) + 300;
    this.cameras.main.setBounds(minSx, minSy, maxSx - minSx, maxSy - minSy);
    this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);
  }
  setZoom(z) {
    z = Phaser.Math.Clamp(z, 0.45, 2.6);
    this.cameras.main.setZoom(z);
    this.layoutLabels(z);
    if (this.poiObjs) for (const o of this.poiObjs) o.pin.setScale(Phaser.Math.Clamp(0.9 / z, 0.6, 1.4));
  }
  layoutLabels(z) {
    // 屏幕空间里的包围盒只和缩放有关，和滚动无关
    const placed = [];
    const list = this.labels.slice().sort((a, b) => a.pri - b.pri);
    for (const l of list) {
      if (!l.always && z < 0.8) { l.obj.setVisible(false); continue; }
      const o = l.obj, w = o.width * z, h = o.height * z, x = o.x * z - w * o.originX, y = o.y * z - h * o.originY;
      const rect = { x, y, w, h };
      const hit = placed.some(r => x < r.x + r.w + 4 && x + w + 4 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y);
      if (hit && !l.always) { o.setVisible(false); continue; }
      o.setVisible(true); placed.push(rect);
    }
  }
  setupInput() {
    const cam = this.cameras.main;
    this.input.on('pointerdown', (p) => { if (p.id > 1) return; this.down = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY }; this.dragging = false; this.consumedTap = false; });
    this.input.on('pointermove', (p) => {
      if (!p.isDown || !this.down || this.pinching) return;
      const dx = p.x - this.down.x, dy = p.y - this.down.y;
      if (!this.dragging && Math.hypot(dx, dy) > 8) { this.dragging = true; cam.stopFollow(); }
      if (this.dragging) { cam.scrollX = this.down.sx - dx / cam.zoom; cam.scrollY = this.down.sy - dy / cam.zoom; }
    });
    this.input.on('pointerup', (p) => {
      if (this.pinching || this.dragging || this.consumedTap || !this.down || this.talking) { this.down = null; return; }
      this.down = null;
      const wp = cam.getWorldPoint(p.x, p.y); const w = AO.ISO.toWorld(wp.x, wp.y);
      this.walkTo(w.x, w.y);
    });
    this.input.on('wheel', (p, objs, dx, dy) => this.setZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));
  }
  handlePinch() {
    const p1 = this.input.pointer1, p2 = this.input.pointer2;
    if (p1 && p2 && p1.isDown && p2.isDown) {
      const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (this.lastPinch) this.setZoom(this.cameras.main.zoom * d / this.lastPinch);
      this.lastPinch = d; this.pinching = true;
    } else if (this.pinching && !(p1.isDown || p2.isDown)) { this.pinching = false; this.lastPinch = null; }
    else if (!this.pinching) this.lastPinch = null;
  }
  setupHud() {
    document.getElementById('hud-city').textContent = this.city.name;
    document.getElementById('hud-area').textContent = this.D.area.name;
    document.getElementById('btn-back').onclick = () => { document.getElementById('poi').classList.add('hidden'); this.scene.start('Select'); };
    document.getElementById('poi-close').onclick = () => document.getElementById('poi').classList.add('hidden');
    document.getElementById('poi-go').onclick = () => { document.getElementById('poi').classList.add('hidden'); if (this.currentPoi) this.walkTo(this.currentPoi.x, this.currentPoi.y); };
  }
  toast(msg) {
    const el = document.querySelector('#hud .hint'); if (!el) return;
    const old = el.textContent; el.textContent = msg; el.style.background = '#fff4dc';
    clearTimeout(this.toastT); this.toastT = setTimeout(() => { el.textContent = old; el.style.background = ''; }, 1400);
  }
};
