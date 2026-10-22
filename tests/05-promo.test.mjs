/**
 * 校验 5：5 条推广链接全部挂接 + deadline 组件与 deadline.js 引用
 * 口径（tasks.md Phase E + data.js 单一事实源）：
 *   - 每条记录的 link 在对应分站每一页（index + guides）以 promo-cta 挂接，href 逐字一致
 *   - 外部 promo-cta 必须带 rel="sponsored nofollow noopener" + target="_blank"
 *   - 页面不得挂接非本站记录的推广链接
 *   - 有 deadline 站（meituan/jingdong-waimai）每页：data-deadline="2026-12-31" 组件 + deadline.js
 *   - 无 deadline 站（bendi/daojia/gouwu）9 页：不引 deadline.js、无 data-deadline
 *   - 通用规则：页面出现 data-deadline 元素 ⇔ 引用 deadline.js（首页卡片组件成立）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE, SLUGS, SITEMAP_PAGES, ALL_PAGES, sitePages, read,
  collectPromoCtas, collectDeadlines,
} from './helpers.mjs';
import { parseDataJs } from '../scripts/check-data.mjs';

const data = parseDataJs(read('data.js'));
const DEADLINE_JS = '/assets/js/deadline.js';
const allLinks = new Set(data.map((it) => it.link));

test('每条推广记录：对应分站全部页面均以 promo-cta 挂接（href 逐字一致，≥1 处）', () => {
  const errs = [];
  for (const rec of data) {
    for (const rel of sitePages(rec.site.slug)) {
      const ctas = collectPromoCtas(read(rel)).filter((c) => !c.href.startsWith(SITE));
      const hits = ctas.filter((c) => c.href === rec.link);
      if (hits.length === 0) {
        errs.push(`${rel}: 未挂接本站推广链接 ${rec.link}`);
      }
    }
  }
  assert.deepEqual(errs, [], '推广链接挂接存在以下缺口');
});

test('全部外部 promo-cta：rel 含 sponsored/nofollow/noopener 且 target="_blank"', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    for (const c of collectPromoCtas(read(rel))) {
      if (c.href.startsWith(SITE)) continue; // 站内 CTA（如 404 返回首页）不适用推广口径
      const relSet = new Set((c.rel || '').split(/\s+/).filter(Boolean));
      for (const token of ['sponsored', 'nofollow', 'noopener']) {
        if (!relSet.has(token)) errs.push(`${rel}: 推广链接 ${c.href} rel 缺 ${token}（实际 rel="${c.rel}"）`);
      }
      if (c.target !== '_blank') errs.push(`${rel}: 推广链接 ${c.href} 缺 target="_blank"`);
    }
  }
  assert.deepEqual(errs, [], '推广链接属性存在以下问题');
});

test('推广链接归属：任何页面不得挂接非本站/非 data.js 的推广链接', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    const slug = SLUGS.find((s) => rel.startsWith(`${s}/`));
    const ownLink = slug ? data.find((it) => it.site.slug === slug)?.link : null;
    for (const c of collectPromoCtas(read(rel))) {
      if (c.href.startsWith(SITE)) continue; // 站内链接
      if (!allLinks.has(c.href)) {
        errs.push(`${rel}: 挂接了 data.js 之外的推广链接：${c.href}`);
      } else if (slug && c.href !== ownLink) {
        errs.push(`${rel}: 挂接了其他分站的推广链接：${c.href}`);
      }
    }
  }
  assert.deepEqual(errs, [], '推广链接归属存在以下问题');
});

test('有 deadline 站（meituan / jingdong-waimai）每页：deadline 组件值正确 + 文案 + 引用 deadline.js', () => {
  const errs = [];
  for (const rec of data.filter((it) => it.deadline !== null)) {
    assert.ok(rec.site.slug === 'meituan' || rec.site.slug === 'jingdong-waimai',
      `deadline 站应为 meituan/jingdong-waimai，实际 ${rec.site.slug}`);
    for (const rel of sitePages(rec.site.slug)) {
      const html = read(rel);
      const dls = collectDeadlines(html);
      if (!dls.includes(rec.deadline)) {
        errs.push(`${rel}: 缺 data-deadline="${rec.deadline}" 组件（现有：${dls.join(', ') || '无'}）`);
      }
      if (!html.includes(`有效期至 ${rec.deadline}`)) {
        errs.push(`${rel}: deadline-text 缺「有效期至 ${rec.deadline}」文案`);
      }
      if (!html.includes(`src="${DEADLINE_JS}"`)) {
        errs.push(`${rel}: 未引用 ${DEADLINE_JS}`);
      }
    }
  }
  assert.deepEqual(errs, [], 'deadline 站组件存在以下问题');
});

test('无 deadline 站（bendi/daojia/gouwu）全部 9 页：不引 deadline.js、无 data-deadline 组件', () => {
  const errs = [];
  for (const slug of ['bendi', 'daojia', 'gouwu']) {
    for (const rel of sitePages(slug)) {
      const html = read(rel);
      if (html.includes(`src="${DEADLINE_JS}"`)) errs.push(`${rel}: 无 deadline 站不应引用 deadline.js`);
      const dls = collectDeadlines(html);
      if (dls.length > 0) errs.push(`${rel}: 无 deadline 站出现 data-deadline 组件：${dls.join(', ')}`);
    }
  }
  assert.deepEqual(errs, [], '无 deadline 站存在以下违规');
});

test('通用规则：页面含 data-deadline 组件 ⇔ 引用 deadline.js（含首页/404/about）', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    const html = read(rel);
    const hasComponent = collectDeadlines(html).length > 0;
    const hasScript = html.includes(`src="${DEADLINE_JS}"`);
    if (hasComponent !== hasScript) {
      errs.push(`${rel}: data-deadline 组件(${hasComponent}) 与 deadline.js 引用(${hasScript}) 不匹配`);
    }
  }
  assert.deepEqual(errs, [], '组件与脚本引用存在以下不匹配');
});

test('全站 data-deadline 值域：只允许出现 data.js 声明的期限（当前仅 2026-12-31）', () => {
  const allowed = new Set(data.filter((it) => it.deadline !== null).map((it) => it.deadline));
  const errs = [];
  for (const rel of ALL_PAGES) {
    for (const v of collectDeadlines(read(rel))) {
      if (!allowed.has(v)) errs.push(`${rel}: data-deadline="${v}" 不在 data.js 期限集合中`);
    }
  }
  assert.deepEqual(errs, [], 'data-deadline 值存在以下越界');
});

test('首页卡片：deadline 站卡片带期限组件，deadline.js 已加载（首页聚合场景）', () => {
  const html = read('index.html');
  const dls = collectDeadlines(html);
  assert.ok(dls.length >= 2, `首页应含 ≥2 个 deadline 卡片组件（meituan/jingdong-waimai），实际 ${dls.length}`);
  for (const v of dls) assert.equal(v, '2026-12-31', `首页组件期限应为 2026-12-31，实际 ${v}`);
  assert.ok(html.includes(`src="${DEADLINE_JS}"`), '首页应引用 deadline.js');
  // 首页快捷入口区允许挂接推广链接：必须全部来自 data.js 单一事实源（href 逐字一致）
  const externalCtas = collectPromoCtas(html).filter((c) => !c.href.startsWith(SITE));
  for (const c of externalCtas) {
    assert.ok(allLinks.has(c.href), `首页快捷入口应为 data.js 推广链接（href 逐字一致），实际 ${c.href}`);
  }
});

test('404 页：promo-cta 仅为站内返回链接（不挂接外部推广）', () => {
  const ctas = collectPromoCtas(read('404.html'));
  assert.ok(ctas.length >= 1, '404 页应含返回首页 CTA');
  for (const c of ctas) {
    assert.ok(c.href.startsWith(SITE), `404 页 CTA 应为站内链接，实际 ${c.href}`);
  }
});
