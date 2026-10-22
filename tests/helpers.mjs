/**
 * tests/helpers.mjs — 站点完整性测试共享工具（零 npm 依赖）
 * 注意：本文件不匹配 node --test 的测试文件模式（*.test.mjs），仅被测试文件导入。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = 'https://youhui8.github.io';
export const SLUGS = ['bendi', 'meituan', 'jingdong-waimai', 'daojia', 'gouwu'];

/** 各分站的内容页（guide 页），与 design.md 1.3.1.2 页面清单一致 */
export const GUIDES = {
  bendi: ['waimai-scene-guide.html', 'zhoubianyou-tuangou.html'],
  meituan: ['hongbao-guide.html', 'shenquan-guide.html'],
  'jingdong-waimai': ['hongbao-step.html', 'duibi-meituan.html'],
  daojia: ['xiche-jiage.html', 'jiazheng-bikeng.html'],
  gouwu: ['dacu-rili.html', 'waimai-gouwu-qingdan.html'],
};

/** sitemap 口径的 17 个页面（不含 404.html） */
export const SITEMAP_PAGES = [
  'index.html',
  'about/index.html',
  ...SLUGS.flatMap((s) => [`${s}/index.html`, ...GUIDES[s].map((g) => `${s}/${g}`)]),
];

/** 全部 18 个 HTML 页面（含 404.html） */
export const ALL_PAGES = [...SITEMAP_PAGES, '404.html'];

/** 分站 slug → 该站全部页面（index + guides） */
export function sitePages(slug) {
  return [`${slug}/index.html`, ...GUIDES[slug].map((g) => `${slug}/${g}`)];
}

/** 页面相对路径 → 规范 URL（尾斜杠形式） */
export function pageUrl(rel) {
  return `${SITE}/${rel.replace(/\\/g, '/').replace(/index\.html$/, '')}`;
}

/* ---------- 文件读取（带缓存） ---------- */
const cache = new Map();
export function read(rel) {
  const p = path.join(ROOT, rel);
  if (!cache.has(p)) cache.set(p, readFileSync(p, 'utf8'));
  return cache.get(p);
}
export function readBin(rel) {
  return readFileSync(path.join(ROOT, rel));
}
export function exists(rel) {
  return existsSync(path.join(ROOT, rel));
}

/* ---------- HTML 工具 ---------- */
export function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 极简 HTML 实体解码（meta/链接内容） */
export function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function getMeta(html, name) {
  const m = html.match(new RegExp(`<meta\\s+name="${escapeRe(name)}"\\s+content="([^"]*)"`, 'i'));
  return m ? decode(m[1]) : null;
}

export function getLink(html, rel) {
  const m = html.match(new RegExp(`<link\\s+rel="${escapeRe(rel)}"\\s+href="([^"]*)"`, 'i'));
  return m ? decode(m[1]) : null;
}

export function getOg(html, prop) {
  const m = html.match(new RegExp(`<meta\\s+property="${escapeRe(prop)}"\\s+content="([^"]*)"`, 'i'));
  return m ? decode(m[1]) : null;
}

/** 页面标题（<title> 文本） */
export function getTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? decode(m[1].trim()) : null;
}

/** 页脚区块 HTML */
export function getFooter(html) {
  const m = html.match(/<footer[\s\S]*?<\/footer>/i);
  return m ? m[0] : null;
}

/** 解析页面全部 JSON-LD（任一非法将抛错） */
export function extractJsonLd(html) {
  const out = [];
  const re = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(JSON.parse(m[1]));
  return out;
}

/** @graph 中的全部 @type */
export function graphTypes(obj) {
  return (obj['@graph'] || []).map((n) => n['@type']);
}

/** @graph 中首个指定 @type 节点 */
export function graphNode(obj, type) {
  return (obj['@graph'] || []).find((n) => n['@type'] === type) || null;
}

/* ---------- URL / 引用解析 ---------- */

/** 站内 URL → 仓库相对文件路径 */
export function urlToRelFile(url) {
  let p = url.startsWith(SITE) ? url.slice(SITE.length) : url;
  p = decodeURIComponent(p);
  if (p === '' || p === '/') return 'index.html';
  if (p.endsWith('/')) return p.slice(1) + 'index.html';
  return p.slice(1);
}

function relFromFile(p) {
  let t = p.replace(/\\/g, '/');
  if (t === '' || t === '/') return 'index.html';
  if (t.endsWith('/')) return t.slice(1) + 'index.html';
  return t.slice(1);
}

/**
 * 解析 href/src 引用。
 * 返回：
 *   { kind: 'external' }                    —— 站外绝对 URL（不检查）
 *   { kind: 'skip' }                        —— mailto/tel/javascript/data 协议
 *   { kind: 'internal', file, hash }        —— 站内引用（file 为仓库相对路径，hash 可能为 null）
 */
export function resolveRef(ref, pageFile) {
  if (/^(mailto:|tel:|javascript:|data:)/i.test(ref)) return { kind: 'skip' };
  const hi = ref.indexOf('#');
  const target = hi >= 0 ? ref.slice(0, hi) : ref;
  const hash = hi >= 0 ? decode(ref.slice(hi + 1)) : null;

  if (/^https?:\/\//i.test(target) || target.startsWith('//')) {
    if (target === SITE || target === SITE + '/') {
      return { kind: 'internal', file: 'index.html', hash };
    }
    if (target.startsWith(SITE + '/')) {
      return { kind: 'internal', file: relFromFile(decodeURIComponent(target.slice(SITE.length))), hash };
    }
    return { kind: 'external' };
  }
  if (target.startsWith('/')) {
    return { kind: 'internal', file: relFromFile(decodeURIComponent(target)), hash };
  }
  if (target === '') {
    return { kind: 'internal', file: pageFile, hash };
  }
  const joined = path.posix.join(
    path.posix.dirname(pageFile.replace(/\\/g, '/')),
    decodeURIComponent(target),
  );
  return { kind: 'internal', file: joined, hash };
}

/** 收集页面全部 href/src 引用 */
export function collectRefs(html) {
  const refs = [];
  const re = /\s(?:href|src)\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) refs.push(m[1]);
  return refs;
}

/** 页面是否定义了指定 id */
export function hasId(html, id) {
  return new RegExp(`\\sid=["']${escapeRe(id)}["']`).test(html);
}

/** 收集页面全部 promo-cta 锚点（含 href/rel/target 属性） */
export function collectPromoCtas(html) {
  const out = [];
  const re = /<a\b([^>]*\bclass="promo-cta"[^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const href = (attrs.match(/\bhref="([^"]*)"/) || [])[1] || '';
    const rel = (attrs.match(/\brel="([^"]*)"/) || [])[1] || '';
    const target = (attrs.match(/\btarget="([^"]*)"/) || [])[1] || '';
    out.push({ href, rel, target });
  }
  return out;
}

/** 页面全部 data-deadline 组件值 */
export function collectDeadlines(html) {
  const out = [];
  const re = /<[^>]*\bdata-deadline="([^"]*)"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

/** 可见 FAQ 区块（.faq-item 的 h3 问题 + p 答案） */
export function collectVisibleFaq(html) {
  const out = [];
  const re = /<div class="faq-item">\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) out.push({ q: decode(m[1].trim()), a: decode(m[2].trim()) });
  return out;
}

/** 可见面包屑（.breadcrumb 内的 li：中间项含链接，末项 aria-current） */
export function collectVisibleBreadcrumb(html) {
  const ol = html.match(/<ol class="breadcrumb">([\s\S]*?)<\/ol>/);
  if (!ol) return null;
  const items = [];
  const re = /<li(\s+aria-current="page")?\s*>(?:<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>|([\s\S]*?))<\/li>/g;
  let m;
  while ((m = re.exec(ol[1]))) {
    items.push({
      current: Boolean(m[1]),
      href: m[2] ? decode(m[2]) : null,
      name: decode((m[3] ?? m[4] ?? '').trim()),
    });
  }
  return items;
}

/** 递归列出仓库内全部 HTML 页面（排除工具/规范目录） */
export function listDiskHtmlFiles() {
  const EXCLUDE = new Set(['.git', '.codearts', 'node_modules', 'tests', 'scripts']);
  const out = [];
  const walk = (relDir) => {
    for (const name of readdirSync(path.join(ROOT, relDir))) {
      const rel = relDir ? `${relDir}/${name}` : name;
      const st = statSync(path.join(ROOT, rel));
      if (st.isDirectory()) {
        if (!EXCLUDE.has(name)) walk(rel);
      } else if (name.endsWith('.html')) {
        out.push(rel);
      }
    }
  };
  walk('');
  return out.sort();
}

/** 字符数（Unicode 码点口径，用于 title/description 长度约束） */
export function charLen(s) {
  return [...s].length;
}

/** 折叠内部空白后比较（JSON-LD 文本 vs 可见文本） */
export function looseText(s) {
  return s.replace(/\s+/g, '');
}
