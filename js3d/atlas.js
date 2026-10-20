/* 程序生成的 16x16 像素方块贴图（我的世界风格），合成一张图集 */
import * as THREE from 'three';
export const COLS = 8, ROWS = 4, PX = 16;
export const T = { GRASS: 0, PARK: 1, ASPHALT: 2, LINE: 3, SIDEWALK: 4, PAVING: 5, PATH: 6, PARKING: 7,
  RAIL: 8, PLATFORM: 9, DIRT: 10, WATER: 11, LOG: 12, LOGTOP: 13, LEAVES: 14, LEAVES2: 15,
  BRICK: 16, RENDER: 17, CONCRETE: 18, BOARD: 19, SANDSTONE: 20, APT: 21, OFFICE: 22, GLASS: 23,
  SHOP: 24, SHOP2: 25, AWNING: 26, TERRACOTTA: 27, ROOF: 28, METAL: 29, GLASSROOF: 30, BRICK2: 31 };
/* 每种贴图在世界里重复一次的尺寸（米）[横, 竖] */
export const SCALE = Array.from({ length: COLS * ROWS }, () => [1, 1]);
Object.assign(SCALE, { [T.APT]: [3, 3], [T.OFFICE]: [3, 3.3], [T.GLASS]: [2, 3.3], [T.SHOP]: [3, 4], [T.SHOP2]: [3, 4], [T.AWNING]: [3, 4], [T.SANDSTONE]: [2, 2] });
export const tileXY = (t) => [t % COLS, Math.floor(t / COLS)];

function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const shade = (c, f) => [Math.min(255, ((c >> 16) & 255) * f) | 0, Math.min(255, ((c >> 8) & 255) * f) | 0, Math.min(255, (c & 255) * f) | 0];
const J = (c, r, a) => shade(c, 1 + (r() - 0.5) * a);
const each = (fn) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) fn(x, y); };
function fill(p, r, base, a, specks) { each((x, y) => { let c = base; if (specks) for (const [sc, pr] of specks) if (r() < pr) { c = sc; break; } p(x, y, J(c, r, a)); }); }
function bricks(p, r, b, m) { each((x, y) => { const off = ((y >> 2) & 1) ? 4 : 0; const mm = (y & 3) === 3 || ((x + off) & 7) === 7; p(x, y, J(mm ? m : b, r, mm ? 0.04 : 0.14)); }); }
function shopfront(p, r, fascia, awning) {
  each((x, y) => {
    let c;
    if (y < 3) c = y === 0 ? fascia : fascia;
    else if (awning && y < 7) c = y === 6 ? 0x8a2a22 : (((x >> 1) & 1) ? 0xd8473a : 0xf3efe6);
    else if (y === 15 || x === 0 || x === 15 || x === 8) c = 0x3a3a3a;
    else if (x >= 10 && x <= 13 && y >= 7) c = 0x5f8faa;
    else c = ((x - y + 20) % 9 < 2) ? 0xc4e4f2 : 0x8ec3dc;
    p(x, y, J(c, r, 0.04));
  });
}
const P = {};
P[T.GRASS] = (p, r) => fill(p, r, 0x6db544, 0.2, [[0x8ccf5c, 0.07], [0x4f9a33, 0.08]]);
P[T.PARK] = (p, r) => fill(p, r, 0x5aa53b, 0.22, [[0x79c050, 0.06], [0x3f8a2c, 0.1], [0xeee070, 0.012]]);
P[T.ASPHALT] = (p, r) => fill(p, r, 0x4b4f55, 0.12, [[0x60646b, 0.08], [0x3c4045, 0.06]]);
P[T.LINE] = (p, r) => fill(p, r, 0xe4dec8, 0.06);
P[T.SIDEWALK] = (p, r) => each((x, y) => p(x, y, J(x === 15 || y === 15 ? 0x9e998f : 0xbcb7ad, r, 0.06)));
P[T.PAVING] = (p, r) => each((x, y) => { const off = ((y >> 2) & 1) ? 4 : 0; const m = (y & 3) === 3 || ((x + off) & 7) === 7; p(x, y, J(m ? 0xcaa48a : 0xb5694c, r, m ? 0.05 : 0.12)); });
P[T.PATH] = (p, r) => fill(p, r, 0xaba18a, 0.25, [[0x8e8571, 0.15], [0xc4bba4, 0.08]]);
P[T.PARKING] = (p, r) => fill(p, r, 0x676b71, 0.1, [[0x787c82, 0.08]]);
P[T.RAIL] = (p, r) => each((x, y) => { let c = 0x8b857a, a = 0.3; if (y % 5 === 0 && x > 0 && x < 15) { c = 0x6b4a2e; a = 0.1; } if (x === 4 || x === 5 || x === 10 || x === 11) { c = 0xc3c8cc; a = 0.05; } p(x, y, J(c, r, a)); });
P[T.PLATFORM] = (p, r) => each((x, y) => p(x, y, J(y < 2 ? 0xe6c23e : 0xc9c4b9, r, 0.08)));
P[T.DIRT] = (p, r) => fill(p, r, 0x8a6a45, 0.25, [[0x6f5436, 0.15], [0x9e7d55, 0.1]]);
P[T.WATER] = (p, r) => each((x, y) => p(x, y, J(((x + y * 2) % 7 === 0) ? 0x6aa3d8 : 0x3f7fc0, r, 0.08)));
P[T.LOG] = (p, r) => each((x, y) => p(x, y, J(x % 4 === 0 ? 0x523820 : 0x6e4b2a, r, 0.2)));
P[T.LOGTOP] = (p, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); p(x, y, J(d > 6.5 ? 0x5a3d22 : (Math.floor(d) % 2 ? 0xa57b47 : 0xbf9258), r, 0.08)); });
P[T.LEAVES] = (p, r) => each((x, y) => { const hole = r() < 0.12; p(x, y, J(r() < 0.22 ? 0x5cae4c : 0x3c8a36, r, 0.3), hole ? 0 : 255); });
P[T.LEAVES2] = (p, r) => each((x, y) => { const hole = r() < 0.12; p(x, y, J(r() < 0.22 ? 0x4a9a44 : 0x2e7433, r, 0.3), hole ? 0 : 255); });
P[T.BRICK] = (p, r) => bricks(p, r, 0x9e4b37, 0xcbbcaa);
P[T.BRICK2] = (p, r) => bricks(p, r, 0xb7845a, 0xd6c7b2);
P[T.RENDER] = (p, r) => fill(p, r, 0xe8dbbf, 0.07, [[0xd9cbae, 0.05]]);
P[T.CONCRETE] = (p, r) => each((x, y) => p(x, y, J(x === 15 || y === 15 ? 0xb8b8b2 : 0xd3d3cd, r, 0.07)));
P[T.BOARD] = (p, r) => each((x, y) => p(x, y, J((y & 3) === 3 ? 0xc8c0aa : 0xefe9d9, r, 0.05)));
P[T.SANDSTONE] = (p, r) => each((x, y) => { const off = ((y >> 2) & 1) ? 4 : 0; const m = (y & 3) === 3 || ((x + off) & 7) === 7; p(x, y, J(m ? 0xc2a46e : 0xdcc48e, r, 0.08)); });
P[T.APT] = (p, r) => each((x, y) => { let c = 0xe4d3b0, a = 0.06; if (x >= 4 && x <= 11 && y >= 3 && y <= 10) { c = (x === 4 || x === 11 || y === 3 || y === 10) ? 0xf3eee2 : (x + y < 12 ? 0x86a9c6 : 0x55789a); a = 0.04; } if (y === 11 && x >= 3 && x <= 12) c = 0xb8ad96; p(x, y, J(c, r, a)); });
P[T.OFFICE] = (p, r) => each((x, y) => { let c = 0xbac0c6; if (x >= 2 && x <= 13 && y >= 2 && y <= 11) c = (x === 2 || x === 13 || y === 2 || y === 11) ? 0x6f7880 : (y < 5 ? 0x6d8fb0 : 0x46688a); p(x, y, J(c, r, 0.05)); });
P[T.GLASS] = (p, r) => each((x, y) => { let c = ((x + y) % 16 >= 3 && (x + y) % 16 <= 5) ? 0x7fb2d8 : 0x4b82b0; if (x === 0 || y === 0) c = 0x2c4256; p(x, y, J(c, r, 0.05)); });
P[T.SHOP] = (p, r) => shopfront(p, r, 0x2f3d50, false);
P[T.SHOP2] = (p, r) => shopfront(p, r, 0xb33b2e, false);
P[T.AWNING] = (p, r) => shopfront(p, r, 0x2f3d50, true);
P[T.TERRACOTTA] = (p, r) => each((x, y) => { let c = 0xb6593b; if ((y & 3) === 3) c = 0x87402a; else if (((x + ((y >> 2) & 1) * 2) & 3) === 0) c = 0xa04e33; p(x, y, J(c, r, 0.08)); });
P[T.ROOF] = (p, r) => fill(p, r, 0x9b968d, 0.22, [[0x86827a, 0.12], [0xb0aca3, 0.08]]);
P[T.METAL] = (p, r) => each((x, y) => p(x, y, J((x & 3) === 0 ? 0x78828a : 0x9aa3a9, r, 0.04)));
P[T.GLASSROOF] = (p, r) => each((x, y) => p(x, y, J((x === 0 || y === 0) ? 0x3d5f7a : 0x6c98bd, r, 0.05)));

export function makeAtlas() {
  const cv = document.createElement('canvas'); cv.width = COLS * PX; cv.height = ROWS * PX;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(cv.width, cv.height); const d = img.data;
  for (let t = 0; t < COLS * ROWS; t++) {
    const [tx, ty] = tileXY(t); const r = rng(t * 7919 + 13);
    const p = (x, y, c, a = 255) => { const o = ((ty * PX + y) * cv.width + tx * PX + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a; };
    (P[t] || P[T.DIRT])(p, r);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  // 每格的平均色，远处用它代替像素贴图，避免摩尔纹（相当于手动的 mipmap）
  const av = document.createElement('canvas'); av.width = COLS; av.height = ROWS; const actx = av.getContext('2d'); const aimg = actx.createImageData(COLS, ROWS);
  for (let t = 0; t < COLS * ROWS; t++) {
    const [tx, ty] = tileXY(t); let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) { const o = ((ty * PX + y) * cv.width + tx * PX + x) * 4; if (d[o + 3]) { r += d[o]; g += d[o + 1]; b += d[o + 2]; n++; } a += d[o + 3]; }
    const o = (ty * COLS + tx) * 4; aimg.data[o] = r / n; aimg.data[o + 1] = g / n; aimg.data[o + 2] = b / n; aimg.data[o + 3] = 255;
  }
  actx.putImageData(aimg, 0, 0);
  const avg = new THREE.CanvasTexture(av); avg.magFilter = THREE.NearestFilter; avg.minFilter = THREE.NearestFilter; avg.generateMipmaps = false; avg.colorSpace = THREE.SRGBColorSpace;
  tex.userData.avg = avg;
  return tex;
}
/* Lambert 材质 + 着色器补丁：每个面用 atile 指定图集格子，uv 以贴图重复次数计，片元里取 fract，
 * 这样合并后的大面也能平铺像素贴图，同时保留 three 自带的光照、阴影和雾 */
export function tileMaterial(tex, opts = {}) {
  const m = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.avgMap = { value: tex.userData.avg };
    sh.vertexShader = 'attribute vec2 atile;\nvarying vec2 vTile;\nvarying vec2 vTuv;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = atile; vTuv = uv;');
    sh.fragmentShader = 'uniform sampler2D avgMap;\nvarying vec2 vTile;\nvarying vec2 vTuv;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec2 tuv = fract(vTuv);
      vec2 auv = vec2((vTile.x + tuv.x) / ${COLS}.0, 1.0 - (vTile.y + 1.0 - tuv.y) / ${ROWS}.0);
      vec4 texel = texture2D(map, auv);
      vec4 avgc = texture2D(avgMap, vec2((vTile.x + 0.5) / ${COLS}.0, 1.0 - (vTile.y + 0.5) / ${ROWS}.0));
      vec2 fw = fwidth(vTuv) * ${PX}.0;
      float far = smoothstep(0.55, 1.6, max(fw.x, fw.y));
      vec4 sampledDiffuseColor = vec4(mix(texel.rgb, avgc.rgb, far), mix(texel.a, 1.0, far * 0.6));
      diffuseColor *= sampledDiffuseColor;`);
  };
  m.customProgramCacheKey = () => 'tile' + (opts.alphaTest ? 'a' : '');
  return m;
}
