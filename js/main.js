/* 澳漂世界 · 入口 */
window.AO = window.AO || {};
AO.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#e9e2d0',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER, width: '100%', height: '100%' },
  render: { antialias: true, roundPixels: true },
  input: { activePointers: 3 },
  // 调试：?loop=timeout 让游戏循环不依赖 requestAnimationFrame（页面不可见时也能跑）
  fps: { forceSetTimeOut: /loop=timeout/.test(location.search) },
  scene: [AO.SelectScene, AO.WorldScene],
});
