/**
 * gen-og.mjs — OG 分享图批量生成（脚本 B，design.md 1.3.5.2）
 * ---------------------------------------------------------------
 * 产出（仓库根目录）：og-home.png、og-bendi.png、og-meituan.png、
 *                    og-jingdong-waimai.png、og-daojia.png、og-gouwu.png
 * 规格：1200×630 PNG，单张 ≤ 300KB，六张两两不同（REQ-FAV-006）。
 *
 * 降级链：sharp 渲染 SVG 中文（本仓库不可用，无 node_modules）→
 * 纯 JS PNG 编码器 + 点阵拉丁字模（本脚本）：渐变底取各站主色→辅色，
 * 渲染站 slug 大写（design.md R2 兜底方案，满足"六图两两不同"验收线）。
 * 用法：node scripts/gen-og.mjs（在仓库根目录执行）
 */
import { writeFileSync } from 'node:fs';
import { pngEncode } from './pnglib.mjs';

const W = 1200;
const H = 630;

/* ---------- 5×7 点阵字模（A-Z、0-9、'-'、'.'；每行 5bit，MSB=最左） ---------- */
const FONT = {
  A: [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  B: [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
  C: [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
  D: [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
  E: [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
  F: [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  G: [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0E],
  H: [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  I: [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  M: [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  P: [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  Q: [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
  R: [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  S: [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
  T: [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
  X: [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
  0: [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
  1: [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  2: [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F],
  3: [0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E],
  4: [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
  5: [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  6: [0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E],
  7: [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
  9: [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E],
  '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C],
};

/* ---------- 六站配置（主色 → 辅色，design.md 1.3.2.2 色值表） ---------- */
const SITES = [
  { slug: 'home', from: [0x33, 0x41, 0x55], to: [0x4F, 0x46, 0xE5] },
  { slug: 'bendi', from: [0xEA, 0x58, 0x0C], to: [0xF5, 0x9E, 0x0B] },
  { slug: 'meituan', from: [0x65, 0xA3, 0x0D], to: [0x4D, 0x7C, 0x0F] },
  { slug: 'jingdong-waimai', from: [0xDC, 0x26, 0x26], to: [0xB9, 0x1C, 0x1C] },
  { slug: 'daojia', from: [0x02, 0x84, 0xC7], to: [0x03, 0x69, 0xA1] },
  { slug: 'gouwu', from: [0x7C, 0x3A, 0xED], to: [0xDB, 0x27, 0x77] },
];

/* ---------- 绘制原语 ---------- */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function fillRect(rgba, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= W) continue;
      const i = (y * W + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
}

/** 点阵文本（scale = 单像素边长），返回文本总宽 */
function drawText(rgba, text, x0, y0, scale, color) {
  let x = x0;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch];
    if (g) {
      for (let row = 0; row < 7; row++) {
        const bits = g[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            fillRect(rgba, x + col * scale, y0 + row * scale, scale, scale, color);
          }
        }
      }
    }
    x += 6 * scale; // 5 列 + 1 列间距
  }
  return x - x0 - scale; // 末尾间距不计
}

/** 白色描边圆环（SDF 抗锯齿） */
function drawRing(rgba, cx, cy, r, halfStroke) {
  const minX = Math.max(0, Math.floor(cx - r - halfStroke - 2));
  const maxX = Math.min(W - 1, Math.ceil(cx + r + halfStroke + 2));
  const minY = Math.max(0, Math.floor(cy - r - halfStroke - 2));
  const maxY = Math.min(H - 1, Math.ceil(cy + r + halfStroke + 2));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cov = clamp01(0.5 - (Math.abs(d - r) - halfStroke));
      if (cov <= 0) continue;
      const i = (y * W + x) * 4;
      rgba[i] = Math.round(rgba[i] + (255 - rgba[i]) * cov);
      rgba[i + 1] = Math.round(rgba[i + 1] + (255 - rgba[i + 1]) * cov);
      rgba[i + 2] = Math.round(rgba[i + 2] + (255 - rgba[i + 2]) * cov);
      rgba[i + 3] = 255;
    }
  }
}

/* ---------- 单站合成 ---------- */
function renderOg(site) {
  const rgba = Buffer.alloc(W * H * 4);

  // 对角渐变底（左上主色 → 右下辅色）
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = clamp01((x / W + y / H) / 2);
      const i = (y * W + x) * 4;
      rgba[i] = Math.round(site.from[0] + (site.to[0] - site.from[0]) * t);
      rgba[i + 1] = Math.round(site.from[1] + (site.to[1] - site.from[1]) * t);
      rgba[i + 2] = Math.round(site.from[2] + (site.to[2] - site.from[2]) * t);
      rgba[i + 3] = 255;
    }
  }

  // 品牌"无限惠环"双环（右侧）
  drawRing(rgba, 960, 245, 85, 22);
  drawRing(rgba, 960, 385, 85, 22);

  // slug 大字（左上，自动缩放避免与圆环重叠）
  const label = site.slug.toUpperCase();
  const scale = label.length > 10 ? 6 : 9; // 长名（JINGDONG-WAIMAI）缩小
  const textW = drawText(rgba, label, 80, 210, scale, [255, 255, 255]);
  // slug 下方装饰条
  fillRect(rgba, 80, 210 + 7 * scale + 26, Math.max(160, textW), 10, [255, 255, 255]);

  // 域名小字（底部）
  drawText(rgba, 'YOUHUI8.GITHUB.IO', 80, 500, 4, [255, 255, 255]);

  return pngEncode(W, H, rgba);
}

/* ---------- 主流程 ---------- */
for (const site of SITES) {
  const png = renderOg(site);
  const file = `og-${site.slug}.png`;
  writeFileSync(file, png);
  const kb = png.length / 1024;
  if (png.length > 300 * 1024) throw new Error(`${file} 超过 300KB 预算`);
  console.log(`OK  ${file}  ${png.length} bytes (${kb.toFixed(1)} KB)`);
}
console.log('完成：6 张 OG 分享图已生成（渐变取各站主色→辅色，两两不同）。');
