/* 商家核销页 */
(function () {
  const $ = (s) => document.querySelector(s);
  const SESSION = 'ao_merchant';
  let me = null, stream = null, pending = null;
  const merchants = AO.Coupon.merchants();
  const fmt = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  function loadSession() { try { const s = JSON.parse(localStorage.getItem(SESSION)); return merchants.find(m => m.id === (s && s.id)) || null; } catch (e) { return null; } }
  function showLogin(note) {
    $('#view-login').classList.remove('hidden'); $('#view-main').classList.add('hidden'); $('#btn-logout').classList.add('hidden');
    $('#store-name').textContent = ''; $('#login-note').textContent = note || '登录后即可扫码核销本店的优惠券。';
    $('#sel-store').innerHTML = merchants.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  }
  function showMain() {
    $('#view-login').classList.add('hidden'); $('#view-main').classList.remove('hidden'); $('#btn-logout').classList.remove('hidden');
    $('#store-name').textContent = me.name; renderLedger();
  }
  function login() {
    const m = merchants.find(x => x.id === $('#sel-store').value);
    if (!m || $('#inp-pin').value !== m.pin) { $('#login-err').textContent = '口令不对'; return; }
    $('#login-err').textContent = ''; $('#inp-pin').value = '';
    me = m; try { localStorage.setItem(SESSION, JSON.stringify({ id: m.id })); } catch (e) {}
    showMain();
    if (pending) { const t = pending; pending = null; handle(t); }
  }

  function renderLedger() {
    const list = AO.CouponStore.list(me.id);
    const today = new Date().toDateString();
    $('#st-today').textContent = list.filter(r => new Date(r.at).toDateString() === today).length;
    $('#st-total').textContent = list.length;
    $('#ledger').innerHTML = list.length ? list.slice(0, 50).map(r => `<div class="ledger-row"><div>${r.text}<br><span>券号 ${r.iid.toUpperCase()}</span></div><span>${fmt(r.at)}</span></div>`).join('') : '<p class="muted">还没有核销记录</p>';
  }
  function result(kind, icon, title, sub, btn) {
    const el = $('#result'); el.className = 'result ' + kind;
    el.innerHTML = `<div class="r-icon">${icon}</div><div class="r-title">${title}</div><div class="r-sub">${sub || ''}</div>${btn ? `<button class="btn" id="btn-confirm">${btn}</button>` : ''}`;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return el;
  }
  async function handle(text) {
    if (!me) { pending = text; showLogin('有一张券等待核销，请先登录门店。'); return; }
    const v = await AO.Coupon.verify(text, me.id);
    if (!v.ok) { result('bad', '✕', '不能核销', v.reason); return; }
    const used = AO.CouponStore.find(me.id, v.info.iid);
    if (used) { result('bad', '✕', '这张券已经核销过', `核销时间 ${fmt(used.at)} · 券号 ${v.info.iid.toUpperCase()}`); return; }
    const d = v.info.def;
    const el = result('ok', '🎟️', d.text, `${d.merchant}<br>${d.terms || ''}<br>券号 ${v.info.iid.toUpperCase()}`, '确认核销');
    el.querySelector('#btn-confirm').onclick = () => {
      if (AO.CouponStore.find(me.id, v.info.iid)) return;
      const rec = AO.CouponStore.add(me.id, { iid: v.info.iid, type: v.info.type, text: d.text, at: Date.now() });
      result('done', '✓', '核销成功', `${d.text} · 券号 ${rec.iid.toUpperCase()}<br>请提醒顾客在游戏里点"已在店里用掉"。`);
      renderLedger();
    };
  }

  /* ---------- 扫码 ---------- */
  function decodeImageData(img) { return window.jsQR ? jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' }) : null; }
  async function startScan() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('这个浏览器不能直接调用相机。可以用手机自带相机扫顾客的二维码，会自动打开本页。'); return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
    catch (e) { alert('没有相机权限。也可以用手机自带相机扫码，会自动打开本页。'); return; }
    const video = $('#video'); video.srcObject = stream; await video.play().catch(() => {});
    $('#scanner').classList.remove('hidden');
    const detector = ('BarcodeDetector' in window) ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
    const tick = async () => {
      if (!stream) return;
      let text = null;
      try {
        if (detector) { const r = await detector.detect(video); if (r[0]) text = r[0].rawValue; }
        else if (video.videoWidth) {
          const s = Math.min(1, 640 / video.videoWidth); canvas.width = video.videoWidth * s; canvas.height = video.videoHeight * s;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height); const r = decodeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height)); if (r) text = r.data;
        }
      } catch (e) {}
      if (text) { if (navigator.vibrate) navigator.vibrate(80); stopScan(); handle(text); } else requestAnimationFrame(tick);
    };
    tick();
  }
  function stopScan() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $('#scanner').classList.add('hidden'); }
  function decodeFile(file) {
    return new Promise((res) => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'), s = Math.min(1, 1200 / Math.max(img.width, img.height)); c.width = img.width * s; c.height = img.height * s;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, c.width, c.height); const r = decodeImageData(ctx.getImageData(0, 0, c.width, c.height)); URL.revokeObjectURL(img.src); res(r ? r.data : null);
      }; img.onerror = () => res(null); img.src = URL.createObjectURL(file);
    });
  }
  function exportCsv() {
    const rows = [['核销时间', '券号', '券种', '内容']].concat(AO.CouponStore.list(me.id).map(r => [new Date(r.at).toISOString(), r.iid, r.type, r.text]));
    const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `核销记录-${me.id}.csv`; a.click();
  }

  /* ---------- 启动 ---------- */
  $('#btn-login').onclick = login;
  $('#inp-pin').onkeydown = (e) => { if (e.key === 'Enter') login(); };
  $('#btn-logout').onclick = () => { try { localStorage.removeItem(SESSION); } catch (e) {} me = null; $('#result').classList.add('hidden'); showLogin(); };
  $('#btn-scan').onclick = startScan;
  $('#btn-scan-close').onclick = stopScan;
  $('#btn-paste').onclick = () => $('#paste-box').classList.toggle('hidden');
  $('#btn-check').onclick = () => handle($('#inp-code').value);
  $('#inp-file').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const t = await decodeFile(f); if (t) handle(t); else result('bad', '✕', '没识别到二维码', '换一张清楚点的图片试试'); };
  $('#btn-csv').onclick = exportCsv;
  window.AOMerchant = { handle, decodeFile };

  me = loadSession();
  const hashToken = location.hash.length > 1 ? location.hash.slice(1) : null;
  if (hashToken) history.replaceState(null, '', location.pathname);
  if (me) { showMain(); if (hashToken) handle(hashToken); }
  else { if (hashToken) pending = hashToken; showLogin(hashToken ? '有一张券等待核销，请先登录门店。' : null); }
})();
