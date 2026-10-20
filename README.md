# youhui8.github.io — 优惠集合导航

非官方的优惠信息聚合导航站：一个首页枢纽 + 5 个垂直分站（本地生活 / 美团优惠 / 京东外卖红包 / 到家服务 / 网购省钱）。纯静态站点，无后端、无构建依赖、无 CDN，直接部署到 GitHub Pages。

## 快速链接

- 线上地址：<https://youhui8.github.io/>
- 规格文档：`.codearts/specs/youhui-network/`（spec.md 需求 / design.md 设计与契约 / tasks.md 任务）

## 目录结构

```
├── index.html              首页（站点矩阵说明 + 五大分站导航 + FAQ）
├── 404.html                错误页（noindex，不进 sitemap）
├── about/index.html        关于本站
├── data.js                 ★ 推广链接唯一数据源（Single Source of Truth）
├── robots.txt / sitemap.xml / llms.txt / .nojekyll
├── favicon.ico / favicon.svg / favicon-{16,32,48}.png
├── apple-touch-icon.png / android-chrome-{192,512}.png / site.webmanifest
├── og-{home,bendi,meituan,jingdong-waimai,daojia,gouwu}.png   社交分享图
├── assets/
│   ├── css/tokens.css      第 1 层：设计 token（颜色/间距/字号，全站唯一定义处）
│   ├── css/base.css        第 2 层：共享组件与布局（header/card/footer/面包屑等）
│   ├── css/theme-home.css  第 3 层：主题色变体（首页与 404 用 home 主题）
│   └── js/deadline.js      全站唯一 JS：有效期过期降级（~15 行，async，静默失败）
├── scripts/
│   ├── check-data.mjs      一致性校验（详见下文）
│   ├── gen-icons.mjs       favicon 位图/ICO 再生成（依赖 pnglib.mjs）
│   ├── gen-og.mjs          6 张 og 分享图再生成（依赖 pnglib.mjs）
│   └── pnglib.mjs          零依赖 PNG/ICO 编码器（zlib + CRC32）
└── {bendi,meituan,jingdong-waimai,daojia,gouwu}/   分站目录（D2 交付）
```

## data.js：唯一数据源

`data.js` 是全部推广链接的唯一数据源，页面内容从它"物化直出"（静态写进 HTML，页面**不加载** data.js）。每条记录与一个分站 1:1 映射：

```js
{
  id: 'meituan',                                  // = 分站目录 slug，全文件唯一
  name: '美团本地生活集合页',                       // 推广记录名，页面引用处逐字一致
  link: 'https://kurl07.cn/te2qe9',               // 外部推广 URL，CTA href 逐字符一致
  description: '美团外卖、团购、酒旅等本地生活优惠集合入口',
  deadline: '2026-12-31',                         // ISO 格式；无期限为 null
  site: { slug: 'meituan', url: 'https://youhui8.github.io/meituan/' },
}
```

### 修改 data.js 后必须同步的 7 处落点

| # | 落点 | 同步内容 |
|---|------|----------|
| 1 | `index.html` 首页卡片 | card-desc 首句 = description；card-note = "推广入口：{name}"；deadline 变化同步徽章行 |
| 2 | 对应分站全部 CTA | `href` 逐字符 = link（禁止改写/加参数）；文案与 data-deadline 属性 |
| 3 | deadline 组件 | `<p class="promo-deadline" data-deadline="…">` 与静态文案"有效期至 …，以页面标注为准" |
| 4 | `sitemap.xml` | 受影响页面的 lastmod 更新为当天 |
| 5 | `llms.txt` | 站点矩阵节的描述与期限标注 |
| 6 | og 分享图 | 仅当站名/域名文字变化时重跑 `node scripts/gen-og.mjs` |
| 7 | 本 README | 仅当结构变化时更新目录树 |

改完必跑校验：`node scripts/check-data.mjs`（见下文）。

## 校验脚本（scripts/check-data.mjs）

零依赖，Node ≥ 18，五节校验：data.js 结构 / HTML 物化逐字比对 / sitemap+llms 一致性 / 静态资产魔数 / JSON-LD 可解析。

```bash
node scripts/check-data.mjs          # 宽松模式：分站未建仅 WARN（D1 阶段）
node scripts/check-data.mjs --strict # 严格模式：分站缺失 FAIL，作 D2 合入门禁
```

退出码 0 = 通过，1 = 有错误。CI 可直接以退出码作门禁；模块可 `import { runAll } from './scripts/check-data.mjs'` 复用。

## 主题机制（三层 CSS）

1. **tokens.css**：全部设计 token（CSS 变量）。改颜色/间距只改这里。
2. **base.css**：共享组件样式，引用 token 变量，不写死颜色。
3. **theme-{slug}.css**：每站一个主题变体，通过 `<body data-site="{slug}">` 生效——变体内用 `[data-site="meituan"] { --c-primary: … }` 覆盖 token，base.css 的组件即整体换肤。分站页面引入 `tokens + base + theme-{slug}` 三个文件。

## deadline 组件（assets/js/deadline.js）

- 结构：`<p class="promo-deadline" data-deadline="2026-12-31"><span class="badge badge-limited">限时</span><span class="deadline-text">有效期至 2026-12-31，以页面标注为准</span></p>`
- JS 仅做过期降级（移除"限时"徽章 + 改文案），**不改链接**；无 JS 时静态文案停留，表述不失实。
- 无期限的站（bendi / daojia / gouwu）：页面**不出现**期限元素，也**不引入** deadline.js。
- 含 `data-deadline` 的页面必须引入 deadline.js（校验脚本强制）。

## 分站工程师契约（D2 必读）

1. **CTA href 逐字符**复制 data.js 的 link，禁止改写、追加参数、二次包装（校验脚本逐字比对）。
2. 外链 CTA 必须带 `rel="sponsored nofollow noopener"` 与 `target="_blank"`。
3. 页面不加载 data.js（轨道 A：内容静态直出承担 SEO 与无 JS 回退）。
4. head 顺序与首页一致：favicon 组 → tokens/base/theme-{slug} → og（og:image 用本站 og-{slug}.png）→ JSON-LD。
5. 每站新建 `assets/css/theme-{slug}.css` 主题变体（参考 theme-home.css，主色见 design.md 4.2.2）。
6. 交付前跑 `node scripts/check-data.mjs --strict` 必须 0 FAIL。

## 资产再生成

```bash
node scripts/gen-icons.mjs   # 重生成 favicon 位图 + favicon.ico（"无限惠环"圆环母题，6 站统一）
node scripts/gen-og.mjs      # 重生成 6 张 1200×630 og 分享图（各站渐变 + 点阵域名）
```

两个脚本均零依赖（内置 pnglib.mjs 编码器）。

## 部署

GitHub Pages（`main` 分支根目录）。`.nojekyll` 已就位，静态文件原样发布。上线后核对 `https://youhui8.github.io/sitemap.xml` 与 `robots.txt` 可访问。

## 维护提醒

- 页脚两段披露（推广声明 + 品牌免责）全站统一，不得删改。
- 页面一律不引外部字体/CDN 资源；性能预算：HTML ≤ 60KB、CSS 合计 ≤ 40KB、JS ≤ 1KB。
- 删除 data.js 记录前，先下线对应分站并清理 sitemap / llms.txt / 互链，避免死链。
