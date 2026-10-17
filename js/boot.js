/* 顺序加载 Phaser（主 CDN 失败时换备用）和游戏脚本 */
(function () {
  const PHASER = [
    'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.80.1/phaser.min.js',
    'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js',
  ];
  const GAME = ['js/iso.js', 'js/pathfind.js', 'js/quests.js', 'js/content_boxhill.js', 'js/ui.js', 'js/scene_select.js', 'js/scene_world.js', 'js/main.js'];
  function load(src) {
    return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error(src)); document.head.appendChild(s); });
  }
  (async () => {
    let got = false;
    for (const u of PHASER) { try { await load(u); got = true; break; } catch (e) { console.warn('phaser cdn failed', u); } }
    if (!got) { document.getElementById('loading').innerHTML = '引擎加载失败，请检查网络后刷新'; return; }
    for (const u of GAME) await load(u);
  })();
})();
