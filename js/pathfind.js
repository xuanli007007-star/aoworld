/* 2 米网格 + A* 寻路 */
window.AO = window.AO || {};
AO.Grid = class {
  constructor(minX, minY, maxX, maxY, cell) {
    this.cell = cell; this.minX = minX; this.minY = minY;
    this.w = Math.ceil((maxX - minX) / cell); this.h = Math.ceil((maxY - minY) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
  }
  toCell(x, y) { return { cx: Math.floor((x - this.minX) / this.cell), cy: Math.floor((y - this.minY) / this.cell) }; }
  toWorld(cx, cy) { return { x: this.minX + (cx + 0.5) * this.cell, y: this.minY + (cy + 0.5) * this.cell }; }
  inside(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; }
  isBlocked(cx, cy) { return !this.inside(cx, cy) || this.blocked[cy * this.w + cx] === 1; }
  block(cx, cy) { if (this.inside(cx, cy)) this.blocked[cy * this.w + cx] = 1; }
  blockPolygon(poly) {
    const b = AO.ISO.bounds(poly);
    const c0 = this.toCell(b.minX, b.minY), c1 = this.toCell(b.maxX, b.maxY);
    for (let cy = c0.cy; cy <= c1.cy; cy++) for (let cx = c0.cx; cx <= c1.cx; cx++) {
      const p = this.toWorld(cx, cy);
      if (AO.ISO.pointInPoly(p.x, p.y, poly)) this.block(cx, cy);
    }
  }
  blockPolyline(pts, radius) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const L = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.ceil(L / (this.cell * 0.5)));
      for (let k = 0; k <= n; k++) {
        const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
        const c = this.toCell(x, y); const r = Math.ceil(radius / this.cell);
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) this.block(c.cx + dx, c.cy + dy);
      }
    }
  }
  walkableWorld(x, y) { const c = this.toCell(x, y); return !this.isBlocked(c.cx, c.cy); }
  nearestFree(cx, cy, maxR = 40) {
    if (!this.isBlocked(cx, cy)) return { cx, cy };
    for (let r = 1; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!this.isBlocked(cx + dx, cy + dy)) return { cx: cx + dx, cy: cy + dy };
    }
    return null;
  }
  // 直线可达检查（用于路径拉直）
  lineFree(x0, y0, x1, y1) {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L / (this.cell * 0.4)));
    for (let k = 0; k <= n; k++) if (!this.walkableWorld(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)) return false;
    return true;
  }
  findPath(x0, y0, x1, y1) {
    const s = this.toCell(x0, y0), g0 = this.toCell(x1, y1);
    const start = this.nearestFree(s.cx, s.cy), goal = this.nearestFree(g0.cx, g0.cy);
    if (!start || !goal) return null;
    const W = this.w, idx = (c) => c.cy * W + c.cx;
    const gScore = new Float32Array(W * this.h).fill(Infinity), came = new Int32Array(W * this.h).fill(-1), closed = new Uint8Array(W * this.h);
    const heap = []; const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const h = (cx, cy) => { const dx = Math.abs(cx - goal.cx), dy = Math.abs(cy - goal.cy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const si = idx(start), gi = idx(goal); gScore[si] = 0; push(h(start.cx, start.cy), si);
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let expanded = 0;
    while (heap.length) {
      const [, i] = pop(); if (closed[i]) continue; closed[i] = 1; if (i === gi) break;
      if (++expanded > 120000) return null;
      const cx = i % W, cy = (i / W) | 0;
      for (const [dx, dy, cost] of DIRS) {
        const nx = cx + dx, ny = cy + dy; if (this.isBlocked(nx, ny)) continue;
        if (dx && dy && (this.isBlocked(cx + dx, cy) || this.isBlocked(cx, cy + dy))) continue; // 不切角
        const ni = ny * W + nx; const ng = gScore[i] + cost;
        if (ng < gScore[ni]) { gScore[ni] = ng; came[ni] = i; push(ng + h(nx, ny), ni); }
      }
    }
    if (came[gi] === -1 && gi !== si) return null;
    const cells = []; for (let i = gi; i !== -1; i = came[i]) { cells.push(this.toWorld(i % W, (i / W) | 0)); if (i === si) break; }
    cells.reverse();
    // 拉直
    const out = [cells[0]]; let a = 0;
    while (a < cells.length - 1) { let b = cells.length - 1; while (b > a + 1 && !this.lineFree(cells[a].x, cells[a].y, cells[b].x, cells[b].y)) b--; out.push(cells[b]); a = b; }
    return out;
  }
};
