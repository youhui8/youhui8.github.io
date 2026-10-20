/**
 * 校验 4：JSON-LD 结构化数据完整性（以 design.md 2.1 为准）
 *   - 每个收录页 JSON-LD 可 JSON.parse，@graph 数组
 *   - 首页：WebSite + ItemList + FAQPage（ItemList 与 data.js 站序一致）
 *   - about：WebPage + BreadcrumbList
 *   - 分站 index：CollectionPage + ItemList + BreadcrumbList
 *   - guide 页：Article + BreadcrumbList（hongbao-guide / dacu-rili / hongbao-step 额外含 FAQPage）
 *   - FAQPage 与可见 .faq-item 文案逐字一致（base.css 契约）
 *   - BreadcrumbList 与可见面包屑 nav 一致
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE, SLUGS, SITEMAP_PAGES, GUIDES, read, pageUrl,
  extractJsonLd, graphTypes, graphNode, collectVisibleFaq, collectVisibleBreadcrumb, looseText,
} from './helpers.mjs';
import { parseDataJs } from '../scripts/check-data.mjs';

const data = parseDataJs(read('data.js'));
const homeHtml = read('index.html');

/** 解析页面首个 JSON-LD（结构错误时抛出，由断言捕获） */
function firstGraph(rel) {
  const arr = extractJsonLd(read(rel));
  assert.ok(arr.length >= 1, `${rel}: 缺 JSON-LD`);
  return arr[0];
}

test('全部 17 个收录页：JSON-LD 可解析、含 @context 与非空 @graph', () => {
  const errs = [];
  for (const rel of SITEMAP_PAGES) {
    try {
      const arr = extractJsonLd(read(rel));
      if (arr.length === 0) {
        errs.push(`${rel}: 无 JSON-LD script`);
        continue;
      }
      const g = arr[0];
      if (g['@context'] !== 'https://schema.org') errs.push(`${rel}: @context 应为 https://schema.org`);
      if (!Array.isArray(g['@graph']) || g['@graph'].length === 0) errs.push(`${rel}: @graph 应为非空数组`);
      for (const node of g['@graph'] || []) {
        if (!node['@type']) errs.push(`${rel}: @graph 节点缺 @type`);
        if (!node['@id']) errs.push(`${rel}: @graph 节点（${node['@type']}）缺 @id`);
      }
    } catch (e) {
      errs.push(`${rel}: JSON-LD 解析失败 ${e.message}`);
    }
  }
  assert.deepEqual(errs, [], 'JSON-LD 基础结构存在以下问题');
});

test('首页：@graph 含 WebSite + ItemList + FAQPage，且 ItemList 与站序一致（design.md 2.1：name=站名，url=规范 URL）', () => {
  const SITE_NAMES = {
    bendi: '本地生活优惠集',
    meituan: '美团优惠专区',
    'jingdong-waimai': '京东外卖红包站',
    daojia: '到家服务特惠',
    gouwu: '网购外卖省钱站',
  };
  const g = firstGraph('index.html');
  const types = graphTypes(g);
  for (const t of ['WebSite', 'ItemList', 'FAQPage']) {
    assert.ok(types.includes(t), `首页 @graph 缺 ${t}（实际：${types.join(', ')}）`);
  }
  // WebSite 基本信息
  const ws = graphNode(g, 'WebSite');
  assert.equal(ws.url, `${SITE}/`, 'WebSite.url 应为站点根');
  // ItemList：站名 + 规范 URL，顺序与 data.js 站序一致
  const il = graphNode(g, 'ItemList');
  const items = il.itemListElement;
  assert.equal(items.length, 5, `首页 ItemList 应 5 项，实际 ${items.length}`);
  const errs = [];
  items.forEach((it, i) => {
    const rec = data[i];
    if (it.position !== i + 1) errs.push(`ItemList 第 ${i + 1} 项 position=${it.position}`);
    if (it.name !== SITE_NAMES[rec.site.slug]) {
      errs.push(`ItemList 第 ${i + 1} 项 name=${it.name}，站名应为 ${SITE_NAMES[rec.site.slug]}`);
    }
    if (it.url !== rec.site.url) errs.push(`ItemList 第 ${i + 1} 项 url=${it.url}，应为 ${rec.site.url}`);
  });
  assert.deepEqual(errs, [], '首页 ItemList 存在以下不一致');
});

test('about：@graph 含 WebPage + BreadcrumbList', () => {
  const types = graphTypes(firstGraph('about/index.html'));
  for (const t of ['WebPage', 'BreadcrumbList']) {
    assert.ok(types.includes(t), `about @graph 缺 ${t}（实际：${types.join(', ')}）`);
  }
});

test('5 个分站 index：@graph 含 CollectionPage + ItemList + BreadcrumbList，站内 ItemList 指向本站页面', () => {
  const errs = [];
  for (const slug of SLUGS) {
    const rel = `${slug}/index.html`;
    try {
      const g = firstGraph(rel);
      const types = graphTypes(g);
      for (const t of ['CollectionPage', 'ItemList', 'BreadcrumbList']) {
        if (!types.includes(t)) errs.push(`${rel}: @graph 缺 ${t}（实际：${types.join(', ')}）`);
      }
      const il = graphNode(g, 'ItemList');
      if (il && Array.isArray(il.itemListElement)) {
        il.itemListElement.forEach((it, i) => {
          if (it.position !== i + 1) errs.push(`${rel}: ItemList position 不连续`);
          if (it.url && !String(it.url).startsWith(`${SITE}/${slug}/`)) {
            errs.push(`${rel}: ItemList 第 ${i + 1} 项 url 越站：${it.url}`);
          }
        });
      }
    } catch (e) {
      errs.push(`${rel}: ${e.message}`);
    }
  }
  assert.deepEqual(errs, [], '分站 index JSON-LD 存在以下问题');
});

test('10 个 guide 页：@graph 含 Article + BreadcrumbList；3 个 FAQ 页额外含 FAQPage', () => {
  const FAQ_GUIDES = ['meituan/hongbao-guide.html', 'gouwu/dacu-rili.html', 'jingdong-waimai/hongbao-step.html'];
  const errs = [];
  for (const slug of SLUGS) {
    for (const g of GUIDES[slug]) {
      const rel = `${slug}/${g}`;
      try {
        const graph = firstGraph(rel);
        const types = graphTypes(graph);
        for (const t of ['Article', 'BreadcrumbList']) {
          if (!types.includes(t)) errs.push(`${rel}: @graph 缺 ${t}（实际：${types.join(', ')}）`);
        }
        const art = graphNode(graph, 'Article');
        if (art) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(art.datePublished || '')) errs.push(`${rel}: Article.datePublished 格式非法`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(art.dateModified || '')) errs.push(`${rel}: Article.dateModified 格式非法`);
          if (art.mainEntityOfPage !== pageUrl(rel)) errs.push(`${rel}: mainEntityOfPage=${art.mainEntityOfPage}，应为 ${pageUrl(rel)}`);
        }
        const hasFaqBlock = collectVisibleFaq(read(rel)).length > 0;
        const hasFaqPage = types.includes('FAQPage');
        if (FAQ_GUIDES.includes(rel) && !hasFaqPage) errs.push(`${rel}: 按 design.md 应含 FAQPage`);
        if (hasFaqBlock !== hasFaqPage) errs.push(`${rel}: 可见 FAQ 区块(${hasFaqBlock}) 与 FAQPage(${hasFaqPage}) 不匹配`);
      } catch (e) {
        errs.push(`${rel}: ${e.message}`);
      }
    }
  }
  assert.deepEqual(errs, [], 'guide 页 JSON-LD 存在以下问题');
});

test('全站 FAQ 一致性：可见 .faq-item 文案与 FAQPage JSON-LD 逐字一致（顺序一致）', () => {
  const errs = [];
  for (const rel of SITEMAP_PAGES) {
    try {
      const html = read(rel);
      const visible = collectVisibleFaq(html);
      if (visible.length === 0) continue;
      const faq = graphNode(firstGraph(rel), 'FAQPage');
      if (!faq) {
        errs.push(`${rel}: 有 ${visible.length} 个可见 faq-item 但无 FAQPage`);
        continue;
      }
      const ents = faq.mainEntity || [];
      if (ents.length !== visible.length) {
        errs.push(`${rel}: FAQPage ${ents.length} 问 vs 可见 ${visible.length} 问`);
        continue;
      }
      ents.forEach((ent, i) => {
        if (looseText(ent.name) !== looseText(visible[i].q)) {
          errs.push(`${rel}: 第 ${i + 1} 问不一致 JSON-LD「${ent.name}」 vs 页面「${visible[i].q}」`);
        }
        const answer = ent.acceptedAnswer && ent.acceptedAnswer.text;
        if (!answer || looseText(answer) !== looseText(visible[i].a)) {
          errs.push(`${rel}: 第 ${i + 1} 答案与页面文案不一致`);
        }
      });
    } catch (e) {
      errs.push(`${rel}: ${e.message}`);
    }
  }
  assert.deepEqual(errs, [], 'FAQ 一致性存在以下问题');
});

test('全站面包屑一致性：可见 .breadcrumb 与 BreadcrumbList 逐项一致（末项 aria-current）', () => {
  const errs = [];
  for (const rel of SITEMAP_PAGES) {
    try {
      const html = read(rel);
      const visible = collectVisibleBreadcrumb(html);
      if (!visible) {
        if (rel !== 'index.html') errs.push(`${rel}: 缺可见面包屑 nav`);
        continue;
      }
      const bl = graphNode(firstGraph(rel), 'BreadcrumbList');
      if (!bl) {
        errs.push(`${rel}: 缺 BreadcrumbList`);
        continue;
      }
      const ents = bl.itemListElement || [];
      if (ents.length !== visible.length) {
        errs.push(`${rel}: BreadcrumbList ${ents.length} 级 vs 可见 ${visible.length} 级`);
        continue;
      }
      ents.forEach((ent, i) => {
        const v = visible[i];
        if (ent.position !== i + 1) errs.push(`${rel}: 面包屑 position 不连续`);
        if (looseText(ent.name) !== looseText(v.name)) {
          errs.push(`${rel}: 第 ${i + 1} 级名称 JSON-LD「${ent.name}」 vs 页面「${v.name}」`);
        }
        if (i === visible.length - 1) {
          if (!v.current) errs.push(`${rel}: 面包屑末项应带 aria-current="page"`);
          if (v.href) errs.push(`${rel}: 面包屑末项不应是链接`);
        } else {
          if (v.current) errs.push(`${rel}: 面包屑第 ${i + 1} 级不应是当前页`);
          if (v.href !== ent.item) errs.push(`${rel}: 第 ${i + 1} 级链接 ${v.href} vs JSON-LD ${ent.item}`);
        }
      });
    } catch (e) {
      errs.push(`${rel}: ${e.message}`);
    }
  }
  assert.deepEqual(errs, [], '面包屑一致性存在以下问题');
});
