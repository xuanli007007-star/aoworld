/* 对话面板、任务面板、背包、HUD（全部是叠在画布上的 HTML） */
window.AO = window.AO || {};
AO.UI = (function () {
  const $ = (s) => document.querySelector(s);
  let resolver = null, typing = null, fullText = '';

  function portrait(npc) { return npc ? npc.emoji : '🧑'; }
  function typeText(el, text) {
    clearInterval(typing); fullText = text; el.textContent = ''; let i = 0;
    typing = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing); typing = null; } }, 18);
  }
  /* 逐句显示；每句 {who:'npc'|'me'|'sys', text} 或字符串(=npc) */
  function say(npc, lines) {
    const list = (Array.isArray(lines) ? lines : [lines]).map(l => typeof l === 'string' ? { who: 'npc', text: l } : l);
    return new Promise(async (done) => {
      for (const l of list) await showLine(npc, l);
      done();
    });
  }
  function showLine(npc, line) {
    return new Promise((res) => {
      const box = $('#dialog'); box.classList.remove('hidden'); document.body.classList.add('talking'); $('#dialog-options').innerHTML = ''; $('#dialog-next').classList.remove('hidden');
      const who = line.who || 'npc';
      $('#dialog-portrait').textContent = who === 'me' ? '🙋' : who === 'sys' ? '📍' : portrait(npc);
      $('#dialog-name').textContent = who === 'me' ? '我' : who === 'sys' ? '' : (npc ? npc.name : '');
      $('#dialog-role').textContent = who === 'npc' && npc ? npc.role : '';
      typeText($('#dialog-text'), line.text);
      resolver = () => { if (typing) { clearInterval(typing); typing = null; $('#dialog-text').textContent = fullText; return; } resolver = null; res(); };
    });
  }
  /* 选项；返回选中的下标 */
  function choose(npc, prompt, options) {
    return new Promise(async (res) => {
      if (prompt) await showLine(npc, typeof prompt === 'string' ? { who: 'npc', text: prompt } : prompt);
      const box = $('#dialog'); box.classList.remove('hidden'); $('#dialog-next').classList.add('hidden');
      $('#dialog-text').textContent = fullText;
      const opts = $('#dialog-options'); opts.innerHTML = '';
      options.forEach((o, i) => {
        const b = document.createElement('button'); b.className = 'dialog-opt';
        let hint = o.hint || '';
        if (o.roll) { const p = Math.round(AO.Quest.rollChance(o.roll) * 100); const an = AO.Quest.ATTRS.find(a => a[0] === o.roll.stat); hint = `${an ? an[1] : ''}判定 · 成功率约 ${p}%` + (hint ? ' · ' + hint : ''); }
        if (o.cost) hint = `花费 $${o.cost}` + (hint ? ' · ' + hint : '');
        b.innerHTML = o.text + (hint ? `<small>${hint}</small>` : '');
        if (o.cost && AO.Quest.state().gold < o.cost) { b.disabled = true; b.innerHTML += '<small>金币不够</small>'; }
        b.onclick = (e) => { e.stopPropagation(); opts.innerHTML = ''; resolver = null; res(i); };
        opts.appendChild(b);
      });
      resolver = null;
    });
  }
  function close() { clearInterval(typing); typing = null; resolver = null; $('#dialog').classList.add('hidden'); document.body.classList.remove('talking'); }
  function toast(text, ms = 1800) {
    const el = $('#toast'); el.textContent = text; el.classList.remove('hidden'); el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.classList.add('hidden'), 300); }, ms);
  }
  function rewardText(r) {
    if (r.kind === 'raw') return r.text;
    if (r.kind === 'card') return `📇 ${r.card.name}${r.first ? ' · 新卡' : ''}`;
    if (r.kind === 'attr') return `${r.name} ${r.v > 0 ? '+' : ''}${r.v}`;
    if (r.kind === 'gold') return `💰 ${r.v > 0 ? '+' : ''}${r.v}`;
    if (r.kind === 'exp') return `经验 +${r.v}`;
    if (r.kind === 'level') return `🎉 升到 Lv.${r.v}`;
    if (r.kind === 'item') { const d = AO.Quest.itemDef(r.id); return `${d.emoji} 获得 ${d.name}`; }
    if (r.kind === 'coupon') return `🎟️ ${r.coupon.merchant} ${r.coupon.text}（在背包里出示）`;
    return '';
  }
  function rewards(title, list) {
    return new Promise((res) => {
      const el = $('#reward'); $('#reward-title').textContent = title;
      $('#reward-list').innerHTML = list.map(r => `<li>${rewardText(r)}</li>`).join('') || '<li>无</li>';
      el.classList.remove('hidden');
      $('#reward-ok').onclick = () => { el.classList.add('hidden'); res(); };
    });
  }
  function fxChips(list) { return list.filter(r => r.kind !== 'level').map(rewardText).filter(Boolean).join(' · '); }

  /* HUD */
  function updateHud() {
    const S = AO.Quest.state();
    $('#hud-stats').innerHTML = `<b>Lv.${S.level}</b> <span class="bar"><i style="width:${Math.round(100 * S.exp / AO.Quest.needExp(S.level))}%"></i></span> 💰${S.gold} · 英${S.attrs.eng} 脉${S.attrs.net} 心${S.attrs.mood} 运${S.attrs.luck}`;
    const n = AO.Quest.activeQuests().length; const badge = $('#quest-badge'); badge.textContent = n; badge.classList.toggle('hidden', !n);
  }
  function tracker(text, dist) {
    const el = $('#tracker');
    if (!text) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden'); el.innerHTML = `📜 ${text}${dist != null ? ` <span class="dist">${Math.round(dist)} m</span>` : ''}`;
  }
  /* 任务面板 */
  function openQuests(onTrack) {
    const el = $('#panel-quests'); el.classList.remove('hidden');
    const act = AO.Quest.activeQuests(), done = AO.Quest.doneQuests();
    const avail = AO.Quest.allQuests().filter(q => AO.Quest.canStart(q));
    const item = (q, body, cls) => `<div class="q ${cls}"><div class="q-title">${q.type === 'main' ? '<span class="tag main">主线</span>' : '<span class="tag">支线</span>'}${q.title}</div><div class="q-body">${body}</div></div>`;
    $('#quests-body').innerHTML =
      `<h4>进行中 ${act.length}</h4>` + (act.map(q => item(q, `▸ ${AO.Quest.objectiveText(q)} <button class="link" data-track="${q.id}">追踪</button>`, 'active')).join('') || '<p class="muted">没有进行中的任务</p>') +
      `<h4>可接 ${avail.length}</h4>` + (avail.map(q => item(q, `去找 ${AO.Quest.npc(q.giver).name} · ${AO.Quest.npc(q.giver).role}`, 'avail')).join('') || '<p class="muted">暂时没有新任务，先把手头的做完</p>') +
      `<h4>已完成 ${done.length}</h4>` + (done.map(q => item(q, '✓', 'done')).join('') || '<p class="muted">还没有</p>');
    el.querySelectorAll('[data-track]').forEach(b => b.onclick = () => { el.classList.add('hidden'); onTrack && onTrack(b.dataset.track); });
  }
  function couponState(c) { if (c.used) return 'used'; if (Date.now() > c.expires) return 'expired'; return 'ok'; }
  const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function openBag() {
    const el = $('#panel-bag'); el.classList.remove('hidden');
    const S = AO.Quest.state(); const ids = Object.keys(S.items);
    const coupons = (S.coupons || []).slice().sort((a, b) => (couponState(a) === 'ok' ? 0 : 1) - (couponState(b) === 'ok' ? 0 : 1) || b.issued - a.issued);
    const cHtml = coupons.map(c => {
      const d = AO.Coupon.defs()[c.type] || { merchant: '?', text: '' }; const st = couponState(c);
      const tag = st === 'used' ? '已使用' : st === 'expired' ? '已过期' : `有效期至 ${fmtDate(c.expires)}`;
      return `<button class="coupon-card ${st}" data-iid="${c.iid}"><div class="cc-left">🎟️</div><div class="cc-main"><div class="cc-merchant">${d.merchant}</div><div class="cc-text">${d.text}</div><div class="cc-tag">${tag}</div></div><div class="cc-go">${st === 'ok' ? '出示 ›' : ''}</div></button>`;
    }).join('');
    const iHtml = ids.map(id => { const d = AO.Quest.itemDef(id); return `<div class="item"><div class="item-emoji">${d.emoji}</div><div><div class="item-name">${d.name}${S.items[id] > 1 ? ` ×${S.items[id]}` : ''}</div><div class="item-desc">${d.desc || ''}</div></div></div>`; }).join('');
    $('#bag-body').innerHTML =
      `<h4>优惠券 ${coupons.filter(c => couponState(c) === 'ok').length}</h4>` + (cHtml || '<p class="muted">做任务可以拿到真实商家的优惠券。</p>') +
      `<h4>道具 ${ids.length}</h4>` + (iHtml || '<p class="muted">背包是空的。去 Main Street 找老张吧。</p>');
    el.querySelectorAll('.coupon-card').forEach(b => b.onclick = () => openCoupon(b.dataset.iid));
  }
  function drawQR(canvas, text) {
    const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), size = canvas.width, m = 3, cell = size / (n + m * 2), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#1b2a3a';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(Math.floor((c + m) * cell), Math.floor((r + m) * cell), Math.ceil(cell), Math.ceil(cell));
  }
  let cpTimer = null;
  async function openCoupon(iid) {
    const S = AO.Quest.state(); const c = S.coupons.find(x => x.iid === iid); if (!c) return;
    const d = AO.Coupon.defs()[c.type]; const st = couponState(c);
    $('#panel-bag').classList.add('hidden');
    const el = $('#panel-coupon'); el.classList.remove('hidden');
    $('#cp-merchant').textContent = d.merchant; $('#cp-text').textContent = d.text;
    $('#cp-terms').textContent = `${d.terms || ''} · 有效期至 ${fmtDate(c.expires)} · 券号 ${c.iid.toUpperCase()}`;
    $('#cp-wrap').classList.toggle('void', st !== 'ok'); $('#cp-void').textContent = st === 'used' ? '已使用' : st === 'expired' ? '已过期' : '';
    $('#cp-used').classList.toggle('hidden', st !== 'ok');
    clearInterval(cpTimer);
    if (st !== 'ok') { $('#cp-timer').textContent = ''; drawQR($('#cp-canvas'), 'void'); return; }
    let nextAt = 0;
    const tick = async () => {
      if (el.classList.contains('hidden')) { clearInterval(cpTimer); return; }
      const now = Date.now();
      if (now >= nextAt) { nextAt = now + AO.Coupon.REFRESH_MS; const token = await AO.Coupon.makeToken(c); el.dataset.token = token; drawQR($('#cp-canvas'), AO.Coupon.merchantUrl(token)); }
      $('#cp-timer').textContent = `动态码 · ${Math.ceil((nextAt - now) / 1000)} 秒后刷新 · 截图无效`;
    };
    await tick(); cpTimer = setInterval(tick, 1000);
    $('#cp-used').onclick = () => { if (!confirm('确认这张券已经在店里用掉了？')) return; AO.Quest.markCouponUsed(c.iid); clearInterval(cpTimer); el.classList.add('hidden'); toast('已标记为使用'); openBag(); };
  }
  function bind(handlers) {
    $('#dialog').onclick = () => { if (resolver) resolver(); };
    $('#btn-quests').onclick = () => openQuests(handlers.track);
    $('#btn-bag').onclick = openBag;
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $(b.dataset.close).classList.add('hidden'));

  }
  return { say, choose, close, toast, rewards, fxChips, updateHud, tracker, openQuests, openBag, openCoupon, drawQR, bind };
})();
