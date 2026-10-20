# 优惠集合站点矩阵（youhui-network）实施任务清单

> **文档定位**：本清单将 `spec.md`（78 条 EARS 需求）与 `design.md`（v1.0，2026-10-20）翻译为可直接执行的工作项。
> **路径契约**：全部文件路径以 design.md **1.3.3 文件树**为唯一基准；本文档与 design.md 的出入已在第 10 节「契约偏差与不一致记录」显式登记，执行时一律以 design.md 为准。
> **规模标记**：S ≤ 1h；M 1~3h；L 3~4h。一张任务卡 = 单执行者单会话可完成的单元。
> **执行纪律**：所有路径仅小写字母/数字/连字符（design.md 1.3.3 规则 1）；共享资源一律根路径引用（`/assets/...`）；`data.js` 的 link/name/description/deadline 引用处必须与数据源**逐字符一致**，禁止改写、追加参数或二次包装。

---

## 1. 任务总览表

### 1.1 与全局任务列表的映射

| 全局阶段 | 全局 key | 本文档任务卡 | 执行方式 |
| --- | --- | --- | --- |
| Phase D1 公共基座 | `build-core` | T1.1 ~ T1.12 | 串行，按 1.2 表顺序 |
| Phase D2 bendi 分站 | — | T2 | 与 T3~T6 并行 |
| Phase D3 meituan 分站 | — | T3 | 与 T2/T4~T6 并行 |
| Phase D4 jingdong-waimai 分站 | — | T4 | 与 T2/T3/T5/T6 并行 |
| Phase D5 daojia 分站 | — | T5 | 与 T2~T4/T6 并行 |
| Phase D6 gouwu 分站 | — | T6 | 与 T2~T5 并行 |
| Phase E 自动化校验 | `phase-test` | T7 | 依赖 D1~D6 全部完成 |
| Phase F 代码质量审查 | `phase-review` | T8 | 依赖 T7 |
| Phase G 功能验证 | `phase-verify` | T9 | 依赖 T8 |

### 1.2 总览表（20 张任务卡）

| 阶段 | 任务 ID | 名称 | 主要产出文件 | 依赖 | 规模 |
| --- | --- | --- | --- | --- | --- |
| D1 | T1.1 | data.js 规范化重写 | `data.js` | — | S |
| D1 | T1.2 | CSS 基座三层架构 | `assets/css/tokens.css`、`assets/css/base.css`、`assets/css/theme-home.css` | T1.1 | M |
| D1 | T1.3 | favicon 全套资产生成 | `favicon.svg`、`favicon.ico`、`favicon-{16,32,48}.png`、`apple-touch-icon.png`、`android-chrome-{192,512}.png`、`site.webmanifest` | — | M |
| D1 | T1.4 | og 分享图生成 ×6 | `og-home.png`、`og-{bendi,meituan,jingdong-waimai,daojia,gouwu}.png` | — | M |
| D1 | T1.5 | 站点级公共文件 | `robots.txt`、`sitemap.xml`、`llms.txt`、`.nojekyll` | T1.1 | M |
| D1 | T1.6 | 首页枢纽页 | `index.html` | T1.1~T1.5 | M |
| D1 | T1.7 | 关于页 | `about/index.html` | T1.6 | S |
| D1 | T1.8 | 404 页 | `404.html` | T1.6 | S |
| D1 | T1.9 | deadline 降级脚本 | `assets/js/deadline.js` | T1.2 | S |
| D1 | T1.10 | 校验脚本 | `scripts/check-data.mjs` | T1.1、T1.6 | M |
| D1 | T1.11 | README 维护说明 | `README.md` | T1.1~T1.10 | S |
| D1 | T1.12 | D1 阶段集成自检 | （无新文件，验证 D1 产物） | T1.1~T1.11 | S |
| D2 | T2 | /bendi/ 分站三页 | `assets/css/theme-bendi.css`、`bendi/index.html`、`bendi/waimai-scene-guide.html`、`bendi/zhoubianyou-tuangou.html` | T1.12 | L |
| D3 | T3 | /meituan/ 分站三页 | `assets/css/theme-meituan.css`、`meituan/index.html`、`meituan/hongbao-guide.html`、`meituan/shenquan-guide.html` | T1.12 | L |
| D4 | T4 | /jingdong-waimai/ 分站三页 | `assets/css/theme-jingdong-waimai.css`、`jingdong-waimai/index.html`、`jingdong-waimai/hongbao-step.html`、`jingdong-waimai/duibi-meituan.html` | T1.12 | L |
| D5 | T5 | /daojia/ 分站三页 | `assets/css/theme-daojia.css`、`daojia/index.html`、`daojia/xiche-jiage.html`、`daojia/jiazheng-bikeng.html` | T1.12 | L |
| D6 | T6 | /gouwu/ 分站三页 | `assets/css/theme-gouwu.css`、`gouwu/index.html`、`gouwu/dacu-rili.html`、`gouwu/waimai-gouwu-qingdan.html` | T1.12 | L |
| E | T7 | 站点完整性测试套件 | `scripts/tests/*.test.mjs`（node:test） | T1.12、T2~T6 | M |
| F | T8 | 代码质量审查 | 审查报告（`scripts/review-report.md`） | T7 | M |
| G | T9 | 功能验证与 VERDICT | 验证报告（`scripts/verify-report.md`） | T8 | M |

> T1.3 / T1.4 可与 T1.1~T1.2 并行（互不依赖）；T1.1~T1.5 内部仅 T1.5 依赖 T1.1。若单人执行，按表中顺序串行即可。

---

## 2. Phase D1 任务卡（公共基座，串行）

### T1.1 data.js 规范化重写

- **目标**：把现有带语法错误的 `data.js` 重写为 design.md 4.2.1 冻结的规范化终稿，成为推广链接唯一数据源。
- **输入**：仓库现有 `data.js`（尾部残留 `],},],`，语法不合法）；design.md 4.2.1 终稿全文、2.2 表 2 字段契约。
- **步骤**：
  - [ ] 按 design.md 4.2.1 代码块**逐字**重写 `data.js`：`const youhuiList = Object.freeze([ ... ]);`，含头部维护注释块
  - [ ] 每条记录写入 6 字段：`id` / `name` / `link` / `description` / `deadline` / `site{slug,url}`
  - [ ] 5 条记录的 `link` 逐字符取自现文件（`https://kzurl18.cn/tHj1ww` 等 5 条，禁止任何改写）
  - [ ] `deadline`：meituan 与 jingdong-waimai 为 `'2026-12-31'`（ISO）；bendi/daojia/gouwu 显式 `null`
  - [ ] 删除现文件第 29~31 行残留 `],},],`，确保 `];` 正确闭合
- **产出物**：`data.js`（根目录，路径不变更名）
- **DoD**：
  - [ ] `node --check` 或 `new Function` 求值通过，`youhuiList.length === 5`
  - [ ] 每条记录 `id` 与 `site.slug` 一致且等于分站目录名
  - [ ] 5 条 `link` 全文件唯一、以 http(s) 开头
  - [ ] 全部记录含 `deadline` 键（有值或 null，无缺省键）
- **REQ 映射**：REQ-NFR-008/010、REQ-CTA-005、spec 10.1/10.2
- **自验命令**：
  ```powershell
  node -e "const l=new Function(require('fs').readFileSync('data.js','utf8')+'\n;return youhuiList;')();console.log(l.length===5&&l.every(r=>r.id===r.site.slug&&r.link.startsWith('http')&&('deadline'in r))?'PASS':'FAIL')"
  ```

### T1.2 CSS 基座三层架构

- **目标**：建立全站共享的三层 CSS 基座（token 层 + 组件层 + 首页主题层），六站差异化全部派生于此。
- **输入**：design.md 1.3.7.2（三层架构与内容清单）、1.3.2.2（六站色值表）、1.3.10（`.promo-deadline` CLS 防抖）、2.1 head 模板（每页引 3 个 CSS）。
- **步骤**：
  - [ ] 写 `assets/css/tokens.css`（~4KB）：色彩语义 token（`--c-primary/-strong/-soft`、`--c-accent`、`--c-bg`、`--c-surface`、`--c-text`、`--c-text-muted`、`--c-border`、`--c-on-primary`）、字体阶梯（`--fs-xs:12px` → `--fs-hero: clamp(...)`）、间距（`--sp-1:4px`~`--sp-8:32px`）、`--w-container:1200px`、`--w-prose:72ch`、圆角阴影、断点注释（375/768/1024/1280）、系统字体栈（design.md 1.3.7.1 冻结值）
  - [ ] 写 `assets/css/base.css`（~14KB）：reset 要素 + body 基线（16px/行高 1.75）+ header/nav + breadcrumb + footer（友链 3 区块）+ `.promo-cta` + `.badge`（含 `.badge-limited`）+ `.card` + `table` + `.faq` + 触控基线（交互元素 min-height/min-width 44px）+ `.skip-link` + `.promo-deadline`（`min-height:1.75em`，徽章不占文档流）
  - [ ] 写 `assets/css/theme-home.css`（~40 行）：覆盖首页主题 token（主色 `#334155`、辅色 `#4F46E5`、底色 `#F8FAFC`）+ `[data-site="home"]` 布局类（居中单列容器 + 5 卡片响应式网格 1/2/3 列）
  - [ ] 移动优先 `min-width` 媒体查询，按 1.3.7.3 断点行为表实现
- **产出物**：`assets/css/tokens.css`、`assets/css/base.css`、`assets/css/theme-home.css`
- **DoD**：
  - [ ] 三文件合计 ≤ 40KB（目标 ~24KB）
  - [ ] `--c-on-primary` 与 `--c-primary` 对比度 ≥ 4.5:1（六站主色均适用，正文对比色 ≥ 4.5:1）
  - [ ] 无 `!important` 滥用、无第三方依赖、零预处理器语法
  - [ ] `.promo-deadline` 具备 `min-height:1.75em`
- **REQ 映射**：REQ-NFR-001/002、REQ-RWD-001/002/003/004/005、REQ-DIFF-006、REQ-NFR-004（CLS）
- **自验命令**：
  ```powershell
  Get-ChildItem assets/css/tokens.css,assets/css/base.css,assets/css/theme-home.css | Select-Object Name,Length
  ```

### T1.3 favicon 全套资产生成

- **目标**：按「无限惠环」品牌图形（design.md 1.3.5.1 源稿）生成全站 favicon 资产与 manifest。
- **输入**：design.md 1.3.5.1（favicon.svg 源稿 XML）、1.3.5.2（资产矩阵 + 脚本 A 三级降级链）、2.2 表 3（site.webmanifest JSON 全文）。
- **步骤**：
  - [ ] 手写落地 `favicon.svg`（照抄 1.3.5.1 源稿：64×64 viewBox、`#4F46E5→#0EA5E9` 渐变、双白环）
  - [ ] 编写临时生成脚本（脚本 A，sharp → 纯 JS PNG/ICO 编码器 → 简化双圆点图形，按降级链逐级尝试）从 favicon.svg 派生 6 档位图：`favicon-16x16.png`、`favicon-32x32.png`、`favicon-48x48.png`、`apple-touch-icon.png`(180)、`android-chrome-192x192.png`、`android-chrome-512x512.png`
  - [ ] 生成 `favicon.ico`（ICO 容器含 16/32/48 三帧 **BMP 32bpp 帧**，非 PNG 帧——Safari 兼容）
  - [ ] 手写 `site.webmanifest`（照抄 2.2 表 3：name=优惠集合导航、short_name=优惠集合、双 icons、theme_color `#334155`、display standalone、start_url `/`）
  - [ ] Windows 环境若 sharp 渲染正常则保留脚本供复用（建议存 `scripts/gen-icons.mjs`），否则用后可删；不入 1.3.3 文件树必需清单
- **产出物**：`favicon.svg`、`favicon.ico`、`favicon-16x16.png`、`favicon-32x32.png`、`favicon-48x48.png`、`apple-touch-icon.png`、`android-chrome-192x192.png`、`android-chrome-512x512.png`、`site.webmanifest`（共 9 个，全部仓库根目录）
- **DoD**：
  - [ ] 9 个文件全部存在，路径与 1.3.3 文件树逐项一致
  - [ ] PNG 魔数 `89 50 4E 47` 合法；ICO 头 `00 00 01 00` 合法；单文件 ≤ 300KB
  - [ ] manifest 为合法 JSON，icons 指向的 2 个文件存在
- **REQ 映射**：REQ-FAV-001/002/005、REQ-RWD-004
- **自验命令**：
  ```powershell
  node -e "const fs=require('fs');const ok=['favicon.svg','favicon.ico','favicon-16x16.png','favicon-32x32.png','favicon-48x48.png','apple-touch-icon.png','android-chrome-192x192.png','android-chrome-512x512.png','site.webmanifest'].every(f=>fs.existsSync(f));const ico=fs.readFileSync('favicon.ico');const png=fs.readFileSync('favicon-32x32.png');console.log(ok&&ico[2]===1&&png[0]===0x89?'PASS':'FAIL')"
  ```

### T1.4 og 分享图生成 ×6

- **目标**：为六站各生成一张 1200×630、两两可区分的 og 分享图。
- **输入**：design.md 1.3.5.2 脚本 B 降级链、1.3.2.2 六站主色/辅色表：home `#334155/#4F46E5`、bendi `#EA580C/#F59E0B`、meituan `#65A30D/#4D7C0F`、jingdong-waimai `#DC2626/#B91C1C`、daojia `#0284C7/#0369A1`、gouwu `#7C3AED/#DB2777`。
- **步骤**：
  - [ ] 编写脚本 B：og 模板 SVG（1200×630：站主色→辅色渐变底 + 白色站名大字 + 品牌双圆环 + 站点定位短语）转 PNG；SVG 显式声明 `font-family="Microsoft YaHei, PingFang SC"`（Windows 中文字体依赖，R2 对策）
  - [ ] sharp 不可用或中文渲染失败时降级：纯 JS PNG 编码器 + 点阵拉丁字模渲染站 slug 大写（如 "BENDI"）
  - [ ] 批量输出 6 张：`og-home.png`、`og-bendi.png`、`og-meituan.png`、`og-jingdong-waimai.png`、`og-daojia.png`、`og-gouwu.png`
  - [ ] 肉眼核对六图底色渐变取自各站主色、两两不同
- **产出物**：`og-home.png`、`og-bendi.png`、`og-meituan.png`、`og-jingdong-waimai.png`、`og-daojia.png`、`og-gouwu.png`（6 个，仓库根目录）
- **DoD**：
  - [ ] 6 张全部存在，PNG 魔数合法，IHDR 宽 1200 × 高 630
  - [ ] 单张 ≤ 300KB；六张肉眼可区分（底色渐变不同）
- **REQ 映射**：REQ-FAV-006、REQ-SEO-005（og:image 引用）、REQ-RWD-004
- **自验命令**：
  ```powershell
  node -e "const fs=require('fs');const sl=['home','bendi','meituan','jingdong-waimai','daojia','gouwu'];console.log(sl.map(s=>'og-'+s+'.png').every(f=>{if(!fs.existsSync(f))return false;const b=fs.readFileSync(f);return b[0]===0x89&&b.readUInt32BE(16)===1200&&b.readUInt32BE(20)===630})?'PASS':'FAIL')"
  ```

### T1.5 站点级公共文件（robots / sitemap / llms / .nojekyll）

- **目标**：落地爬虫与 AI 引擎可发现性资产，URL 集合一次冻结成型。
- **输入**：design.md 1.3.1.2（17 内容页 URL 清单）、1.3.6.6（sitemap 结构）、1.3.6.7（robots 终稿全文）、1.3.6.8（llms.txt 三层结构模板）、T1.1 的 `data.js`。
- **步骤**：
  - [ ] 写 `robots.txt`：照抄 1.3.6.7 终稿（通用 `User-agent: * Allow: /` + GPTBot/ClaudeBot/PerplexityBot/Google-Extended/Bytespider/CCBot 六个 AI 爬虫显式允许组 + `Sitemap: https://youhui8.github.io/sitemap.xml`，无 Disallow）
  - [ ] 写 `sitemap.xml`：收录 1.3.1.2 表全部 17 个 URL（404 不收录），每条 `<loc>` + `<lastmod>`（初始上线日 2026-10-20）；不含 changefreq/priority；目录页带尾斜杠、攻略页 `.html`
  - [ ] 写 `llms.txt`：按 1.3.6.8 三层结构（H1 站名 + 简介 blockquote → 「站点矩阵」6 站列表 → 「各站页面清单」逐站 17 页 → 「使用说明」推广链接与有效期口径），meituan/jingdong-waimai 条目含「有效期至 2026-12-31」
  - [ ] 创建空文件 `.nojekyll`（0 字节，禁止 Jekyll 处理）
- **产出物**：`robots.txt`、`sitemap.xml`、`llms.txt`、`.nojekyll`
- **DoD**：
  - [ ] sitemap `<loc>` 数 = 17，URL 集合与 1.3.1.2 表完全一致（XML 语法合法）
  - [ ] llms.txt 链接集 ⊇ sitemap URL 集；含全部 6 站 + 17 页
  - [ ] `.nojekyll` 存在且为空
  - [ ] 三个文本文件编码 UTF-8 无 BOM
- **REQ 映射**：REQ-SEO-007/008、REQ-AI-001/002、REQ-NFR-006、REQ-CONTENT-001
- **自验命令**：
  ```powershell
  (Select-String -Path sitemap.xml -Pattern '<loc>').Count; (Get-Item .nojekyll).Length
  ```

### T1.6 首页枢纽页 index.html

- **目标**：构建全站导航枢纽：5 分站卡片 + FAQ + 完整 head 契约 + 页脚友链与披露。
- **输入**：design.md 2.1（每页通用 head 模板）、1.3.1.3（首页内容规划：title/H1 草案与四区块）、1.3.5.3（图标引用链 7 项）、1.3.6.3（OG/Twitter）、1.3.6.4（JSON-LD 选型）、1.3.8（页脚友链）、1.3.10（deadline 组件）、1.3.11（披露两段 + CTA 预期管理）、T1.1~T1.5 产物。
- **步骤**：
  - [ ] head：按 2.1 模板（lang=zh-CN、title ≤30 字、description 60~120 字、canonical `https://youhui8.github.io/`、图标链 7 项 + theme-color `#334155`、3 个 CSS、OG/Twitter 用 og-home.png、JSON-LD 单段 `@graph` = WebSite + ItemList(5 分站) + FAQPage(4~5 问)）
  - [ ] body：`data-site="home"`、skip-link、站内导航（首页 + 关于）
  - [ ] 站点简介区：≥400 中文字符的站点矩阵说明（REQ-CONTENT-004）
  - [ ] 分站卡片网格：5 张卡片 = 站名 h2 链接（锚文本=站名，指向分站带尾斜杠 URL）+ data.js `description` 首句逐字引用 + 定位补充语 + deadline 徽章行（仅 meituan/jingdong-waimai 卡片渲染期限组件与 `.badge-limited`，其余 3 卡零期限元素）
  - [ ] FAQ 区：4~5 条，与 FAQPage JSON-LD 逐字一致
  - [ ] 页脚：友链组件（本站快捷导航 + 其余 5 站互链绝对 URL + 3 外链 `券宝/优惠聚合/号卡办理中心` 带 `rel="noopener"`）+ 推广声明与品牌免责声明两段（1.3.11.1 原文约 110 字）
- **产出物**：`index.html`
- **DoD**：
  - [ ] 单页 HTML ≤ 60KB；恰 1 个 h1；JSON-LD 可 `JSON.parse`
  - [ ] 5 张卡片链接 = data.js `site.url` 逐字符一致；2 张卡片含 `data-deadline="2026-12-31"`
  - [ ] 页脚含其余 5 站 + 3 外链全部绝对 URL；互链无 nofollow/sponsored
  - [ ] 正文关键词自然分布（优惠集合、外卖红包入口、网购省钱导航），无堆砌
- **REQ 映射**：REQ-NAV-001/003/004、REQ-CONTENT-004/006、REQ-SEO-001/002/003/004/005/006/009、REQ-AI-003/004、REQ-DL-001、REQ-LINK-001/002/004/005、REQ-COMP-001/002
- **自验命令**：
  ```powershell
  node -e "const h=require('fs').readFileSync('index.html','utf8');console.log((h.match(/<h1/g)||[]).length===1&&h.includes('og-home.png')&&h.includes('data-deadline=\"2026-12-31\"')&&(h.match(/<script type=\"application\/ld\+json\"/g)||[]).length===1?'PASS':'FAIL')"
  ```

### T1.7 关于页 about/index.html

- **目标**：落地站点说明页（品牌免责声明第二落点）。
- **输入**：design.md 1.3.1.3（about 规划）、2.1 head 模板、1.3.6.2 canonical 规则、1.3.6.4 JSON-LD（WebPage + BreadcrumbList）、1.3.11.1 声明全文。
- **步骤**：
  - [ ] head：canonical `https://youhui8.github.io/about/`（带尾斜杠）、JSON-LD = WebPage + BreadcrumbList、其余按 2.1 模板
  - [ ] 正文五段式：站点定位与收录原则（信息聚合导航身份表述）→ 6 站矩阵结构图（文字版）→ 推广链接与有效期说明机制 → 品牌免责声明**全文**（REQ-COMP-002 双落点之二）→ 维护与更新说明
  - [ ] 页脚友链组件照常输出（当前站 home，互链其余 5 站）
- **产出物**：`about/index.html`
- **DoD**：
  - [ ] 品牌免责声明与首页页脚版本逐字一致
  - [ ] 面包屑（首页 → 关于本站）与 BreadcrumbList JSON-LD 逐字一致
  - [ ] title/description 全站唯一且符合长度区间
- **REQ 映射**：REQ-COMP-002、REQ-CONTENT-008、REQ-SEO-002/003/011、REQ-LINK-001/005
- **自验命令**：
  ```powershell
  node -e "const h=require('fs').readFileSync('about/index.html','utf8');const f=require('fs').readFileSync('index.html','utf8');console.log(h.includes('品牌免责声明')&&h.includes('about/')?'PASS':'FAIL')"
  ```

### T1.8 404 页 404.html

- **目标**：落地全站自定义 404（任意无效路径渲染），维持互链一致性。
- **输入**：design.md 1.3.12（404 设计四要点）、2.2 表 4 服务契约、T1.2 的 theme-home.css。
- **步骤**：
  - [ ] head：`<meta name="robots" content="noindex">`、**无 canonical**、全部资源根路径引用、不引 deadline.js
  - [ ] 内容：H1 `页面走丢了` → 一句话说明 → 6 站迷你导航卡片（与首页卡片同源样式、站名锚文本、绝对 URL）→「返回首页」主按钮
  - [ ] 正文真实可用文案 ≥ 100 字（禁止占位文本）；沿用 theme-home.css，不引入第 7 套主题
  - [ ] 页脚友链组件照常输出（REQ-LINK-001 的 18 页口径含 404）
- **产出物**：`404.html`
- **DoD**：
  - [ ] 含 noindex 且无 canonical；零相对路径资源引用（全部 `/` 开头）
  - [ ] 含 6 站绝对 URL 导航；页脚 5 站互链 + 3 外链齐全
- **REQ 映射**：REQ-LINK-001、REQ-NAV-005、REQ-NFR-005（服务契约对照）、REQ-SEO-011 例外（无面包屑）
- **自验命令**：
  ```powershell
  node -e "const h=require('fs').readFileSync('404.html','utf8');console.log(h.includes('noindex')&&!h.includes('canonical')&&!/href=\"(?!https?:\/\/|#|\/)[^\"]+\"/.test(h)?'PASS':'FAIL')"
  ```

### T1.9 deadline 降级脚本 deadline.js

- **目标**：实现唯一 JS：客户端有效期过期降级（渐进增强，失败静默）。
- **输入**：design.md 1.3.10.2（行为规范注释伪码）、4.2.3（三态状态机）、R10（CLS 对策）。
- **步骤**：
  - [ ] 实现约 15 行逻辑：`today = 'YYYY-MM-DD'`（客户端日期）；遍历 `[data-deadline]`，`today > deadline` 时移除 `.badge-limited` 并把 `.deadline-text` 替换为「活动时间可能已结束，可点击查看最新情况」
  - [ ] CTA href 保留不动（REQ-DL-002）；任何异常静默（try/catch 包裹，失败停留静态文案）
  - [ ] 引用方式：仅含期限组件的页面（首页、meituan/jd 分站页）在 head 尾部 `<script src="/assets/js/deadline.js" async defer></script>`
- **产出物**：`assets/js/deadline.js`
- **DoD**：
  - [ ] 文件 ≤ 1KB；无外部请求、无 API 调用、无 DOM 以外的副作用
  - [ ] 手工改系统时间至 2027-01-01 验证降级文案生效；断网/禁 JS 时静态文案停留不失实
- **REQ 映射**：REQ-DL-002/003/005、REQ-NFR-002/004
- **自验命令**：
  ```powershell
  (Get-Item assets/js/deadline.js).Length
  ```

### T1.10 校验脚本 check-data.mjs

- **目标**：实现零依赖数据-页面一致性校验脚本（物化漂移防线，供提交前与 Phase E/G 复用）。
- **输入**：design.md 4.2.5（五条比对规则）、1.3.1.2（17 页清单）、1.3.4.3（物化落点表）、1.3.3（文件树）。
- **步骤**：
  - [ ] 解析 `data.js`（`new Function` 或动态 import 取 `youhuiList`，零依赖）
  - [ ] 逐记录 × 逐页面：`link` 在对应分站全部 `<a class="promo-cta">` 的 href 逐字符相等；`name`/`description`/`deadline` 在物化落点（首页卡片、CTA 预期管理文案、期限组件、llms.txt）出现且逐字一致
  - [ ] 结构校验：HTML 文件树 = 1.3.3 清单（18 html + 资产存在性）；sitemap URL 集 = 17 内容页；llms 链接集 ⊇ sitemap；扫描文件树路径大小写违规（R6）
  - [ ] SEO 校验：title ≤30 中文字符且全站唯一；description 60~120 且全站唯一；每页恰 1 个 h1、恰 1 段可 `JSON.parse` 的 JSON-LD
  - [ ] 输出 PASS/FAIL + 差异明细清单；exit code 0/1；按可复用模块组织（`export function runChecks()` + CLI 直跑入口），供 T7 测试套件 import 复用
- **产出物**：`scripts/check-data.mjs`
- **DoD**：
  - [ ] 仅用 Node 内置模块（fs/path/url），无 npm 依赖
  - [ ] 对故意篡改的样例（如改一个 CTA href 字符）能报 FAIL 并定位差异
  - [ ] D1 末运行时因分站页面未建而报「缺 15 个 HTML」属预期输出（T2~T6 完成后转 PASS）
- **REQ 映射**：REQ-NFR-008/009、REQ-CTA-005、REQ-SEO-001/002/004/007、REQ-NFR-005
- **自验命令**：
  ```powershell
  node scripts/check-data.mjs
  ```

### T1.11 README 维护说明

- **目标**：把仓库占位 README 更新为站点结构 + 维护流程说明，落实七处同步落点清单。
- **输入**：design.md 1.3.3（文件树）、1.3.4.3（物化落点：首页卡片、分站 CTA、期限组件、sitemap lastmod、llms.txt 等）、4.2.1 data.js 头部维护注释、spec 10.2（站点与数据映射约束）。
- **步骤**：
  - [ ] 写站点定位一段 + 目录结构说明（18 html + 资产清单概览）
  - [ ] 写「同步落点清单」：修改 data.js 任何字段后须同步的七处落点（首页卡片记录名/描述/徽章、各分站 CTA href 与预期管理文案、期限组件、sitemap lastmod、llms.txt 描述、check-data 复跑）
  - [ ] 写维护流程：加攻略页 / 加分站 / 删记录三场景的分步操作（含 sitemap/llms/互链同步）
  - [ ] 写本地校验说明：`node scripts/check-data.mjs` + `npx http-server . -p 8080` 预览
- **产出物**：`README.md`（仓库根，更新现有文件）
- **DoD**：
  - [ ] 七处同步落点与 design.md 1.3.4.3 逐项对应、无遗漏
  - [ ] 含「先跑校验再提交」的工作流约定
- **REQ 映射**：REQ-NFR-009/011、spec 10.2.2/10.2.3
- **自验命令**：
  ```powershell
  Select-String -Path README.md -Pattern '同步落点|check-data|维护'
  ```

### T1.12 D1 阶段集成自检

- **目标**：验证 D1 公共基座可用、可预览，冻结为 D2~D6 的依赖基线。
- **输入**：T1.1~T1.11 全部产物。
- **步骤**：
  - [ ] `npx http-server . -p 8080` 启动本地预览，浏览器走查 `/`、`/about/`、`/404.html`：样式加载、favicon 显示、卡片渲染、页脚友链齐全
  - [ ] 运行 `node scripts/check-data.mjs`：确认仅报「分站 15 页缺失」（预期 FAIL 项），无其他差异（首页三页的 link/名称/描述/期限比对全部通过）
  - [ ] git 提交 D1 全部产物，打 tag 或记录 commit hash 作为并行基线
- **产出物**：无新文件（验证性任务卡）
- **DoD**：
  - [ ] 首页/about/404 三页本地 200 且视觉正常
  - [ ] check-data 输出中除「15 个分站 HTML 缺失」外零 FAIL
  - [ ] D1 基线 commit 已固化，T2~T6 均可从此基线检出并行
- **REQ 映射**：REQ-NFR-003/005/006 综合验证
- **自验命令**：
  ```powershell
  npx http-server . -p 8080
  ```
  （另开终端）`node scripts/check-data.mjs`

---

## 3. Phase D2~D6 分站任务卡（五卡结构相同，可并行）

> 每张分站卡的通用契约（各卡不再重复）：
> - **通用输入**：design.md 2.1 head 模板、1.3.5.3 图标链、1.3.6.3 OG、1.3.6.4 JSON-LD、1.3.6.5 锚文本策略、1.3.8 页脚友链组件（当前站自身从互链中省略，输出其余 5 站）、1.3.11 披露与 CTA 预期管理、T1.12 冻结的 D1 基线。
> - **CTA 规范**：`<a class="promo-cta" href="{data.js link 逐字符}" rel="sponsored nofollow noopener" target="_blank">`；CTA 区块附预期管理句「点击后将离开本站，前往"{data.js name}"外部优惠页面（新窗口打开），活动信息以目标页为准。」（name 逐字取自 data.js）。
> - **攻略页通用要求**：正文 ≥ 600 中文字符、含表格或列表（大纲指定处）、语义化 h2/h3 不跳级、JSON-LD = Article（headline=H1、datePublished/dateModified、author/publisher=`{"@type":"Organization","name":"优惠集合导航编辑部"}`）+ BreadcrumbList（与可见面包屑逐字一致）、canonical `https://youhui8.github.io/{slug}/{page}.html`、og:type=article、内文至少 1 处指向本分站首页的上下文句链接。
> - **分站 index 通用要求**：正文 ≥ 500 中文字符 + ≥ 3 内容区块、JSON-LD = CollectionPage + ItemList(本站攻略) + BreadcrumbList、canonical 带尾斜杠、og:type=website、攻略列表锚文本=攻略完整标题（或「阅读《标题》」）。
> - **每卡末步**：跑 `node scripts/check-data.mjs`，确认本站 3 页全部通过比对（其余未建分站仍报缺失，属预期）。

### T2 /bendi/ 本地生活优惠集（D2）

- **目标**：以「城市生活场景周刊风」交付本地生活分站三页 + 主题 CSS。
- **输入**：通用契约 + design.md 1.3.1.4（三页 title/H1/大纲/关键词表）、1.3.2.2（bendi 视觉：暖橙 `#EA580C`/暖黄 `#F59E0B`/米白 `#FFFBF5`，周刊感排印，头牌区块+双栏杂志列表）、data.js bendi 记录（link `https://kzurl18.cn/tHj1ww`、deadline **null**）。
- **步骤**：
  - [ ] 写 `assets/css/theme-bendi.css`（~60-80 行）：按 1.3.2.2 示例覆盖 12 个主题 token + `[data-site="bendi"]` 布局差异类（头牌 hero 双栏、杂志双栏列表、周刊标题下划线、栏目编号样式）
  - [ ] 写 `bendi/index.html`：栏目 `本周场景精选`/`场景省钱指南`/`优惠入口说明`；大纲①站点定位与栏目导读（≥500 字+3 区块）②工作日/周末/假期三大场景省钱思路总览 ③攻略列表（2 篇，锚文本=攻略标题）④优惠入口 CTA；**零期限元素**（deadline=null，不渲染徽章/组件，不引 deadline.js）
  - [ ] 写 `bendi/waimai-scene-guide.html`（外卖点餐场景省钱指南）：一日场景拆解（通勤早餐/工作日午餐/深夜加餐，h2×3）→ 每场景省钱组合表（红包+满减+拼单，表格）→ 团购套餐 vs 单点对比（列表）→ 常见误区 → CTA
  - [ ] 写 `bendi/zhoubianyou-tuangou.html`（周边游团购订房攻略）：周末短途游花费结构（h2）→ 团购套餐选择对比表 → 酒旅优惠时机列表 → 两日行程组合示例（ol）→ CTA
- **产出物**：`assets/css/theme-bendi.css`、`bendi/index.html`、`bendi/waimai-scene-guide.html`、`bendi/zhoubianyou-tuangou.html`
- **DoD**：
  - [ ] 3 页存在且与 1.3.3 文件树路径一致；每页 ≤ 60KB、恰 1 个 h1
  - [ ] 全站 title/description 与其他页不重复；title ≤ 30 字、description 60~120 字（按 bendi「场景罗列式」句式骨架）
  - [ ] 全部 CTA href 与 data.js bendi.link 逐字符一致；预期管理句含 name「本地生活集合页」
  - [ ] 页面零 `.promo-deadline`/`.badge-limited`/`data-deadline`/deadline.js 引用
  - [ ] 主题主色 `#EA580C` 生效，与首页并排 10 秒内可区分
  - [ ] check-data 对 bendi 三页比对零差异
- **REQ 映射**：REQ-CTA-001/002/003/004/005/006、REQ-DL-004、REQ-CONTENT-002/003/005/007、REQ-DIFF-001/002/003/005、REQ-SEO-001~006/010/011、REQ-LINK-001~006、REQ-RWD-003、REQ-COMP-001/002/003
- **自验命令**：
  ```powershell
  node -e "const fs=require('fs');const p=['bendi/index.html','bendi/waimai-scene-guide.html','bendi/zhoubianyou-tuangou.html','assets/css/theme-bendi.css'];const ok=p.every(f=>fs.existsSync(f));const noDl=p.slice(0,3).every(f=>!fs.readFileSync(f,'utf8').includes('data-deadline'));console.log(ok&&noDl?'PASS':'FAIL')"
  ```

### T3 /meituan/ 美团优惠专区（D3）

- **目标**：以「单品深度教程风」交付美团分站三页 + 主题 CSS。
- **输入**：通用契约 + design.md 1.3.1.5（三页规划表）、1.3.2.2（meituan 视觉：黄绿 `#65A30D`/深绿 `#4D7C0F`/浅绿白 `#FAFDF7`，编号步骤、等宽小标签、步骤卡片竖排+桌面右侧粘性目录栏）、data.js meituan 记录（link `https://kurl07.cn/te2qe9`、deadline `'2026-12-31'`、name「美团本地生活集合页」）。
- **步骤**：
  - [ ] 写 `assets/css/theme-meituan.css`：黄绿主题 token + 步骤卡片竖排布局类 + `≥1024px` 右侧粘性目录栏
  - [ ] 写 `meituan/index.html`：栏目 `红包领取教程`/`神券日历玩法`/`优惠入口说明`；大纲①站点定位 + deadline 提示（`.promo-deadline` 组件 + `.badge-limited`「限时」徽章 + `data-deadline="2026-12-31"`）②三类优惠工具速览卡（红包/神券/会员）③攻略列表 ④CTA + 预期管理句；head 引 deadline.js（async defer）
  - [ ] 写 `meituan/hongbao-guide.html`（红包领取教程）：红包类型说明（店铺券/平台券/膨胀红包，h2×3）→ 每日领取入口与操作步骤（ol）→ 红包叠加规则表 → 领取失败常见原因（ul）→ **FAQ ≥ 3 问（与 FAQPage JSON-LD 逐字一致，本页 JSON-LD 附 FAQPage）** → 有效期提示组件 → CTA
  - [ ] 写 `meituan/shenquan-guide.html`（神券节攻略）：神券节节奏说明（h2）→ 大额神券获取途径对比表 → 神券与红包叠加规则（ul）→ 完整下单实测示例（按步骤）→ 有效期提示组件 → CTA
- **产出物**：`assets/css/theme-meituan.css`、`meituan/index.html`、`meituan/hongbao-guide.html`、`meituan/shenquan-guide.html`
- **DoD**：
  - [ ] 3 页全部含 `.promo-deadline` 组件且 `data-deadline="2026-12-31"`、引用 deadline.js
  - [ ] hongbao-guide 的 FAQ 可见文案与 FAQPage JSON-LD 逐字一致（验收抽检点）
  - [ ] 全部 CTA href = `https://kurl07.cn/te2qe9` 逐字符；预期管理句含 name「美团本地生活集合页」
  - [ ] title 按「教程式」句式、description 按「步骤承诺式」骨架，全站唯一
  - [ ] check-data 对 meituan 三页零差异
- **REQ 映射**：REQ-CTA-001~006、REQ-DL-001（三态 ACTIVE 态直出）、REQ-CONTENT-002/003/005/007、REQ-SEO-001~006/010/011（含 FAQPage）、REQ-DIFF-001/002/003/005、REQ-LINK-001~006、REQ-RWD-003、REQ-COMP-001~004
- **自验命令**：
  ```powershell
  node -e "const fs=require('fs');const p=['meituan/index.html','meituan/hongbao-guide.html','meituan/shenquan-guide.html'];console.log(p.every(f=>fs.readFileSync(f,'utf8').includes('data-deadline=\"2026-12-31\"')&&fs.readFileSync(f,'utf8').includes('kurl07.cn/te2qe9'))?'PASS':'FAIL')"
  ```

### T4 /jingdong-waimai/ 京东外卖红包站（D4）

- **目标**：以「红包教程 + 横向对比风」交付京东外卖分站三页 + 主题 CSS。
- **输入**：通用契约 + design.md 1.3.1.6（三页规划表）、1.3.2.2（jd 视觉：红 `#DC2626`/深红 `#B91C1C`/浅灰白 `#FEF9F9`，结论加粗前置、对比表格为主体、红包入口高亮框红描边）、data.js jingdong-waimai 记录（link `https://1.yoourl.net/link/10009836aafbeff4e2171002ArLVtpn4`、deadline `'2026-12-31'`、name「京东外卖集合页」）。
- **步骤**：
  - [ ] 写 `assets/css/theme-jingdong-waimai.css`：红色主题 token + 对比表格密集排版 + 红包入口高亮框（红描边）布局类
  - [ ] 写 `jingdong-waimai/index.html`：栏目 `红包领取入口`/`首单立减攻略`/`跨平台对比`（对比栏目全站独有）；大纲①站点定位 + deadline 提示组件 ②红包能省多少典型订单测算（表）③攻略列表 ④CTA + 预期管理句；引 deadline.js
  - [ ] 写 `jingdong-waimai/hongbao-step.html`（三步领取教程）：红包入口说明（h2）→ 三步领取操作（ol，每步一段说明）→ 首单用户与老用户差异（对比表）→ 有效期提示组件 → **FAQ ≥ 3 问（附 FAQPage）** → CTA
  - [ ] 写 `jingdong-waimai/duibi-meituan.html`（京东 vs 美团对比）：对比维度总表（红包力度/配送费/满减门槛/品类覆盖，table）→ 什么情况更适合京东（ul）→ 什么情况更适合美团（ul）→ 双平台组合省钱法（h3）→ CTA
- **产出物**：`assets/css/theme-jingdong-waimai.css`、`jingdong-waimai/index.html`、`jingdong-waimai/hongbao-step.html`、`jingdong-waimai/duibi-meituan.html`
- **DoD**：
  - [ ] 3 页含期限组件 + deadline.js；CTA href 与 data.js jd.link 逐字符一致（注意长 URL 完整性）
  - [ ] duibi-meituan 以描述性方式提及美团（无官方暗示，REQ-COMP-003/004）
  - [ ] title 按「对比式」句式、description 按「对比结论式」骨架，全站唯一
  - [ ] check-data 对本站三页零差异
- **REQ 映射**：REQ-CTA-001~006、REQ-DL-001、REQ-CONTENT-002/003/005/007、REQ-SEO-001~006/010/011、REQ-DIFF-001~005、REQ-LINK-001~006、REQ-RWD-003、REQ-COMP-001~004
- **自验命令**：
  ```powershell
  node -e "const fs=require('fs');const p=['jingdong-waimai/index.html','jingdong-waimai/hongbao-step.html','jingdong-waimai/duibi-meituan.html'];console.log(p.every(f=>fs.readFileSync(f,'utf8').includes('yoourl.net/link/10009836aafbeff4e2171002ArLVtpn4'))?'PASS':'FAIL')"
  ```

### T5 /daojia/ 到家服务特惠（D5）

- **目标**：以「服务类目价格对比风」交付到家服务分站三页 + 主题 CSS。
- **输入**：通用契约 + design.md 1.3.1.7（三页规划表）、1.3.2.2（daojia 视觉：天蓝 `#0284C7`/深蓝 `#0369A1`/淡蓝白 `#F5FAFE`，圆角大卡片、徽章化服务标签、类目卡片三联+价格表主体）、data.js daojia 记录（link `http://h.fxzb.vip/2vnMAd0ISWs`、deadline **null**、name「本地生活集合页」）。
- **步骤**：
  - [ ] 写 `assets/css/theme-daojia.css`：天蓝主题 token + 类目卡片三联 + 价格表布局类
  - [ ] 写 `daojia/index.html`：栏目 `洗车特惠对比`/`家政保洁怎么选`/`上门服务避坑`；大纲①站点定位（≥500 字+3 区块）②服务类目速览卡（洗车/家政/上门维修）③攻略列表 ④CTA + 预期管理句；**零期限元素**
  - [ ] 写 `daojia/xiche-jiage.html`（洗车价格对比）：三种洗车方式价格对比表（到店/上门/团购券，h2+table）→ 各方式适用场景（ul）→ 团购洗车券注意事项（有效期、门店限制，ul）→ 长期养车省钱组合（h3）→ CTA
  - [ ] 写 `daojia/jiazheng-bikeng.html`（京东家政避坑指南）：服务类目说明（日常/深度/专项保洁，h2×3）→ 计价方式对比（按小时 vs 按面积，表）→ 预约时机与优惠节奏（ul）→ 避坑清单（加项/耗材/时长争议，table）→ CTA
- **产出物**：`assets/css/theme-daojia.css`、`daojia/index.html`、`daojia/xiche-jiage.html`、`daojia/jiazheng-bikeng.html`
- **DoD**：
  - [ ] 3 页零期限元素（deadline=null）；CTA href = `http://h.fxzb.vip/2vnMAd0ISWs`（注意是 **http**）
  - [ ] 两篇攻略均含价格对比表；描述以「类目价格式」骨架撰写，全站唯一
  - [ ] check-data 对本站三页零差异
- **REQ 映射**：REQ-CTA-001~006、REQ-DL-004、REQ-CONTENT-002/003/005/007、REQ-SEO-001~006/010/011、REQ-DIFF-001~005、REQ-LINK-001~006、REQ-RWD-003、REQ-COMP-001~004
- **自验命令**：
  ```powershell
  node -e "const fs=require('fs');const p=['daojia/index.html','daojia/xiche-jiage.html','daojia/jiazheng-bikeng.html'];const ok=p.every(f=>fs.readFileSync(f,'utf8').includes('h.fxzb.vip/2vnMAd0ISWs'));const noDl=p.every(f=>!fs.readFileSync(f,'utf8').includes('data-deadline'));console.log(ok&&noDl?'PASS':'FAIL')"
  ```

### T6 /gouwu/ 网购外卖省钱站（D6）

- **目标**：以「大促日历 / 清单导购风」交付网购省钱分站三页 + 主题 CSS（收官站，完成后全站 18 页齐）。
- **输入**：通用契约 + design.md 1.3.1.8（三页规划表）、1.3.2.2（gouwu 视觉：紫 `#7C3AED`/品红 `#DB2777` 渐变/淡紫白 `#FAF8FF`，时间轴节点、清单勾选符号、垂直时间轴+双列清单卡）、data.js gouwu 记录（link `https://taoduoyu118.kzurl01.cn/?tm8b2RlD`、deadline **null**、name「本地生活+网购集合页」）。
- **步骤**：
  - [ ] 写 `assets/css/theme-gouwu.css`：紫→品红渐变主题 token + 垂直时间轴 + 双列清单卡布局类
  - [ ] 写 `gouwu/index.html`：栏目 `全年大促日历`/`平台优惠清单`/`双线省钱法`；大纲①站点定位（≥500 字+3 区块）②迷你大促日历（本季度节点，时间轴样式）③攻略列表 ④CTA + 预期管理句；**零期限元素**
  - [ ] 写 `gouwu/dacu-rili.html`（全年大促日历）：全年大促时间轴（月度 table：节点/力度/适合囤什么，h2）→ 各节点囤货品类清单（ul）→ 优惠券领取与预售规则（h3）→ 大促价格真伪辨别（ul）→ **FAQ ≥ 3 问（附 FAQPage）** → CTA
  - [ ] 写 `gouwu/waimai-gouwu-qingdan.html`（双线省钱清单）：外卖侧省钱清单（红包/满减/拼单，h2+ul）→ 网购侧省钱清单（平台券/凑单/退换货技巧，h2+ul）→ 双线组合场景：宅家一周花销规划（table）→ 速查清单（dl）→ CTA
- **产出物**：`assets/css/theme-gouwu.css`、`gouwu/index.html`、`gouwu/dacu-rili.html`、`gouwu/waimai-gouwu-qingdan.html`
- **DoD**：
  - [ ] 3 页零期限元素；CTA href = `https://taoduoyu118.kzurl01.cn/?tm8b2RlD` 逐字符（含查询串）
  - [ ] dacu-rili 的 FAQ 可见文案与 FAQPage JSON-LD 一致；时间轴样式与本站主题匹配
  - [ ] description 按「时间线式」骨架，全站唯一；check-data 对本站三页零差异
  - [ ] 本卡完成后 18 个 HTML 全部存在，`node scripts/check-data.mjs` 转 **PASS**（D1~D6 汇合点）
- **REQ 映射**：REQ-CTA-001~006、REQ-DL-004、REQ-CONTENT-001/002/003/005/007、REQ-SEO-001~006/010/011、REQ-DIFF-001~005、REQ-LINK-001~006、REQ-RWD-003、REQ-COMP-001~004
- **自验命令**：
  ```powershell
  node -e "const fs=require('fs');const p=['gouwu/index.html','gouwu/dacu-rili.html','gouwu/waimai-gouwu-qingdan.html'];const ok=p.every(f=>fs.readFileSync(f,'utf8').includes('taoduoyu118.kzurl01.cn/?tm8b2RlD'));const noDl=p.every(f=>!fs.readFileSync(f,'utf8').includes('data-deadline'));console.log(ok&&noDl?'PASS':'FAIL')"
  ```

---

## 4. Phase E 任务卡（自动化校验，依赖 D1~D6 全部完成）

### T7 站点完整性测试套件（node:test）

- **目标**：以 Node 内置 test runner 构建全站完整性测试套件，把 spec 11 章验收清单中可自动化的部分固化为 `node --test` 一键回归。
- **输入**：T1.10 的 `scripts/check-data.mjs`（可导出模块，优先 import 复用其校验函数，避免两套逻辑漂移）；design.md 4.2.5、2.2 表 4（服务契约）、1.3.1.2（18 页清单）；spec 11 章 A~J 验收标准。
- **步骤**：
  - [ ] 建 `scripts/tests/` 目录，编写 7 个测试文件（node:test + node:assert，零外部依赖）：
    - [ ] `pages-exist.test.mjs`：18 个 HTML 按 1.3.1.2 表逐项存在，路径全小写
    - [ ] `friend-links.test.mjs`：6 站互链完整性——18 页每页页脚含「其余 5 站」绝对 URL（锚文本=站名）+ 3 外链（券宝/优惠聚合/号卡办理中心）；互链无 nofollow/sponsored
    - [ ] `sitemap-llms.test.mjs`：sitemap 17 URL 集合 = 17 内容页集合（404 不在）；llms.txt 链接集 ⊇ sitemap；`/bendi` 等无尾斜杠目录形式不得出现
    - [ ] `favicon.test.mjs`：每页 head 含 1.3.5.3 图标引用链 7 项 + theme-color；9 个图标/manifest 文件存在且魔数合法
    - [ ] `promo-links.test.mjs`：data.js 5 条 link 全部挂接（每条 ≥ 1 个 `.promo-cta`）；href 逐字符一致；`rel` 含 `sponsored nofollow noopener` 且 `target="_blank"`；预期管理句含对应 name；deadline=null 的 3 站零期限元素、deadline 有值的页面组件正确
    - [ ] `seo-meta.test.mjs`：title ≤ 30 字全站唯一；description 60~120 字全站唯一；canonical 符合 1.3.6.2 规则（目录页尾斜杠/文件页 .html/404 无 canonical 有 noindex）；每页恰 1 个 h1、恰 1 段可 JSON.parse 的 JSON-LD 且 @graph 实体符合 1.3.6.4 页型选型；面包屑与 BreadcrumbList 逐字一致；FAQ 落点 4 页 FAQPage 与可见文案一致
    - [ ] `no-deadlink.test.mjs`：抓取 18 页全部站内链接（相对路径映射为仓库文件；`https://youhui8.github.io/...` 绝对 URL 剥离域名后映射为仓库文件），逐一断言目标文件存在；同时校验 head 中 CSS/JS/图片引用全部存在
  - [ ] 编写 `scripts/tests/` 内公共辅助（如 HTML 抓取/解析工具函数），与 check-data.mjs 共享或复用其实现
  - [ ] 运行 `node --test scripts/tests/` 全绿；故意破坏一处样例（如删一个互链）验证能捕获
  - [ ] git 提交测试套件
- **产出物**：`scripts/tests/pages-exist.test.mjs`、`friend-links.test.mjs`、`sitemap-llms.test.mjs`、`favicon.test.mjs`、`promo-links.test.mjs`、`seo-meta.test.mjs`、`no-deadlink.test.mjs`（+ 公共辅助模块）
- **DoD**：
  - [ ] `node --test scripts/tests/` 输出 0 fail；`node scripts/check-data.mjs` 输出 PASS
  - [ ] 第 5 节「Phase E 校验项清单」7 大项全部有对应断言覆盖
  - [ ] 无 npm 依赖（仅 node:test / node:assert / node:fs 等）
- **REQ 映射**：REQ-NFR-005/008/009、REQ-LINK-001~006、REQ-SEO-001~007/011、REQ-CTA-003/004/005、REQ-FAV-001~004、REQ-DL-001~004、REQ-CONTENT-001（映射 spec 11 章 A~J 可自动化项）
- **自验命令**：
  ```powershell
  node --test scripts/tests/
  ```

---

## 5. Phase E 校验项清单（测试套件断言口径）

| # | 校验项 | 断言口径（依据） |
| --- | --- | --- |
| 1 | 页面存在性 | 1.3.1.2 表 18 个 HTML 文件全部存在，路径与文件树逐项一致，全小写 |
| 2 | 6 站友链互链完整性 | 18 页（含 404）页脚各含其余 5 站绝对 URL + 3 外链；锚文本=站名；互链无 nofollow/sponsored；K6 完全图任意 1 跳可达（REQ-LINK-005） |
| 3 | sitemap 与实际页面一致 | sitemap=17 内容页集合；llms ⊇ sitemap；目录 URL 带尾斜杠；404 不收录 |
| 4 | favicon 引用与文件存在 | 每页 head 图标链 7 项 + manifest 引用 + theme-color；9 文件存在、魔数合法（ICO `0001`、PNG `8950`）、尺寸正确 |
| 5 | 5 条推广链接全部挂接 | 每条 data.js link 在对应分站页面 CTA 逐字符出现；rel=`sponsored nofollow noopener` + `target="_blank"`；预期管理句含 name；deadline 三态落点正确（null→零期限元素） |
| 6 | 每页 meta/title/canonical/JSON-LD 完整 | title ≤30 字唯一、description 60~120 字唯一、canonical 按页型规则、单段 JSON-LD 可解析且 @graph 实体符合页型选型、恰 1 个 h1、面包屑与 BreadcrumbList 一致 |
| 7 | 无死链（站内相对链接 200） | 18 页全部站内 href 与 head 资源引用映射到仓库文件均存在；外链仅限 data.js 5 条 + 友链 3 条白名单 |

---

## 6. Phase F / G 任务卡

### T8 代码质量审查（phase-review）

- **目标**：对全部交付代码做静态质量审查，输出分级修复清单，修复 P0 后放行 Phase G。
- **输入**：D1~D6 全部源文件、design.md 全文（契约基准）、T7 测试结果。
- **步骤**：
  - [ ] HTML 审查：语义化标签使用（header/nav/main/article/section/footer）、标题层级不跳级（h1→h2→h3）、无内联 style/script、`lang="zh-CN"`、skip-link 存在
  - [ ] CSS 审查：token 覆盖正确性（六站主题 token 与 1.3.2.2 色值表逐一比对）、无冗余选择器、无 `!important` 滥用、断点行为符合 1.3.7.3、触控目标 ≥ 44px
  - [ ] JS 审查：deadline.js ≤1KB、async、异常静默、无全局污染
  - [ ] 性能预算实测：每页 HTML ≤ 60KB、CSS 合计 ≤ 40KB、JS ≤ 1KB、零外部请求（无 CDN/无 Web 字体）、正文零位图
  - [ ] 无障碍抽查：正文对比度 ≥ 4.5:1、`--c-on-primary` 前景可读、表格有语义结构
  - [ ] 内容抽查：字数基线（首页 ≥400 / 分站 index ≥500 / 攻略 ≥600）、正文非占位、品牌词无「官方/授权」暗示、无第三方 Logo
  - [ ] 汇总为 `scripts/review-report.md`：问题按 P0（阻塞验收）/ P1（应修）/ P2（可延后）分级；修复 P0 后复跑 `node --test scripts/tests/` 确认全绿
- **产出物**：`scripts/review-report.md`（+ P0 修复的代码变更）
- **DoD**：
  - [ ] review-report.md 覆盖上述 7 个审查维度，每个问题给出文件:行号定位
  - [ ] P0 清零（P1/P2 允许带病放行但在报告中登记）
- **REQ 映射**：REQ-NFR-001~004、REQ-RWD-002/004、REQ-DIFF-006、REQ-COMP-003、REQ-AI-003/004
- **自验命令**：
  ```powershell
  node --test scripts/tests/; Get-ChildItem -Recurse -Include *.html | ForEach-Object { "{0} {1}" -f $_.Length, $_.FullName }
  ```

### T9 功能验证与 VERDICT（phase-verify）

- **目标**：按 spec 11 章 A~J 逐条核验，输出最终 VERDICT。
- **输入**：spec.md 11 章验收标准、design.md 2.2 表 4 服务契约、T7 测试套件、T8 审查报告。
- **步骤**：
  - [ ] `npx http-server . -p 8080` 起本地服务，模拟 GitHub Pages 行为走查：`/`、`/about/`、`/bendi/`（及无尾斜杠 301 行为说明）、`/gouwu/dacu-rili.html`、任意无效路径渲染 404.html、`/data.js` 可请求
  - [ ] 浏览器手工走查（桌面 + 375px 移动模拟）：6 站首页并排 10 秒区分自查（REQ-DIFF-006）、卡片网格 1/2/3 列断点、CTA 新窗口跳转、deadline 组件展示、页脚互链点击
  - [ ] `node scripts/check-data.mjs` PASS + `node --test scripts/tests/` 全绿，输出留档
  - [ ] （可选，有条件时）Lighthouse 移动模拟：Performance ≥ 90 / A11y ≥ 90 / Best Practices ≥ 90 / SEO ≥ 95
  - [ ] 按 spec 11 章 A~J 逐条勾验，生成 `scripts/verify-report.md`：每条验收项 → 通过证据（测试输出/截图/走查记录）
  - [ ] 输出 **VERDICT**：`PASS` / `FAIL`（FAIL 须附阻塞项清单与责任任务卡号）
- **产出物**：`scripts/verify-report.md`（含 VERDICT）
- **DoD**：
  - [ ] spec 11 章 A~J 每条验收项均有「通过证据」或「登记偏差」二选一记录
  - [ ] VERDICT 为 PASS，或 FAIL 附明确阻塞清单
- **REQ 映射**：全部 78 条（终验），关键映射见 design.md 附录 A
- **自验命令**：
  ```powershell
  node scripts/check-data.mjs; node --test scripts/tests/
  ```

---

## 7. D2~D6 并行策略说明

**结论：T2~T6 五张分站卡可安全全并行**，依据三个前提：

1. **各写各目录，零文件交集**：
   - T2 仅写 `bendi/`（3 个 html）+ `assets/css/theme-bendi.css`
   - T3 仅写 `meituan/` + `assets/css/theme-meituan.css`；T4/T5/T6 同理
   - 五卡之间无任何共享写目标；`assets/css/` 下各写各的 `theme-{slug}.css`，不触碰 `tokens.css`/`base.css`
2. **D1 公共依赖已完成并冻结**（T1.12 基线）：tokens/base/theme-home、favicon 全套、og 六图、robots/sitemap/llms、404、data.js、check-data.mjs 全部就绪。分站卡对 D1 产物**只读**——如发现 D1 基线缺陷，登记给 D1 负责人统一修复后重建基线，禁止分站任务各自改公共文件（避免并行写冲突）。
3. **友链网络由 design.md 固化，无需协调**：每站页脚互链直接按 1.3.8.1 模板写「其余 5 站」绝对 URL（当前站省略自身），链接关系是 K6 完全图的既定投影，不存在"等对方先定 URL"的依赖；CTA href 与站名从 data.js 逐字复制，同样零协调。

**汇合与集成**：五卡全部完成后，任一执行者跑一次 `node scripts/check-data.mjs`（应转 PASS）+ `node --test scripts/tests/`（T7 就绪后），确认 D1~D6 集成无交叉缺陷（互链完整性、title/description 全站唯一性是仅有的跨站校验点，均由脚本覆盖）。

**例外约束**：全站唯一性约束（title/description 17+1 页互不重复）要求五站执行者**各自按 design.md 1.3.1 各表给定的 title 草案撰写**，不得自由发挥超出草案主题词范围；这是并行不冲突的隐性前提。

---

## 8. 风险与回滚注意事项

**执行期风险**（摘自 design.md 第 5 章 R1~R12，标注任务卡归属）：

| 风险 | 归属任务卡 | 执行动作 |
| --- | --- | --- |
| R1 纯 JS PNG/ICO 编码器复杂度超预期（sharp 不可用） | T1.3/T1.4 | 第一天先验证编码器可行性再批量生成；降级链 sharp → 纯 JS 编码器 → 简化双圆点图形 |
| R2 Windows 渲染 SVG 中文字体缺失 | T1.4 | SVG 显式 `font-family="Microsoft YaHei, PingFang SC"`；兜底改点阵拉丁字母（slug 大写） |
| R3 手工物化 data.js 漂移 | T1.6~T1.11、T2~T6 | 每张卡完成即跑 `node scripts/check-data.mjs` 增量比对；README 七处落点清单（T1.11）固化维护流程 |
| R6 Windows 路径大小写不敏感 → 部署死链 | 全部写文件任务卡 | 路径仅小写+数字+连字符；check-data.mjs 扫描大小写违规；互链用绝对 URL |
| R4/R9 无 JS 过期文案 / 外链失效 | T1.9、T9 | 静态文案已含「以页面标注为准」兜底；外链失效非本站责任（spec 1.6.7），验收不因外链 404 挂起 |
| R10 deadline.js 替换文案 CLS | T1.2/T1.9 | `.promo-deadline` 固定 `min-height:1.75em` + 徽章不占文档流 |
| R12 六站「换皮感」差异化争议 | T2~T6、T9 | 差异落三可测维度（主色/布局骨架/排印基调）；T9 并排 10 秒自查 |

**git 回滚策略**：

- **阶段化提交**：T1.12 打 tag（如 `d1-baseline`）；T2~T6 各自独立 commit（`feat(bendi): ...` 等），单站问题单站回滚（`git revert` 或按目录 checkout），不影响他站
- **公共文件回滚需评估**：`tokens.css`/`base.css`/`data.js`/`sitemap.xml`/`llms.txt` 的回滚影响全部下游任务卡，回滚前须跑 `node --test scripts/tests/` 确认无连锁破坏；data.js 变更后必须按 README 七处落点清单同步（T1.11 流程）
- **资产再生成**：favicon/og 由脚本生成（T1.3/T1.4），可随时重跑脚本再生成，不依赖手工修复；生成脚本若保留在 `scripts/`（如 `scripts/gen-icons.mjs`）须确保 check-data.mjs 的结构校验只检查「必需清单存在」、不禁止额外文件，避免误报
- **上线后 deadline 过期**（2026-12-31 之后）：deadline.js 自动降级为中性文案，CTA 保持可点击，无需人工干预；若要更换活动，按 T1.11 维护流程改 data.js → 同步七处落点 → 复跑校验

---

## 9. 验证组（全链路最后一道关）

- [ ] `node scripts/check-data.mjs` 输出 PASS（exit 0）
- [ ] `node --test scripts/tests/` 全绿（0 fail）
- [ ] 18 个 HTML + 全部资产与 design.md 1.3.3 文件树逐项一致
- [ ] spec 11 章 A~J 验收清单逐条核验完毕（T9 verify-report.md 留档）
- [ ] VERDICT = PASS，或 FAIL 附阻塞清单

---

## 10. 契约偏差与不一致记录（执行前必读）

以下为 tasks.md 编制过程中发现的 spec / design / 全局任务清单之间的出入及处理决策，**执行时一律以 design.md 为准**：

| # | 不一致点 | 处理决策 |
| --- | --- | --- |
| 1 | design.md 1.3.3 文件树含 `README.md`（更新站点结构 + 维护流程，REQ-NFR-009/011），但全局 Phase D1 任务清单未明确列出 README | 归入 D1，编为 T1.11（紧邻 check-data.mjs 之后，内容依赖其校验命令） |
| 2 | design.md 1.3.3 / 4.2.5 注明 `scripts/check-data.mjs`「Phase D1 一并交付」，但全局清单 D1 未提、Phase E 定位为「Node 内置 test runner 校验」 | D1 交付核心校验脚本（T1.10，按可导出模块组织）；Phase E（T7）以 node:test 包装复用其校验函数，两阶段职责分离：D1 = 单入口快速校验，E = 一键回归测试套件 |
| 3 | `scripts/tests/`（T7）、`scripts/review-report.md`（T8）、`scripts/verify-report.md`（T9）未列入 design.md 1.3.3 文件树（该树冻结于 Phase B） | 属 Phase E/F/G 新增的**开发期资产**，不进入部署产物、不影响站点运行；已在本表登记，建议 Phase G 验收时确认保留 |
| 4 | T1.5 在 D1 阶段就写全 sitemap（17 URL）与 llms.txt（含分站页），而分站 HTML 在 D2~D6 才创建 | URL 契约已在 design.md 1.3.1.2 冻结，提前全量写入是设计意图（避免分站任务各自维护 sitemap 造成并发冲突）；D1 末 check-data 报「缺 15 页」属预期，T6 完成后自动转 PASS |
| 5 | og 图依赖六站主题色，而分站 CSS 由 T2~T6 编写 | 色值已由 design.md 1.3.2.2 冻结（本表无需等 CSS），T1.4 直接从设计表取色生成，无真实依赖 |
| 6 | favicon/og 生成脚本（脚本 A/B）未列入 1.3.3 文件树 | 按 design.md 1.3.5.2 定位为「Phase D1 编码工程师用 Node 脚本」，属工具非产物；建议存 `scripts/gen-icons.mjs`/`scripts/gen-og.mjs` 供复用，check-data.mjs 结构校验不得因额外脚本文件误报（见第 8 节回滚策略） |
| 7 | 仓库现有 `data.js` 尾部残留 `],},],`（语法错误），与 spec REQ-NFR-010「可直接执行」冲突 | 属待修复现状而非文档矛盾，T1.1 首个任务即按 design.md 4.2.1 终稿重写解决 |
| 8 | spec 11 章验收清单与 design.md 4.2.5 校验规则口径 | 覆盖一致无冲突；T7 落地可自动化部分（本清单第 5 节 7 项），T9 人工核验剩余部分（视觉差异、跳转行为、Lighthouse） |

---

## 版本记录

- v1.0（2026-10-20）：首版，基于 spec.md v1.0（78 条 EARS）与 design.md v1.0 编制；20 张任务卡（D1×12 + 分站×5 + E/F/G×3）。

