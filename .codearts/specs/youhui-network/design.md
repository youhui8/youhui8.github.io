# 优惠集合站点矩阵（youhui-network）技术设计

| 项目 | 内容 |
| --- | --- |
| 特性名称 | youhui-network |
| 文档类型 | [design.md](http://design.md)（技术设计，定义"怎么做"） |
| 版本 / 日期 | v1.0 / 2026-10-20 |
| 状态 | 待评审 |
| 上游输入 | `.codearts/specs/youhui-network/spec.md` v1.0（78 条 EARS 需求） |
| 线上根地址 | [https://youhui8.github.io/（GitHub](https://youhui8.github.io/%EF%BC%88GitHub) Pages 用户站点，主分支直接 serving） |
| 数据源基线 | data.js（5 条推广链接，2 条含 deadline `2026.12.31`；当前尾部存在语法残留，须规范化） |
| 下游消费者 | Phase C 页面编码、Phase D1 图标资产生成、Phase E 部署、Phase G 验收 |

> 阅读说明：本文档回答"怎么做"（How），全部设计以上游 [spec.md](http://spec.md) 的 78 条需求为唯一需求来源；每节标题后以括号标注所覆盖的 REQ 编号段，附录 A 给出 78 条需求的逐条覆盖核对表。所有代码块均为**设计契约草案 / 实现参考**，不是最终实现；落地细节由 Phase C / D1 编码阶段完成。

* * *

# **1\. 实现模型**

## **1.1 上下文视图**

系统整体上下文：一个部署于 GitHub Pages 的**纯静态站点矩阵**，对外仅暴露静态文件（HTML / CSS / JS / 图标 / 文本清单），不存在任何后端服务、运行时数据接口或构建产物目录。所有动态性被压缩到两处：**编辑期的数据维护**（站长改 data.js 与页面）与**运行期的一段 ≤1KB 日期判断脚本**（deadline.js）。

```
flowchart LR
    subgraph actors["外部角色"]
        VISITOR["访客<br/>桌面 / iPhone Safari / Android Chrome"]
        SE["搜索引擎爬虫<br/>Googlebot / Bingbot"]
        AIBOT["AI 爬虫<br/>GPTBot / ClaudeBot / PerplexityBot<br/>Google-Extended / Bytespider / CCBot"]
        OWNER["站长（维护者）<br/>编辑 data.js 与静态页面"]
    end

    subgraph sys["youhui8 站点矩阵（GitHub Pages 纯静态）"]
        SITE["6 个静态站点（首页 + 5 分站，≥17 页）<br/>全部内容静态 HTML 直出"]
        ASSETS["静态资产<br/>favicon 矩阵 / og-*.png ×6<br/>robots.txt / sitemap.xml / llms.txt / .nojekyll"]
        DATAJS["data.js<br/>唯一推广数据源（SSOT，编辑期生效）"]
    end

    subgraph ext["外部系统"]
        PROMO["外部推广目标页 ×5<br/>data.js 的 link 字段"]
        FRIENDS["外部友链 ×3<br/>券宝 / 优惠聚合 / 号卡办理中心"]
        HOST["GitHub Pages 托管"]
    end

    VISITOR -->|"HTTP GET（浏览 / 点击 CTA）"| SITE
    SE -->|"抓取 HTML / sitemap.xml / robots.txt"| SITE
    AIBOT -->|"抓取正文 / llms.txt"| SITE
    OWNER -->|"git push（编辑 data.js + 页面 + 资产清单）"| HOST
    HOST -.->|"静态原样分发（.nojekyll）"| SITE
    SITE -->|"CTA 跳转：新标签页<br/>rel=&quot;sponsored nofollow noopener&quot;"| PROMO
    SITE -->|"页脚友链（普通 &lt;a href&gt;）"| FRIENDS
    DATAJS -.->|"编辑期物化为页面静态内容（双轨策略，见 1.3.4）"| SITE


```

上下文视图确立的四条硬约束（后续所有设计决策的前提）：

1.  **无服务端**：GitHub Pages 只做静态分发，任何"运行时聚合 / 转发 / 判断"能力都不可用；SEO 与 AI 可读性必须由初始 HTML 源码独立成立（REQ-NAV-002、REQ-AI-003）。
2.  **无构建管线**：仓库主分支即部署产物，不存在 dist 目录；允许但不要求本地辅助脚本（校验 / 资产生成），脚本缺失不影响站点可用性（spec 12.3）。
3.  **data.js 是编辑期真理源**：它在运行期不被任何页面依赖（异常场景 1），其值通过"物化"进入各 HTML 页面（双轨策略见 1.3.4）。
4.  **外部不可控**：推广短链的存活与内容不在本站责任范围，本站仅按 deadline 做展示降级（REQ-DL-002、spec 1.6.7）。

## **1.2 服务/组件总体架构**

站点矩阵采用"**三层一链**"架构：表现层（6 站静态页面）→ 共享前端层（设计系统 + 主题覆盖 + 唯一增强脚本）→ 数据与资产层（data.js / favicon 矩阵 / SEO 清单文件），外加贯穿全站的**页脚友链网络**。

```
flowchart TB
    subgraph L1["表现层：6 站 · 18 个 HTML 文件（17 页入 sitemap/llms + 404）"]
        direction LR
        HOME["/ 首页站<br/>index.html + about/index.html"]
        BENDI["/bendi/<br/>本地生活优惠集"]
        MT["/meituan/<br/>美团优惠专区"]
        JD["/jingdong-waimai/<br/>京东外卖红包站"]
        DJ["/daojia/<br/>到家服务特惠"]
        GW["/gouwu/<br/>网购外卖省钱站"]
        NF["/404.html<br/>（noindex，不收录）"]
    end

    subgraph L2["共享前端层（仓库内静态文件，零外部依赖）"]
        TOKENS["assets/css/tokens.css<br/>全站设计 token（色彩/字体/间距/断点）"]
        BASE["assets/css/base.css<br/>通用组件：header/nav/footer/CTA/徽章/卡片"]
        THEMES["assets/css/theme-{slug}.css ×6<br/>每站主题 token 覆盖 + 布局骨架差异"]
        DLJS["assets/js/deadline.js<br/>唯一 JS：有效期降级增强（≤1KB，async）"]
    end

    subgraph L3["数据与资产层"]
        DATAJS["data.js<br/>推广链接唯一数据源（SSOT）"]
        FAV["favicon.ico / favicon.svg / favicon-*.png<br/>apple-touch-icon / android-chrome-*.png / site.webmanifest"]
        OGS["og-home.png + og-{slug}.png ×5<br/>1200×630 分享图"]
        SEOF["robots.txt / sitemap.xml / llms.txt / .nojekyll"]
        CHECK["scripts/check-data.mjs（可选自检脚本，<br/>本地校验页面与 data.js 一致性，不参与部署）"]
    end

    HOME & BENDI & MT & JD & DJ & GW & NF -->|"每页引用"| TOKENS
    HOME & BENDI & MT & JD & DJ & GW & NF -->|"每页引用"| BASE
    BENDI -->|"各自仅引用本站主题"| THEMES
    MT --> THEMES
    JD --> THEMES
    DJ --> THEMES
    GW --> THEMES
    HOME --> THEMES
    BENDI & MT & JD & HOME -->|"带 deadline 的页面引用"| DLJS
    DATAJS -->|"编辑期物化"| L1
    DATAJS -->|"一致性抽检"| CHECK
    L1 -->|"逐字比对"| CHECK
    SEOF -->|"全站收录与爬取入口"| L1


```

### 架构原则（决策依据，对应后续各节）

| # | 原则 | 对应需求 | 落点 |
| --- | --- | --- | --- |
| A1 | **静态优先 / 渐进增强**：HTML 完整可用，JS 仅做 deadline 文案降级，禁 JS 全功能可用 | REQ-NAV-002、REQ-AI-003、spec 4.6 | 1.3.4、1.3.10 |
| A2 | **单一数据源（SSOT）+ 双轨物化**：数据只在 data.js 定义一次，页面静态直出其值 | REQ-NFR-008~010 | 1.3.4、4.2 |
| A3 | **同源设计系统、异质呈现**：共享 token 与组件，6 站以主题覆盖 + 布局骨架差异形成可感知区分 | REQ-DIFF-003/006 | 1.3.2、1.3.7 |
| A4 | **零依赖**：无框架、无 CDN、无 Web 字体、无正文位图 | REQ-NFR-001、REQ-RWD-004 | 1.3.7、1.3.9 |
| A5 | **互链全连通**：页脚组件全站统一，任一页面 1 跳可达其余 5 站 | REQ-LINK-001~006 | 1.3.8 |
| A6 | **推广透明**：CTA rel 三属性 + 页脚披露 + 免责声明，访客与搜索引擎双重透明 | REQ-CTA-003/004/006、REQ-COMP-001~004 | 1.3.8、1.3.11 |

### 架构层面的关键技术决策总览

| 决策点 | 决策 | 备选与否决理由 |
| --- | --- | --- |
| 运行时框架 | 无框架，纯 HTML+CSS+原生 JS | React/Vue/jQuery 违反 REQ-NFR-001 |
| 页面生成方式 | 手工静态 HTML（无 SSG 构建） | Hugo/Astro 等引入"必须构建才有页面"机制，违反 spec 12.3 |
| data.js 消费方式 | 页面**不**`<script src>` 引用 data.js；其值物化进 HTML；deadline.js 读 DOM `data-deadline` 属性 | 运行时加载 data.js 会引入运行时依赖与请求，且对 SEO 无增益 |
| CSS 组织 | tokens.css + base.css 共享，theme-{slug}.css 每站一份（每页 3 个 CSS 文件） | 单一巨型 main.css（缓存好但无法体现"每站独立主题"，且跨站冗余）；6 套完全独立 CSS（违反 REQ-DIFF-006 同源设计系统） |
| deadline 判断 | 客户端 ≤1KB 原生 JS + 无 JS 静态兜底文案 | 服务端判断不存在；纯 CSS 无法取当前日期 |
| favicon 统一性 | 6 站共用一套 favicon（REQ-FAV-005）；每站差异体现在 og 图与 `meta theme-color` | 每站独立 favicon 违反 REQ-FAV-005 |
| 404 处理 | 根目录 404.html（GitHub Pages 用户站点原生支持），根路径引用资源 + noindex | 无 404 页会呈现 GitHub 默认错误页 |

## **1.3 实现设计文档**

以下 12 小节按任务要求逐项展开：信息架构、差异化矩阵、文件树、数据层、图标资产、SEO、技术选型、友链、性能、deadline、合规、404。

### 1.3.1 站点信息架构与内容规划（覆盖 REQ-NAV-001~006、REQ-CONTENT-001~008、REQ-CTA-001/002、spec 3.x）

#### 1.3.1.1 站点矩阵总表

6 站与 data.js 5 条记录保持 1:1 固定映射（spec 10.2.1）。站名为拟定终稿（两两不同，REQ-DIFF-001）：

| # | 规范 URL | 站名（终稿） | data.js 记录（name / link） | CTA 目标 | deadline | 内容定位一句话 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `https://youhui8.github.io/` | 优惠集合导航 | —（汇总 5 条，不直出外链） | —（无） | — | 全站枢纽：5 大分站导航 + 站点矩阵说明 |
| 1 | `/bendi/` | 本地生活优惠集 | 第 1 条 · 本地生活集合页 / `https://kzurl18.cn/tHj1ww` | 同 link | 无 | 城市生活场景省钱：外卖、团购、周边游 |
| 2 | `/meituan/` | 美团优惠专区 | 第 2 条 · 美团本地生活集合页 / `https://kurl07.cn/te2qe9` | 同 link | 2026-12-31 | 美团系红包与神券的步骤教程站 |
| 3 | `/jingdong-waimai/` | 京东外卖红包站 | 第 3 条 · 京东外卖集合页 / `https://1.yoourl.net/link/10009836aafbeff4e2171002ArLVtpn4` | 同 link | 2026-12-31 | 京东外卖红包教程与跨平台对比测评 |
| 4 | `/daojia/` | 到家服务特惠 | 第 4 条 · 本地生活集合页（fxzb 源）/ `http://h.fxzb.vip/2vnMAd0ISWs` | 同 link | 无 | 到家服务价格对比与避坑：洗车、家政 |
| 5 | `/gouwu/` | 网购外卖省钱站 | 第 5 条 · 本地生活+网购集合页 / `https://taoduoyu118.kzurl01.cn/?tm8b2RlD` | 同 link | 无 | 全年大促日历与双线省钱清单 |

同名消歧处理（spec 3.1 说明 2）：data.js 第 1 条与第 4 条 name 同为"本地生活集合页"，首页卡片以**分站站名 + 差异化定位描述**消歧（"本地生活优惠集"偏外卖/团购/周边游场景，"到家服务特惠"偏洗车/家政上门服务）；卡片描述第一句逐字引用 data.js 的 description（满足 REQ-NFR-008 抽检），第二句为站方定位补充语（合计 ≥ 20 中文字符，满足 REQ-NAV-001）。

#### 1.3.1.2 全站 URL / 文件清单（18 个 HTML 文件）

分站目录页 canonical 使用带尾斜杠规范形式；攻略页为 `{slug}.html` 语义化命名（spec 3.2 规则 1/2）。17 个内容页全部纳入 sitemap.xml 与 llms.txt（REQ-CONTENT-001、REQ-SEO-007、REQ-AI-001）；`404.html` 为功能性页面，**不收录**进 sitemap/llms（搜索引擎规范：sitemap 不应包含错误页），加 `noindex`（见 1.3.12）。

| # | URL | 文件路径 | 页型 | JSON-LD（@graph 合并，见 1.3.6） | 收录 |
| --- | --- | --- | --- | --- | --- |
| 1 | `/` | `index.html` | 首页枢纽 | WebSite + ItemList(5 分站) + FAQPage | ✔ |
| 2 | `/about/` | `about/index.html` | 站点说明 | WebPage + BreadcrumbList | ✔ |
| 3 | `/bendi/` | `bendi/index.html` | 分站首页 | CollectionPage + ItemList + BreadcrumbList | ✔ |
| 4 | `/bendi/waimai-scene-guide.html` | 同路径 | 场景攻略 | Article + BreadcrumbList | ✔ |
| 5 | `/bendi/zhoubianyou-tuangou.html` | 同路径 | 场景攻略 | Article + BreadcrumbList | ✔ |
| 6 | `/meituan/` | `meituan/index.html` | 分站首页 | CollectionPage + ItemList + BreadcrumbList | ✔ |
| 7 | `/meituan/hongbao-guide.html` | 同路径 | 步骤教程 | Article + BreadcrumbList + FAQPage | ✔ |
| 8 | `/meituan/shenquan-guide.html` | 同路径 | 步骤教程 | Article + BreadcrumbList | ✔ |
| 9 | `/jingdong-waimai/` | `jingdong-waimai/index.html` | 分站首页 | CollectionPage + ItemList + BreadcrumbList | ✔ |
| 10 | `/jingdong-waimai/hongbao-step.html` | 同路径 | 步骤教程 | Article + BreadcrumbList + FAQPage | ✔ |
| 11 | `/jingdong-waimai/duibi-meituan.html` | 同路径 | 对比测评 | Article + BreadcrumbList | ✔ |
| 12 | `/daojia/` | `daojia/index.html` | 分站首页 | CollectionPage + ItemList + BreadcrumbList | ✔ |
| 13 | `/daojia/xiche-jiage.html` | 同路径 | 价格对比 | Article + BreadcrumbList | ✔ |
| 14 | `/daojia/jiazheng-bikeng.html` | 同路径 | 服务指南 | Article + BreadcrumbList | ✔ |
| 15 | `/gouwu/` | `gouwu/index.html` | 分站首页 | CollectionPage + ItemList + BreadcrumbList | ✔ |
| 16 | `/gouwu/dacu-rili.html` | 同路径 | 清单导购 | Article + BreadcrumbList + FAQPage | ✔ |
| 17 | `/gouwu/waimai-gouwu-qingdan.html` | 同路径 | 清单导购 | Article + BreadcrumbList | ✔ |
| 18 | 任意无效路径 | `404.html` | 错误页 | 无（noindex） | ✘ |

FAQPage 落点 4 处（REQ-SEO-006 要求全站 ≥ 2，超额覆盖）：首页、`/meituan/hongbao-guide.html`、`/jingdong-waimai/hongbao-step.html`、`/gouwu/dacu-rili.html`；FAQ 文案与页面可见内容逐字一致（验收抽检点）。

#### 1.3.1.3 首页站规划（/）

**`/index.html`**（title 草案：`外卖红包与网购优惠集合入口｜优惠集合导航`，20 字，REQ-SEO-001）

-   H1 草案：`一站式外卖、团购与网购优惠导航`
-   内容区块（自上而下）：
    1.  站点简介区：≥ 400 中文字符的站点矩阵说明（这是什么站、怎么用、5 个分站各管什么，REQ-CONTENT-004）
    2.  分站卡片网格：5 张卡片（站名 h2 链接 + data.js description 首句逐字引用 + 定位补充语 + deadline 徽章行），全部为站内链接，锚文本 = 站名（REQ-NAV-001/003/004）
    3.  常见问题区：4~5 条 FAQ（与 FAQPage JSON-LD 一致）
    4.  页脚（友链 + 披露声明，见 1.3.8 / 1.3.11）
-   关键词：优惠集合、外卖红包入口、网购省钱导航（自然分布，禁止堆砌，REQ-CONTENT-006）

**`/about/index.html`**（title 草案：`关于本站：站点矩阵与使用说明｜优惠集合导航`）

-   H1 草案：`关于优惠集合导航`
-   内容大纲：站点定位与收录原则（信息聚合导航身份表述，REQ-CONTENT-008）→ 6 站矩阵结构图（文字版）→ 推广链接与有效期说明机制 → 品牌免责声明全文（REQ-COMP-002 落点之二）→ 维护与更新说明。
-   关键词：优惠集合导航是什么、站点说明。

#### 1.3.1.4 /bendi/ 本地生活优惠集 —— 城市生活场景周刊风

**栏目结构（≥ 2 个独特栏目，REQ-DIFF-002）**：`本周场景精选`（首页轮换的场景选题摘要）、`场景省钱指南`（攻略列表）、`优惠入口说明`（CTA 与使用说明）。

| 页面 | slug / 文件 | title 草案（字数） | H1 草案 | 内容大纲 | 目标关键词 |
| --- | --- | --- | --- | --- | --- |
| 分站首页 | `index.html` | 本地生活优惠导航与场景攻略｜本地生活优惠集（22） | 本地生活优惠集：外卖、团购与周边游的省钱入口 | ① 站点定位与栏目导读（含 ≥ 500 字正文与 3 区块，REQ-CONTENT-002）② 三大生活场景（工作日 / 周末 / 假期）的省钱思路总览 ③ 攻略列表（2 篇，锚文本 = 攻略标题）④ 优惠入口说明 + CTA（`https://kzurl18.cn/tHj1ww`） | 本地生活优惠、美团团购、周边游省钱 |
| 攻略 1 | `waimai-scene-guide.html` | 外卖点餐场景省钱指南：午餐到聚餐｜本地生活优惠集（24） | 外卖点餐场景指南：通勤午餐到周末聚餐怎么点更划算 | ① 一日场景拆解：通勤早餐 / 工作日午餐 / 深夜加餐（h2×3）② 每场景的省钱组合表（红包 + 满减 + 拼单，表格）③ 团购套餐 vs 单点对比（列表）④ 常见误区（满减凑单反而不省钱等）⑤ 优惠入口 CTA | 外卖点餐省钱、午餐满减、外卖红包 |
| 攻略 2 | `zhoubianyou-tuangou.html` | 周边游团购订房省钱攻略｜本地生活优惠集（20） | 周末周边游怎么订更划算：团购、酒旅优惠实操 | ① 周末短途游典型花费结构（h2）② 团购套餐选择：景点 + 餐饮组合（对比表）③ 酒旅优惠时机：提前订 vs 当日订（列表）④ 两日行程组合示例（ol）⑤ 优惠入口 CTA | 周边游攻略、团购套餐、酒旅特惠 |

#### 1.3.1.5 /meituan/ 美团优惠专区 —— 单品深度教程风

**栏目结构**：`红包领取教程`、`神券日历玩法`、`优惠入口说明`（与 bendi 的"场景"角度、gouwu 的"清单"角度互斥，REQ-DIFF-004）。

| 页面 | slug / 文件 | title 草案（字数） | H1 草案 | 内容大纲 | 目标关键词 |
| --- | --- | --- | --- | --- | --- |
| 分站首页 | `index.html` | 美团红包神券与会员玩法攻略｜美团优惠专区（21） | 美团优惠专区：红包、神券与会员的省钱玩法 | ① 站点定位 + deadline 提示（`有效期至 2026-12-31`，REQ-DL-001）② 三类优惠工具速览（红包 / 神券 / 会员，卡片）③ 攻略列表 ④ CTA + 预期管理文案（`https://kurl07.cn/te2qe9`） | 美团优惠、美团红包、美团神券 |
| 攻略 1 | `hongbao-guide.html` | 美团外卖红包领取教程｜美团优惠专区（18） | 美团外卖红包领取教程：每天可领的入口与使用步骤 | ① 红包类型说明：店铺券 / 平台券 / 膨胀红包（h2×3）② 每日领取入口与操作步骤（ol 步骤列表）③ 红包叠加规则表（表格）④ 领取失败常见原因（ul）⑤ FAQ（≥ 3 问，与 FAQPage 一致）⑥ CTA | 美团外卖红包、红包领取入口、美团优惠券 |
| 攻略 2 | `shenquan-guide.html` | 美团神券节大额券抢券攻略｜美团优惠专区（20） | 美团神券怎么抢：神券节时间与大额券叠加方法 | ① 神券节节奏：每月固定档期说明（h2）② 大额神券获取途径对比（表）③ 神券与红包叠加规则（ul）④ 一个完整下单实测示例（按步骤）⑤ CTA | 美团神券节、大额优惠券、神券叠加 |

#### 1.3.1.6 /jingdong-waimai/ 京东外卖红包站 —— 红包教程 + 横向对比风

**栏目结构**：`红包领取入口`、`首单立减攻略`、`跨平台对比`（"对比"栏目为全站独有，REQ-DIFF-002/004）。

| 页面 | slug / 文件 | title 草案（字数） | H1 草案 | 内容大纲 | 目标关键词 |
| --- | --- | --- | --- | --- | --- |
| 分站首页 | `index.html` | 京东外卖红包领取与省钱攻略｜京东外卖红包站（22） | 京东外卖红包站：领红包点外卖更划算 | ① 站点定位 + deadline 提示（`有效期至 2026-12-31`）② 红包能省多少：典型订单测算（表）③ 攻略列表（教程 + 对比两篇导读）④ CTA + 预期管理文案（`https://1.yoourl.net/link/10009836aafbeff4e2171002ArLVtpn4`） | 京东外卖红包、京东外卖优惠券、点外卖省钱 |
| 攻略 1 | `hongbao-step.html` | 京东外卖红包三步领取教程｜京东外卖红包站（21） | 京东外卖红包领取教程：三步到账，下单立减 | ① 红包入口是什么：本站聚合的优惠入口说明（h2）② 三步领取操作（ol，每步一段说明）③ 首单用户与老用户差异（对比表）④ 有效期提示（deadline 组件）⑤ FAQ（≥ 3 问）⑥ CTA | 京东外卖红包、首单立减、外卖红包教程 |
| 攻略 2 | `duibi-meituan.html` | 京东与美团外卖点餐对比｜京东外卖红包站（20） | 京东外卖 vs 美团外卖：红包、配送费与满减对比 | ① 对比维度总表：红包力度 / 配送费 / 满减门槛 / 品类覆盖（table，h2）② 什么情况更适合京东（ul）③ 什么情况更适合美团（ul）④ 双平台组合省钱法（h3）⑤ CTA | 京东外卖对比、外卖平台哪个便宜、点餐省钱 |

#### 1.3.1.7 /daojia/ 到家服务特惠 —— 服务类目价格对比风

**栏目结构**：`洗车特惠对比`、`家政保洁怎么选`、`上门服务避坑`（"避坑"栏目与服务价格表为该站独有体裁）。

| 页面 | slug / 文件 | title 草案（字数） | H1 草案 | 内容大纲 | 目标关键词 |
| --- | --- | --- | --- | --- | --- |
| 分站首页 | `index.html` | 到家服务优惠与避坑指南｜到家服务特惠（19） | 到家服务特惠：洗车、家政保洁上门服务省钱指南 | ① 站点定位：到家服务类优惠聚合（≥ 500 字 + 3 区块）② 服务类目速览卡：洗车 / 家政 / 上门维修（卡片组）③ 攻略列表 ④ CTA + 预期管理文案（`http://h.fxzb.vip/2vnMAd0ISWs`） | 到家服务优惠、上门洗车、家政保洁 |
| 攻略 1 | `xiche-jiage.html` | 特惠洗车价格对比怎么选｜到家服务特惠（19） | 特惠洗车怎么选：到店、上门与团购券价格对比 | ① 三种洗车方式价格对比表（到店 / 上门 / 团购券，h2 + table）② 各方式适用场景（ul）③ 团购洗车券注意事项：有效期、门店限制（ul）④ 长期养车省钱组合（h3）⑤ CTA | 特惠洗车、洗车团购、上门洗车价格 |
| 攻略 2 | `jiazheng-bikeng.html` | 京东家政保洁预约避坑指南｜到家服务特惠（20） | 京东家政保洁怎么约：计价方式与避坑要点 | ① 服务类目说明：日常保洁 / 深度保洁 / 专项（h2×3）② 计价方式对比：按小时 vs 按面积（表）③ 预约时机与优惠节奏（ul）④ 避坑清单：加项 / 耗材 / 时长争议（table）⑤ CTA | 京东家政、家政保洁价格、保洁避坑 |

#### 1.3.1.8 /gouwu/ 网购外卖省钱站 —— 大促日历 / 清单导购风

**栏目结构**：`全年大促日历`、`平台优惠清单`、`双线省钱法`（"日历 / 时间轴"体裁为全站独有）。

| 页面 | slug / 文件 | title 草案（字数） | H1 草案 | 内容大纲 | 目标关键词 |
| --- | --- | --- | --- | --- | --- |
| 分站首页 | `index.html` | 网购大促日历与省钱清单｜网购外卖省钱站（20） | 网购外卖省钱站：大促日历与平台优惠清单 | ① 站点定位：外卖 + 网购双线省钱（≥ 500 字 + 3 区块）② 迷你大促日历（本季度节点，时间轴样式）③ 攻略列表 ④ CTA + 预期管理文案（`https://taoduoyu118.kzurl01.cn/?tm8b2RlD`） | 网购省钱、大促日历、外卖网购优惠 |
| 攻略 1 | `dacu-rili.html` | 全年网购大促日历与囤货攻略｜网购外卖省钱站（22） | 全年大促日历：618、双11 与年货节的囤货节奏 | ① 全年大促时间轴（月度 table：节点 / 力度 / 适合囤什么，h2）② 各节点囤货品类清单（ul）③ 优惠券领取与预售规则（h3）④ 大促价格真伪辨别（ul）⑤ FAQ（≥ 3 问）⑥ CTA | 618 攻略、双11 省钱、年货节、大促日历 |
| 攻略 2 | `waimai-gouwu-qingdan.html` | 外卖加网购双线省钱清单｜网购外卖省钱站（20） | 外卖加网购双线省钱：红包、满减与凑单技巧清单 | ① 外卖侧省钱清单：红包 / 满减 / 拼单（h2 + ul）② 网购侧省钱清单：平台券 / 凑单 / 退换货技巧（h2 + ul）③ 双线组合场景：宅家一周花销规划（table）④ 速查清单（dl）⑤ CTA | 网购优惠券、凑单技巧、外卖满减 |

#### 1.3.1.9 选题查重结论（REQ-DIFF-004 自检）

五站攻略选题两两比对：bendi（场景 / 行程）↔ meituan（平台玩法教程）↔ jd（入口教程 / 平台对比）↔ daojia（服务价格 / 避坑）↔ gouwu（时间轴 / 清单）。唯一交叉话题"外卖省钱"在 4 站出现，但切入角度分别为**场景组合**（bendi）、**平台工具教程**（meituan）、**平台对比**（jd）、**双线清单**（gouwu），角度显著不同；正文段落互不复制（REQ-DIFF-005，共享仅限全局组件文字）。

### 1.3.2 每站差异化设计矩阵（覆盖 REQ-DIFF-001~006、REQ-RWD-003）

#### 1.3.2.1 内容角度 / 栏目结构差异（两两可区分）

| 站点 | 编辑视角（一句话） | 独特栏目（≥ 2，其他站没有） | 攻略体裁 | 信息组织骨架 |
| --- | --- | --- | --- | --- |
| 首页 `/` | 枢纽导览员：只做分发与解释 | ① 分站导航矩阵 ② 站点使用说明（FAQ 形式） | 导览说明 | 卡片网格 + FAQ |
| `/bendi/` | 城市生活周刊编辑：按"生活场景"切内容 | ① 本周场景精选 ② 场景省钱指南（场景化选题） | 场景化攻略 | 期刊分区（头牌区块 + 栏目分栏） |
| `/meituan/` | 平台玩法研究员：把一个平台的工具讲透 | ① 红包领取教程 ② 神券日历玩法 | 步骤教程型 | 步骤卡片流（ol 视觉化）+ 侧栏目录 |
| `/jingdong-waimai/` | 横评测评作者：领红包 + 拉平台对比 | ① 红包领取入口 ② 跨平台点餐对比 | 对比 / 测评型 | 对比表格 + 高亮结论框 |
| `/daojia/` | 服务消费顾问：类目价格与风险 | ① 洗车特惠对比 ② 上门服务避坑清单 | 服务指南型 | 类目卡片 + 价格表 + 避坑清单 |
| `/gouwu/` | 大促日历编辑：按时间轴推清单 | ① 全年大促日历 ② 双线省钱清单 | 清单导购型 | 时间轴 + 清单卡片 |

#### 1.3.2.2 视觉方向差异（同源 token、异质派生）

六站在同一 `tokens.css` 体系下，各自通过 `theme-{slug}.css` 覆盖约 12 个主题 token + 少量布局类实现差异化。主色两两可区分（并排 10 秒目测可辨，REQ-DIFF-003；色相分布：灰蓝 / 橙 / 黄绿 / 红 / 天蓝 / 紫，覆盖色环无重复色区）：

| 站点 | 主色（--c-primary） | 辅色（--c-accent） | 中性基调 | 字体排印基调 | 布局骨架差异 |
| --- | --- | --- | --- | --- | --- |
| 首页 | 石墨蓝 `#334155` | 靛蓝 `#4F46E5` | 冷灰白底 `#F8FAFC` | 中性克制：常规字重、大留白、紧凑导航 | 居中单列容器（max 1200px），5 卡片响应式网格（1/2/3 列） |
| `/bendi/` | 暖橙 `#EA580C` | 暖黄 `#F59E0B` | 米白 `#FFFBF5` | 周刊感：大号衬线感标题（加粗黑体 + 字距）、栏目编号 | 头牌大区块（hero 卡）+ 双栏杂志式列表 |
| `/meituan/` | 黄绿 `#65A30D` | 深绿 `#4D7C0F` | 浅绿白 `#FAFDF7` | 教程感：编号步骤、等宽感小标签、紧凑行高 | 步骤卡片竖排 + 桌面端右侧粘性目录栏 |
| `/jingdong-waimai/` | 红 `#DC2626` | 深红 `#B91C1C` | 浅灰白 `#FEF9F9` | 测评感：结论加粗前置、表格密集排版 | 对比表格为主体 + 红包入口高亮框（红色描边） |
| `/daojia/` | 天蓝 `#0284C7` | 深蓝 `#0369A1` | 淡蓝白 `#F5FAFE` | 信任感：圆角大卡片、徽章化服务标签、宽松行高 | 类目卡片三联 + 价格表主体 |
| `/gouwu/` | 紫 `#7C3AED` | 品红 `#DB2777`（主→辅渐变） | 淡紫白 `#FAF8FF` | 导购感：时间轴节点、清单勾选符号、渐变强调 | 垂直时间轴 + 双列清单卡 |

主题覆盖机制（同源设计系统的实现方式，避免 6 套独立代码，REQ-DIFF-006）：

```css
/* assets/css/theme-bendi.css —— 每站主题文件仅约 60~80 行 */
:root {
  /* 仅覆盖主题层 token，其余继承 tokens.css */
  --c-primary: #EA580C;
  --c-primary-strong: #C2410C;
  --c-primary-soft: #FFF7ED;   /* 徽章/底纹浅色 */
  --c-accent: #F59E0B;
  --c-bg: #FFFBF5;
  --c-surface: #FFFFFF;
  --c-border: #FED7AA;
  --radius-card: 14px;          /* bendi 圆角更大 */
  --fs-page-title: 2rem;
  --header-underline: 4px;      /* 周刊风标题下划线 */
}
/* 布局骨架差异类（仅本站启用）：body data-site="bendi" */
[data-site="bendi"] .site-hero { grid-template-columns: 1.2fr 1fr; }  /* 头牌双栏 */
[data-site="bendi"] .guide-list { column-gap: 2rem; }                 /* 杂志双栏 */


```

验收自查：6 站 index 并排打开，主色 / 首屏布局 / 标题排印三个维度均可在 10 秒内区分归属；布局模板不得仅换文字（REQ-DIFF-006 禁止项）。

### 1.3.3 目录结构与完整文件树（对应 spec 3.2 契约）

```
youhui8.github.io/                     ← 仓库根 = GitHub Pages 站点根（主分支直接 serving）
├── .nojekyll                          ← 空文件，禁止 Jekyll 处理（REQ-NFR-006）
├── index.html                         ← 首页（站点 0）
├── 404.html                           ← 全站 404（noindex，根路径引用资源）
├── about/
│   └── index.html                     ← 关于本站
├── bendi/
│   ├── index.html
│   ├── waimai-scene-guide.html
│   └── zhoubianyou-tuangou.html
├── meituan/
│   ├── index.html
│   ├── hongbao-guide.html
│   └── shenquan-guide.html
├── jingdong-waimai/
│   ├── index.html
│   ├── hongbao-step.html
│   └── duibi-meituan.html
├── daojia/
│   ├── index.html
│   ├── xiche-jiage.html
│   └── jiazheng-bikeng.html
├── gouwu/
│   ├── index.html
│   ├── dacu-rili.html
│   └── waimai-gouwu-qingdan.html
├── assets/
│   ├── css/
│   │   ├── tokens.css                ← 全站设计 token（色彩/字号/间距/断点，~4KB）
│   │   ├── base.css                  ← 通用组件（header/nav/footer/CTA/徽章/卡片/表格，~14KB）
│   │   ├── theme-home.css            ← 首页主题（~40 行）
│   │   ├── theme-bendi.css           ← 以下每站主题 ~60-80 行
│   │   ├── theme-meituan.css
│   │   ├── theme-jingdong-waimai.css
│   │   ├── theme-daojia.css
│   │   └── theme-gouwu.css
│   ├── js/
│   │   └── deadline.js               ← 唯一 JS：有效期降级增强（≤1KB，async）
│   └── icons/
│       ├── logo-mark.svg             ← 品牌图形（页头装饰用，非 favicon）
│       └── accent-{slug}.svg ×6      ← 每站 accent 装饰图形（可选，内联亦可）
├── data.js                           ← 推广链接唯一数据源（规范化后，见 1.3.4 / 4.2）
├── favicon.ico                       ← 多尺寸 ICO（16/32/48，BMP 帧）
├── favicon.svg                       ← 矢量主图标（桌面现代浏览器优先加载）
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png
├── apple-touch-icon.png              ← 180×180
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── site.webmanifest
├── og-home.png                       ← 1200×630 ×6，每站一张、两两不同
├── og-bendi.png
├── og-meituan.png
├── og-jingdong-waimai.png
├── og-daojia.png
├── og-gouwu.png
├── robots.txt
├── sitemap.xml
├── llms.txt
├── scripts/
│   └── check-data.mjs                ← 可选本地自检脚本（不部署依赖，Phase D1 一并交付）
└── README.md                         ← 更新：站点结构 + 维护流程说明（REQ-NFR-009/011）


```

文件树规则（契约级）：

1.  全部路径**仅小写字母、数字与连字符**（GitHub Pages 服务器大小写敏感，Windows 开发环境不敏感，须防大小写漂移死链）。
2.  页面引用共享资源一律使用根路径（`/assets/...`），分站深层路径（如 `/gouwu/waimai-gouwu-qingdan.html`）下相对路径易错，根路径在 GitHub Pages 用户站点（根域部署）下安全。
3.  `data.js` 保留在根路径（spec 3.2 契约），不移动、不更名。
4.  每页 CSS 引用 3 个文件：`tokens.css` + `base.css` + 本站 `theme-{slug}.css`（首页用 `theme-home.css`）；跨页导航时前两者命中浏览器缓存。

### 1.3.4 数据层设计：data.js 规范化与双轨策略（覆盖 REQ-NFR-008/009/010、spec 10.x、异常场景 1/3）

#### 1.3.4.1 现状问题

当前 `data.js`（30 行）：`const youhuiList = [ ... ]` 数组本体合法，但**第 29~31 行存在语法残留**（多余的 `],},],` 三重闭合），导致整个文件不可执行（REQ-NFR-010 待修复）；字段本身完整（name / link / description / deadline）。

#### 1.3.4.2 规范化终稿格式（Phase C 落地）

规范化为**语法合法、可直接被浏览器执行的 JS 数组字面量**，挂全局常量 `youhuiList`（保留原变量名向后兼容），完整终稿见 4.2.1。要点：

1.  **保留原值逐字不动**：5 条记录的 `name`、`link`、`description` 与源文件逐字符一致（REQ-NFR-008 基准）。
2.  **deadline 值升级为 ISO 格式** `'2026-12-31'`（源值 `'2026.12.31'`）：这样"页面展示的有效期与 data.js 逐字一致"（REQ-NFR-008）与"展示格式 YYYY-MM-DD"（REQ-DL-001、spec 10.1.4）**同时满足**——若 data.js 保留点分格式，两条需求将互相矛盾；文件头注释记录历史格式变更。
3.  **扩展元数据字段**（不改原字段，只增不改）：`id`（记录标识 = 分站 slug，供自检脚本映射）、`site`（对应分站 slug 与规范 URL）。字段规范与注释规范见 4.2。
4.  删除尾部残留闭合符号，统一缩进；文件尾部保留 `Object.freeze`（防运行期意外篡改）。

#### 1.3.4.3 双轨策略（核心架构决策）

```
                ┌──────────────────────────────────────────────────┐
                │  data.js（编辑期真理源 SSOT，站长唯一改动点）       │
                └───────┬───────────────────────────┬──────────────┘
                        │                           │
        轨道 A：物化直出（MVP 主轨）        轨道 B：运行时增强（辅助轨，仅 1 个消费者）
                        │                           │
                        ▼                           ▼
   ┌────────────────────────────────┐   ┌────────────────────────────────┐
   │ Phase C 编码时，把 data.js 的值  │   │ deadline.js 读取 HTML 元素上的  │
   │ 逐字写入各页面静态 HTML：         │   │ data-deadline 属性（已物化），   │
   │ · 首页卡片：name/description/    │   │ 客户端比较当前日期做文案降级     │
   │   deadline → 卡片文案            │   │ （REQ-DL-002/005）             │
   │ · 分站 CTA：link → href +       │   └────────────────────────────────┘
   │   rel="sponsored nofollow       │
   │   noopener" + target="_blank"   │   注意：没有任何页面 <script src="data.js">
   │ · 期限提示：data-deadline 属性    │   data.js 运行期不被任何页面加载
   └────────────────────────────────┘


```

**轨道 A（物化直出）——承担全部 SEO 与无 JS 场景**：

-   所有 HTML 页面在编写时由编码工程师将 data.js 的值复制为静态 HTML 文本与属性。爬虫抓取初始 HTML 即获得全部数据（REQ-NAV-002、REQ-AI-003）。
-   物化落点清单（REQ-NFR-009 变更同步流程的依据）：

| data.js 值 | 物化落点 |
| --- | --- |
| `name` | 首页卡片记录名行（次要行，逐字）；CTA 区块来源说明文案（逐字） |
| `description` | 首页卡片描述第一句（逐字） |
| `link` | 对应分站全部 CTA `href`（逐字符一致，REQ-CTA-005） |
| `deadline` | 首页卡片徽章行 + 分站 CTA 区块期限组件的 `data-deadline` 属性与静态文案（逐字） |
| `site.url` | 首页卡片链接 `href`、页脚互链（绝对 URL） |

**轨道 B（运行时增强）——仅 deadline 一项，且不加载 data.js**：

-   `deadline.js`（全站唯一 JS，`async` 加载，≤1KB）扫描 `document.querySelectorAll('[data-deadline]')`，与客户端日期比较，过期则切换文案（详见 1.3.10）。
-   **页面不引用 data.js**：避免运行时依赖（异常场景 1：data.js 请求失败页面无感知）、减少 1 个网络请求、SEO 零收益的加载不值得。

**一致性保障（双轨漂移防线）**：

1.  `scripts/check-data.mjs`（Node ≥18，零依赖，本地运行）：解析 data.js → 抓取全部 HTML → 逐条比对 link 逐字符一致、name/description/deadline 在物化落点存在且一致、sitemap/llms.txt 收录与文件树一致。输出差异清单，退出码非 0。
2.  该脚本**不参与部署链路**（无构建依赖，spec 12.3 合规），仅作为站长提交前自检与 Phase G 验收工具。
3.  README 维护说明列出"改 data.js 后需同步的 7 处落点"（首页卡片 / 对应分站 CTA / deadline 组件 / sitemap lastmod / llms.txt / og 图如涉及 / README 结构图）。

### 1.3.5 favicon / 图标资产矩阵（覆盖 REQ-FAV-001~006）

#### 1.3.5.1 品牌图形设计（原创，REQ-FAV-005）

全站统一一个品牌图形——**"无限惠环"**：圆角方形渐变底（靛蓝 `#4F46E5` → 天青 `#0EA5E9`，与首页 accent 同源），上叠两个白色描边圆环，上下相扣构成 "8" / "∞" 双关（呼应域名 youhui**8** 与"优惠循环"）。纯几何路径，无文字依赖，任意尺寸渲染稳定，非第三方 Logo。`favicon.svg` 设计源稿：

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4F46E5"/>
      <stop offset="1" stop-color="#0EA5E9"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <circle cx="32" cy="22" r="9" fill="none" stroke="#FFFFFF" stroke-width="5"/>
  <circle cx="32" cy="42" r="9" fill="none" stroke="#FFFFFF" stroke-width="5"/>
</svg>


```

6 站共用此 favicon（REQ-FAV-005 统一品牌）；每站差异体现在：① `og-{slug}.png` 底色渐变取各站主色；② 每页 `<meta name="theme-color">` 取各站主色（浏览器 UI 着色，不属于 favicon 资产）；③ 页头装饰 `accent-{slug}.svg` 可选内联。

#### 1.3.5.2 资产矩阵与生成管线

**设计决策：本设计阶段（Phase B）不产出真实位图**（本环境无法可靠生成位图），位图全部由 Phase D1 编码工程师用 Node 脚本生成；设计冻结的是**文件清单、规格、视觉规范与生成降级链**。

| 文件 | 规格 | 生成方式 | 用途 |
| --- | --- | --- | --- |
| `/favicon.svg` | 矢量，如上源稿 | 手写 SVG 直接落地（无需脚本） | 现代桌面浏览器优先图标 |
| `/favicon.ico` | ICO 容器含 16/32/48 三帧（BMP 32bpp 帧，非 PNG 帧） | 脚本 A | 桌面浏览器兜底（含 Safari 老版本；选 BMP 帧因 Safari 对 PNG-in-ICO 支持不稳） |
| `/favicon-16x16.png` | 16×16 PNG | 脚本 A | 高 DPI 标签页回退 |
| `/favicon-32x32.png` | 32×32 PNG | 脚本 A | 标准标签页 |
| `/favicon-48x48.png` | 48×48 PNG | 脚本 A | 任务栏/快捷方式（ 任务补充要求，超出 spec 最小清单） |
| `/apple-touch-icon.png` | 180×180 PNG | 脚本 A | iOS / iPadOS 添加到主屏幕 |
| `/android-chrome-192x192.png` | 192×192 PNG | 脚本 A | Android Chrome |
| `/android-chrome-512x512.png` | 512×512 PNG | 脚本 A | Android 高清 / 启动画面 |
| `/site.webmanifest` | JSON 文本 | 手写（见 2.2 表 3） | Android 安装信息 |
| `/og-home.png` + `/og-{slug}.png` ×5 | 1200×630 PNG ×6 | 脚本 B | OG 分享图，底色渐变 = 各站主色 → 辅色，六图两两不同（REQ-FAV-006） |

**脚本 A（favicon 位图）生成降级链**（Phase D1 按序尝试，任一成功即止）：

1.  **首选**：Node + `sharp`（devDependency，仅开发期）：`sharp(Buffer.from(svg))` 按 16/32/48/180/192/512 六档 resize 输出 PNG。SVG 中圆环为矢量路径，缩放无损。
2.  **次选（sharp 安装失败）**：Node 内置 `zlib` + 手写 **纯 JS PNG 编码器**（约 100 行：PNG 签名 + IHDR + IDAT（`zlib.deflateSync` 压缩 RGB scanline）+ IEND + 手写 CRC32 查表，Node ≥20.15 亦可用内置 `zlib.crc32`）。图形用 JS 函数按坐标绘制：渐变底 + 两圆环（每像素判断与圆心距离 ≤ 描边带宽即着白色，抗锯齿用距离软化 1px）。ICO 容器：ICONDIR(6B) + 3×ICONDIRENTRY(16B each) + 32bpp BMP 帧（BITMAPINFOHEADER 40B + 像素 BGRA 自下而上 + AND mask）。
3.  **最小可行兜底**：若圆环几何绘制效果不佳，退化为"圆角渐变底 + 中心白色双圆点"简化图形——仍是原创图形、非空白图（满足 REQ-FAV-005 下限）。

**脚本 B（og 图）生成降级链**：

1.  **首选**：`sharp` 将 og 模板 SVG（1200×630：站主色→辅色渐变底 + 白色站名大字 + 品牌双圆环 + 站点定位短语）转 PNG。注意 Windows 下 sharp 转 SVG 中文依赖系统字体，需在 SVG 中显式指定 `font-family="Microsoft YaHei, PingFang SC"`。
2.  **兜底**：纯 JS PNG 编码器（同上）绘制渐变底 + 双圆环 + **点阵字母**（内置 7×9 位图字模仅覆盖 A-Z 与数字，渲染站 slug 大写，如 "BENDI"）——中文不可行时以拉丁字母保底，仍满足"六图两两不同、1200×630、≤300KB"（REQ-FAV-006、REQ-RWD-004）。

脚本产物验收：PNG/ICO 文件头合法（可用 `file` 命令或读魔数校验）、尺寸正确、单文件 ≤ 300KB、六张 og 图肉眼可区分。

#### 1.3.5.3 每页 `<head>` 图标引用链（回退顺序）

全站统一模板（满足并超出 REQ-FAV-003 最小清单；浏览器按声明顺序与支持度自选最优，SVG → PNG → ICO 逐级回退，任何一环 404 不影响下一级，REQ-FAV-004）：

```html
<link rel="icon" href="/favicon.ico" sizes="any">                          <!-- ① ICO 兜底 -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">                 <!-- ② SVG 优先 -->
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png"> <!-- ③ 大尺寸 PNG -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"> <!-- ④ 标准 PNG -->
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"> <!-- ⑤ 高 DPI PNG -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">                 <!-- ⑥ iOS 主屏 -->
<link rel="manifest" href="/site.webmanifest">                             <!-- ⑦ Android/安装 -->
<meta name="theme-color" content="#334155">                                <!-- 每站取各自主色 -->


```

平台行为验证点（Phase G / REQ-FAV-004）：桌面 Chrome/Edge/Firefox/Safari 请求无 404；iOS Safari"添加到主屏幕"显示 180 图；Android Chrome 安装弹窗显示 192/512 图；不支持 manifest 的环境经 ②~⑤ 回退。

### 1.3.6 SEO 与可发现性设计（覆盖 REQ-SEO-001~011、REQ-AI-001~004）

#### 1.3.6.1 title / meta description 模板（每站句式不同）

title 统一 `{页面主题}｜{站名}`，≤ 30 中文字符，全站唯一（REQ-SEO-001）；六站尾部品牌词（站名）固定，前半句式随站体裁变化，进一步保证 REQ-DIFF-001 的"title 主题词两两不同"：

| 站点 | title 前半句式 | 示例（已在 1.3.1 各表给出全部 17 页草案） |
| --- | --- | --- |
| 首页 | 集合定位式："…集合入口" | 外卖红包与网购优惠集合入口｜优惠集合导航 |
| `/bendi/` | 场景式："…场景…指南/攻略" | 外卖点餐场景省钱指南：午餐到聚餐｜本地生活优惠集 |
| `/meituan/` | 教程式："…教程/攻略" | 美团外卖红包领取教程｜美团优惠专区 |
| `/jingdong-waimai/` | 对比式："…对比/三步…" | 京东与美团外卖点餐对比｜京东外卖红包站 |
| `/daojia/` | 类目价格式："…怎么选/避坑指南" | 特惠洗车价格对比怎么选｜到家服务特惠 |
| `/gouwu/` | 日历清单式："…日历/清单" | 全年网购大促日历与囤货攻略｜网购外卖省钱站 |

meta description：60~120 中文字符、每页唯一（REQ-SEO-002），六站采用不同句式骨架——首页"总分式"（先总述矩阵再列分站）、bendi"场景罗列式"、meituan"步骤承诺式"（第 1 步…第 2 步…）、jd"对比结论式"（A 与 B 哪个划算）、daojia"类目价格式"、gouwu"时间线式"（从 618 到双 11）。Phase C 文案阶段按句式逐页撰写，check-data.mjs 校验长度区间与全站唯一性。

#### 1.3.6.2 canonical 规则（REQ-SEO-003）

| 页型 | canonical 值 |
| --- | --- |
| 首页 | `https://youhui8.github.io/` |
| about / 分站目录页 | `https://youhui8.github.io/{slug}/`（**带尾斜杠**） |
| 攻略页 | `https://youhui8.github.io/{slug}/{page}.html`（**不带尾斜杠**） |
| 404 | 无 canonical，`<meta name="robots" content="noindex">` |

原因：GitHub Pages 对 `/bendi` 会 301 到 `/bendi/`（目录），对 `.html` 文件则原样分发——canonical 跟随服务器规范化行为，避免重复收录。

#### 1.3.6.3 Open Graph / Twitter Card（REQ-SEO-005）

每页输出（og:image 分站内复用，六站 index 各自独立）：

```html
<meta property="og:title" content="{与 title 一致}">
<meta property="og:description" content="{与 meta description 一致}">
<meta property="og:type" content="website">            <!-- 攻略页用 article -->
<meta property="og:url" content="{canonical URL}">
<meta property="og:image" content="https://youhui8.github.io/og-{slug}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="{站名}">
<meta name="twitter:card" content="summary_large_image">


```

#### 1.3.6.4 JSON-LD 方案（REQ-SEO-006）

每页**单段** `<script type="application/ld+json">`，内部用 `@graph` 合并本页全部实体（减少解析开销、避免多段维护漂移）。按页型选型：

| 页型 | @graph 实体 |
| --- | --- |
| 首页 | `WebSite`（name/url/inLanguage=zh-CN）+ `ItemList`（5 分站，ListItem.name=站名，url=规范 URL）+ `FAQPage`（4~5 问，与可见 FAQ 一致） |
| about | `WebPage` + `BreadcrumbList` |
| 分站 index | `CollectionPage` + `ItemList`（本站攻略列表）+ `BreadcrumbList` |
| 攻略页 | `Article`（headline=H1、datePublished=内容定稿日、dateModified、author=`{"@type":"Organization","name":"优惠集合导航编辑部"}`、publisher 同）+ `BreadcrumbList`（+ 指定 4 页附 `FAQPage`） |

BreadcrumbList 与页面可见面包屑逐字一致（REQ-SEO-011）：

```html
<nav aria-label="面包屑"><ol class="breadcrumb">
  <li><a href="https://youhui8.github.io/">首页</a></li>
  <li><a href="https://youhui8.github.io/jingdong-waimai/">京东外卖红包站</a></li>
  <li aria-current="page">京东外卖红包三步领取教程</li>
</ol></nav>


```

#### 1.3.6.5 内链锚文本策略（REQ-SEO-010、REQ-NAV-003）

| 链接类型 | 锚文本规则 | 示例 |
| --- | --- | --- |
| 首页 → 分站 | 分站站名（可点击卡片，站名为卡片 h2 内链接） | `本地生活优惠集` |
| 分站 index → 攻略页 | 攻略完整标题或"阅读《标题》" | `阅读《美团外卖红包领取教程》` |
| 攻略页 → 本分站 | 面包屑 + 文内上下文句链接 | `更多红包玩法见美团优惠专区首页` |
| 页脚互链 | 站名（绝对 URL） | `京东外卖红包站` |
| CTA 外链 | 动作导向锚 + 平台名 | `领取京东外卖红包` |
| 禁止 | "点击这里 / 进入 / 更多"等无语义锚 | — |

内链深度目标：首页 1 跳达 5 分站 index；分站 index 1 跳达本站全部攻略；任意页 1 跳达其余 5 站（页脚保证）。

#### 1.3.6.6 sitemap.xml 结构（REQ-SEO-007）

收录 1.3.1.2 表中 17 个 URL（404 除外）；`lastmod` 初始为上线日期，此后每次页面实质修改同步更新；不含 changefreq / priority（Google 忽略，减少维护面）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://youhui8.github.io/</loc>
    <lastmod>2026-10-20</lastmod>
  </url>
  <!-- 其余 16 个 URL 同构：about/、5×{slug}/、12×{slug}/{page}.html -->
</urlset>


```

#### 1.3.6.7 robots.txt 终稿（REQ-SEO-008、REQ-AI-002）

```text
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bytespider
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://youhui8.github.io/sitemap.xml


```

（通用组 + 6 个 AI 爬虫显式允许组 + Sitemap 行；无 Disallow 项——全站无不想被抓取的路径。）

#### 1.3.6.8 llms.txt 结构（REQ-AI-001）

Markdown 格式，三层结构，与站点结构逐项一致（Phase G 校验点）：

```markdown
# 优惠集合导航（youhui8.github.io）

> 外卖红包、团购与网购优惠的信息聚合导航站，由首页与 5 个垂直分站组成；本站为聚合导航，非各平台官方。

## 站点矩阵
- [优惠集合导航](https://youhui8.github.io/): 全站枢纽，5 大分站导航与使用说明
- [本地生活优惠集](https://youhui8.github.io/bendi/): 外卖、团购、周边游等城市生活场景省钱攻略
- [美团优惠专区](https://youhui8.github.io/meituan/): 美团红包、神券领取教程与玩法攻略（推广链接有效期至 2026-12-31）
- [京东外卖红包站](https://youhui8.github.io/jingdong-waimai/): 京东外卖红包领取教程与跨平台点餐对比（推广链接有效期至 2026-12-31）
- [到家服务特惠](https://youhui8.github.io/daojia/): 特惠洗车、京东家政等上门服务的价格对比与避坑指南
- [网购外卖省钱站](https://youhui8.github.io/gouwu/): 全年网购大促日历与外卖、网购双线省钱清单

## 各站页面清单
### 优惠集合导航
- [关于本站](https://youhui8.github.io/about/): 站点定位、矩阵结构与推广链接说明
### 本地生活优惠集
- [外卖点餐场景省钱指南](https://youhui8.github.io/bendi/waimai-scene-guide.html): 通勤午餐到周末聚餐的场景化点餐攻略
- [周边游团购订房省钱攻略](https://youhui8.github.io/bendi/zhoubianyou-tuangou.html): 团购套餐与酒旅优惠的实操指南
（……meituan / jingdong-waimai / daojia / gouwu 逐站列出全部攻略页……）

## 使用说明
- 各分站页面内的"优惠入口"指向第三方推广页面，点击后将离开本站
- 标注"有效期至 2026-12-31"的入口以页面标注为准；过期后入口仍可点击查看最新情况


```

AI 可读性配套（REQ-AI-003/004）：正文全部静态直出；标题层级严格 h1 → h2 → h3 不跳级；信息用语义化 `ul/ol/table` 组织（各攻略大纲已按此规划）。

### 1.3.7 前端技术选型与 CSS 架构（覆盖 REQ-NFR-001~004、REQ-RWD-001~005）

#### 1.3.7.1 技术选型决策表

| 维度 | 选型 | 理由 / 需求依据 |
| --- | --- | --- |
| HTML | HTML5 语义化（header/nav/main/article/section/footer，每页唯一 h1） | REQ-SEO-004 |
| CSS | 原生 CSS（自定义属性 + 移动优先媒体查询），零预处理器 | 无构建依赖（spec 12.3）、REQ-NFR-001 |
| JS | 原生 JS 单文件 deadline.js（async、≤1KB、无 API 调用） | 渐进增强，REQ-NFR-002 |
| 框架 | 无（无 React/Vue/jQuery） | REQ-NFR-001 |
| 字体 | 系统字体栈，零 Web 字体、零 Google Fonts | REQ-NFR-001、性能预算 |
| 本地验证 | `npx http-server . -p 8080`（或 `python -m http.server`）直接预览，无构建步骤 | spec 12.3 |
| 暗色模式 | **不做**（spec 12.6 明确 Out of Scope，设计不越界） | — |
| 图片策略 | 正文零位图，仅内联 SVG / CSS 图形；位图仅 favicon 与 og 分享图（不进入渲染路径） | REQ-RWD-004、性能预算 |

系统字体栈（tokens.css 冻结值）：

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
             "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Consolas, "Courier New", monospace; /* 仅步骤编号/小标签 */


```

#### 1.3.7.2 CSS 三层架构

```
tokens.css（全局继承层，~4KB）
  ├─ 色彩语义 token：--c-primary/-strong/-soft、--c-accent、--c-bg、--c-surface、
  │   --c-text、--c-text-muted、--c-border、--c-on-primary（前景色，保证对比度 ≥ 4.5:1）
  ├─ 字体阶梯：--fs-xs:12px → --fs-base:16px → --fs-xl:22px → --fs-hero: clamp(1.75rem, 4vw, 2.5rem)
  ├─ 间距：--sp-1:4px ~ --sp-8:32px（4px 基数）；容器 --w-container:1200px；阅读宽 --w-prose:72ch
  ├─ 圆角/阴影：--radius-sm:8px / --radius-card:12px；--shadow-card
  └─ 断点（媒体查询注释冻结）：--bp: 375 / 768 / 1024 / 1280
base.css（组件层，~14KB，全部站点共享）
  ├─ reset 要素 + body 基线（16px、行高 1.75）
  ├─ header / nav（站内导航：首页 + 本站栏目锚点 + 关于）
  ├─ breadcrumb / footer（友链 3 区块）/ promo-cta / badge / card / table / faq / pagination-less
  └─ 触控基线：交互元素 min-height/min-width 44px（REQ-RWD-002）
theme-{slug}.css（主题层 ×6，各 ~60-80 行）
  └─ 覆盖 1.3.2.2 所列约 12 个主题 token + [data-site] 布局差异类


```

#### 1.3.7.3 响应式断点行为表（移动优先，min-width 查询）

| 断点 | 布局行为 |
| --- | --- |
| < 375px（基线，320px 可用） | 单列堆叠；卡片全宽；页脚友链纵向列表；正文 16px 无截断（REQ-RWD-001） |
| ≥ 375px | 触控间距放宽（--sp-6+）；卡片内边距增大 |
| ≥ 768px（平板） | 分站卡片 2 列；正文出现限宽容器；meituan 步骤卡片横向留白 |
| ≥ 1024px（桌面） | 首页卡片 3 列网格（REQ-RWD-003 多列对齐）；正文阅读宽 72ch 限制（禁止全屏拉伸）；meituan 出现右侧粘性目录栏；gouwu 时间轴左侧对齐 |
| ≥ 1280px（宽屏） | 容器封顶 1200px 居中；bendi 杂志双栏生效 |

旋转 / 视口变化（REQ-RWD-005）：全部布局用流式 grid/flex + 相对单位，无固定宽元素，无 JS 参与布局——天然通过。

### 1.3.8 友情链接网络实现（覆盖 REQ-LINK-001~006）

#### 1.3.8.1 页脚组件规范（全站统一结构，18 个页面全部包含）

```html
<footer class="site-footer">
  <nav aria-label="站点导航">
    <!-- 区块 1：本站快捷导航（首页 + 关于 + 本站栏目）…… -->
  </nav>
  <nav aria-label="友情链接">
    <h2 class="footer-title">友情链接</h2>
    <!-- 区块 2：6 站互链（当前站以外的 5 个，绝对 URL，锚文本=站名） -->
    <a href="https://youhui8.github.io/">优惠集合导航</a>
    <a href="https://youhui8.github.io/bendi/">本地生活优惠集</a>
    <a href="https://youhui8.github.io/meituan/">美团优惠专区</a>
    <a href="https://youhui8.github.io/jingdong-waimai/">京东外卖红包站</a>
    <a href="https://youhui8.github.io/daojia/">到家服务特惠</a>
    <a href="https://youhui8.github.io/gouwu/">网购外卖省钱站</a>
    <!-- 区块 3：外部友链 ×3 -->
    <a href="https://jdjdndn.github.io/" rel="noopener">券宝</a>
    <a href="https://wcbblll.cc" rel="noopener">优惠聚合</a>
    <a href="https://dlhaoka.com" rel="noopener">号卡办理中心</a>
  </nav>
  <!-- 区块 4：披露与免责声明（见 1.3.11） -->
</footer>


```

（实现时当前站自身从互链中省略，输出其余 5 站——保证 REQ-LINK-005 的"1 次点击可达其余 5 站"；全部为静态 `<a href>`，无 JS 跳转，禁 JS 下完整可见可点，REQ-LINK-004/006。）

#### 1.3.8.2 rel 属性策略（设计决策与理由）

| 链接类型 | rel / target | 决策理由 |
| --- | --- | --- |
| 6 站互链（站内绝对 URL） | 无 rel 附加（不加 nofollow / sponsored）；同窗口打开 | ① spec REQ-LINK-004 明确"互链不得添加 nofollow"；② 站内链接权重需自由流动（这是矩阵 SEO 的核心收益）；③ 同域链接无安全顾虑，target 默认 |
| 3 个外部友链 | `rel="noopener"`；同窗口打开；**不加 nofollow、不加 sponsored** | ① spec REQ-LINK-004 明确"外部友链按常规友链对待，不标 sponsored"；② 友链本质是互惠导航而非付费推广，加 nofollow 违背交换惯例、损害互惠价值；③ noopener 为外部链接安全惯例（同窗口跳转时防反向 tabnabbing），成本为零 |
| 推广 CTA（data.js link） | `rel="sponsored nofollow noopener"` + `target="_blank"` | REQ-CTA-003/004 契约：推广属性对搜索引擎透明 + 新窗口防丢失当前页 + noopener 防窗口引用泄漏 |

#### 1.3.8.3 友链网络拓扑

```
flowchart LR
    HOME["/ 首页<br/>优惠集合导航"]
    B["/bendi/<br/>本地生活优惠集"]
    M["/meituan/<br/>美团优惠专区"]
    J["/jingdong-waimai/<br/>京东外卖红包站"]
    D["/daojia/<br/>到家服务特惠"]
    G["/gouwu/<br/>网购外卖省钱站"]
    QB["券宝<br/>jdjdndn.github.io"]
    YH["优惠聚合<br/>wcbblll.cc"]
    HK["号卡办理中心<br/>dlhaoka.com"]
    HOME <--> B & M & J & D & G
    B <--> M & J & D & G
    M <--> J & D & G
    J <--> D & G
    D <--> G
    B & M & J & D & G --> QB & YH & HK


```

（6 站完全图 K6：任意页面页脚 1 跳可达其余 5 站；3 个外链每页输出——链路距离约束满足 REQ-LINK-005 / REQ-SEO-010。）

### 1.3.9 性能预算（覆盖 REQ-NFR-002~004、REQ-RWD-004、REQ-NFR-001）

设计预算严于 spec 上限，为内容增长留缓冲：

| 指标 | 设计预算 | spec 上限 | 达成手段 |
| --- | --- | --- | --- |
| 单页 HTML（未压缩） | **≤ 60KB** | 100KB | 无内联大块 CSS/JS；正文图文精炼 |
| 每页 CSS 合计 | **≤ 40KB**（实际 ~24KB：tokens 4 + base 14 + theme 6） | 50KB | 三文件方案、无冗余主题 |
| 每页 JS | **≤ 1KB**（deadline.js 单文件） | 50KB | 唯一脚本 async 加载、不阻塞首屏 |
| 外部请求 | **0 个 CDN / 0 Web 字体** | 0（REQ-NFR-001） | 系统字体栈 + 仓库内资源 |
| 正文位图 | **0 张** | 图片 ≤300KB/张 | 仅内联 SVG / CSS 图形；位图仅 favicon / og（og 不入渲染路径） |
| 每页总请求数 | ≤ 7（1 html + 3 css + 1 js + favicon + manifest） | — | LCP 元素为首屏文本/卡片，无大图等待 |
| Lighthouse 移动端 | P ≥ 90 / A11y ≥ 90 / BP ≥ 90 / SEO ≥ 95（对齐 REQ-NFR-003） | 同 | 上述手段天然达标；验收用 Lighthouse 移动模拟 |
| LCP / CLS | ≤ 2.5s / ≤ 0.1（REQ-NFR-004） | 同 | 无字体闪烁（系统字体）、deadline.js 文案替换保持等高（见 1.3.10 CLS 条目） |

### 1.3.10 有效期展示与过期降级组件（覆盖 REQ-DL-001~005、REQ-NAV-005、REQ-CTA-006）

#### 1.3.10.1 组件 HTML 契约（静态直出态 = 有效期内形态）

```html
<!-- 有效期提示组件（仅 meituan / jingdong-waimai 相关页面与首页对应卡片使用） -->
<p class="promo-deadline" data-deadline="2026-12-31">
  <span class="badge badge-limited">限时</span>
  <span class="deadline-text">有效期至 2026-12-31，以页面标注为准</span>
</p>


```

静态文案设计要点：

-   格式统一 `有效期至 2026-12-31`（YYYY-MM-DD，REQ-DL-001），后缀"，以页面标注为准"为**无 JS 兜底语义**——即使脚本不可用且已过期，该句仍构成中性、非失实的表述（"以页面标注为准"不承诺活动仍在进行），同时不违反 REQ-DL-003（无"限时有效/即将截止"字样）。
-   **无 deadline 的 3 条链接（bendi / daojia / gouwu）页面零期限元素**：不渲染组件、不渲染徽章（REQ-DL-004，禁止虚构期限）。

#### 1.3.10.2 deadline.js 行为规范（唯一 JS，Phase C 落地参考）

```js
// 逻辑规范（约 15 行实现，async 加载，失败静默）：
// 1. now = new Date()（客户端日期）；today = 'YYYY-MM-DD'
// 2. 对每个 [data-deadline] 元素：if (today > deadline) 则：
//    a. 移除 .badge-limited（隐藏"限时"紧迫徽章）
//    b. 将 .deadline-text 文案替换为："活动时间可能已结束，可点击查看最新情况"
//    c. CTA 按钮 href 保留不动（REQ-DL-002：CTA 必须保留可点击）
// 3. 无 [data-deadline] 页面（bendi/daojia/gouwu 分站内页）可不引用本脚本


```

三态状态机：

```
无 deadline（bendi/daojia/gouwu）──► 永不渲染期限组件（REQ-DL-004）
有 deadline（meituan/jd + 首页 2 卡片）
   ├─ today ≤ 2026-12-31 ──► [限时]徽章 + "有效期至 2026-12-31，以页面标注为准"（REQ-DL-001）
   └─ today > 2026-12-31 ──► JS：去徽章 + "活动时间可能已结束，可点击查看最新情况"（REQ-DL-002/003/005）
                              无 JS：静态文案停留（含"以页面标注为准"兜底，不失实）


```

CLS 防抖：`.promo-deadline` 固定 `min-height: 1.75em`，徽章行内绝对定位不占文档流高度——JS 替换文案不引起布局位移（REQ-NFR-004 的 CLS ≤ 0.1）。

### 1.3.11 合规设计（覆盖 REQ-COMP-001~004、REQ-CONTENT-008）

#### 1.3.11.1 页脚披露声明（每页必含，文字清晰可读、不隐藏，REQ-COMP-001/002）

> **推广声明**：本站为优惠信息聚合导航，页面内"优惠入口"等部分链接为推广链接，点击后将跳转第三方页面，具体优惠信息以目标页面为准。
> 
> **品牌免责声明**：本站与美团、京东、饿了么、淘宝、拼多多等品牌无关联，页面中提及的名称与商标归各自权利人所有；本站为非官方的信息聚合导航站点。

（两段合计约 110 字，正文对比色 ≥ 4.5:1，置于页脚区块 4；about 页同步全文呈现，REQ-COMP-002 双落点。）

#### 1.3.11.2 CTA 预期管理文案模板（≥ 15 中文字符，REQ-CTA-006）

每分站 CTA 区块固定附说明句：`点击后将离开本站，前往"｛data.js name｝"外部优惠页面（新窗口打开），活动信息以目标页为准。`（name 逐字取自 data.js，兼作物化落点。）

#### 1.3.11.3 品牌词使用规范

1.  全站**不嵌入任何第三方品牌 Logo / 商标图片**（REQ-COMP-003）；视觉仅用自有"无限惠环"与几何图形。
2.  提及平台一律使用描述性文字（"美团外卖红包领取入口"），站名与 title 虽含品牌词，但均以"品类 + 优惠"描述性方式使用，且每站均有"非官方聚合导航"声明兜底。
3.  不得出现"官方 / 官网 / 指定渠道"等暗示授权的表述（REQ-CONTENT-008）。
4.  页脚不虚构 ICP 备案号（GitHub Pages 境外托管，无备案义务）。

### 1.3.12 404 页面设计

**文件**：`/404.html`（GitHub Pages 用户站点原生支持：任意 404 路径自动渲染该文件）。

**设计要点**：

1.  `<head>`：`<meta name="robots" content="noindex">`；无 canonical；**全部资源用根路径引用**（`/assets/...`）——404 可能在任意深层路径渲染，相对路径必然断链；不引用 deadline.js（无期限内容）。
2.  内容结构：友好提示 H1（`页面走丢了`）→ 一句话说明（"你访问的地址可能已变更或不存在"）→ **6 站迷你导航卡片**（与首页卡片同源样式、站名锚文本、绝对 URL）→"返回首页"主按钮 → 页脚友链组件照常输出（维持全站互链一致性，REQ-LINK-001 的"每个页面"口径涵盖 404）。
3.  视觉：沿用首页中性主题（theme-home.css），不引入第 7 套主题。
4.  正文 ≥ 100 字即可（404 页不在 REQ-CONTENT 字数基线内），但需真实可用文案，禁止占位。

# **2\. 接口设计**

## **2.1 总体设计**

本项目无运行时 API（无后端、无对外接口，spec 1.6.2/1.6.6）。"接口"在本设计中指四类**静态契约**，供 Phase C 编码、Phase D1 资产生成、Phase G 验收三方共同遵守：

1.  **页面契约**：每个 HTML 页面的 head 元数据模板与 body 结构骨架（页面即接口的提供方与消费方均为：浏览器、爬虫、访客）。
2.  **数据契约**：data.js 的字段结构与消费规则（消费方：编码期物化过程、check-data.mjs、站长维护流程）。
3.  **资产契约**：favicon / og / manifest / robots / sitemap / llms.txt 的文件规格与引用关系（消费方：浏览器、社交平台、搜索引擎、AI 引擎）。
4.  **服务契约**：GitHub Pages 静态分发的 URL → 文件映射规则（含尾斜杠 301 行为、404.html 行为、.nojekyll 行为）。

### 每页通用 head 模板（页面契约核心，全站 18 页统一套用）

```html
<!DOCTYPE html>
<html lang="zh-CN">                                    <!-- REQ-SEO-009 -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{页面主题}｜{站名}</title>                      <!-- REQ-SEO-001，≤30 中文字符，全站唯一 -->
  <meta name="description" content="{60~120 中文字符，全站唯一}">  <!-- REQ-SEO-002 -->
  <link rel="canonical" href="{规范绝对 URL}">            <!-- REQ-SEO-003，规则见 1.3.6.2 -->
  <!-- 图标引用链 7 项 + theme-color（REQ-FAV-003/004，见 1.3.5.3） -->
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/theme-{slug}.css">
  <!-- Open Graph + Twitter Card（REQ-SEO-005，见 1.3.6.3） -->
  <script type="application/ld+json">{ "@context": "https://schema.org", "@graph": [ … ] }</script>
  <!-- 仅含 deadline 的页面追加：<script src="/assets/js/deadline.js" async defer></script> -->
</head>
<body data-site="{slug}">
  <a class="skip-link" href="#main">跳到主要内容</a>      <!-- A11y：键盘跳转（REQ-NFR-003 A11y ≥90） -->
  <header class="site-header">…站内导航…</header>
  <nav aria-label="面包屑">…</nav>                        <!-- 分站页与攻略页，REQ-SEO-011 -->
  <main id="main">
    <article>…唯一 h1 + 正文（语义化 h2/h3、ul/ol/table）…</article>
    …CTA / 期限组件（见 1.3.10）…
  </main>
  <footer class="site-footer">…友链 + 披露（1.3.8 / 1.3.11）…</footer>
</body>
</html>


```

## **2.2 接口清单**

### 表 1：页面接口（18 项，URL 契约与元数据规则）

见 1.3.1.2 全站清单表（URL / 文件 / 页型 / JSON-LD / 收录），补充列如下：

| 接口属性 | 规则 |
| --- | --- |
| 响应类型 | `text/html; charset=utf-8`，静态文件 |
| 目录页尾斜杠 | GitHub Pages 将 `/bendi` 301 → `/bendi/`；页面间互链一律书写带尾斜杠规范形式 |
| h1 | 每页唯一（REQ-SEO-004） |
| 请求方法 | 仅 GET（任何 POST/PUT 到静态路径均 404/405，无副作用，天然安全） |
| 缓存策略 | GitHub Pages 默认（ETag / max-age=600），无自定义头能力，设计接受默认 |

### 表 2：data.js 数据契约（字段规范与消费方）

| 字段 | 类型 | 必填 | 约束 | 消费方 |
| --- | --- | --- | --- | --- |
| `id` | string | ✔ | 分站 slug，全文件唯一（bendi / meituan / jingdong-waimai / daojia / gouwu） | check-data.mjs 映射、README 维护流程 |
| `name` | string | ✔ | 非空；允许与源文件同名记录（第 1/4 条）；页面引用处逐字一致 | 首页卡片记录名行、CTA 预期管理文案 |
| `link` | string | ✔ | 合法 http/https URL；全文件唯一；CTA href 逐字符一致（REQ-CTA-005） | 分站全部 CTA |
| `description` | string | ✔ | ≥ 10 中文字符；方向与分站定位一致 | 首页卡片描述首句 |
| `deadline` | string | null | — | 有则 `YYYY-MM-DD`（ISO，由源 `YYYY.MM.DD` 规范化）；无则显式 `null` |
| `site.slug` / `site.url` | string | ✔ | 分站 slug 与规范 URL（带尾斜杠）；与目录结构一致 | 首页卡片链接、页脚互链、check-data.mjs |

### 表 3：静态资源接口（资产契约）

| 资源 | 规格 / 契约要点 | 引用方 |
| --- | --- | --- |
| `/favicon.ico` | ICO，BMP 帧 16/32/48（1.3.5.2） | head ① |
| `/favicon.svg` | SVG，64×64 viewBox（1.3.5.1 源稿） | head ② |
| `/favicon-{16,32,48}.png`、`/apple-touch-icon.png`(180)、`/android-chrome-{192,512}.png` | PNG，规格如名 | head ③~⑦ / manifest |
| `/site.webmanifest` | `{"name":"优惠集合导航","short_name":"优惠集合","icons":[{"src":"/android-chrome-192x192.png","sizes":"192x192","type":"image/png"},{"src":"/android-chrome-512x512.png","sizes":"512x512","type":"image/png"}],"theme_color":"#334155","background_color":"#F8FAFC","display":"standalone","start_url":"/"}`（REQ-FAV-002：name/short\_name/icons 双档/theme\_color 齐全） | head manifest |
| `/og-home.png` + `/og-{slug}.png` ×5 | 1200×630 PNG，每站一张两两不同（REQ-FAV-006） | og:image |
| `/assets/css/*`、`/assets/js/deadline.js` | 见 1.3.7.2 / 1.3.10.2 | 每页 head / body 尾 |
| `/robots.txt` | 终稿见 1.3.6.7 | 爬虫 |
| `/sitemap.xml` | 17 URL + lastmod（1.3.6.6） | 搜索引擎 |
| `/llms.txt` | 三层结构（1.3.6.8） | AI 引擎 |
| `/.nojekyll` | 空文件 | GitHub Pages（REQ-NFR-006） |
| `/data.js` | 规范化终稿（4.2.1）；**运行期无消费者**（2.1 设计决策） | 编辑期：站长、check-data.mjs |

### 表 4：服务契约（GitHub Pages 行为约定，验收对照）

| 场景 | 预期行为 |
| --- | --- |
| `GET /bendi`（无尾斜杠） | 301 → `/bendi/`（canonical 与互链均直接写带尾斜杠形式，避免跳转损耗） |
| `GET /bendi/` | 200，serve `bendi/index.html` |
| `GET /gouwu/dacu-rili.html` | 200，原样分发 |
| `GET /不存在的路径` | 404，serve `/404.html`（自定义页） |
| `GET /data.js` | 200，`text/javascript`（语法合法可执行，REQ-NFR-010） |
| 主分支 push | 自动部署（GitHub Actions Pages 工作流由平台托管，仓库无需自建） |

# **4\. 数据模型**

## **4.1 设计目标**

| # | 目标 | 说明 | 需求依据 |
| --- | --- | --- | --- |
| G1 | 单一真理源 | 推广链接的 name / link / description / deadline 仅在 data.js 定义一次；页面是它的物化投影 | REQ-NFR-008 |
| G2 | 逐字一致性 | 页面引用处的值与 data.js 逐字符一致，可被脚本自动抽检 | REQ-NFR-008、REQ-CTA-005 |
| G3 | 语法合法性 | data.js 是可直接被浏览器执行的 JS 文件（修复现有尾部残留） | REQ-NFR-010 |
| G4 | 无运行时耦合 | 任何页面不加载 data.js；数据模型变更不影响线上页面可用性 | spec 4.6 异常场景 1 |
| G5 | 可扩展 | 新增第 6 条推广链接可按既有模式扩展（新分站目录 + 卡片 + 互链 + sitemap/llms 同步） | spec 10.2.2/10.2.3 |
| G6 | 机器可校验 | 结构规整（稳定字段名、ISO 日期、显式 null），check-data.mjs 可零依赖解析 | REQ-NFR-009 |

## **4.2 模型实现**

### 4.2.1 data.js 规范化终稿（Phase C 直接落地稿）

```js
/**
 * youhui8.github.io 推广链接唯一数据源（Single Source of Truth）
 * ------------------------------------------------------------------
 * 维护规则（详见仓库 README.md「维护说明」）：
 *  1. 本文件是全部推广链接的唯一数据源；修改任何字段后，须按 README
 *     「同步落点清单」更新对应页面（首页卡片、分站 CTA、期限组件、
 *     sitemap.xml lastmod、llms.txt）。
 *  2. 字段说明：
 *     - id          记录标识 = 对应分站目录 slug（全文件唯一）
 *     - name        推广记录名（页面引用处须逐字一致）
 *     - link        外部推广目标 URL（全文件唯一；CTA href 逐字符一致，
 *                   禁止改写、追加参数或二次包装）
 *     - description 一句话描述（首页卡片描述首句逐字引用）
 *     - deadline    活动截止日期，ISO 格式 YYYY-MM-DD；无期限时为 null
 *                   （历史格式 2026.12.31 已于 2026-10 规范化为 2026-12-31）
 *     - site        对应分站映射：slug + 规范 URL（带尾斜杠）
 *  3. 每条记录与分站保持 1:1 固定映射；删除记录前先按 README 流程
 *     下线对应分站并清理 sitemap / llms.txt / 互链，避免死链。
 */
const youhuiList = Object.freeze([
  {
    id: 'bendi',
    name: '本地生活集合页',
    link: 'https://kzurl18.cn/tHj1ww',
    description: '美团外卖、团购、酒旅等本地生活优惠集合入口',
    deadline: null,
    site: { slug: 'bendi', url: 'https://youhui8.github.io/bendi/' },
  },
  {
    id: 'meituan',
    name: '美团本地生活集合页',
    link: 'https://kurl07.cn/te2qe9',
    description: '美团外卖、团购、酒旅等本地生活优惠集合入口',
    deadline: '2026-12-31',
    site: { slug: 'meituan', url: 'https://youhui8.github.io/meituan/' },
  },
  {
    id: 'jingdong-waimai',
    name: '京东外卖集合页',
    link: 'https://1.yoourl.net/link/10009836aafbeff4e2171002ArLVtpn4',
    description: '京东外卖优惠入口，点外卖领红包更划算',
    deadline: '2026-12-31',
    site: { slug: 'jingdong-waimai', url: 'https://youhui8.github.io/jingdong-waimai/' },
  },
  {
    id: 'daojia',
    name: '本地生活集合页',
    link: 'http://h.fxzb.vip/2vnMAd0ISWs',
    description: '美团外卖、特惠洗车、京东家政等本地生活优惠集合入口',
    deadline: null,
    site: { slug: 'daojia', url: 'https://youhui8.github.io/daojia/' },
  },
  {
    id: 'gouwu',
    name: '本地生活+网购集合页',
    link: 'https://taoduoyu118.kzurl01.cn/?tm8b2RlD',
    description: '美团京东饿了么外卖优惠集合+淘宝京东拼多多入口',
    deadline: null,
    site: { slug: 'gouwu', url: 'https://youhui8.github.io/gouwu/' },
  },
]);


```

与源文件 diff 说明：删除第 29~31 行残留的 `],},],`；补 `Object.freeze` 与 `];` 正确闭合；原 4 字段值逐字保留；`deadline` 由 `'2026.12.31'` 规范化为 `'2026-12-31'`（理由见 1.3.4.2 第 2 点）；无期限记录显式写 `deadline: null`（禁止省略字段造成"undefined vs 无"歧义）；新增 `id` / `site` 扩展字段。

### 4.2.2 站点注册模型（site registry，映射关系的规范表述）

6 站注册表（本表为设计模型，物化为：首页卡片、页脚互链、sitemap、llms.txt 四处）：

| slug | 站名 | 规范 URL | 记录 id | deadline | 主题 CSS | og 图 |
| --- | --- | --- | --- | --- | --- | --- |
| home | 优惠集合导航 | `https://youhui8.github.io/` | —（枢纽，无记录） | — | theme-home.css | og-home.png |
| bendi | 本地生活优惠集 | `…/bendi/` | bendi | null | theme-bendi.css | og-bendi.png |
| meituan | 美团优惠专区 | `…/meituan/` | meituan | 2026-12-31 | theme-meituan.css | og-meituan.png |
| jingdong-waimai | 京东外卖红包站 | `…/jingdong-waimai/` | jingdong-waimai | 2026-12-31 | theme-jingdong-waimai.css | og-jingdong-waimai.png |
| daojia | 到家服务特惠 | `…/daojia/` | daojia | null | theme-daojia.css | og-daojia.png |
| gouwu | 网购外卖省钱站 | `…/gouwu/` | gouwu | null | theme-gouwu.css | og-gouwu.png |

### 4.2.3 deadline 状态模型（三态，驱动展示与降级）

```
记录级：deadline = null ────────────► 展示态 NONE：零期限元素（REQ-DL-004）
记录级：deadline = '2026-12-31' ─┬─ 会话级比较：today ≤ deadline ──► ACTIVE：徽章+日期（REQ-DL-001）
                                └─ 会话级比较：today >  deadline ──► EXPIRED：中性文案+保 CTA（REQ-DL-002/003/005）
会话级状态由 deadline.js 在客户端求值（无 JS 时停留在静态 ACTIVE 文案，
其"以页面标注为准"后缀保证表述不失实）。


```

### 4.2.4 SEO 元数据模型（每页派生规则）

```
page(url) → {
  title        = {页面主题短语} ｜ {所属站名}          // ≤30 中文字符，全站唯一
  description  = 按所属站句式骨架撰写                  // 60~120 中文字符，全站唯一
  canonical    = url（目录页带尾斜杠 / 文件页 .html）
  og:type      = index/about → website；攻略页 → article
  og:image     = /og-{slug}.png（六站两两不同）
  jsonld       = 按页型查 1.3.6.4 选型表
  inSitemap    = true（404 除外）；inLLMs = 同 sitemap
  lastmod      = 页面最近实质修改日（YYYY-MM-DD）
}


```

### 4.2.5 校验模型（check-data.mjs 的比对规则，Phase D1 实现）

1.  解析 data.js（`node --input-type=module` 动态 import 或 `new Function` 取 `youhuiList`）。
2.  逐记录 × 逐页面：`link` 出现处（对应分站全部 `<a class="promo-cta">`）逐字符相等；`description`、`name`、`deadline` 在 1.3.4.3 物化落点表中声明的位置出现且逐字一致。
3.  结构校验：HTML 文件树 = 1.3.3 文件树（18 html + 资产清单）；sitemap URL 集 = 17 内容页集合；llms.txt 链接集 ⊇ sitemap URL 集。
4.  SEO 校验：title ≤ 30 字且全站唯一；description 长度 60~120 且全站唯一；每页恰好 1 个 h1、1 段 JSON-LD（JSON.parse 通过）。
5.  输出：PASS/FAIL + 差异明细；exit code 0/1（供提交前本地校验与 Phase G 使用）。

# **5\. 技术风险与对策**

| # | 风险 | 影响 | 概率 | 对策（设计已内置 / 执行期动作） |
| --- | --- | --- | --- | --- |
| R1 | 纯 JS PNG/ICO 编码器实现复杂度超预期（sharp 不可用时） | favicon / og 资产延期 | 中 | 三级降级链（1.3.5.2）：sharp → 纯 JS 编码器（Node zlib + CRC32，圆环为距离判断几何绘制）→ 简化双圆点图形；Phase D1 第一天先验证编码器可行性，再做批量生成 |
| R2 | sharp 渲染 SVG 中文依赖系统字体，Windows/Linux CI 字体缺失 | og 图文字缺失 | 中 | SVG 显式声明 `font-family="Microsoft YaHei, PingFang SC"`；兜底方案改用点阵拉丁字母（slug 大写），仍满足"六图两两不同"验收线 |
| R3 | 手工物化 data.js 造成页面与数据源漂移（改了 data.js 忘改页面） | REQ-NFR-008 验收失败 | 高 | check-data.mjs 自动比对（4.2.5）+ README 七处落点清单（1.3.4.3）+ Phase G 验收纳入脚本输出 |
| R4 | 无 JS 环境下过期文案停留"限时"徽章 | REQ-DL-003 边缘违规 | 低 | 静态文案即设计为非紧迫表述："有效期至…，以页面标注为准"（1.3.10.1）；徽章"限时"二字与"即将截止"类失实文案区分，兜底语义可辩护 |
| R5 | 客户端时钟错误（用户改系统时间） | 降级判断偏差 | 低 | 接受：deadline 判断本就以访客本地时间为准（spec REQ-DL-005 允许"页面内轻量日期比较或等价机制"）；无更优纯静态方案 |
| R6 | Windows 开发环境路径大小写不敏感 → 部署后死链 | REQ-NFR-005 失败 | 中 | 路径规范冻结全小写（1.3.3 规则 1）；check-data.mjs 扫描文件树大小写；互链统一绝对 URL 减少相对路径出错面 |
| R7 | 手工维护 17 URL 的 sitemap / llms.txt 遗漏新页面 | 收录不全 | 中 | 4.2.5 校验第 3 条：sitemap URL 集 = 内容页集合、llms ⊇ sitemap，脚本强制一致性 |
| R8 | SEO 强竞争词（"美团红包"等）排名冷启动困难 | 流量目标不达 | 高 | 设计层对策：长尾关键词布局（1.3.1 各表目标关键词均含场景词/对比词）、六站差异化内容避免内耗（REQ-DIFF-004）、FAQPage 争取富摘要、AI 引擎（llms.txt + 结构化正文）作为第二流量曲线 |
| R9 | 外部短链失效 / 活动提前结束 | 用户点击后体验差 | 高 | spec 明确非本站责任（1.6.7）：不监控、不代理；deadline 降级文案已做预期管理；页脚披露"活动信息以目标页为准"（1.3.11.1） |
| R10 | deadline.js 替换文案引起 CLS | Lighthouse 性能分下降 | 低 | 组件固定 min-height + 徽章不占文档流（1.3.10 CLS 防抖条目） |
| R11 | GitHub Pages 尾斜杠 301 与 canonical 不一致导致重复收录 | SEO 信号分散 | 低 | canonical 规则与服务器行为对齐（1.3.6.2）：目录页带尾斜杠、文件页 .html；互链直接书写规范形式避免跳转 |
| R12 | 6 站共用组件导致"换皮感"，差异化验收（REQ-DIFF-006）争议 | 验收标准分歧 | 中 | 差异落在三个可测维度：主色（1.3.2.2 色值表）、布局骨架（每站独立网格结构）、排印基调；1.3.2.2 末尾给出"并排 10 秒"验收自查法 |

* * *

# **附录 A：REQ 覆盖映射核对表（78 条逐条）**

> 核对结论：[spec.md](http://spec.md) 附录所列 12 个需求区域、78 条 EARS 需求**全部在本设计中有唯一或主责落点**，无遗漏、无越界（暗色模式、PWA、站内搜索等 Out of Scope 项未引入）。逐条映射如下：

### A.1 首页导航（REQ-NAV，6/6）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-NAV-001 | 1.3.1.3 | 首页分站卡片区块：站名 + description 首句 + 补充语（≥20 字）+ 站内链接 |
| REQ-NAV-002 | 1.3.4.3、2.1 | 轨道 A 物化直出，初始 HTML 全量内容，零 JS 渲染依赖 |
| REQ-NAV-003 | 1.3.6.5 | 锚文本=站名；禁用无语义锚 |
| REQ-NAV-004 | 1.3.1.3 | 卡片全部指向站内分站 URL，首页无外链主入口 |
| REQ-NAV-005 | 1.3.10.1 + 1.3.4.3 | 首页卡片复用期限组件，deadline 物化落点含首页 |
| REQ-NAV-006 | 1.3.1.3 + 1.3.8.1 | about 入口 + 页脚友链区块 |

### A.2 分站 CTA（REQ-CTA，6/6）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-CTA-001 | 1.3.1.4~1.3.1.8 各 index 区块④ | 首屏 CTA 区（hero 区内，无滚动可见），href=data.js link |
| REQ-CTA-002 | 1.3.1 各攻略大纲末项 | 每篇正文含 ≥1 个 CTA / 引导链接 |
| REQ-CTA-003 | 1.3.8.2 | target="\_blank" + rel 含 noopener |
| REQ-CTA-004 | 1.3.8.2 | rel="sponsored nofollow noopener" 三属性 |
| REQ-CTA-005 | 1.3.4.3 + 4.2.5 | link 物化逐字符一致 + 脚本校验 |
| REQ-CTA-006 | 1.3.11.2 | CTA 说明文案模板（≥15 字，含 data.js name） |

### A.3 有效期处理（REQ-DL，5/5）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-DL-001 | 1.3.10.1 | 统一格式"有效期至 2026-12-31"+ 可选"限时"徽章 |
| REQ-DL-002 | 1.3.10.2 | 过期降级中性文案 + CTA 保留可点 |
| REQ-DL-003 | 1.3.10.1 | 文案白名单：不含"限时有效/即将截止"类失实表述 |
| REQ-DL-004 | 1.3.10.1 | 无 deadline 记录零期限元素（三态模型 NONE 态） |
| REQ-DL-005 | 1.3.10.2 | deadline.js 客户端自动切换，无需手工改文案 |

### A.4 友情链接网络（REQ-LINK，6/6）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-LINK-001 | 1.3.8.1 | 页脚组件规范，18 页全部包含（含 404） |
| REQ-LINK-002 | 1.3.8.1 | 其余 5 站互链，绝对 URL + 站名锚文本 |
| REQ-LINK-003 | 1.3.8.1 | 3 外链固定锚文本（券宝/优惠聚合/号卡办理中心） |
| REQ-LINK-004 | 1.3.8.2 | 普通 `<a href>`、无 JS 跳转、互链无 nofollow、外链不标 sponsored |
| REQ-LINK-005 | 1.3.8.3 | K6 完全图拓扑，链接距离 ≤1 |
| REQ-LINK-006 | 1.3.8.1 | 静态 HTML 输出，禁 JS 完整可见 |

### A.5 内容要求（REQ-CONTENT，8/8）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-CONTENT-001 | 1.3.1.2 | 17 页清单（首页站 2 + 每分站 3），全部入 sitemap/llms |
| REQ-CONTENT-002 | 1.3.1.4~1.3.1.8 区块① | 各分站 index ≥500 字 + ≥3 区块（大纲已列 4 区块） |
| REQ-CONTENT-003 | 1.3.1 各攻略大纲 | ≥600 字、h2/h3 层级、每篇含表格或列表（大纲已内置） |
| REQ-CONTENT-004 | 1.3.1.3 | 首页 ≥400 字简介 + 卡片描述 ≥20 字 |
| REQ-CONTENT-005 | 1.3.1 全部大纲 + 1.3.12.4 | 选题均为真实具体内容；404 页同样禁占位 |
| REQ-CONTENT-006 | 1.3.1.3 关键词注记 | 自然分布约束，Phase C 撰写原则 |
| REQ-CONTENT-007 | 1.3.1 各大纲 | 均为真实合理的平台玩法表述，不虚构力度 |
| REQ-CONTENT-008 | 1.3.11.3 | 聚合导航身份表述规范 |

### A.6 差异化矩阵（REQ-DIFF，6/6）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-DIFF-001 | 1.3.1.1 + 1.3.6.1 | 6 站名/title 主题词/H1 两两不同（title 草案 17 条全列） |
| REQ-DIFF-002 | 1.3.2.1 | 每站 ≥2 独特栏目矩阵，符合 spec 差异化表方向 |
| REQ-DIFF-003 | 1.3.2.2 | 6 主色值两两可区分（灰蓝/橙/黄绿/红/天蓝/紫） |
| REQ-DIFF-004 | 1.3.1.9 | 选题查重结论：体裁五分，交叉话题角度显著不同 |
| REQ-DIFF-005 | 1.3.1.9 | 正文段落互不复制，共享仅限全局组件文字 |
| REQ-DIFF-006 | 1.3.2.2 | tokens+base 共享、theme-{slug} 覆盖 + 布局骨架差异（非仅换文字） |

### A.7 SEO（REQ-SEO，11/11）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-SEO-001 | 1.3.6.1 | title 模板 + 17 条草案（≤30 字，两两唯一） |
| REQ-SEO-002 | 1.3.6.1 + 4.2.5 | 六站句式骨架 + 脚本校验唯一性与长度 |
| REQ-SEO-003 | 1.3.6.2 | canonical 规则表（目录带尾斜杠） |
| REQ-SEO-004 | 2.1 + 1.3.7.1 | 语义化结构 + 每页唯一 h1 |
| REQ-SEO-005 | 1.3.6.3 | OG 四项 + og:image 六站独立 1200×630 |
| REQ-SEO-006 | 1.3.6.4 | JSON-LD 按页型选型 + FAQPage ×4（≥2） |
| REQ-SEO-007 | 1.3.6.6 | sitemap 17 URL + lastmod |
| REQ-SEO-008 | 1.3.6.7 | robots.txt 终稿（通配允许 + 6 AI 爬虫 + Sitemap 行） |
| REQ-SEO-009 | 2.1 | html lang="zh-CN" |
| REQ-SEO-010 | 1.3.6.5 | 内链深度：首页 1 跳达分站、index 1 跳达攻略、页脚 1 跳互达 |
| REQ-SEO-011 | 1.3.6.4 | 可见面包屑 + BreadcrumbList 逐字一致 |

### A.8 AI 友好（REQ-AI，4/4）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-AI-001 | 1.3.6.8 | llms.txt 三层结构完整草案 |
| REQ-AI-002 | 1.3.6.7 | 与 REQ-SEO-008 合并落实 |
| REQ-AI-003 | 1.3.4.3 + 1.3.6.8 | 正文静态直出、无脚本渲染信息 |
| REQ-AI-004 | 1.3.6.8 配套 | 标题不跳级 + 语义化列表/表格（各攻略大纲内置） |

### A.9 favicon 与资产（REQ-FAV，6/6）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-FAV-001 | 1.3.5.2 | 7 项资产矩阵（含任务追加的 48×48 与 favicon.svg，共 9 文件） |
| REQ-FAV-002 | 2.2 表 3 | webmanifest 完整 JSON（name/short\_name/icons 双档/theme\_color） |
| REQ-FAV-003 | 1.3.5.3 | head 引用链 7 项（超 spec 最小 5 项要求） |
| REQ-FAV-004 | 1.3.5.3 | SVG→PNG→ICO 回退链 + 三平台验证点 |
| REQ-FAV-005 | 1.3.5.1 | 原创品牌图形"无限惠环"，6 站统一 |
| REQ-FAV-006 | 1.3.5.2 脚本 B | og ×6（1200×630、两两不同、按站主色） |

### A.10 响应式（REQ-RWD，5/5）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-RWD-001 | 1.3.7.3 | 320px~1920px+ 断点行为表（移动优先） |
| REQ-RWD-002 | 1.3.7.2 | 44px 触控基线 + 窄屏堆叠规则 |
| REQ-RWD-003 | 1.3.7.3 | 72ch 阅读限宽 + 桌面多列网格 |
| REQ-RWD-004 | 1.3.7.1 | 正文零位图；位图仅 favicon/og 且 ≤300KB |
| REQ-RWD-005 | 1.3.7.3 | 流式布局无固定宽，旋转天然通过 |

### A.11 性能 / 可靠性 / 可维护性（REQ-NFR，11/11）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-NFR-001 | 1.3.7.1 | 零框架、零 CDN、零 Web 字体选型表 |
| REQ-NFR-002 | 1.3.9 | 预算表（HTML 60K / CSS 40K / JS 1K，均严于上限） |
| REQ-NFR-003 | 1.3.9 | Lighthouse 四项对齐 |
| REQ-NFR-004 | 1.3.9 + 1.3.10 | LCP/CLS 手段 + CLS 防抖设计 |
| REQ-NFR-005 | 1.3.3 + 4.2.5 + 2.2 表 4 | 路径规范 + 脚本扫死链 + 服务契约对照 |
| REQ-NFR-006 | 1.3.3 | .nojekyll 在文件树 |
| REQ-NFR-007 | 1.3.7.1 + 1.3.9 | 目标浏览器矩阵 + 无外部依赖天然无 404 |
| REQ-NFR-008 | 1.3.4.3 + 4.2.1 | SSOT + 物化落点表 + 逐字校验 |
| REQ-NFR-009 | 1.3.4.3 | README 同步流程（七处落点清单） |
| REQ-NFR-010 | 1.3.4.1 / 4.2.1 | 语法残留修复 + 合法终稿 |
| REQ-NFR-011 | 1.3.3 + 1.3.4.3 | README 维护说明范围（结构图 / 改链接 / 加攻略流程） |

### A.12 合规（REQ-COMP，4/4）

| REQ | 落点 | 覆盖方式 |
| --- | --- | --- |
| REQ-COMP-001 | 1.3.11.1 | 页脚推广披露声明逐字文案 |
| REQ-COMP-002 | 1.3.11.1 | 品牌免责声明（页脚 + about 双落点） |
| REQ-COMP-003 | 1.3.11.3 | 禁第三方 Logo、禁官方暗示 |
| REQ-COMP-004 | 1.3.8.2 + 1.3.11.1 | rel 标注与披露声明双落实 |

* * *

## 版本记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0 | 2026-10-20 | 初稿：基于 [spec.md](http://spec.md) v1.0（78 条需求）完成全部技术设计；待团队评审后交 Phase C/D1 执行 |