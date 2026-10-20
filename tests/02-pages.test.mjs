/**
 * 校验 2：页面存在性 + sitemap.xml / 磁盘 双向一致性
 * 口径（tasks.md Phase E）：
 *   - sitemap 全部 URL 对应实际文件存在（尾斜杠 URL → /index.html）
 *   - 磁盘上的页面都进入 sitemap（404.html 除外：应 noindex 且不在 sitemap）
 *   - robots.txt 声明 sitemap；llms.txt 镜像站点矩阵与期限标注
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE, SLUGS, SITEMAP_PAGES, read, exists, pageUrl, urlToRelFile,
  listDiskHtmlFiles, getMeta,
} from './helpers.mjs';
import { parseDataJs } from '../scripts/check-data.mjs';

const sitemapXml = read('sitemap.xml');
const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const lastmods = [...sitemapXml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1].trim());

test('sitemap.xml：恰含 17 条 URL，与站点矩阵（首页+about+5 分站×3 页）一致', () => {
  const expected = SITEMAP_PAGES.map(pageUrl);
  assert.equal(locs.length, 17, `sitemap 应 17 条，实际 ${locs.length}`);
  const missing = expected.filter((u) => !locs.includes(u));
  const extra = locs.filter((u) => !expected.includes(u));
  assert.deepEqual(
    { missing, extra },
    { missing: [], extra: [] },
    'sitemap 与站点矩阵不一致',
  );
});

test('sitemap.xml：lastmod 全部存在、格式合法且不晚于今天', () => {
  assert.equal(lastmods.length, locs.length, '每个 URL 应有 lastmod');
  const today = new Date().toISOString().slice(0, 10);
  const errs = [];
  lastmods.forEach((d, i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) errs.push(`第 ${i + 1} 条 lastmod 格式非法：${d}`);
    else if (d > today) errs.push(`第 ${i + 1} 条 lastmod 晚于今天：${d}`);
  });
  assert.deepEqual(errs, [], 'lastmod 存在以下问题');
});

test('页面存在性：sitemap 全部 URL 均映射到磁盘上的实际文件', () => {
  const errs = [];
  for (const url of locs) {
    const rel = urlToRelFile(url);
    if (!exists(rel)) errs.push(`${url} → ${rel} 文件不存在`);
  }
  assert.deepEqual(errs, [], '以下 sitemap URL 无对应文件');
});

test('页面存在性：磁盘 HTML 页面全部进入 sitemap（404.html 除外）', () => {
  const disk = listDiskHtmlFiles();
  const errs = [];
  for (const rel of disk) {
    if (rel === '404.html') continue;
    const url = pageUrl(rel);
    if (!locs.includes(url)) errs.push(`${rel}（${url}）未进入 sitemap`);
  }
  // 反向兜底：矩阵清单中的每个页面都真实落盘
  for (const rel of SITEMAP_PAGES) {
    if (!disk.includes(rel.replace(/\\/g, '/'))) errs.push(`矩阵清单页面未落盘：${rel}`);
  }
  assert.deepEqual(errs, [], '磁盘 ↔ sitemap 存在以下不一致');
});

test('404.html：存在、noindex、且不出现在 sitemap 中', () => {
  assert.ok(exists('404.html'), '404.html 缺失');
  const html = read('404.html');
  assert.equal(getMeta(html, 'robots'), 'noindex', '404.html 应声明 robots noindex');
  assert.ok(!locs.includes(`${SITE}/404.html`), '404.html 不应进入 sitemap');
  assert.ok(!locs.includes(`${SITE}/404`), 'sitemap 不应出现 404 条目');
});

test('robots.txt：允许抓取并声明 sitemap 地址', () => {
  const robots = read('robots.txt');
  assert.ok(/User-agent:\s*\*/.test(robots), 'robots.txt 缺 User-agent: *');
  assert.ok(/Allow:\s*\//.test(robots), 'robots.txt 缺 Allow: /');
  assert.ok(robots.includes(`Sitemap: ${SITE}/sitemap.xml`), 'robots.txt 缺 Sitemap 声明');
});

test('llms.txt：镜像 6 站矩阵、各分站页面清单与推广期限标注', () => {
  const llms = read('llms.txt');
  const errs = [];
  const matrixUrls = [
    `${SITE}/`, `${SITE}/about/`, ...SLUGS.map((s) => `${SITE}/${s}/`),
  ];
  for (const u of matrixUrls) {
    if (!llms.includes(u)) errs.push(`llms.txt 缺站点 URL：${u}`);
  }
  // 每个分站的内容页也应出现在 llms.txt 中
  for (const url of locs) {
    if (url.endsWith('.html') && !llms.includes(url)) errs.push(`llms.txt 缺页面 URL：${url}`);
  }
  // 与 data.js 一致的期限标注
  const list = parseDataJs(read('data.js'));
  for (const it of list) {
    if (it.deadline !== null && !llms.includes(`有效期至 ${it.deadline}`)) {
      errs.push(`llms.txt 缺 ${it.id} 的期限标注（有效期至 ${it.deadline}）`);
    }
  }
  assert.deepEqual(errs, [], 'llms.txt 存在以下缺失');
});

test('GitHub Pages 基础设施：.nojekyll 存在，index.html 落盘', () => {
  assert.ok(exists('.nojekyll'), '.nojekyll 缺失（GitHub Pages 会忽略下划线/特殊目录外资产）');
  assert.ok(exists('index.html'), 'index.html 缺失');
});
