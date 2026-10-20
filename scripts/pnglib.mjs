/**
 * pnglib.mjs — 零依赖图像编码公共库（Node ≥ 18，仅内置模块）
 * ---------------------------------------------------------------
 * 提供：
 *   - crc32()            PNG chunk 校验（手写查表，design.md 1.3.5.2 降级链第 2 级）
 *   - pngEncode()        RGBA 缓冲 → PNG（color type 6，zlib deflate）
 *   - drawBrandIcon()    "无限惠环"品牌图形逐像素几何绘制（渐变圆角底 + 双白环）
 *
 * 设计依据：design.md 1.3.5.1（favicon.svg 源稿）、1.3.5.2（脚本 A/B 降级链）。
 * sharp 在本仓库不可用（无 package.json / node_modules，保持零依赖），
 * 按降级链采用纯 JS 编码器 + 距离场几何绘制（抗锯齿：SDF 软化 1px）。
 */
import zlib from 'node:zlib';

/* ---------- CRC32（手写查表） ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---------- PNG 编码（RGBA，bit depth 8，filter 0） ---------- */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function pngEncode(width, height, rgba) {
  if (rgba.length !== width * height * 4) {
    throw new Error(`像素缓冲长度不符：期望 ${width * height * 4}，实际 ${rgba.length}`);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter type: None
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- 品牌图形绘制（"无限惠环"） ---------- */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const GRAD_FROM = [0x4F, 0x46, 0xE5]; // 靛蓝 #4F46E5
const GRAD_TO = [0x0E, 0xA5, 0xE9];   // 天青 #0EA5E9

/**
 * 绘制品牌图形，返回 RGBA 像素缓冲。
 * @param {number} size 画布边长（正方形）
 * @param {object} [opts]
 * @param {boolean} [opts.fullBleed=false] true = 无圆角全出血（apple-touch-icon 用，
 *        iOS 自行裁圆角，透明角会呈现黑底）；false = 圆角 + 透明外围。
 */
export function drawBrandIcon(size, opts = {}) {
  const { fullBleed = false } = opts;
  const N = size;
  const rgba = Buffer.alloc(N * N * 4);
  const half = N / 2;
  const radius = (14 / 64) * N;              // rx = 14（64 viewBox）
  const halfStroke = (5 / 64) * N / 2;       // stroke-width = 5
  const rings = [
    { cx: (32 / 64) * N, cy: (22 / 64) * N, r: (9 / 64) * N },
    { cx: (32 / 64) * N, cy: (42 / 64) * N, r: (9 / 64) * N },
  ];

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const ax = x + 0.5;
      const ay = y + 0.5;

      // 圆角矩形 SDF（抗锯齿：coverage = clamp(0.5 - sdf)）
      let bgCov = 1;
      if (!fullBleed) {
        const px = ax - half;
        const py = ay - half;
        const qx = Math.abs(px) - (half - radius);
        const qy = Math.abs(py) - (half - radius);
        const dx = Math.max(qx, 0);
        const dy = Math.max(qy, 0);
        const sdf = Math.hypot(dx, dy) + Math.min(Math.max(qx, qy), 0) - radius;
        bgCov = clamp01(0.5 - sdf);
      }
      if (bgCov <= 0) continue; // 圆角外保持透明

      // 圆环 SDF（两环取最大覆盖）
      let ringCov = 0;
      for (const ring of rings) {
        const d = Math.hypot(ax - ring.cx, ay - ring.cy);
        const sdf = Math.abs(d - ring.r) - halfStroke;
        const cov = clamp01(0.5 - sdf);
        if (cov > ringCov) ringCov = cov;
      }

      // 对角线渐变（SVG x1=0 y1=0 x2=1 y2=1）
      const t = clamp01((ax / N + ay / N) / 2);
      const g = [
        GRAD_FROM[0] + (GRAD_TO[0] - GRAD_FROM[0]) * t,
        GRAD_FROM[1] + (GRAD_TO[1] - GRAD_FROM[1]) * t,
        GRAD_FROM[2] + (GRAD_TO[2] - GRAD_FROM[2]) * t,
      ];
      const i = (y * N + x) * 4;
      rgba[i] = Math.round(g[0] + (255 - g[0]) * ringCov);
      rgba[i + 1] = Math.round(g[1] + (255 - g[1]) * ringCov);
      rgba[i + 2] = Math.round(g[2] + (255 - g[2]) * ringCov);
      rgba[i + 3] = Math.round(bgCov * 255);
    }
  }
  return rgba;
}

export { GRAD_FROM, GRAD_TO };
