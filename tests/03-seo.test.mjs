/**
 * 校验 3：每页 meta 完整性（title / description / canonical / OG / twitter）
 * 口径（spec REQ-SEO-001/002 + tasks.md Phase E）：
 *   - title 唯一且 ≤30 字；description 60~120 字且全站唯一
 *   - canonical 与页面 URL 一致（404 除外，不索引）
 *   - OG 标签完整（og:title/og:description/og:type/og:url/og:image+尺寸/og:site_name）
 *   - og:image 指向的图片文件真实存在且为合法 PNG
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITEMAP_PAGES, ALL_PAGES, read, exists, pageUrl, urlToRelFile, readBin,
  getTitle, getMeta, getLink, getOg, charLen,
} from './helpers.mjs';

test('全站 18 页：title 均存在、唯一且 ≤30 字', () => {
  const titles = new Map();
  const errs = [];
  for (const rel of ALL_PAGES) {
    const t = getTitle(read(rel));
    if (!t) {
      errs.push(`${rel}: 缺 <title>`);
      continue;
    }
    const n = charLen(t);
    if (n > 30) errs.push(`${rel}: title ${n} 字（>30）：${t}`);
    if (titles.has(t)) errs.push(`${rel}: title 与 ${titles.get(t)} 重复：${t}`);
    else titles.set(t, rel);
  }
  assert.deepEqual(errs, [], 'title 校验存在以下问题');
});

test('全站 18 页：description 均存在、60~120 字且全站唯一', () => {
  const descs = new Map();
  const errs = [];
  for (const rel of ALL_PAGES) {
    const d = getMeta(read(rel), 'description');
    if (!d) {
      errs.push(`${rel}: 缺 meta description`);
      continue;
    }
    const n = charLen(d);
    if (n < 60 || n > 120) errs.push(`${rel}: description ${n} 字（应在 60~120）：${d.slice(0, 24)}…`);
    if (descs.has(d)) errs.push(`${rel}: description 与 ${descs.get(d)} 重复`);
    else descs.set(d, rel);
  }
  assert.deepEqual(errs, [], 'description 校验存在以下问题');
});

test('17 个收录页：canonical 与页面 URL 逐字一致', () => {
  const errs = [];
  for (const rel of SITEMAP_PAGES) {
    const c = getLink(read(rel), 'canonical');
    const expected = pageUrl(rel);
    if (!c) errs.push(`${rel}: 缺 canonical`);
    else if (c !== expected) errs.push(`${rel}: canonical=${c}，应为 ${expected}`);
  }
  assert.deepEqual(errs, [], 'canonical 校验存在以下问题');
});

test('404.html：不设 canonical（noindex 页不出现在索引口径中）', () => {
  assert.equal(getLink(read('404.html'), 'canonical'), null, '404.html 不应设置 canonical');
});

test('17 个收录页：OG 标签完整且 og:title/og:url 与页面一致', () => {
  const errs = [];
  for (const rel of SITEMAP_PAGES) {
    const html = read(rel);
    const expectedUrl = pageUrl(rel);
    const title = getTitle(html);
    const checks = [
      ['og:title', getOg(html, 'og:title'), title],
      ['og:description', getOg(html, 'og:description'), null],
      ['og:type', getOg(html, 'og:type'), null],
      ['og:url', getOg(html, 'og:url'), expectedUrl],
      ['og:image', getOg(html, 'og:image'), null],
      ['og:image:width', getOg(html, 'og:image:width'), '1200'],
      ['og:image:height', getOg(html, 'og:image:height'), '630'],
      ['og:site_name', getOg(html, 'og:site_name'), null],
    ];
    for (const [prop, actual, expect] of checks) {
      if (!actual) errs.push(`${rel}: 缺 ${prop}`);
      else if (expect !== null && actual !== expect) errs.push(`${rel}: ${prop}=${actual}，应为 ${expect}`);
    }
    const type = getOg(html, 'og:type');
    if (type && !['website', 'article'].includes(type)) {
      errs.push(`${rel}: og:type=${type} 应为 website 或 article`);
    }
    const card = getMeta(html, 'twitter:card');
    if (card !== 'summary_large_image') errs.push(`${rel}: twitter:card=${card}，应为 summary_large_image`);
  }
  assert.deepEqual(errs, [], 'OG 标签校验存在以下问题');
});

test('og:image 分享图：全部图片文件真实存在且为合法 PNG', () => {
  const errs = [];
  for (const rel of SITEMAP_PAGES) {
    const img = getOg(read(rel), 'og:image');
    if (!img) continue; // 缺失已由上一用例报告
    const file = urlToRelFile(img);
    if (!exists(file)) {
      errs.push(`${rel}: og:image 文件不存在：${img}`);
      continue;
    }
    const buf = readBin(file);
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
      errs.push(`${rel}: og:image 非 PNG 魔数：${file}`);
    }
  }
  assert.deepEqual(errs, [], 'og:image 校验存在以下问题');
});
