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
