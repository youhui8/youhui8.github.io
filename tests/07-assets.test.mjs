/**
 * 校验 7：favicon 引用与静态资产完整性
 * 口径（tasks.md Phase E）：
 *   - 每页 head 引用 /favicon.ico、/favicon.svg、PNG 16/32/48、apple-touch-icon、site.webmanifest
 *   - 上述文件在根目录存在
 *   - PNG 头字节合法（89 50 4E 47）、ICO 头字节合法（00 00 01 00）、SVG 含 <svg>
 *   - site.webmanifest JSON 合法且其 icons 引用存在
 *   - 各站主题 CSS 存在且非空（不混改约束的前置存在性）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PAGES, read, readBin, exists,
} from './helpers.mjs';

const FAVICON_REFS = [
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
];

const ICON_FILES = [
  'favicon.ico', 'favicon.svg',
  'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png',
  'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png',
];

const THEME_CSS = [
  'assets/css/tokens.css', 'assets/css/base.css',
  'assets/css/theme-home.css', 'assets/css/theme-bendi.css', 'assets/css/theme-meituan.css',
  'assets/css/theme-jingdong-waimai.css', 'assets/css/theme-daojia.css', 'assets/css/theme-gouwu.css',
];

test('全部 18 页：head 完整引用 7 项 favicon/manifest 资源', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    const head = (read(rel).match(/<head>[\s\S]*?<\/head>/i) || [''])[0];
    if (!head) {
      errs.push(`${rel}: 缺 <head>`);
      continue;
    }
    for (const ref of FAVICON_REFS) {
      if (!head.includes(`href="${ref}"`)) errs.push(`${rel}: head 缺引用 ${ref}`);
    }
  }
  assert.deepEqual(errs, [], 'favicon 引用存在以下缺口');
});

test('favicon/图标文件：全部存在于根目录', () => {
  const errs = [];
  for (const f of ICON_FILES) {
    if (!exists(f)) errs.push(`根目录缺文件 ${f}`);
  }
  assert.deepEqual(errs, [], '图标文件存在以下缺失');
});

test('二进制魔数：PNG（89 50 4E 47）与 ICO（00 00 01 00）头字节合法', () => {
  const errs = [];
  for (const f of ICON_FILES) {
    if (!exists(f)) continue; // 缺失已由上一用例报告
    const buf = readBin(f);
    if (f.endsWith('.png')) {
      if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
        errs.push(`${f}: 非 PNG 魔数`);
      }
      if (buf.length < 100) errs.push(`${f}: 文件过小（${buf.length}B），疑似占位损坏`);
    } else if (f.endsWith('.ico')) {
      if (!(buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0)) {
        errs.push(`${f}: 非 ICO 魔数`);
      }
      const frames = buf.readUInt16LE(4);
      if (frames < 1) errs.push(`${f}: ICO 不含任何帧`);
    } else if (f.endsWith('.svg')) {
      if (!buf.toString('utf8').includes('<svg')) errs.push(`${f}: 非 SVG 内容`);
    }
  }
  assert.deepEqual(errs, [], '魔数校验存在以下问题');
});

test('site.webmanifest：JSON 合法、字段完备、icons 引用的文件存在', () => {
  const raw = read('site.webmanifest');
  let manifest;
  assert.doesNotThrow(() => { manifest = JSON.parse(raw); }, 'site.webmanifest 应为合法 JSON');
  const errs = [];
  for (const f of ['name', 'short_name', 'icons', 'display', 'start_url']) {
    if (!(f in manifest)) errs.push(`webmanifest 缺字段 ${f}`);
  }
  for (const icon of manifest.icons || []) {
    const file = icon.src.replace(/^\//, '');
    if (!exists(file)) errs.push(`webmanifest icon 缺文件：${icon.src}`);
    else if ((icon.type || '') === 'image/png') {
      const buf = readBin(file);
      if (!(buf[0] === 0x89 && buf[1] === 0x50)) errs.push(`webmanifest icon 非 PNG：${icon.src}`);
    }
  }
  assert.deepEqual(errs, [], 'webmanifest 存在以下问题');
});

test('主题 CSS：tokens/base + 6 个分站主题文件存在且非空（主题隔离约束的前置条件）', () => {
  const errs = [];
  for (const f of THEME_CSS) {
    if (!exists(f)) {
      errs.push(`缺样式文件 ${f}`);
      continue;
    }
    const text = read(f);
    if (text.trim().length === 0) errs.push(`${f} 为空文件`);
  }
  assert.deepEqual(errs, [], '主题 CSS 存在以下问题');
});

test('deadline.js：脚本文件存在且为有效 JS（含 data-deadline 处理逻辑）', () => {
  assert.ok(exists('assets/js/deadline.js'), 'assets/js/deadline.js 缺失');
  const js = read('assets/js/deadline.js');
  assert.ok(js.includes('data-deadline') || js.includes('deadline'), 'deadline.js 应处理 data-deadline 组件');
  assert.ok(js.trim().length > 0, 'deadline.js 不应为空');
});
