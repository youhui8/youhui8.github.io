/**
 * 校验 1：data.js 完整性（推广数据单一事实源）
 * 覆盖 tasks.md Phase E「data.js 记录与页面挂接一致」的数据侧；
 * 并复用 scripts/check-data.mjs（D1 交付）的 runAll 严格模式做全面回归。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDataJs, runAll } from '../scripts/check-data.mjs';
import {
  ROOT, SITE, SLUGS, read, exists,
} from './helpers.mjs';
import path from 'node:path';

const list = parseDataJs(read('data.js'));

test('data.js：解析出 5 条推广记录，字段完备且类型正确', () => {
  assert.equal(list.length, 5, `记录数应为 5，实际 ${list.length}`);
  const errs = [];
  for (const it of list) {
    for (const f of ['id', 'name', 'link', 'description', 'deadline', 'site']) {
      if (!(f in it)) errs.push(`${it.id ?? '(未知记录)'} 缺字段 ${f}`);
    }
    if (!it.id || typeof it.id !== 'string') errs.push(`id 非法：${JSON.stringify(it.id)}`);
    if (!it.name || typeof it.name !== 'string') errs.push(`${it.id} name 非空字符串`);
    if (!it.description || typeof it.description !== 'string') errs.push(`${it.id} description 非空字符串`);
    if (!/^https?:\/\//.test(it.link)) errs.push(`${it.id} link 非合法 URL：${it.link}`);
    if (it.deadline !== null && !/^\d{4}-\d{2}-\d{2}$/.test(it.deadline)) {
      errs.push(`${it.id} deadline 非法（应为 null 或 YYYY-MM-DD）：${it.deadline}`);
    }
    if (!it.site || typeof it.site !== 'object') errs.push(`${it.id} site 非对象`);
    else {
      if (!it.site.slug || typeof it.site.slug !== 'string') errs.push(`${it.id} site.slug 非法`);
      if (!it.site.url || typeof it.site.url !== 'string') errs.push(`${it.id} site.url 非法`);
    }
  }
  assert.deepEqual(errs, [], '字段完备性存在以下问题');
});

test('data.js：5 条记录与 5 个分站一一对应（slug 唯一且覆盖全部站点）', () => {
  const slugs = list.map((it) => it.site.slug);
  assert.deepEqual([...slugs].sort(), [...SLUGS].sort(), 'site.slug 集合应恰为 5 个分站');
  const errs = [];
  for (const it of list) {
    if (it.site.url !== `${SITE}/${it.site.slug}/`) {
      errs.push(`${it.id} site.url 应为 ${SITE}/${it.site.slug}/，实际 ${it.site.url}`);
    }
  }
  assert.deepEqual(errs, [], 'site.url 与 slug 映射存在以下问题');
});

test('data.js：推广链接全局唯一（无重复挂接）', () => {
  const links = list.map((it) => it.link);
  assert.equal(new Set(links).size, links.length, '推广链接出现重复');
});

test('data.js：deadline 语义正确（仅美团/京东外卖标注 2026-12-31）', () => {
  const withDeadline = list.filter((it) => it.deadline !== null).map((it) => it.site.slug);
  assert.deepEqual(withDeadline.sort(), ['jingdong-waimai', 'meituan'], '标注 deadline 的站点应为 meituan 与 jingdong-waimai');
  for (const it of list) {
    if (it.deadline !== null) {
      const d = new Date(`${it.deadline}T00:00:00Z`);
      assert.ok(!Number.isNaN(d.getTime()), `${it.id} deadline 不是合法日期：${it.deadline}`);
    }
  }
});

test('data.js：D1 校验脚本 runAll(--strict) 全部通过（复用既有交付回归）', () => {
  const { err } = runAll(true);
  assert.equal(err, 0, 'check-data.mjs 严格模式存在 FAIL 项，详见上方输出');
});

test('data.js：文件本身可被浏览器作为普通脚本加载（无 export/import 语法）', () => {
  const text = read('data.js');
  assert.ok(!/\bexport\b/.test(text), 'data.js 不应含 export（浏览器 <script> 加载会报错）');
  assert.ok(!/\bimport\b/.test(text), 'data.js 不应含 import（浏览器 <script> 加载会报错）');
  assert.ok(text.includes('const youhuiList'), 'data.js 应声明 const youhuiList');
});
