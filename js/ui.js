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
    if (r.kind === 'attr') return `${r.name} ${r.v > 0 ? '+' : ''}${r.v}`;
    if (r.kind === 'gold') return `💰 ${r.v > 0 ? '+' : ''}${r.v}`;
    if (r.kind === 'exp') return `经验 +${r.v}`;
    if (r.kind === 'level') return `🎉 升到 Lv.${r.v}`;
    if (r.kind === 'item') { const d = AO.Quest.itemDef(r.id); return `${d.emoji} 获得 ${d.name}`; }
    if (r.kind === 'coupon') return `🎟️ 优惠券：${r.coupon.merchant} ${r.coupon.text}`;
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
  function openBag() {
    const el = $('#panel-bag'); el.classList.remove('hidden');
    const S = AO.Quest.state(); const ids = Object.keys(S.items);
    $('#bag-body').innerHTML = ids.length ? ids.map(id => { const d = AO.Quest.itemDef(id); return `<div class="item ${d.coupon ? 'coupon' : ''}"><div class="item-emoji">${d.emoji}</div><div><div class="item-name">${d.name}${S.items[id] > 1 ? ` ×${S.items[id]}` : ''}</div><div class="item-desc">${d.desc || ''}</div></div></div>`; }).join('') : '<p class="muted">背包是空的。去 Main Street 找老张吧。</p>';
  }
  function bind(handlers) {
    $('#dialog').onclick = () => { if (resolver) resolver(); };
    $('#btn-quests').onclick = () => openQuests(handlers.track);
    $('#btn-bag').onclick = openBag;
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => $(b.dataset.close).classList.add('hidden'));
    $('#btn-reset').onclick = () => { if (confirm('清空存档，从头开始？')) { AO.Quest.reset(); location.reload(); } };
  }
  return { say, choose, close, toast, rewards, fxChips, updateHud, tracker, openQuests, openBag, bind };
})();
