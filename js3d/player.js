/* 玩家：物理、第三人称相机、手机摇杆和键鼠操控 */
import * as THREE from 'three';

export class Input {
  constructor(el) {
    this.move = { x: 0, y: 0 }; this.jump = false; this.keys = {}; this.look = { dx: 0, dy: 0 }; this.zoom = 0; this.enabled = true;
    const stick = document.getElementById('stick'), knob = document.getElementById('stick-knob');
    let stickId = null, sx = 0, sy = 0; const looks = new Map(); let pinch = null;
    const R = 50;
    const setStick = (cx, cy) => { let dx = cx - sx, dy = cy - sy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.move.x = dx / R; this.move.y = -dy / R; };
    el.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.45 && stickId === null) { stickId = t.identifier; sx = t.clientX; sy = t.clientY; stick.style.left = (sx - 60) + 'px'; stick.style.top = (sy - 60) + 'px'; stick.classList.add('on'); setStick(sx, sy); }
        else looks.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
      if (looks.size === 2) { const [a, b] = [...looks.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) setStick(t.clientX, t.clientY);
        else if (looks.has(t.identifier)) { const p = looks.get(t.identifier); if (looks.size === 1) { this.look.dx += t.clientX - p.x; this.look.dy += t.clientY - p.y; } p.x = t.clientX; p.y = t.clientY; }
      }
      if (looks.size === 2 && pinch) { const [a, b] = [...looks.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoom += (pinch - d) * 0.05; pinch = d; }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === stickId) { stickId = null; this.move.x = this.move.y = 0; stick.classList.remove('on'); knob.style.transform = ''; } looks.delete(t.identifier); } if (looks.size < 2) pinch = null; };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
    let drag = null;
    el.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mousemove', (e) => { if (!drag) return; this.look.dx += e.clientX - drag.x; this.look.dy += e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; });
    window.addEventListener('mouseup', () => { drag = null; });
    el.addEventListener('wheel', (e) => { this.zoom += e.deltaY * 0.01; e.preventDefault(); }, { passive: false });
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; if (e.code === 'Space') { this.jump = true; e.preventDefault(); } });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    const jb = document.getElementById('btn-jump');
    jb.addEventListener('touchstart', (e) => { this.jump = true; e.preventDefault(); e.stopPropagation(); }, { passive: false });
    jb.addEventListener('mousedown', (e) => { this.jump = true; e.stopPropagation(); });
  }
  axis() {
    let x = this.move.x, y = this.move.y; const k = this.keys;
    if (k.KeyW || k.ArrowUp) y = 1; if (k.KeyS || k.ArrowDown) y = -1; if (k.KeyA || k.ArrowLeft) x = -1; if (k.KeyD || k.ArrowRight) x = 1;
    const run = !k.ShiftLeft; const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; }
    return { x, y, run };
  }
}

export class Player {
  constructor(world, char, camera) {
    this.world = world; this.char = char; this.camera = camera;
    this.p = new THREE.Vector3(); this.vy = 0; this.onGround = true; this.speed = 0;
    this.yaw = 0.6; this.pitch = 0.42; this.dist = 9; this.camDist = 9; this.facing = 0;
    this.camPos = new THREE.Vector3(); this.tmp = new THREE.Vector3();
  }
  place(x, z) { this.p.set(x, this.world.solidH(x, z), z); this.char.root.position.copy(this.p); }
  blocked(x, z, y) {
    const R = 0.28; let maxH = 0;
    for (const [ox, oz] of [[-R, -R], [R, -R], [-R, R], [R, R]]) { const h = this.world.solidH(x + ox, z + oz); if (h > maxH) maxH = h; }
    return maxH;
  }
  update(dt, input, opts = {}) {
    const W = this.world; const a = input.axis(); const boost = opts.speedBoost || 1;
    this.yaw -= input.look.dx * 0.006; this.pitch = Math.min(1.35, Math.max(0.08, this.pitch + input.look.dy * 0.005)); input.look.dx = input.look.dy = 0;
    this.dist = Math.min(30, Math.max(3.5, this.dist + input.zoom)); input.zoom = 0;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let mx = fx * a.y + rx * a.x, mz = fz * a.y + rz * a.x; const mag = Math.hypot(mx, mz);
    const target = mag > 0.05 ? (a.run ? 6.2 : 3) * boost * Math.min(1, mag) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    if (mag > 0.05) { this.facing = Math.atan2(mx, mz); mx /= mag; mz /= mag; }
    else { mx = Math.sin(this.facing); mz = Math.cos(this.facing); }
    const step = this.speed * dt;
    // 分轴移动：能跨上 1 格台阶，更高就挡住
    const tryMove = (nx, nz) => { const h = this.blocked(nx, nz); if (h <= this.p.y + 0.01) return true; if (h - this.p.y <= 1.01 && this.onGround) { this.p.y = h; return true; } return false; };
    if (step > 0) {
      const nx = this.p.x + mx * step; if (tryMove(nx, this.p.z)) this.p.x = nx;
      const nz = this.p.z + mz * step; if (tryMove(this.p.x, nz)) this.p.z = nz;
    }
    if (input.jump && this.onGround) { this.vy = 9.2; this.onGround = false; opts.onJump && opts.onJump(); }
    input.jump = false;
    this.vy -= 26 * dt; this.p.y += this.vy * dt;
    const ground = this.blocked(this.p.x, this.p.z);
    if (this.p.y <= ground) { if (!this.onGround && this.vy < -12) opts.onLand && opts.onLand(); this.p.y = ground; this.vy = 0; this.onGround = true; } else if (this.p.y > ground + 0.05) this.onGround = false;
    const ch = this.char.root; ch.position.copy(this.p);
    let dr = this.facing - ch.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); ch.rotation.y += dr * Math.min(1, dt * 12);
    this.char.animate(dt, this.onGround ? this.speed : 0);
    if (!this.onGround) { this.char.armL.rotation.x = -2.6; this.char.armR.rotation.x = -2.6; }
    this.updateCamera(dt);
  }
  updateCamera(dt, instant) {
    const t = this.tmp.set(this.p.x, this.p.y + 1.5, this.p.z);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dx = Math.sin(this.yaw) * cp, dy = sp, dz = Math.cos(this.yaw) * cp;
    // 相机碰撞：被楼挡住就拉近
    let d = this.dist; for (let s = 0.6; s < this.dist; s += 0.4) { const x = t.x + dx * s, y = t.y + dy * s, z = t.z + dz * s; if (y < this.world.viewH(x, z) + 0.2) { d = Math.max(1.2, s - 0.5); break; } }
    this.camDist += (d - this.camDist) * (instant ? 1 : Math.min(1, dt * (d < this.camDist ? 20 : 4)));
    this.camera.position.set(t.x + dx * this.camDist, t.y + dy * this.camDist, t.z + dz * this.camDist);
    this.camera.lookAt(t);
  }
  /* 屏幕上指向目标的角度（0 = 正前方） */
  bearingTo(x, z) { const vx = x - this.p.x, vz = z - this.p.z; const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw); return Math.atan2(vx * rx + vz * rz, vx * fx + vz * fz); }
}
