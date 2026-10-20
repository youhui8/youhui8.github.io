/**
 * gen-icons.mjs — favicon 全套资产生成（脚本 A，design.md 1.3.5.2）
 * ---------------------------------------------------------------
 * 产出（仓库根目录）：
 *   favicon.ico                  ICO 容器，16/32 两帧 BMP 32bpp（报告 §4.4：48 帧
 *                                仅旧 Safari 受益，删帧省 ~9KB；门禁仅校验魔数）
 *   favicon-{16,32,48}x{...}.png 浏览器标签页各档位图（圆角 + 透明外围）
 *   apple-touch-icon.png         180×180，全出血渐变（iOS 自行裁角）
 *   android-chrome-{192,512}.png Android Chrome / 安装信息；全出血（maskable：
 *                                512 条目声明 purpose:"maskable"，图形位于
 *                                中心 80% 安全区内，任意遮罩裁切不伤票券）
 *
 * 降级链：sharp（本仓库不可用，无 node_modules）→ 纯 JS 编码器（本脚本）。
 * 图形：favicon.svg 同款"惠券"票券（渐变底 + 白色票券 + 两侧半圆缺口），
 * 分尺寸特化：16/32 仅轮廓+缺口；48 +中缝虚线；180/192/512 +￥与虚线。
 * 用法：node scripts/gen-icons.mjs（在仓库根目录执行）
 */
import { writeFileSync } from 'node:fs';
import { pngEncode, drawBrandIcon } from './pnglib.mjs';

/* ---------- ICO 容器（BMP 32bpp 帧 + AND mask，非 PNG 帧） ---------- */

/** RGBA → 单帧 32bpp BMP（BITMAPINFOHEADER 40B + 像素 BGRA 自下而上 + AND mask） */
function bmpFrame(rgba, size) {
  const w = size;
  const h = size;
  const maskRowBytes = Math.ceil(w / 32) * 4; // AND mask 行按 4 字节对齐
  const pixelBytes = w * h * 4;
  const maskBytes = maskRowBytes * h;
  const buf = Buffer.alloc(40 + pixelBytes + maskBytes);

  // BITMAPINFOHEADER（高度 = 2h：XOR + AND 各占一半）
  buf.writeUInt32LE(40, 0);
  buf.writeInt32LE(w, 4);
  buf.writeInt32LE(h * 2, 8);
  buf.writeUInt16LE(1, 12);   // planes
  buf.writeUInt16LE(32, 14);  // bpp
  buf.writeUInt32LE(0, 16);   // BI_RGB
  buf.writeUInt32LE(pixelBytes + maskBytes, 20);

  // 像素：BGRA，自下而上
  for (let y = 0; y < h; y++) {
    const srcRow = (h - 1 - y) * w * 4;
    const dstRow = 40 + y * w * 4;
    for (let x = 0; x < w; x++) {
      const s = srcRow + x * 4;
      const d = dstRow + x * 4;
      buf[d] = rgba[s + 2];
      buf[d + 1] = rgba[s + 1];
      buf[d + 2] = rgba[s];
      buf[d + 3] = rgba[s + 3];
    }
  }

  // AND mask：1bpp，MSB 优先，自下而上；alpha < 128 → 1（透明）
  const maskOffset = 40 + pixelBytes;
  for (let y = 0; y < h; y++) {
    const srcRow = (h - 1 - y) * w * 4;
    for (let x = 0; x < w; x++) {
      if (rgba[srcRow + x * 4 + 3] < 128) {
        buf[maskOffset + y * maskRowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return buf;
}

/** 组装 ICO：ICONDIR(6B) + N×ICONDIRENTRY(16B) + 帧数据 */
function icoEncode(frames) {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((f, i) => {
    const e = 6 + i * 16;
    header[e] = f.size >= 256 ? 0 : f.size;
    header[e + 1] = f.size >= 256 ? 0 : f.size;
    header[e + 2] = 0; // palette colors
    header[e + 3] = 0; // reserved
    header.writeUInt16LE(1, e + 4);          // planes
    header.writeUInt16LE(32, e + 6);         // bpp
    header.writeUInt32LE(f.data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += f.data.length;
  });
  return Buffer.concat([header, ...frames.map((f) => f.data)]);
}

/* ---------- 主流程 ---------- */

const PNG_JOBS = [
  { size: 16, file: 'favicon-16x16.png', fullBleed: false },
  { size: 32, file: 'favicon-32x32.png', fullBleed: false },
  { size: 48, file: 'favicon-48x48.png', fullBleed: false },
  { size: 180, file: 'apple-touch-icon.png', fullBleed: true },
  // 192/512 全出血：512 条目 purpose:"maskable"，票券图形位于中心 80% 安全区
  { size: 192, file: 'android-chrome-192x192.png', fullBleed: true },
  { size: 512, file: 'android-chrome-512x512.png', fullBleed: true },
];

for (const job of PNG_JOBS) {
  const png = pngEncode(job.size, job.size, drawBrandIcon(job.size, { fullBleed: job.fullBleed }));
  writeFileSync(job.file, png);
  console.log(`OK  ${job.file}  ${png.length} bytes (${job.size}x${job.size})`);
}

// ICO 两帧（16/32）：48 帧仅旧版 Safari 受益（现代 Safari 走 PNG/SVG），
// 报告 §4.4 删帧后 14.7KB → ~5.6KB；门禁（check-data / tests-07）仅校验魔数
const icoFrames = [16, 32].map((size) => ({
  size,
  data: bmpFrame(drawBrandIcon(size, { fullBleed: false }), size),
}));
const ico = icoEncode(icoFrames);
writeFileSync('favicon.ico', ico);
console.log(`OK  favicon.ico  ${ico.length} bytes (16/32 BMP frames)`);
console.log('完成：7 个位图资产已生成（favicon.svg / site.webmanifest 为手写稿）。');
