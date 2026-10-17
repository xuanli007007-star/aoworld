/* 起始地选择：一张手绘风澳洲地图 */
window.AO = window.AO || {};
AO.CITIES = [
  { id: 'melbourne', name: '墨尔本', en: 'Melbourne', lon: 144.96, lat: -37.81, open: true, area: 'Box Hill' },
  { id: 'sydney', name: '悉尼', en: 'Sydney', lon: 151.21, lat: -33.87 },
  { id: 'brisbane', name: '布里斯班', en: 'Brisbane', lon: 153.03, lat: -27.47 },
  { id: 'perth', name: '珀斯', en: 'Perth', lon: 115.86, lat: -31.95 },
  { id: 'adelaide', name: '阿德莱德', en: 'Adelaide', lon: 138.60, lat: -34.93 },
  { id: 'canberra', name: '堪培拉', en: 'Canberra', lon: 149.13, lat: -35.28 },
  { id: 'goldcoast', name: '黄金海岸', en: 'Gold Coast', lon: 153.40, lat: -28.02 },
  { id: 'hobart', name: '霍巴特', en: 'Hobart', lon: 147.33, lat: -42.88 },
  { id: 'darwin', name: '达尔文', en: 'Darwin', lon: 130.84, lat: -12.46 },
];
// 粗略海岸线（经度, 纬度）
AO.AU_OUTLINE = [[142.5,-10.7],[143.8,-14.5],[145.3,-15.3],[145.5,-16.5],[146.3,-18.8],[147.4,-19.4],[149.2,-21.1],[150.5,-23.4],[151.9,-24.8],[153.1,-26.0],[153.4,-27.6],[153.6,-28.6],[153.1,-30.3],[152.4,-31.8],[151.2,-33.9],[150.9,-34.6],[150.1,-36.5],[149.9,-37.5],[148.3,-37.8],[147.0,-38.3],[146.4,-39.1],[145.5,-38.5],[144.9,-38.2],[144.5,-38.1],[143.6,-38.8],[141.6,-38.4],[140.9,-38.0],[139.7,-37.0],[139.8,-36.0],[138.5,-35.6],[138.0,-34.6],[137.3,-35.0],[136.5,-34.6],[135.8,-34.8],[135.0,-33.5],[134.0,-32.6],[132.0,-31.8],[129.0,-31.6],[126.0,-32.3],[124.0,-33.6],[121.5,-33.9],[118.0,-35.0],[116.0,-34.8],[115.0,-34.3],[115.1,-33.0],[115.7,-31.9],[114.9,-30.0],[114.2,-28.4],[113.5,-26.0],[113.9,-24.4],[114.1,-22.0],[116.5,-20.7],[118.6,-20.3],[121.0,-19.0],[122.2,-18.0],[123.5,-17.2],[124.0,-16.3],[125.2,-15.0],[126.7,-14.0],[128.0,-15.0],[129.5,-14.9],[130.0,-13.0],[130.8,-12.4],[132.5,-11.5],[134.2,-12.0],[136.0,-12.1],[136.7,-12.2],[136.0,-13.8],[136.3,-14.9],[135.5,-15.0],[137.2,-16.0],[139.3,-17.5],[140.5,-17.6],[141.5,-15.5],[141.8,-13.0],[142.5,-10.7]];
AO.TAS_OUTLINE = [[144.7,-40.7],[146.5,-41.1],[148.2,-40.9],[148.3,-42.2],[147.9,-43.3],[146.0,-43.6],[145.2,-42.3],[144.7,-40.7]];

AO.SelectScene = class extends Phaser.Scene {
  constructor() { super('Select'); }
  create() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    this.cameras.main.setBackgroundColor('#cfe5f0');
    this.entering = false;
    this.build();
    // 窗口尺寸变化时重排，防抖；场景关闭时移除监听，避免监听器越积越多
    let timer = null;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(() => { if (this.scene.isActive() && !this.entering) { this.children.removeAll(true); this.build(); } }, 150); };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => { clearTimeout(timer); this.scale.off('resize', onResize); });
  }
  proj() {
    const W = this.scale.width, H = this.scale.height;
    const lonMin = 112.5, lonMax = 154.5, latMin = -44.5, latMax = -9.5;
    const pad = 28, top = Math.min(150, H * 0.2);
    const sx = (W - pad * 2) / (lonMax - lonMin), sy = (H - top - 120) / (latMax - latMin);
    const s = Math.min(sx, sy);
    const ox = (W - (lonMax - lonMin) * s) / 2, oy = top + ((H - top - 120) - (latMax - latMin) * s) / 2;
    return (lon, lat) => ({ x: ox + (lon - lonMin) * s, y: oy + (latMax - lat) * s });
  }
  build() {
    const W = this.scale.width, P = this.proj();
    this.add.text(W / 2, 34, '澳漂世界', { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '36px', fontStyle: '800', color: '#1b2a3a' }).setOrigin(0.5);
    this.add.text(W / 2, 70, 'AUSSIE LIFE · 真实地图 2.5D 原型', { fontSize: '12px', color: '#1f7a5a', letterSpacing: 2 }).setOrigin(0.5);
    this.add.text(W / 2, 96, '选择你的起始地', { fontSize: '15px', color: '#4a5a6a' }).setOrigin(0.5);
    const g = this.add.graphics();
    const draw = (outline, fill) => {
      const pts = outline.map(([lon, lat]) => P(lon, lat));
      g.fillStyle(0x000000, 0.08); g.fillPoints(pts.map(p => ({ x: p.x + 6, y: p.y + 8 })), true);
      g.fillStyle(fill, 1); g.fillPoints(pts, true);
      g.lineStyle(2, 0xb9875a, 1); g.strokePoints(pts, true);
    };
    draw(AO.AU_OUTLINE, 0xe8c99a); draw(AO.TAS_OUTLINE, 0xe8c99a);
    const votes = JSON.parse(localStorage.getItem('ao_votes') || '{}');
    for (const c of AO.CITIES) {
      const p = P(c.lon, c.lat);
      const dot = this.add.circle(p.x, p.y, c.open ? 9 : 6, c.open ? 0x1f7a5a : 0x8a94a0).setStrokeStyle(2, 0xffffff);
      const lbl = this.add.text(p.x, p.y + 12, c.open ? `${c.name} · ${c.area} 已开放` : `${c.name} · 即将开放${votes[c.id] ? ' · ' + votes[c.id] + ' 票' : ''}`,
        { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: c.open ? '13px' : '11px', color: c.open ? '#1f7a5a' : '#4a5a6a', fontStyle: c.open ? '700' : '400', backgroundColor: 'rgba(255,255,255,.75)', padding: { x: 4, y: 2 } }).setOrigin(0.5, 0);
      if (c.id === 'perth') lbl.setOrigin(0, 0.5).setPosition(p.x + 10, p.y);
      if (c.id === 'darwin') lbl.setOrigin(0.5, 1).setPosition(p.x, p.y - 10);
      const hit = this.add.circle(p.x, p.y, 26, 0x000000, 0).setInteractive({ useHandCursor: true });
      if (c.open) {
        this.tweens.add({ targets: dot, scale: 1.5, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
        hit.on('pointerup', () => this.enter(c));
        lbl.setInteractive({ useHandCursor: true }).on('pointerup', () => this.enter(c));
      } else {
        hit.on('pointerup', () => { votes[c.id] = (votes[c.id] || 0) + 1; localStorage.setItem('ao_votes', JSON.stringify(votes)); lbl.setText(`${c.name} · 已投票 · ${votes[c.id]} 票`); this.tweens.add({ targets: dot, scale: 1.6, duration: 160, yoyo: true }); });
      }
    }
    const H = this.scale.height;
    this.add.text(W / 2, H - 70, '墨尔本 Box Hill 按真实街道还原，点它进入\n其他城市点一下投票，票多的先做', { fontSize: '12px', color: '#4a5a6a', align: 'center', lineSpacing: 4 }).setOrigin(0.5);
    const btn = this.add.text(W / 2, H - 30, '进入墨尔本 · Box Hill →', { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontSize: '16px', fontStyle: '700', color: '#ffffff', backgroundColor: '#1f7a5a', padding: { x: 22, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.enter(AO.CITIES[0]));
  }
  enter(city) {
    if (this.entering) return;
    this.entering = true;
    document.getElementById('loading').classList.remove('hidden');
    this.scene.start('World', { city });
  }
};
