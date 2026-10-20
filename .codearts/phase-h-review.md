# Phase H — 全站全面 Review 报告（不挤牙膏）

> 审查日期：2026-10-20 · 审查人：代码质量审查专家（phase_h_review）
> 性质：**只读审查**，未改动任何代码/样式/页面。本文为唯一产出物。
> 基线：`npm test` 47/47 全绿（审查前实测），审查结论不影响现有测试通过状态。

---

## 1. 概述

### 1.1 审查范围

- **页面（18 页全量）**：index.html、404.html、about/index.html + 5 分站 ×（index + 2 攻略页）
- **样式（三层 CSS 全量）**：tokens.css（3.0KB）→ base.css（9.2KB）→ theme-{home,bendi,meituan,jingdong-waimai,daojia,gouwu}.css（1.9~6.6KB）
- **JS**：assets/js/deadline.js（0.9KB，全站唯一脚本）
- **图标体系**：favicon.svg / favicon.ico / PNG 16/32/48 / apple-touch-icon 180 / android-chrome 192/512 / site.webmanifest / scripts/gen-icons.mjs / scripts/pnglib.mjs（drawBrandIcon SDF 绘制）
- **数据与测试**：data.js（5 条推广记录）、tests/01~07（47 用例）
- **SEO 配套**：sitemap.xml、robots.txt、llms.txt

### 1.2 审查方法

1. **静态代码审查**：逐行阅读全部 CSS 与代表性 HTML（index、meituan/index、daojia/index、gouwu/index、about、404 全文；其余 12 页按结构/断言要点批量核查）。
2. **程序化核查**：18 页批量脚本比对 head 字段/title 长度/h1 数量/heading 层级跳级/面包屑位置；WCAG 对比度按公式逐对核算（19 组关键前景/背景组合）。
3. **截图取证**：复用 `.resultverify/screenshots/`（Phase G 产物：6 站 × 375/1280 共 12 张）验证 footer 布局、卡片网格、版权行可见性。未新起浏览器会话（静态分析已足够定位，且任务为只读）。
4. **测试基线确认**：审查前 `npm test` 47/47 通过；全部测试断言（02/03/05/06/07 全文阅读）已核对，用于评估修复回归风险。
5. **性能预算实测**：文件字节数逐项测量（见附录 A）。

### 1.3 环境与总体结论

- 环境：Windows / main 分支 / 纯静态无构建 / 已上线 https://youhui8.github.io/
- **总体评价**：站点工程质量高于典型静态站——三层 CSS 架构清晰、每处颜色均注释对比度计算、heading 零跳级、head 18 页结构完全一致、CSS 零死代码、性能预算全达标。真正的缺陷集中在：**页脚版权行**（3 个 P1：两个分站版权行在深底上不可读、18 页结构三态分裂）、**首页 hero 渐变浅端对比度**（P2）、以及用户点名的 4 项 P0。全部问题均已定位到文件行号并给出代码级方案。

**问题总数：14** ｜ P0 ×4 ｜ P1 ×3 ｜ P2 ×2 ｜ P3 ×5

---

## 2. 问题清单

| 编号 | 优先级 | 问题描述 | 文件与行号 | 修复建议（概要） | 影响范围 |
|---|---|---|---|---|---|
| P0-1 | **P0** | `.prose` 在 ≥1024px 被限宽 72ch，大屏未铺满父盒子（用户点名①） | tokens.css L52；base.css L125-134 | 删除 1024px 媒体查询内的 `max-width: var(--w-prose)`；同步更新 tokens.css L52 与 L67-68 注释（"禁止全屏拉伸"口径作废）。详见 §3.1 | 全部含 `.prose` 的页面（首页/分站 index/攻略页/about） |
| P0-2 | **P0** | 首页/404 五大分站导航卡片仅 h2 标题内 a 可点，点击热区过小（用户点名②） | index.html L63-91；404.html L38-59；base.css L239-268 | `position:relative` + `h2 a::after { inset:0 }` 整卡覆盖 + `:hover`/`:focus-within` 整卡反馈。详见 §3.2 | index.html、404.html |
| P0-3 | **P0** | 页脚 `.footer-disclosure` 未横跨整行：≥768px 双列 grid 下被自动放置到第二行**第一列**（1/3 宽），未独占一行（用户点名③） | base.css L474-485（缺 `grid-column: 1 / -1`）；18 页 footer | grid 分区重构 + disclosure `grid-column: 1 / -1`。详见 §3.3 | 全部 18 页 |
| P0-4 | **P0** | favicon"无限惠环"母题：两圆环互相分离无交叉，16px 下退化为两个模糊白点，辨识度差、不精致（用户点名④） | favicon.svg；scripts/pnglib.mjs L84-139（drawBrandIcon）；scripts/gen-icons.mjs | 重设计为"票券缺口"母题，重跑生成脚本（7 个文件名与 manifest 引用不变）。详见 §4 | 全站 favicon/安装图标 |
| P1-1 | **P1** | daojia 页脚版权行文字色 `--c-text-muted`(#3E5A73) 落在页脚深蓝底 #075985 上，**对比度 1.05:1，肉眼不可见**；且它是 `.container` 直接子元素，≥768px 被错位放置到 grid 第二行第二列（右列），与其他站结构不同 | theme-daojia.css L106-111（颜色错）；daojia/index.html L161、xiche-jiage.html L132、jiazheng-bikeng.html L138（DOM 位置错） | 版权行移入 `.footer-disclosure` 末尾（与 P0-3 重构合并）；颜色统一走 base.css 基座。截图实证：daojia-1280.png 页脚版权行不可读 | daojia 3 页 |
| P1-2 | **P1** | gouwu 页脚版权行：theme-gouwu.css **完全没有定义** `.footer-copy`，文字继承 body 正文色 #292038 落在页脚深紫底 #5B21B6 上，**对比度 1.72:1，不可读** | theme-gouwu.css（缺失规则）；gouwu/index.html L133、dacu-rili.html L164、waimai-gouwu-qingdan.html L156 | 同 P1-1：版权行样式收敛到 base.css 统一基座（#CBD5E1 对全部 6 站页脚底 ≥4.77:1） | gouwu 3 页 |
| P1-3 | **P1** | 页脚版权行结构 18 页三态分裂：index/404/about **无版权行**；meituan 3 页版权行在 disclosure 内但**无 class**；bendi/gouwu/jd 9 页在 disclosure 内带 `.footer-copy`；daojia 3 页在 disclosure **外**（引发 P1-1 错位） | index.html L142-145、404.html L86-89、about L99-102（无）；meituan/index.html L151（无 class）；对比 bendi/index.html L172 | 统一为 disclosure 末尾 `<p class="footer-copy">© 2026 …</p>`，全 18 页补齐（含 index/404/about）。与 P0-3 一批实施 | 全部 18 页 |
| P2-1 | **P2** | 首页 hero 渐变 `#4F46E5→#0EA5E9` 浅端 #0EA5E9 上白字仅 **2.77:1**（大文本 AA 需 3:1、正文需 4.5:1）。h1 居中混合色 ≈4.36:1 勉强达标，但副标题 p（16px 正文）更靠下更接近浅端，存在可读性风险。其他 5 站 hero 均遵守"渐变两端白字 ≥4.5:1"（各自 CSS 注释明示），唯 home 例外，标准不一致 | theme-home.css L25-29 | 浅端换深：`linear-gradient(135deg, #4338CA 0%, #2563EB 100%)`（白字 7.86:1 / 5.35:1），并与 favicon 新配色（§4）同源形成品牌一致 | index.html、404.html（同用 home 主题） |
| P2-2 | **P2** | 首页/404 五卡在 ≥1024px 3 列网格下呈 **3+2 布局，第 4/5 卡左对齐、右侧 1/3 空缺**，视觉不平衡（截图 home-1280.png 实证："第2行两张卡片左侧对齐…右侧留空"） | theme-home.css L56-60；index.html L63-91；404.html L38-59 | 6 列网格方案：卡 1-3 `span 2`、卡 4-5 `span 3`，尾行两卡平铺满行。详见 §3.4 | index.html、404.html |
| P3-1 | P3 | `.footer-copy` 样式分散在 theme-bendi.css L199-205 / theme-jingdong-waimai.css L230-236 重复定义同构规则，gouwu 漏定义、daojia 定义错误——正是"分散导致漂移"的架构根因（P1-1/P1-2 的成因） | theme-bendi.css L199-205；theme-jingdong-waimai.css L230-236；theme-daojia.css L106-111 | 收敛到 base.css 单一定义：`.footer-copy { color:#CBD5E1; border-top:1px solid rgba(226,232,240,.25); … }`，删除各主题层重复/错误规则。与 P0-3 一批实施 | base.css + 4 个主题 css |
| P3-2 | P3 | favicon.ico 14.7KB 偏大（16/32/48 三帧全量 BMP 32bpp + AND mask，无压缩） | scripts/gen-icons.mjs L103-108 | 可减为 16/32 两帧（约 5.6KB）。Safari 现代版已走 PNG，48 帧仅极旧浏览器受益；P0-4 重做图标时一并决策 | favicon.ico |
| P3-3 | P3 | site.webmanifest 的 android icons 未声明 `purpose:"maskable"`，Android 自适应图标按安全区（中心 ~80%）裁切，图形贴边元素可能被切 | site.webmanifest L1 | P0-4 重设计时保证图形元素落在 512 画布中心 80% 安全区内，并在 manifest 512 条目加 `"purpose":"maskable"`（或双条目 any+maskable） | Android Chrome 安装态 |
| P3-4 | P3 | 分站攻略卡片（.mt-guide-cards/.guide-list/.daojia-cards/.gw-grid-2 内 `h3>a`）同样仅标题可点，触控目标 ≈31px 高（fs-lg 18×1.5），低于 44px 最佳实践（WCAG 2.5.8 AA 24×24 尚达标）。P0-2 完成后可将同一整卡可点模式复制到这些卡片 | base.css L258-268（现有标题态）；各分站 index 攻略列表区 | 复用 §3.2 模式，选择器推广为 `.card h2 a::after, .card h3 a::after` 或按卡片类白名单。作为可选增强，非本轮必做 | 5 分站 index 页 + 攻略页推荐卡 |
| P3-5 | P3 | deadline.js 过期降级移除"限时"徽章后，`.promo-deadline` 的 `padding-left: 3em`（为徽章预留）仍保留，过期态文案长期悬挂缩进 3em，观感像排版 bug（2026-12-31 过期后才显现） | base.css L340-352；assets/js/deadline.js L13-16 | JS 移除徽章时同步 `classList.add('is-expired')`；CSS 加 `.promo-deadline.is-expired { padding-left: 0 }`。CLS 影响可忽略（小元素一次性水平位移） | meituan/jd 6 页 + 首页 2 个卡片组件 |

**未列入问题的核查通过项**（避免误报，供参考）：heading 层级 18 页零跳级；面包屑 16 页位置统一（main 前独立 container）；head 17 项字段顺序 18 页一致（404 有意省 canonical/og 且 noindex，合规）；CSS 全部类均有使用（无死代码）；表格均有 caption + `.table-wrap` 横滚兜底；skip-link/focus-visible/`prefers-reduced-motion` 均已实现；性能预算全部达标（附录 A）；data.js 与页面文案逐字一致（tests 01/05 已覆盖）。

---

## 3. 用户点名 4 项专项方案（coder 可直接照做）

### 3.1 P0-1：.prose 铺满父盒子

**现状确认**
- tokens.css L52：`--w-prose: 72ch; /* 正文阅读宽（≥1024px 生效，禁止全屏拉伸） */`
- base.css L130-134：`@media (min-width: 1024px) { .prose { max-width: var(--w-prose); } }`
- 实测效果：1200px 容器内正文仅占约 72ch（约 860-1160px 视字号），首页"站点矩阵说明"区明显窄于下方卡片区（截图 home-1280.png 实证："正文段落宽度明显窄于卡片区域"）。

**修复（2 处 CSS + 2 处注释）**

```css
/* base.css L125-134 替换为： */
/* 正文阅读宽：铺满父容器（1200px 容器内约 73 汉字/行，2026-10 产品确认放弃 72ch 限宽） */
.prose {
  max-width: 100%;
}
/* 删除整个 @media (min-width: 1024px) { .prose {…} } 块 */
```

```css
/* tokens.css L50-52 布局容器区块： */
--w-container: 1200px;  /* 宽屏容器封顶（≥1280px 居中） */
--w-prose: 72ch;        /* 保留 token：hero 容器（home/mt/daojia hero .container）与 gw-hero-lead 仍在引用；正文 .prose 不再使用 */
```

**同步必改的注释（口径冻结）**：
- tokens.css L52 注释去掉"禁止全屏拉伸"表述，改为"仅用于 hero 居中容器"。
- tokens.css L63-68 断点速查注释中"≥ 1024px 桌面：卡片 3 列、正文 72ch"改为"卡片 3 列"。
- base.css 文件头注释第 5 行同步。

**引用核查**（已 grep 确认）：`--w-prose` 其他引用点为 theme-home.css L32（`.home-hero .container`）、theme-meituan.css L43（`.mt-hero .container`）、theme-daojia.css L39（`.daojia-hero .container`）、theme-gouwu.css L42（`.gw-hero-lead`）——均为 hero 居中容器，**不受影响、不需改动**。

**配套措施（可选，不强制）**：铺满后桌面端行长 ≈73 汉字/行，长于中文最佳 35-45 字。用户以"铺满"为准；若想缓解可读性，可在 ≥1024px 给 `.prose` 微调 `font-size: 17px; line-height: 1.85;`（约 +2px 行距），或保持不动。**不建议**重新引入限宽，与需求冲突。

**about 页权衡说明**：about/index.html L51 整页 `<article class="prose">` 铺满后为 1200px 全宽文字页。默认跟随统一规则铺满；若 coder 认为整页长文观感差，可单独给 about 保留 `max-width: var(--w-prose)`（加一个 `.prose--narrow` 修饰类），属可选项。

**测试影响**：无任何测试断言 72ch 或 .prose（已核对 7 个测试文件）。安全。

### 3.2 P0-2：五大分站卡片整卡可点

**现状确认**
- index.html L64-90：五张 `<article class="card site-card site-card--{slug}">`，仅 h2 内 `<a href="分站URL">` 可点（热区 ≈标题行 31px 高）。
- 404.html L39-58 同款结构（也是 h2 > a），需一并处理。
- 卡片内含 `.promo-deadline` 徽章组件（首页 L73/L79，meituan/jd 卡），过期降级由 deadline.js 操作其 DOM——覆盖层方案不得破坏该组件。

**方案（position:relative + a::after 拉伸覆盖 + 整卡反馈）**

```css
/* 追加到 base.css 卡片区块（L268 .card-note 之后） */
.site-card {
  position: relative;
}

/* 整卡可点：标题链接的伪元素拉伸覆盖整卡（z 覆盖层在卡片内容之上） */
.site-card h2 a::after {
  content: "";
  position: absolute;
  inset: 0;
}

/* hover 整卡反馈：边框着色 + 轻微上浮 + 阴影加深（标题色复用现有 hover 规则） */
.site-card:hover {
  border-color: var(--c-accent);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12), 0 8px 20px rgba(15, 23, 42, 0.10);
}

/* 键盘可达：Tab 聚焦标题时整卡描边（全局 a:focus-visible 只描标题文字，这里补整卡态） */
.site-card:focus-within {
  outline: 3px solid var(--c-accent);
  outline-offset: 2px;
}

/* 尊重减弱动效（若追加 transform 过渡，需在此关闭；不添加 transform 则可省略） */
@media (prefers-reduced-motion: reduce) {
  .site-card,
  .site-card:hover {
    transition: none;
  }
}
```

HTML **零改动**（方案纯 CSS，index.html 与 404.html 均适用，h2 结构一致）。

**兼容性要点（已逐一评估）**
1. **promo-deadline 徽章**：`::after` 覆盖层位于其上方，点击落在覆盖层 → 触发分站跳转（预期行为：整卡即入口）。deadline.js 移除徽章/改文案操作的是卡内真实 DOM 节点，不受伪元素影响，CLS 防抖逻辑不变。
2. **文本选择**：覆盖层会阻断卡内文字的鼠标选择。导航卡片文字（定位描述/入口来源）无选择需求，业界标准做法（MDN "Card pattern"）均如此，可接受。若要保留选择能力，退级方案是"卡片 cursor:pointer + JS 代理点击"，但引入 JS 与无构建原则相悖，不推荐。
3. **触控目标**：热区从 ≈31px 高扩大到整卡（≥160px 高），WCAG 2.5.8 与移动 44px 最佳实践均大幅达标。
4. **404 页**：同选择器直接生效；404 卡无徽章，无兼容问题。

**测试影响**：tests/05-promo L128-137 断言首页卡片区域无外部推广 CTA、deadline 组件 ≥2——本方案不改任何 href/DOM，安全。tests/06 死链/锚点断言不涉及卡片交互。**零回归风险**。

### 3.3 P0-3：footer 分区重构，disclosure 独占整行（含 P1-1/2/3、P3-1 一并修复）

**现状确认（含截图实证）**
- base.css L424-428：`.site-footer .container` 基线单列 grid。
- base.css L474-478：`@media (min-width: 768px)` 改 `grid-template-columns: 1fr 2fr` 两列，**但没有给 `.footer-disclosure` 声明任何跨列**。grid 自动放置结果：
  - 第 1 行：本站导航（1fr 列）+ 友情链接（2fr 列）
  - 第 2 行：`.footer-disclosure` **只占第一列（约 1/3 宽）**，右侧 2/3 空白（daojia 站则被错位的版权行占据）
- 这就是用户看到"披露与友链堆在一起、不独占一行不好看"的根源：声明文字挤在窄列里长换行，大屏右侧大片空。
- 结构三态（P1-3）与两处不可读版权行（P1-1/P1-2）如清单所述。

**方案（base.css 重写页脚区 + 18 页 HTML 微调）**

① base.css L417-485 页脚区整体替换为：

```css
/* ---- 页脚：导航/友链分区 + 披露横跨整行（REQ-LINK-001~006、REQ-COMP-001/002） ---- */
.site-footer {
  margin-top: var(--sp-8);
  background: var(--c-primary-strong);
  color: #E2E8F0;
}

.site-footer .container {
  padding-block: var(--sp-6);
  display: grid;
  gap: var(--sp-6);
}

.footer-title {
  font-size: var(--fs-base);
  color: #FFFFFF;
  margin-bottom: var(--sp-2);
}

.footer-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;      /* 基线：纵向列表 */
  gap: var(--sp-1);
}

.footer-links a {
  color: #E2E8F0;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  min-height: 44px;            /* 触控基线（REQ-RWD-002） */
}

.footer-links a:hover,
.footer-links a:focus-visible {
  color: #FFFFFF;
  text-decoration: underline;
}

/* 披露 + 版权：整行横跨（分区布局最后一行） */
.footer-disclosure {
  border-top: 1px solid rgba(226, 232, 240, 0.25);
  padding-top: var(--sp-4);
  font-size: var(--fs-sm);
  color: #CBD5E1;              /* 对全部 6 站页脚底色 ≥ 4.77:1 */
}

.footer-disclosure p + p {
  margin-top: var(--sp-2);
}

.footer-disclosure strong {
  color: #FFFFFF;
}

/* 版权行：统一基座（收敛原 4 处主题层定义；#CBD5E1 对 6 站页脚底 4.77~10.4:1） */
.footer-copy {
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid rgba(226, 232, 240, 0.25);
  font-size: var(--fs-xs);
  color: #CBD5E1;
}

@media (min-width: 768px) {
  .site-footer .container {
    grid-template-columns: 1fr 2fr;
    grid-template-areas:
      "nav  links"
      "disclosure disclosure";
    gap: var(--sp-8);
  }

  /* 依 DOM 顺序占位：nav(1) → nav 区、nav(2) → links 区、.footer-disclosure → 横跨整行 */
  .site-footer .container > nav:first-of-type { grid-area: nav; }
  .site-footer .container > nav:last-of-type  { grid-area: links; }
  .site-footer .container > .footer-disclosure { grid-area: disclosure; }

  .footer-links {
    flex-direction: row;       /* ≥768px：友链横向换行 */
    flex-wrap: wrap;
    gap: var(--sp-2) var(--sp-6);
  }
}
```

> 说明：用 `grid-template-areas` 显式分区而非仅 `grid-column: 1 / -1`，可同时根除 daojia 版权行错位（P1-1）——容器内的任何额外子元素都必须显式归位，不会再被自动放置到错误列。若不想动 HTML 的 daojia 版权行在 disclosure 外，则必须选择本方案并把该 p 移入 disclosure（见②）。

② 18 页 HTML 结构统一（每页 3-10 分钟机械修改）：

统一目标结构（以首页为例）：

```html
<footer class="site-footer">
  <div class="container">
    <nav aria-label="站点导航"> …保持原样… </nav>
    <nav aria-label="友情链接"> …保持原样… </nav>
    <div class="footer-disclosure">
      <p><strong>推广声明</strong>：…</p>
      <p><strong>品牌免责声明</strong>：…</p>
      <p class="footer-copy">© 2026 优惠集合导航（youhui8.github.io）· 非官方优惠信息聚合导航站点</p>
    </div>
  </div>
</footer>
```

各页具体动作：
| 页面 | 动作 |
|---|---|
| index.html / about / 404 | disclosure 内**新增** `<p class="footer-copy">© 2026 优惠集合导航（youhui8.github.io）· 非官方优惠信息聚合导航站点</p>`（补齐 P1-3） |
| meituan 3 页 | disclosure 内无 class 的版权 `<p>`（如 meituan/index.html L151）加上 `class="footer-copy"` |
| bendi / gouwu / jingdong-waimai 9 页 | 已在 disclosure 内且带 class，**无需改动**（仅确认文案统一可选） |
| daojia 3 页 | 把 disclosure 之后的兄弟 `<p class="footer-copy">`（如 daojia/index.html L161）**剪切移入 disclosure 末尾**，同时消除 P1-1 的错位与不可读 |

③ 主题层清理（P3-1）：
- 删除 theme-bendi.css L199-205、theme-jingdong-waimai.css L230-236 的 `.footer-copy` 块；
- 删除 theme-daojia.css L106-111 的 `.footer-copy` 块（错误颜色源头）；
- theme-gouwu.css 本就无定义，无需动。

**修复后效果**：≥768px 页脚呈"左：本站导航 / 右：友链横排两行 / 底：推广声明 + 免责 + 版权，横跨整行独占"的三分区布局；<768px 单列堆叠不变。daojia/gouwu 版权行恢复可读（≥4.77:1）。

**测试影响**：tests/06 L23-39（页脚 9 个友链 href）与 L41-56（rel=noopener）按 footer 内字符串匹配——所有 href 与 rel 保持不变，通过。tests/02 sitemap、tests/03 SEO 不涉及 footer DOM。**唯一注意**：修改 HTML 后按仓库维护规范同步 sitemap.xml 对应页 lastmod（tests/02 只校验"≤今天"，不改也不会挂，但规范要求实质修改更新日期）。

### 3.4 P2-2：首页/404 卡片尾行平衡（配套 P0-2 一起做）

```css
/* theme-home.css L56-60 替换 */
@media (min-width: 1024px) {
  .home-cards {
    grid-template-columns: repeat(6, 1fr);   /* 6 列基准 */
  }
  /* 前 3 卡各占 2 列（第一行铺满），后 2 卡各占 3 列（第二行铺满） */
  .home-cards > .card:nth-child(-n+3) { grid-column: span 2; }
  .home-cards > .card:nth-child(n+4)  { grid-column: span 3; }
}
```

5 卡时呈 **3 + 2**，第二行两张等宽铺满整行，消除右侧空缺。404.html 同款 `.home-cards` 结构自动生效。<1024px（1 列/2 列）不受影响。零测试影响。

---

## 4. favicon 重设计方案（P0-4 + P3-2/P3-3）

### 4.1 现状问题诊断

favicon.svg 当前母题"无限惠环"（L9-L10）：上下两个分离白环（cx=32, cy=22 与 cy=42, r=9, stroke=5）于 `#4F46E5→#0EA5E9` 渐变圆角底板上。三个缺陷：
1. **"无限"语义断裂**：两环完全分离、无交叉，视觉读作"双圆圈/双目"，而非 ∞（无限符号必须交叉）；
2. **小尺寸退化**：16px 下每个环仅 ~5px，描边 1px 出头，渲染为两个模糊白点，几乎无辨识度；
3. **配色问题**：浅端 #0EA5E9 过亮（白图形在其上 2.77:1），渐变整体偏"工具感"。

### 4.2 推荐方案：票券缺口母题（"惠券"）

**设计理由**：优惠导航的第一心智是"券"。票券轮廓（圆角矩形 + 两侧半圆缺口）几何极简（SDF 好写）、16px 下仍可辨、语义直白，且"票券=入口"与导航站定位契合。

**视觉规格**（64×64 画布，ASCII 示意）：

```
┌──────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  底板：rx=14 圆角方
│ ▓                          ▓ │  渐变 135deg
│ ▓   ╭────────────────╮     ▓ │  #4338CA → #2563EB
│ ▓ ◝│                │◜   ▓ │
│ ▓   │   ￥   │  ∙∙  │     ▓ │  白色票券 40×24：
│ ▓   │       │       │     ▓ │    左半大号"￥"(16px 档隐藏)
│ ▓   │       │       │     ▓ │    中缝竖虚线(32px 档起显示)
│ ▓ ◟│                │◞   ▓ │    两侧 r=4 半圆缺口
│ ▓   ╰────────────────╯     ▓ │
│ ▓                          ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└──────────────────────────────┘
  16px 档特化：只留票券轮廓+两侧缺口（去掉￥与虚线）
```

**配色 token**（与 P2-1 修复后的 home hero 同源，形成品牌一致）：
- 渐变深端 `#4338CA`（indigo-700，白图形 7.86:1）
- 渐变浅端 `#2563EB`（blue-600，白图形 5.35:1）——比现浅端 #0EA5E9 深一档半，两端均超 AA
- 图形纯白 `#FFFFFF`
- 与 6 站主题色关系：favicon 用"母品牌"蓝紫（home 站色），分站色仅在卡片顶条出现，图标不做 6 色变体（16px 无信息量，且 manifest 只有一套引用）。

**分尺寸特化**（gen-icons.mjs 已有 fullBleed 参数机制，沿用）：
| 尺寸 | 图形策略 |
|---|---|
| 16 / 32 | 票券轮廓 + 两侧缺口，无内部细节；fullBleed=false（图形留 2px 边距） |
| 48 | + 中缝虚线 |
| 180 (apple-touch) | + 左半 "￥"（粗字重，占票券左区 ~60%）+ 中缝虚线；**全出血**（iOS 自动加圆角裁切） |
| 192 / 512 | 同 180；图形元素收进中心 80% 安全区，兼作 maskable（解决 P3-3） |

### 4.3 备选方案：单笔画无限环（改动最小）

若希望保留"无限惠环"品牌叙事：把现有分离双环改为真正交叉的 ∞——
- 上环圆心 (32,26)、下环圆心 (32,38)、r=10，两环交叠处用底色小菱形"断口"制造单笔画交叉错觉（标准 ∞ logo 画法）；
- 渐变同步换 `#4338CA→#2563EB`；
- 16px 档 stroke 放粗至 ~7/64 等效。
改动仅限 pnglib.mjs `drawBrandIcon()` 的 rings 坐标 + 断口逻辑 + favicon.svg 手改三行。**缺点**：仍偏抽象，"优惠"语义弱于票券。建议作为 Plan B。

### 4.4 实施步骤

1. 手写新 `assets/icons/favicon.svg`（矢量源，票券路径 + 渐变，纯静态可直接写）。
2. 重写 `scripts/pnglib.mjs` `drawBrandIcon()`（L84-139）：票券 SDF = 圆角矩形 SDF `∪` 两侧半圆缺口（`sdRoundRect(...) ∪ circle(...) 反向`），按上表分档决定是否叠加 ￥/虚线；￥ 用现成的字形块绘制函数思路（pnglib 已有 fillRect/画圆能力，￥ 可用粗矩形拼装或简化为 ¥ 双横线+竖线拼装——建议拼装，避免引入字体依赖）。
3. `node scripts/gen-icons.mjs` 重新生成 7 个文件（favicon.ico / favicon-16/32/48 / apple-touch-icon / android-chrome-192/512），**文件名与 site.webmanifest 引用完全不变**（tests/07 L84-101 断言保护）。
4. manifest 的 512 条目加 `"purpose":"maskable"`（P3-3）；ico 是否减帧到 16/32（P3-2，5.6KB）实施时拍板。
5. 验证（下节）。

### 4.5 三端 PNG 回退加载验证要点

| 端 | 验证点 |
|---|---|
| 桌面 Chrome | ① 标签页 16px：票券轮廓+缺口清晰可辨；② 书签栏；③ DevTools → Application → Manifest：Icons 列表无报错、无 404（本地 `npx serve .` 起服务后 Network 面板确认 favicon 请求链：ico(旧 Safari) → svg(新 Chrome) 优先级；④ PWA 安装态 192/512 |
| iPhone Safari | ① 主屏图标 = apple-touch-icon 180 全出血 + iOS 圆角裁切后 ￥ 不被切边；② 标签页（iOS 15+）favicon 走 32 PNG；③ Safari 图标缓存顽固，验证需**彻底退出 Safari 重启**（必要时飞行模式强刷），否则看到旧图标易误判 |
| Android Chrome | ① 安装 PWA：manifest icons 192/512 命中 + maskable 安全区裁切后票券完整；② 深色模式自适应图标背景不留白边（webmanifest `background_color` 建议配 `#1E293B` 或保持品牌渐变底板本身即背景）；③ 地址栏 favicon SVG 回退 PNG 正常 |
| 通用 | 清缓存硬刷（Ctrl+F5）；`tests/07-assets` PNG/ICO 魔数与尺寸断言全绿（重生成后必跑）；跨 16/32/48 手动目检灰度边缘（无白噪点/锯齿毛刺，pnglib 抗锯齿 SDF 半透明渐变带） |

---

## 5. 修复顺序建议与回归风险点

### 5.1 建议批次（每批可独立提交+全量回归）

| 批次 | 内容 | 改动文件 | 理由 |
|---|---|---|---|
| ① | P0-3 + P1-1/2/3 + P3-1（页脚重构一批） | base.css、theme-bendi/jd/daojia.css、18 页 HTML、sitemap.xml lastmod | 同一根因（页脚结构/版权行基座），拆开必然返工；HTML 批量改动一次完成减少 lastmod 抖动 |
| ② | P0-1（prose 铺满 + 注释口径） | base.css、tokens.css | 独立小改，2 处 CSS + 3 处注释 |
| ③ | P0-2 + P2-2（整卡可点 + 尾行平衡，同选器区域） | base.css、theme-home.css | 同属首页卡片区，一批验收（375/768/1024/1440 四档截图对比） |
| ④ | P2-1（home hero 渐变加深） | theme-home.css | 与批次⑤ favicon 同色系，先定色再产图标 |
| ⑤ | P0-4 + P3-2/3（favicon 全套重做） | favicon.svg、pnglib.mjs、gen-icons.mjs 产物、site.webmanifest | 依赖批次④的配色定稿 |
| ⑥ | P3-5（deadline 过期态缩进）、P3-4（分站攻略卡整卡化，可选） | deadline.js、base.css | 低优先，P3-4 复用批次③模式 |

### 5.2 回归风险点（按测试文件逐一核对）

| 测试 | 断言内容 | 受影响修复 | 注意事项 |
|---|---|---|---|
| tests/05 L128-137 | 首页 `.card.site-card` 区**无外部推广 CTA**、deadline 组件 ≥2 | 批次③ | 整卡可点**不得**新增/改动卡内 a 的 href（只加伪元素覆盖）；promo-deadline DOM 保持 |
| tests/05 L104-115 | `data-deadline` ⇔ deadline.js 引用一一对应；仅允许 2026-12-31 | 批次⑥ | deadline.js 改动仅加 `classList.add`，不动 script 标签 |
| tests/06 L23-56 | 页脚 6 站互链 + 3 外链、外链 rel=noopener | **批次①（重点）** | 页脚 HTML 重构保持全部 href/rel 原样；版权行移动不涉及链接 |
| tests/06 L73-92 | 锚点/死链全站扫描 | 批次①③ | 新增的 `.footer-copy` 文本不含 a；卡片伪元素不产生新链接 |
| tests/07 L38-51 | head 7 项 favicon 引用 + PNG/ICO 魔数 + manifest 字段 | 批次⑤ | 7 个图标**文件名不变**；manifest 加 purpose 时保持其余字段 |
| tests/03 SEO | title/desc/canonical/OG 唯一性 | 无 | 任何批次不得改 head 文案 |
| tests/02 sitemap | lastmod ≤ today | 批次①③（HTML 有实质改动） | 按 README 维护规范更新对应页 lastmod 为 2026-10-xx（当天） |
| tests/01/04 | data.js 结构 / JSON-LD | 无 | 所有修复不碰 data.js 与结构化数据 |

**视觉回归**：每批完成后 `npx serve .` + 375/768/1024/1440 四档截图，重点对比：页脚（批次①）、首页矩阵说明区行长（②）、卡片 hover/聚焦态与尾行（③）、hero 色深（④）、标签页图标（⑤）。

**明确不需要担心的**：无任何测试断言 72ch 限宽、footer DOM 层级、favicon 视觉内容、hero 渐变色值——这四类改动对 47 个用例零敏感（前提是 href/rel/文件名/head 文案/manifest 引用四不变）。

---

## 附录 A：性能预算实测（全部达标 ✓）

| 指标 | 预算 | 实测 | 结论 |
|---|---|---|---|
| HTML 单页 | ≤ 60KB | 5.4KB（404）~ 15.5KB（gouwu/dacu-rili） | ✓ 最大余量 74% |
| CSS 单页合计（tokens+base+theme） | ≤ 40KB | 14.1KB（gouwu 主题最简）~ 18.8KB（daojia 主题最重） | ✓ |
| JS | ≤ 1KB | deadline.js 0.9KB | ✓ |
| 图片（og） | — | 30~49KB × 6（按站各加载 1 张） | ✓ |
| 图标 | — | favicon PNG 0.4~1.4KB；ico 14.7KB（见 P3-2）；android 5.2/17.1KB | ✓（ico 可优化） |

## 附录 B：对比度核算表（WCAG 相对亮度公式，程序计算）

| 组合 | 前景 | 背景 | 比率 | 判定 |
|---|---|---|---|---|
| daojia 版权行（现状） | #3E5A73 | #075985 | **1.05:1** | ✗ 不可读（P1-1） |
| gouwu 版权行（现状） | #292038 | #5B21B6 | **1.72:1** | ✗ 不可读（P1-2） |
| home hero 副标题最浅端（现状） | #FFFFFF | #0EA5E9 | **2.77:1** | ✗（P2-1） |
| **方案：统一版权行色** | #CBD5E1 | #075985 / #3F6212 / #9A3412 / #991B1B / #5B21B6 / #1E293B | **4.77 ~ 10.4:1** | ✓ 全站覆盖 |
| **方案：home hero 新渐变** | #FFFFFF | #2563EB / #4338CA | **5.35 / 7.86:1** | ✓ |
| 参考已达标项 | footer-links #E2E8F0、disclosure #CBD5E1、各站 hero 白字、各 accent 深底白字 | — | 全部 ≥ 4.5:1 | ✓ |

## 附录 C：一致性核查结论（通过项）

- heading 层级：18 页序列零跳级（脚本全量验证，含 404 的 1-2 结构）。
- 面包屑：16 页（除 index/404）结构、位置（main 前独立 container）、`aria-label="面包屑"` 完全一致。
- head：18 页 17 项字段顺序一致；title 12-25 字全唯一；404 无 canonical/OG 且带 noindex 属设计意图。
- 卡片组件：`.card > h3 + .card-desc + .card-note` 结构全站一致。
- CSS 死代码：零（guide-more/verdict-panel/gw-quick/gw-check/hero-aside/section-no 等全部类均有 HTML 使用）。
- 交互基线：skip-link、全局 `a:focus-visible`、`prefers-reduced-motion`、表格 caption+横滚、nav/footer 链接 min-height 44px 均已实现。
- 语义化：article/section/nav/aside/time/dl/caption 使用规范，无 div 滥用。

---

*报告完。修复实施请按 §5 批次推进，每批后 `npm test` + `npm run check:data` 全量回归。*

