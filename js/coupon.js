/* 优惠券：券码生成、签名、校验，以及商家端核销记录
 * 券码格式：AO1.<券种>.<券实例id>.<过期日(36进制天)>.<生成时间(36进制秒)>.<签名>
 * 二维码内容是商家核销页链接 + #券码，店员用手机相机扫一下就能打开核销页。
 *
 * 原型说明：签名密钥写在前端，只能防普通篡改；核销记录存在商家手机本地，
 * 同一张券在两台商家设备上可能被各核销一次。正式版把签名和 CouponStore 换成后端即可。 */
window.AO = window.AO || {};
AO.Coupon = (function () {
  const DEMO_KEY = 'aoworld-demo-key-v1';
  const FRESH_MS = 3 * 60 * 1000;   // 二维码有效 3 分钟
  const REFRESH_MS = 60 * 1000;     // 玩家端每 60 秒刷新
  const enc = new TextEncoder();
  let keyP = null;
  const key = () => keyP || (keyP = crypto.subtle.importKey('raw', enc.encode(DEMO_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']));
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  async function sign(body) { return b64u(await crypto.subtle.sign('HMAC', await key(), enc.encode(body))).slice(0, 16); }
  const defs = () => (AO.CONTENT && AO.CONTENT.coupons) || {};
  const merchants = () => (AO.CONTENT && AO.CONTENT.merchants) || [];
  function newId() { const a = new Uint8Array(6); crypto.getRandomValues(a); return Array.from(a, b => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-2); }

  function issue(type) {
    const d = defs()[type]; if (!d) return null;
    const now = Date.now();
    return { iid: newId(), type, issued: now, expires: now + (d.validDays || 30) * 864e5, used: false };
  }
  async function makeToken(c, tsOverride) {
    const ts = Math.floor((tsOverride || Date.now()) / 1000).toString(36);
    const exp = Math.floor(c.expires / 864e5).toString(36);
    const body = `AO1.${c.type}.${c.iid}.${exp}.${ts}`;
    return body + '.' + await sign(body);
  }
  function merchantUrl(token) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return base + 'merchant.html#' + token;
  }
  function extract(text) {
    text = (text || '').trim(); const i = text.indexOf('#'); if (i >= 0) text = text.slice(i + 1);
    try { text = decodeURIComponent(text); } catch (e) {}
    return text;
  }
  /* 校验；merchantId 给了就检查是不是本店的券 */
  async function verify(text, merchantId, now = Date.now()) {
    const token = extract(text); const p = token.split('.');
    if (p.length !== 6 || p[0] !== 'AO1') return { ok: false, reason: '这不是澳漂世界的优惠券码' };
    const [, type, iid, exp, ts, sig] = p;
    if (await sign(p.slice(0, 5).join('.')) !== sig) return { ok: false, reason: '签名不对，券码可能被改过' };
    const def = defs()[type]; if (!def) return { ok: false, reason: '未知的券种' };
    const info = { type, iid, def, expires: (parseInt(exp, 36) + 1) * 864e5 - 1, ts: parseInt(ts, 36) * 1000 };
    if (merchantId && def.merchantId !== merchantId) return { ok: false, reason: `这张券属于 ${def.merchant}，不是本店的`, info };
    if (now > info.expires) return { ok: false, reason: '这张券已经过期', info };
    if (info.ts - now > 60 * 1000) return { ok: false, reason: '顾客手机时间不对，请让顾客校准时间后重试', info };
    if (now - info.ts > FRESH_MS) return { ok: false, reason: '二维码已失效。请让顾客在游戏里重新打开这张券（截图无效）', info };
    return { ok: true, info };
  }
  return { FRESH_MS, REFRESH_MS, issue, makeToken, merchantUrl, verify, extract, defs, merchants };
})();

/* 商家端核销记录。原型存本机；接后端时只需实现同样的三个方法 */
AO.CouponStore = {
  _k: (m) => 'ao_ledger_' + m,
  list(m) { try { return JSON.parse(localStorage.getItem(this._k(m))) || []; } catch (e) { return []; } },
  find(m, iid) { return this.list(m).find(r => r.iid === iid) || null; },
  add(m, rec) { const l = this.list(m); l.unshift(rec); try { localStorage.setItem(this._k(m), JSON.stringify(l)); } catch (e) {} return rec; },
};
