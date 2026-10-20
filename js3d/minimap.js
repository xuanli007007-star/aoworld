/* 圆形小地图：底图从方块世界预先画好，跟着相机朝向旋转 */
import { T } from './atlas.js';
const GROUND = { [T.GRASS]: '#6db544', [T.PARK]: '#5aa53b', [T.ASPHALT]: '#55595f', [T.LINE]: '#55595f', [T.SIDEWALK]: '#bcb7ad', [T.PAVING]: '#c07a5c', [T.PATH]: '#b0a68e', [T.PARKING]: '#7a7e84', [T.RAIL]: '#7d776c', [T.PLATFORM]: '#c9c4b9', [T.WATER]: '#3f7fc0' };
export function makeMinimap(world, canvas) {
  const { W, L, G, H } = world;
  const base = document.createElement('canvas'); base.width = W; base.height = L; const bx = base.getContext('2d'); const img = bx.createImageData(W, L);
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cache = {}; for (const k in GROUND) cache[k] = rgb(GROUND[k]);
  for (let i = 0; i < W * L; i++) {
    let c; if (H[i]) { const v = Math.max(120, 235 - H[i] * 2); c = [v, v - 6, v - 18]; } else c = cache[G[i]] || [109, 181, 68];
    img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
  }
  bx.putImageData(img, 0, 0);
  const ctx = canvas.getContext('2d'); const S = canvas.width; const scale = S / 140; // 显示约 140 米
  return {
    draw(player, marks) {
      ctx.save(); ctx.clearRect(0, 0, S, S); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#6db544'; ctx.fillRect(0, 0, S, S);
      ctx.translate(S / 2, S / 2); ctx.rotate(player.yaw); ctx.scale(scale, scale);
      ctx.translate(-(player.p.x - world.X0), -(player.p.z - world.Z0));
      ctx.imageSmoothingEnabled = false; ctx.drawImage(base, 0, 0);
      for (const m of marks) {
        const x = m.x - world.X0, z = m.z - world.Z0; ctx.save(); ctx.translate(x, z); ctx.rotate(-player.yaw);
        ctx.fillStyle = m.color; ctx.strokeStyle = '#1b2a3a'; ctx.lineWidth = 1.2 / scale * 2; ctx.beginPath(); ctx.arc(0, 0, (m.r || 5) / scale * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (m.label) { ctx.fillStyle = '#1b2a3a'; ctx.font = `900 ${18 / scale}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(m.label, 0, 0.5 / scale); }
        ctx.restore();
      }
      ctx.restore();
      // 玩家箭头永远朝上
      ctx.save(); ctx.translate(S / 2, S / 2); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b2a3a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(11, 12); ctx.lineTo(0, 6); ctx.lineTo(-11, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    },
  };
}
