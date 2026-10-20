# Phase F 代码质量审查报告 — youhui8.github.io 六站静态矩阵

- 审查人：代码质量审查专家（Phase F）
- 审查范围：全部 18 个 HTML 页面（首页 / about / 404 / 5 分站首页 + 10 篇攻略页）、3 层 CSS（tokens/base/theme×6）、deadline.js、data.js、robots.txt、sitemap.xml、llms.txt、scripts/check-data.mjs
- 判定基准：`.codearts/specs/youhui-network/spec.md`（78 条 REQ）与 `design.md` 契约
- 审查方式：逐页人工阅读 + 脚本化一致性核查；P0/P1 已直接修复并回归验证，P2 仅记录

---

## 一、审查结论概览

**总体判定：高质量交付，修复 9 类问题后达到"专业站长"水准。**

- 站点架构（3 层 CSS 作用域、data.js 单一数据源、18 页 head 契约、K6 完全图友链、期限组件降级）执行严格，自带校验脚本 `scripts/check-data.mjs --strict` 50 项全过。
- 内容质量是最大亮点：10 篇攻略平均约 1450 中文字符/篇，全部超过"≥800 字实质内容"要求；视角、结构、文风逐站不同，无 AI 模板化痕迹，无关键词堆砌，事实表述谨慎（"以页面为准"兜底句式运用得当）。
- 发现的主要缺陷集中在 **daojia / gouwu 两站偏离全站 head/品牌契约**（title 后缀、og:site_name、site-brand、JSON-LD @id）、**bendi 表格裸露破坏移动端体验**、**meituan favicon 声明不一致**，均已修复。

修复后回归：`node scripts/check-data.mjs --strict` → **PASS=50 / WARN=0 / FAIL=0**；18 页 title 全唯一；修复仅触碰各站自有文件与 robots.txt，未改共享 CSS 层，未削弱 tester 任何断言目标（友链 8 项、CTA href 逐字一致、meta 完整性均保持且增强）。

---

## 二、问题清单（P0/P1 已修复，P2 建议）

### P0（破坏 SEO 契约/可访问性/功能）— 4 类，全部已修复

| # | 文件 | 问题 | 修复内容 | 修复前 → 修复后 |
|---|------|------|----------|----------------|
| P0-1 | daojia/index.html、daojia/xiche-jiage.html、daojia/jiazheng-bikeng.html | **title 缺「｜站名」后缀**，违反 REQ-SEO-001 全站契约「{页面主题}｜{站名}」，SERP 品牌词缺失，且全站唯一性依赖后缀 | 补齐后缀，同步 og:title 与 JSON-LD CollectionPage/Article name | `到家服务特惠：洗车家政价格对比与避坑` → `洗车家政价格对比与避坑｜到家服务特惠`（另两页同理） |
| P0-2 | daojia/xiche-jiage.html L37 | **导航链接 href 错误 + aria-current 误标**：「洗车比价」锚点指向 `/daojia/`（分站首页）而非本页，且误标 `aria-current="page"`，键盘/读屏用户被误导"当前在首页" | href 改指本页 xiche-jiage.html，保留 aria-current | `href="…/daojia/" aria-current="page"` → `href="…/daojia/xiche-jiage.html" aria-current="page"` |
| P0-3 | bendi/waimai-scene-guide.html、bendi/zhoubianyou-tuangou.html | **表格裸露无 `.table-wrap` 滚动容器**（全站其余 6 处表格均有）。移动端 4 列/3 列表格溢出视口，横向滚动失效，破坏 iPhone/Android 体验（用户明确要求移动端正常） | 表格外包 `<div class="table-wrap">`（纯结构包装，无样式副作用） | `<table>…</table>` → `<div class="table-wrap"><table>…</table></div>` |
| P0-4 | daojia/xiche-jiage.html、daojia/jiazheng-bikeng.html | **JSON-LD `@id` 双斜杠**：`…jiazheng-bikeng.html/#article`、`/#breadcrumb` 共 4 处。@id 与 url/外链引用的规范形式不一致，结构化数据实体指向含冗余斜杠的非规范 ID | 去除 `/`：`.html/#article` → `.html#article`（4 处） | — |

### P1（明显质量缺陷）— 5 类，全部已修复

| # | 文件 | 问题 | 修复内容 |
|---|------|------|----------|
| P1-1 | daojia 全部 3 页 | **品牌识别契约分裂**：`og:site_name` = "优惠集合导航"（总站名），而其他 4 站均为分站名；违反 design.md L561 `og:site_name content="{站名}"` 契约，OG 分享卡片品牌归属错乱（og-daojia.png 上印的是"到家服务特惠"） | og:site_name 统一改为 "到家服务特惠"（3 页） |
| P1-2 | daojia 全部 3 页 | **site-brand 显示总站名且指向总站首页**：header 品牌区写 "优惠集合导航"，与 title/og 图/JSON-LD 的分站品牌互相矛盾；用户在分站内点击品牌词预期回分站首页 | site-brand 改为 "到家服务特惠" → `/daojia/`（3 页） |
| P1-3 | gouwu 全部 3 页 | **site-brand 混搭**：显示 "优惠集合导航"（总站名）但 og:site_name = "网购外卖省钱站"（分站名），同一页面两套品牌口径 | site-brand 统一为 "网购外卖省钱站" → `/gouwu/`（3 页） |
| P1-4 | meituan 全部 3 页 | **favicon 声明与全站契约不一致**：`<link rel="icon" href="/favicon.ico" sizes="48x48">`（ICO 被限制为 48px，其余 15 页均为 `sizes="any"`；含 3 帧的 ICO 应交由浏览器选择），且 5 行 link 属性顺序/type 写法均异于全站 | 统一为全站写法：`sizes="any"` + `type` 前置属性顺序（3 页 × 5 行） |
| P1-5 | robots.txt | **未屏蔽内部工作目录 `/.codearts/`**：该目录含规格文档与测试脚本，当前未 git 跟踪但无防线，一旦误提交即随 GitHub Pages 公开发布，暴露内部规格与 AI 协作痕迹 | 通用段增加 `Disallow: /.codearts/`（不影响 GPTBot 等专属段的全量 Allow 语义——专属 UA 段优先匹配） |

### P2（改进建议，仅记录不修改）

1. **gouwu/daojia hero 首屏 CTA 布局不一致**：bendi/jd/gouwu 的 hero 区含 promo-cta 按钮，meituan/daojia 的 hero 无（CTA 藏在下方区块）。转化路径深度两站略高，建议统一为 hero 即带入口（属产品决策，未擅改）。
2. **404.html 与 about/ 无 `© 2026` 版权行**：全站其余 15 页页脚均有，这两页 footer-disclosure 区缺版权行（404 属特殊页可接受，about 建议补齐）。
3. **verify-meituan.ps1 编码问题**：该 PS1 为 UTF-8 无 BOM 且含中文，Windows PowerShell 5.1 下解析报错（中文串被按 ANSI 读取导致 unterminated string）。tester 若在 5.1 环境跑会全红，建议加 BOM 或改 pwsh 7。非站点代码缺陷。
4. **daojia/index JSON-LD ItemList 的 name** 为"到家服务攻略列表"，与页面可见 h2"洗车与家政怎么选：两篇攻略"文案不完全一致，schema 无碍，建议下个内容迭代周期对齐。
5. **内链锚文本**整体多样自然（如"京东外卖红包三步领取教程"），仅 bendi 页脚"本站导航"两处锚文本与页面 h1 完全一致，属合理冗余，无需处理。

---

## 三、六站两两差异化评估矩阵

评分维度：内容角度 / 栏目结构 / 文风 / 视觉主题。✔ = 明显差异，无雷同风险。

| 配对 | 内容角度 | 栏目结构 | 文风 | 视觉 | 结论 |
|------|:---:|:---:|:---:|:---:|------|
| 首页 × bendi | ✔ 导航枢纽 vs 场景攻略 | ✔ 卡片矩阵 vs 场景时间线 | ✔ 索引体 vs 叙事体 | ✔ 蓝紫 vs 暖橙 | 差异充分 |
| 首页 × meituan | ✔ 枢纽 vs 单平台教程 | ✔ 卡片 vs 三步教程+FAQ | ✔ 索引体 vs 步骤体 | ✔ 蓝紫 vs 橄榄绿 | 差异充分 |
| 首页 × jd-waimai | ✔ 枢纽 vs 领券工具页 | ✔ 卡片 vs 步骤条+对比表 | ✔ 索引体 vs 操作体 | ✔ 蓝紫 vs 明黄 | 差异充分 |
| 首页 × daojia | ✔ 枢纽 vs 垂类服务 | ✔ 卡片 vs 服务比价 | ✔ 索引体 vs 决策体 | ✔ 蓝紫 vs 青蓝 | 差异充分 |
| 首页 × gouwu | ✔ 枢纽 vs 日历+清单 | ✔ 卡片 vs 时间轴+checklist | ✔ 索引体 vs 规划体 | ✔ 蓝紫 vs 紫罗兰 | 差异充分 |
| bendi × meituan | ✔ 多平台场景 vs 美团系玩法 | ✔ 场景分区 vs 工具分区 | ✔ 叙事 vs 步骤 | ✔ 暖橙 vs 橄榄绿 | 差异充分 |
| bendi × jd-waimai | ✔ 场景省钱 vs 领券操作 | ✔ 场景卡 vs 步骤条 | ✔ 叙事 vs 操作 | ✔ | 差异充分 |
| bendi × daojia | ✔ 到店消费 vs 上门服务 | ✔ | ✔ 场景散文 vs 比价决策 | ✔ | 差异充分 |
| bendi × gouwu | ✔ 外卖/周边游 vs 网购节奏 | ✔ | ✔ | ✔ | 差异充分 |
| meituan × jd-waimai | **⚠ 最接近的一对**（同属外卖红包垂类） | ✔ 教程+FAQ vs 步骤条+对比表 | ✔ 工具讲解 vs 对比分析 | ✔ 橄榄绿 vs 明黄 | 差异成立：meituan 聚焦"美团券体系玩法"，jd 聚焦"按单领取+双平台对比"，栏目与文风可区分；建议长期保持各自选题不交叉 |
| meituan × daojia | ✔ 平台玩法 vs 垂类服务 | ✔ | ✔ | ✔ | 差异充分 |
| meituan × gouwu | ✔ | ✔ | ✔ | ✔ | 差异充分 |
| jd-waimai × daojia | ✔ | ✔ | ✔ | ✔ | 差异充分 |
| jd-waimai × gouwu | ✔ | ✔ | ✔ | ✔ | 差异充分 |
| daojia × gouwu | ✔ 上门服务 vs 网购日历 | ✔ | ✔ | ✔ | 差异充分 |

**结论：15 组两两配对全部可区分，REQ-DIFF-001 满足。** 唯一需持续留意的是 meituan × jingdong-waimai（同为外卖领券主题），当前以"券体系 vs 按单对比"的角度差异化解，风险可控。

---

## 四、内容充实度评估表

| 页面 | 正文中文字符 | H2 数 | 特色结构 | 评价 |
|------|---:|:---:|------|------|
| meituan/hongbao-guide | 1486 | 5 | TOC 侧栏+表格+FAQ(JSON-LD) | ★★★★★ 范本级 |
| jingdong-waimai/duibi-meituan | 1893 | 8 | 五维对比表+verdict 面板+三场景 | ★★★★★ 最有信息增量 |
| jingdong-waimai/hongbao-step | 1491 | — | 三步流程+FAQ | ★★★★☆ |
| daojia/xiche-jiage | 1626 | — | 三方式对比表 | ★★★★☆ |
| daojia/jiazheng-bikeng | 1647 | — | 计价对比+检查清单 | ★★★★☆ |
| gouwu/dacu-rili | 1599 | 7 | 全年 12 月时间轴表+FAQ | ★★★★★ 信息密度高 |
| gouwu/waimai-gouwu-qingdan | 1165 | — | 双线 checklist+周花销表 | ★★★★☆ |
| bendi/waimai-scene-guide | 1400 | 7 | 场景速查表 | ★★★★☆ |
| bendi/zhoubianyou-tuangou | 1546 | 7 | 套餐对比表+两日行程示例 | ★★★★★ |
| meituan/shenquan-guide | 1192 | 5 | 途径对比表+下单示例 | ★★★★☆ |

- **充实度：10/10 篇全部 >1100 中文字符，无"薄内容"页面。**
- **AI 痕迹检查：未发现模板化排比、"作为AI"式表达、空洞套话**；文风克制、有具体数字感（"满 30 减 8"、"二十元的早餐"），无事实性硬伤，涉平台规则处均有"以页面为准"对冲。
- 错别字/病句抽查：未发现；品牌词大小写规范（美团/京东/饿了么/淘宝/拼多多统一）。

---

## 五、合规与安全

- 推广披露：18 页 footer 均含"推广声明 + 品牌免责声明"双段 ✔
- 外链策略：全部 5 条 data.js 推广链接在页面上的 CTA 均 `rel="sponsored nofollow noopener"` + `target="_blank"` ✔（check-data.mjs 逐页断言）
- 友链 3 外站（券宝/优惠聚合/号卡办理中心）带 `rel="noopener"`、无 sponsored/nofollow ✔
- 404 页 noindex、无 canonical/og/deadline.js ✔

---

## 六、总体质量评分（相对"专业站长"基线）

| 维度 | 评分 | 说明 |
|------|:---:|------|
| 语义化 HTML 与可访问性 | 9.5/10 | landmark/skip-link/aria-current/breadcrumb ol 全对，修复 1 处 href 错误 |
| SEO 深度 | 9/10 | title/desc 全唯一、JSON-LD @graph 规范、sitemap/llms/robots 齐；修复 daojia 品牌词缺失 |
| 内容质量与差异化 | 9.5/10 | 无薄页、无 AI 味、15 组配对全可区分 |
| 视觉与体验 | 9/10 | 6 主题协调专业、移动端表格问题已修复 |
| 代码一致性 | 9/10 | 修复 daojia/gouwu/meituan 偏离后 18 页契约统一 |
| 性能 | 10/10 | HTML≤15.5KB、CSS≤9.2KB、JS 969B、0 CDN/0 字体/正文 0 位图 |
| 合规 | 10/10 | 披露/免责/rel 策略无遗漏 |
| **综合** | **9.2/10** | 达到并部分超出"专业站长"基线 |

---

## 七、遗留风险

1. **meituan × jingdong-waimai 主题邻近**：后续新增内容时需保持"券体系玩法 vs 按单对比"的选题边界，避免两站内容趋同。
2. **`scripts/probe.mjs` / `probe2.mjs` / `tests/` 为未跟踪文件**：若为调试残留，建议提交前清理或纳入 ignore，避免混入发布。
3. **verify-meituan.ps1 的 PowerShell 5.1 编码问题**（P2-3）会影响 tester 在老环境跑自动化，建议 tester 侧修复（加 UTF-8 BOM）。
4. **og 图视觉与修改后站名的一致性**：og-daojia.png 按 design.md 契约生成为"到家服务特惠"，与修复后的 title/og:site_name 一致，已确认无回归；其余站未改动无需重生成。

---

## 附：本次修复文件清单（12 处，13 文件）

| 文件 | 修复项 |
|------|--------|
| daojia/index.html | title/og:title/JSON-LD name 加后缀；og:site_name；site-brand |
| daojia/xiche-jiage.html | title/og:title 加后缀；og:site_name；site-brand；nav href+aria-current；@id ×2；表格无(已有 wrap) |
| daojia/jiazheng-bikeng.html | title/og:title 加后缀；og:site_name；site-brand；@id ×2 |
| gouwu/index.html | site-brand |
| gouwu/dacu-rili.html | site-brand |
| gouwu/waimai-gouwu-qingdan.html | site-brand |
| bendi/waimai-scene-guide.html | .table-wrap |
| bendi/zhoubianyou-tuangou.html | .table-wrap |
| meituan/index.html | favicon ×5 |
| meituan/hongbao-guide.html | favicon ×5 |
| meituan/shenquan-guide.html | favicon ×5 |
| robots.txt | Disallow: /.codearts/ |

**回归验证：`node scripts/check-data.mjs --strict` → PASS=50 / WARN=0 / FAIL=0；18 页 title 全唯一；@id 双斜杠零残留；404 友链 8 项完整。**
