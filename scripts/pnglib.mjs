/**
 * pnglib.mjs — 零依赖图像编码公共库（Node ≥ 18，仅内置模块）
 * ---------------------------------------------------------------
 * 提供：
 *   - crc32()            PNG chunk 校验（手写查表，design.md 1.3.5.2 降级链第 2 级）
 *   - pngEncode()        RGBA 缓冲 → PNG（color type 6，zlib deflate）
 *   - drawBrandIcon()    "惠券"票券品牌图形逐像素几何绘制（渐变圆角底 + 白色票券）
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

/* ---------- 品牌图形绘制（"惠券"票券母题） ---------- */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const GRAD_FROM = [0x43, 0x38, 0xCA]; // 靛蓝 #4338CA（白图形对比度 7.86:1）
const GRAD_TO = [0x25, 0x63, 0xEB];   // 蓝 #2563EB（白图形对比度 5.35:1）

/* 以下几何均以 64×64 基准坐标系描述，s = size/64 为缩放系数：
 *   底板     0,0 → 64,64（rx=14，fullBleed 时方形满铺）
 *   票券     12,20 → 52,44（rx=2），左缘中点 (12,32)、右缘中点 (52,32)
 *           各挖 r=4 半圆缺口 → 主体落在中心 ~19%~81%，满足 maskable 安全区
 *   中缝虚线 x=41.5，y 24→40（宽 1.8，dash/gap 2.8）
 *   左区 ￥  人字双斜线 (17,23)/(37,23)→(27,32) + 中竖 (27,23)→(27,41) + 双横
 *           （矩形拼装，避免字体依赖；与 favicon.svg text 版视觉同构）
 */

/** 圆角矩形 SDF coverage（64 基准坐标 → 像素坐标） */
function roundedRectCov(ax, ay, x0, y0, x1, y1, r, s) {
  const cx = ((x0 + x1) / 2) * s;
  const cy = ((y0 + y1) / 2) * s;
  const hx = ((x1 - x0) / 2) * s;
  const hy = ((y1 - y0) / 2) * s;
  const rr = r * s;
  const px = Math.abs(ax - cx) - (hx - rr);
  const py = Math.abs(ay - cy) - (hy - rr);
  const dx = Math.max(px, 0);
  const dy = Math.max(py, 0);
  const sdf = Math.hypot(dx, dy) + Math.min(Math.max(px, py), 0) - rr;
  return clamp01(0.5 - sdf);
}

/** 圆 SDF coverage */
function circleCov(ax, ay, cx, cy, r, s) {
  const d = Math.hypot(ax - cx * s, ay - cy * s) - r * s;
  return clamp01(0.5 - d);
}

/** 线段 SDF coverage */
function segCov(ax, ay, x0, y0, x1, y1, halfW, s) {
  const sx = x0 * s, sy = y0 * s;
  const vx = (x1 - x0) * s, vy = (y1 - y0) * s;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : clamp01(((ax - sx) * vx + (ay - sy) * vy) / len2);
  const d = Math.hypot(ax - (sx + vx * t), ay - (sy + vy * t)) - halfW * s;
  return clamp01(0.5 - d);
}

/**
 * 绘制品牌图形，返回 RGBA 像素缓冲。
 * @param {number} size 画布边长（正方形）
 * @param {object} [opts]
 * @param {boolean} [opts.fullBleed=false] true = 无圆角全出血（apple-touch 与
 *        android 192/512 用：iOS 自行裁圆角、Android maskable 需满铺底板）；
 *        false = 圆角 + 透明外围（favicon PNG/ICO 用）。
 * 分尺寸特化：16/32 仅票券轮廓+缺口；48 +中缝虚线；180/192/512 +￥与虚线。
 */
export function drawBrandIcon(size, opts = {}) {
  const { fullBleed = false } = opts;
  const N = size;
  const s = N / 64;                          // 64 基准几何 → 实际像素
  const withDash = N >= 48;                  // 48px 起：中缝虚线
  const withYuan = N >= 180;                 // 180px 起：左区 ￥
  const rgba = Buffer.alloc(N * N * 4);
  const half = N / 2;
  const radius = 14 * s;                     // 底板圆角 rx = 14（64 基准）
  const dashY0 = 24 * s, dashY1 = 40 * s;    // 虚线纵向范围
  const dashX = 41.5 * s, dashHalfW = 0.9 * s;
  const dash = 2.8 * s, period = 5.6 * s;    // dash 2.8 / gap 2.8（64 基准）

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const ax = x + 0.5;
      const ay = y + 0.5;

      // 底板 SDF（抗锯齿：coverage = clamp(0.5 - sdf)）
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
      if (bgCov <= 0) continue; // 底板外保持透明

      // 票券 SDF：圆角矩形 − 两侧半圆缺口（缺口透出底板渐变）
      let ticket = roundedRectCov(ax, ay, 12, 20, 52, 44, 2, s);
      const notchL = circleCov(ax, ay, 12, 32, 4, s);
      const notchR = circleCov(ax, ay, 52, 32, 4, s);
      ticket = clamp01(ticket - Math.max(notchL, notchR));

      // 内部细节（虚线 / ￥）：从白票券上挖出，透出底板渐变
      let detail = 0;
      if (withDash && ay >= dashY0 && ay <= dashY1) {
        if ((ay - dashY0) % period < dash) {
          detail = Math.max(detail, clamp01(0.5 - (Math.abs(ax - dashX) - dashHalfW)));
        }
      }
      if (withYuan) {
        detail = Math.max(
          detail,
          segCov(ax, ay, 17, 23, 27, 32, 1.8, s),               // 左斜
          segCov(ax, ay, 37, 23, 27, 32, 1.8, s),               // 右斜
          segCov(ax, ay, 27, 23, 27, 41, 1.5, s),               // 中竖
          roundedRectCov(ax, ay, 19, 33, 35, 36, 1.5, s),       // 横 1
          roundedRectCov(ax, ay, 19, 37.5, 35, 40.5, 1.5, s),   // 横 2
        );
      }
      const graphic = clamp01(ticket - detail);

      // 对角线渐变（与 favicon.svg userSpaceOnUse x1=0 y1=0 x2=64 y2=64 同源）
      const t = clamp01((ax / N + ay / N) / 2);
      const g = [
        GRAD_FROM[0] + (GRAD_TO[0] - GRAD_FROM[0]) * t,
        GRAD_FROM[1] + (GRAD_TO[1] - GRAD_FROM[1]) * t,
        GRAD_FROM[2] + (GRAD_TO[2] - GRAD_FROM[2]) * t,
      ];
      const i = (y * N + x) * 4;
      rgba[i] = Math.round(g[0] + (255 - g[0]) * graphic);
      rgba[i + 1] = Math.round(g[1] + (255 - g[1]) * graphic);
      rgba[i + 2] = Math.round(g[2] + (255 - g[2]) * graphic);
      rgba[i + 3] = Math.round(bgCov * 255);
    }
  }
  return rgba;
}

export { GRAD_FROM, GRAD_TO };
