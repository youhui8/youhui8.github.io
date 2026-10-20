#!/usr/bin/env node
/**
 * check-data.mjs — data.js 与全站产物一致性校验（T1.10，零依赖，Node >= 18）
 * ------------------------------------------------------------------
 * 校验分五节：
 *   1. data.js 结构（字段齐全、id=slug 唯一、link 唯一且合法、deadline 格式）
 *   2. HTML 物化（首页卡片 name/description/deadline 落点逐字比对；
 *      任何页面不得加载 data.js；deadline.js 引用与期限元素配套；
 *      外链 CTA 的 href/rel/target 合规——分站页面生效）
 *   3. sitemap.xml / llms.txt 与文件树一致性
 *   4. 静态资产存在性 + PNG/ICO/SVG/JSON 头字节校验
 *   5. JSON-LD 可解析抽检
 *
 * 用法：
 *   node scripts/check-data.mjs            # 宽松模式：分站未建仅警告（D1 阶段）
 *   node scripts/check-data.mjs --strict   # 严格模式：分站文件缺失视为错误（D2 门禁）
 *
 * 退出码：0 = 全部通过（警告不计入）；1 = 存在错误。
 * 本文件同时导出 parseDataJs / runAll，供 Phase E 自动化流程复用。
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://youhui8.github.io';
const SLUGS = ['bendi', 'meituan', 'jingdong-waimai', 'daojia', 'gouwu'];
// sitemap 应包含的 17 个 URL（首页 + about + 5 分站首页 + 10 篇文章页）
const SITEMAP_EXPECT = [
  '/', '/about/',
  '/bendi/', '/bendi/waimai-scene-guide.html', '/bendi/zhoubianyou-tuangou.html',
  '/meituan/', '/meituan/hongbao-guide.html', '/meituan/shenquan-guide.html',
  '/jingdong-waimai/', '/jingdong-waimai/hongbao-step.html', '/jingdong-waimai/duibi-meituan.html',
  '/daojia/', '/daojia/xiche-jiage.html', '/daojia/jiazheng-bikeng.html',
  '/gouwu/', '/gouwu/dacu-rili.html', '/gouwu/waimai-gouwu-qingdan.html',
];
const ASSETS = [
  'favicon.ico', 'favicon.svg',
  'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png',
  'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png',
  'og-home.png', 'og-bendi.png', 'og-meituan.png',
  'og-jingdong-waimai.png', 'og-daojia.png', 'og-gouwu.png',
  'site.webmanifest', 'robots.txt', '.nojekyll',
  'assets/css/tokens.css', 'assets/css/base.css', 'assets/css/theme-home.css',
  'assets/js/deadline.js',
];

/** 解析 data.js 文本为记录数组（不 eval 业务代码之外的内容：仅提取数组字面量） */
export function parseDataJs(text) {
  const start = text.indexOf('const youhuiList');
  if (start === -1) throw new Error('data.js 中未找到 youhuiList 声明');
  const lb = text.indexOf('[', start);
  const rb = text.lastIndexOf(']');
  if (lb === -1 || rb === -1 || rb < lb) throw new Error('youhuiList 数组边界异常');
  // 数组字面量中均为安全字面量（字符串/数字/null/对象），Function 环境只暴露 Object 冻结语义
  const list = new Function('Object', `"use strict";return (${text.slice(lb, rb + 1)});`)(Object);
  if (!Array.isArray(list) || list.length === 0) throw new Error('youhuiList 不是非空数组');
  return list;
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

class Report {
  constructor() { this.pass = 0; this.warns = 0; this.err = 0; }
  ok(msg) { this.pass++; console.log(`  [PASS] ${msg}`); }
  warn(msg) { this.warns++; console.log(`  [WARN] ${msg}`); }
  fail(msg) { this.err++; console.log(`  [FAIL] ${msg}`); }
  skip(msg) { console.log(`  [SKIP] ${msg}`); }
}

function htmlFiles() {
  const files = [];
  if (existsSync(path.join(ROOT, 'index.html'))) files.push('index.html');
  if (existsSync(path.join(ROOT, 'about/index.html'))) files.push('about/index.html');
  if (existsSync(path.join(ROOT, '404.html'))) files.push('404.html');
  for (const slug of SLUGS) {
    const dir = path.join(ROOT, slug);
    if (!existsSync(dir)) continue;
    files.push(`${slug}/index.html`);
    for (const f of ['hongbao-guide', 'shenquan-guide', 'hongbao-step', 'duibi-meituan',
      'waimai-scene-guide', 'zhoubianyou-tuangou', 'xiche-jiage', 'jiazheng-bikeng',
      'dacu-rili', 'waimai-gouwu-qingdan']) {
      if (existsSync(path.join(dir, `${f}.html`))) files.push(`${slug}/${f}.html`);
    }
  }
  return files;
}

/** 第 1 节：data.js 结构校验，返回记录数组 */
function checkDataStructure(r) {
  let list;
  try {
    list = parseDataJs(readFileSync(path.join(ROOT, 'data.js'), 'utf8'));
  } catch (e) {
    r.fail(`data.js 解析失败：${e.message}`);
    return null;
  }
  if (list.length !== 5) { r.fail(`记录数应为 5，实际 ${list.length}`); } else { r.ok(`记录数 = 5`); }
  const seenSlug = new Set(), seenLink = new Set();
  for (const it of list) {
    const tag = it.id ?? '?';
    for (const k of ['id', 'name', 'link', 'description', 'deadline', 'site']) {
      if (!(k in it)) r.fail(`[${tag}] 缺字段 ${k}`);
    }
    if (it.site && it.site.slug !== it.id) r.fail(`[${tag}] site.slug(${it.site.slug}) ≠ id`);
    if (it.site && it.site.url !== `${SITE}/${it.id}/`) r.fail(`[${tag}] site.url 非规范地址`);
    if (it.id && seenSlug.has(it.id)) r.fail(`[${tag}] id 重复`); seenSlug.add(it.id);
    if (it.name && !String(it.name).trim()) r.fail(`[${tag}] name 为空`);
    if (it.description && !String(it.description).trim()) r.fail(`[${tag}] description 为空`);
    if (it.link) {
      if (!/^https?:\/\//.test(it.link)) r.fail(`[${tag}] link 非法协议：${it.link}`);
      if (seenLink.has(it.link)) r.fail(`[${tag}] link 重复`); seenLink.add(it.link);
    }
    if (it.deadline !== null && !/^\d{4}-\d{2}-\d{2}$/.test(it.deadline ?? '')) {
      r.fail(`[${tag}] deadline 须为 YYYY-MM-DD 或 null，实际：${it.deadline}`);
    }
    if (typeof it.deadline === 'string' && Number.isNaN(new Date(`${it.deadline}T00:00:00Z`).getTime())) {
      r.fail(`[${tag}] deadline 非法日期：${it.deadline}`);
    }
  }
  if (r.err === 0) r.ok('全部 5 条记录字段/唯一性/日期格式合法');
  return list;
}

/** 第 2 节：HTML 物化校验 */
function checkHtml(r, list, strict) {
  const files = htmlFiles();
  if (files.length === 0) { r.fail('未找到任何 HTML 页面'); return; }
  const idx = files.includes('index.html');
  if (!idx && strict) r.fail('缺 index.html'); if (idx) r.ok('index.html 存在');

  for (const f of files) {
    const html = readFileSync(path.join(ROOT, f), 'utf8');
    const rel = f.replace(/\\/g, '/');
    // 任何页面不得加载 data.js（轨道 A：页面静态直出）
    if (/src=["'][^"']*data\.js/.test(html)) r.fail(`[${rel}] 页面加载了 data.js（轨道 A 禁止）`);
    // deadline.js 配套：含 data-deadline 元素才允许引入
    const hasDlAttr = html.includes('data-deadline');
    const hasDlJs = /deadline\.js/.test(html);
    if (hasDlAttr && !hasDlJs) r.fail(`[${rel}] 含期限元素但未引入 deadline.js`);
    if (!hasDlAttr && hasDlJs && rel !== 'index.html') r.fail(`[${rel}] 无期限元素却引入 deadline.js`);
    // 外链 CTA 合规（指向 data.js link 的 <a>）
    for (const it of list) {
      const esc = escapeHtml(it.link);
      if (html.includes(esc)) {
        const re = new RegExp(`<a\\s[^>]*href="${esc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g');
        for (const m of html.match(re) ?? []) {
          if (!/rel="[^"]*sponsored/.test(m) || !/nofollow/.test(m) || !/noopener/.test(m)) {
            r.fail(`[${rel}] 外链 CTA rel 缺 sponsored/nofollow/noopener：${it.link}`);
          }
          if (!/target="_blank"/.test(m)) r.fail(`[${rel}] 外链 CTA 缺 target="_blank"：${it.link}`);
        }
      }
    }
    // JSON-LD 可解析（第 5 节并入此处逐页执行）
    const ldBlocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
    for (const b of ldBlocks) {
      try { JSON.parse(b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')); }
      catch (e) { r.fail(`[${rel}] JSON-LD 解析失败：${e.message}`); }
    }
    if (ldBlocks.length > 0 && !r.err) r.ok(`[${rel}] ${ldBlocks.length} 段 JSON-LD 可解析`);
  }

  // 首页卡片逐字物化
  if (idx) {
    const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    for (const it of list) {
      const cardMatch = html.match(new RegExp(`<article class="card site-card site-card--${it.id}">[\\s\\S]*?</article>`));
      if (!cardMatch) { r.fail(`[index.html] 缺 site-card--${it.id} 卡片`); continue; }
      const card = cardMatch[0];
      if (!card.includes(`href="${it.site.url}"`)) r.fail(`[${it.id}] 卡片站名链接非 ${it.site.url}`);
      if (!card.includes(`推广入口：${it.name}`)) r.fail(`[${it.id}] card-note 缺记录名“${it.name}”`);
      if (!card.includes(escapeHtml(it.description))) r.fail(`[${it.id}] card-desc 未含 description 原文`);
      if (it.deadline !== null) {
        if (!card.includes(`data-deadline="${it.deadline}"`)) r.fail(`[${it.id}] 缺 data-deadline="${it.deadline}"`);
        if (!card.includes(`有效期至 ${it.deadline}`)) r.fail(`[${it.id}] 缺静态文案“有效期至 ${it.deadline}”`);
      } else if (/data-deadline|有效期至/.test(card)) {
        r.fail(`[${it.id}] 无期限记录的卡片出现期限元素`);
      }
    }
    if (r.err === 0) r.ok('首页 5 张卡片 name/description/deadline 物化逐字一致');
  }

  // 404 页专项
  if (files.includes('404.html')) {
    const html = readFileSync(path.join(ROOT, '404.html'), 'utf8');
    if (!/name="robots"\s+content="noindex"/.test(html)) r.fail('[404.html] 缺 noindex');
    if (/rel="canonical"/.test(html)) r.fail('[404.html] 不应有 canonical');
    if (/og:image|og:url/.test(html)) r.fail('[404.html] 不应有 og:url/og:image（非规范地址）');
    if (html.includes('deadline.js')) r.fail('[404.html] 不应引入 deadline.js');
    if (r.err === 0) r.ok('404.html：noindex/无 canonical/无 og/无 deadline.js');
  } else if (strict) r.fail('缺 404.html');

  // 分站物化（D1 宽松：目录未建仅提示）
  for (const it of list) {
    const f = path.join(ROOT, it.id, 'index.html');
    if (!existsSync(f)) { strict ? r.fail(`分站 ${it.id}/index.html 缺失`) : r.skip(`分站 ${it.id}/ 未建（D2 交付）`); continue; }
    const html = readFileSync(f, 'utf8');
    if (!html.includes(escapeHtml(it.link))) r.fail(`[${it.id}/] CTA href 与 link 不一致`);
    else r.ok(`[${it.id}/] CTA href 逐字符一致`);
    if (it.deadline !== null) {
      if (!html.includes(`data-deadline="${it.deadline}"`)) r.fail(`[${it.id}/] 缺期限元素`);
      if (!html.includes(`有效期至 ${it.deadline}`)) r.fail(`[${it.id}/] 缺静态期限文案`);
    } else if (/data-deadline/.test(html)) {
      r.fail(`[${it.id}/] 无期限分站出现期限元素`);
    }
  }
}

/** 第 3 节：sitemap.xml 与 llms.txt */
function checkSitemapAndLlms(r, strict) {
  // --- sitemap ---
  let sm;
  try { sm = readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'); }
  catch { r.fail('sitemap.xml 缺失'); return; }
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expect = SITEMAP_EXPECT.map((p) => SITE + p);
  const missing = expect.filter((u) => !locs.includes(u));
  const extra = locs.filter((u) => !expect.includes(u));
  if (missing.length) r.fail(`sitemap 缺 URL：${missing.join(' ')}`);
  if (extra.length) r.fail(`sitemap 多出 URL：${extra.join(' ')}`);
  if (locs.length !== 17) r.fail(`sitemap 应 17 条，实际 ${locs.length}`);
  else if (!missing.length && !extra.length) r.ok('sitemap.xml = 17 URL 且与站点矩阵一致');
  const today = new Date().toISOString().slice(0, 10);
  for (const m of sm.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1]) || m[1] > today) r.fail(`sitemap lastmod 非法或晚于今天：${m[1]}`);
  }
  // 磁盘 ↔ sitemap 双向
  const onDisk = htmlFiles().filter((f) => f !== '404.html')
    .map((f) => `${SITE}/${f.replace(/\\/g, '/').replace(/index\.html$/, '')}`);
  for (const u of onDisk) if (!locs.includes(u)) r.fail(`磁盘页面未进 sitemap：${u}`);
  for (const u of locs) {
    const p = path.join(ROOT, decodeURIComponent(u.slice(SITE.length + 1)).replace(/\/$/, '/index.html').replace(/\/index\.html$/, u.endsWith('/') ? '/index.html' : ''));
    if (!existsSync(p)) strict ? r.fail(`sitemap 条目无对应文件：${u}`) : r.warn(`sitemap 条目暂未落盘（分站 D2 交付）：${u}`);
  }
  // --- llms.txt ---
  let ll;
  try { ll = readFileSync(path.join(ROOT, 'llms.txt'), 'utf8'); }
  catch { r.fail('llms.txt 缺失'); return; }
  for (const u of expect.slice(0, 7)) if (!ll.includes(u)) r.fail(`llms.txt 缺站点 URL：${u}`);
  for (const s of SLUGS) if (!ll.includes(`/${s}/`)) r.fail(`llms.txt 缺分站 ${s}`);
  const list = parseDataJs(readFileSync(path.join(ROOT, 'data.js'), 'utf8'));
  for (const it of list) {
    if (it.deadline !== null && !ll.includes(`有效期至 ${it.deadline}`)) r.fail(`llms.txt 缺 ${it.id} 期限标注`);
  }
  if (r.err === 0) r.ok('llms.txt：6 站 URL + 期限标注与 data.js 一致');
}

/** 第 4 节：资产存在性 + 魔数校验 */
function checkAssets(r) {
  for (const a of ASSETS) {
    const p = path.join(ROOT, a);
    if (!existsSync(p)) { r.fail(`资产缺失：${a}`); continue; }
    const buf = readFileSync(p);
    const head = buf.subarray(0, 8);
    if (a.endsWith('.png')) {
      const ok = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
      ok ? r.ok(`${a}（PNG 头合法，${buf.length}B）`) : r.fail(`${a} 非 PNG 魔数`);
    } else if (a.endsWith('.ico')) {
      head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0
        ? r.ok(`${a}（ICO 头合法，含 ${buf.readUInt16LE(4)} 帧）`) : r.fail(`${a} 非 ICO 魔数`);
    } else if (a.endsWith('.webmanifest')) {
      try { JSON.parse(buf.toString('utf8')); r.ok(`${a}（JSON 合法）`); } catch (e) { r.fail(`${a} JSON 解析失败：${e.message}`); }
    } else if (a.endsWith('.svg')) {
      buf.toString('utf8').includes('<svg') ? r.ok(`${a}（SVG 合法）`) : r.fail(`${a} 非 SVG`);
    } else if (statSync(p).size === 0 && a === '.nojekyll') {
      r.ok(`${a}（空文件）`);
    } else if (statSync(p).size === 0) {
      r.fail(`${a} 为空文件`);
    } else { r.ok(`${a} 存在（${buf.length}B）`); }
  }
}

/** 主入口：返回 {pass, warn, err}；strict 为 true 时分站缺失计为错误 */
export function runAll(strict = false) {
  const r = new Report();
  console.log(strict ? '\n== check-data（严格模式）==\n' : '\n== check-data（宽松模式）==\n');
  console.log('[1/5] data.js 结构');
  const list = checkDataStructure(r);
  console.log('\n[2/5] HTML 物化 + JSON-LD');
  if (list) checkHtml(r, list, strict); else r.fail('data.js 结构错误，跳过 HTML 校验');
  console.log('\n[3/5] sitemap.xml / llms.txt');
  if (list) checkSitemapAndLlms(r, strict);
  console.log('\n[4/5] 静态资产');
  checkAssets(r);
  console.log('\n[5/5] 汇总');
  console.log(`  PASS=${r.pass}  WARN=${r.warns}  FAIL=${r.err}`);
  console.log(r.err === 0 ? '\n✔ 全部校验通过' : '\n✘ 存在校验失败项');
  return { pass: r.pass, warn: r.warns, err: r.err };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { err } = runAll(process.argv.includes('--strict'));
  process.exitCode = err === 0 ? 0 : 1;
}
