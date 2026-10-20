/**
 * 校验 6：6 站友链互链完整性 + 无死链
 * 口径（tasks.md Phase E）：
 *   - 每页（含首页/about/404）页脚含 6 站互链（首页 + 5 分站）+ 3 个外链
 *   - 外部友链带 rel="noopener"
 *   - 每页引用的本地资产（href/src 相对/根相对路径）文件均存在
 *   - 站内链接（含锚点）均可解析到实际文件与 id
 *   - 站外链接不发起网络请求（留待人工/Phase F 线上验证）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE, SLUGS, ALL_PAGES, read, exists, getFooter, collectRefs, resolveRef, hasId,
} from './helpers.mjs';

const INTERNAL_LINKS = [`${SITE}/`, ...SLUGS.map((s) => `${SITE}/${s}/`)];
const EXTERNAL_FRIENDS = [
  { url: 'https://jdjdndn.github.io/', name: '券宝' },
  { url: 'https://wcbblll.cc', name: '优惠聚合' },
  { url: 'https://dlhaoka.com', name: '号卡办理中心' },
];

test('全部 18 页：页脚含 6 站互链 + 3 个外链（共 9 个友链 URL）', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    const footer = getFooter(read(rel));
    if (!footer) {
      errs.push(`${rel}: 缺 <footer>`);
      continue;
    }
    for (const u of INTERNAL_LINKS) {
      if (!footer.includes(`href="${u}"`)) errs.push(`${rel}: 页脚缺互链 ${u}`);
    }
    for (const f of EXTERNAL_FRIENDS) {
      if (!footer.includes(`href="${f.url}"`)) errs.push(`${rel}: 页脚缺外链 ${f.url}（${f.name}）`);
    }
  }
  assert.deepEqual(errs, [], '友链互链存在以下缺口');
});

test('全部 18 页：3 个外部友链均带 rel="noopener"', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    const footer = getFooter(read(rel));
    if (!footer) continue;
    for (const f of EXTERNAL_FRIENDS) {
      const m = footer.match(new RegExp(`<a\\b[^>]*href="${f.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`));
      if (!m) continue; // 缺失已由上一用例报告
      const relAttr = (m[0].match(/\brel="([^"]*)"/) || [])[1] || '';
      if (!relAttr.split(/\s+/).includes('noopener')) {
        errs.push(`${rel}: 外链 ${f.url} 缺 rel="noopener"（实际 rel="${relAttr}"）`);
      }
    }
  }
  assert.deepEqual(errs, [], '外链 rel 存在以下问题');
});

test('无死链：每页 href/src 的本地引用均解析到实际存在的文件', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    const html = read(rel);
    for (const ref of collectRefs(html)) {
      const r = resolveRef(ref, rel);
      if (r.kind !== 'internal') continue; // external/skip 不检查文件
      if (!exists(r.file)) {
        errs.push(`${rel}: 死链 ${ref} → ${r.file} 不存在`);
      }
    }
  }
  assert.deepEqual(errs, [], '本地引用存在以下死链');
});

test('锚点可解析：站内链接的 #fragment 均能在目标页面找到对应 id', () => {
  const errs = [];
  for (const rel of ALL_PAGES) {
    const html = read(rel);
    for (const ref of collectRefs(html)) {
      const r = resolveRef(ref, rel);
      if (r.kind !== 'internal' || !r.hash) continue;
      if (!exists(r.file)) continue; // 文件缺失已由上一用例报告
      try {
        const targetHtml = read(r.file);
        if (!hasId(targetHtml, r.hash)) {
          errs.push(`${rel}: 锚点 ${ref} → ${r.file} 中无 id="${r.hash}"`);
        }
      } catch {
        errs.push(`${rel}: 锚点目标读取失败 ${ref}`);
      }
    }
  }
  assert.deepEqual(errs, [], '锚点解析存在以下问题');
});

test('站外链接仅做静态口径登记（不发起网络请求，线上可达性留待人工/Phase F）', () => {
  // 本用例为守门说明：外部 URL 不在本测试范围内验证连通性。
  // 这里仅统计每页外链数量，确保没有把站内资源误写为外链（如把 /assets 写成错误域名）。
  const errs = [];
  for (const rel of ALL_PAGES) {
    for (const ref of collectRefs(read(rel))) {
      if (/^https?:\/\//i.test(ref) && !ref.startsWith(SITE)) {
        // 白名单：3 个友链 + data.js 推广链接 + schema.org（JSON-LD 不走 href，此处兜底）
        const ok = EXTERNAL_FRIENDS.some((f) => ref.startsWith(f.url));
        if (!ok && !/^https?:\/\/(kzurl18\.cn|kurl07\.cn|1\.yoourl\.net|h\.fxzb\.vip|taoduoyu118\.kzurl01\.cn)/.test(ref)) {
          errs.push(`${rel}: 出现未登记的外链：${ref}`);
        }
      }
    }
  }
  assert.deepEqual(errs, [], '外链登记存在以下异常');
});
