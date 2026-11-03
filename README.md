# easyfun2-blog

Easyfun2 的个人主页 —— 纯静态站点，托管在 GitHub Pages。

- 线上地址：<https://easyfun2.github.io/easyfun2-blog/>
- 仓库：<https://github.com/Easyfun2/easyfun2-blog>

## 结构

```text
.
├── index.html                    # 首页：关于 / 技能 / 项目 / 热榜 / 文章 / 联系
├── 404.html                      # 自定义 404
├── posts/                        # 文章（每篇一个 HTML 文件）
│   ├── hello-world.html
│   └── build-with-github-pages.html
├── assets/
│   ├── style.css                 # 全站样式（改 :root 变量即可换主题色）
│   ├── main.js                   # 深浅色主题 / 汇率 / 导航高亮 / 热榜渲染
│   └── favicon.svg
├── data/hot.json                 # 热榜数据（由 GitHub Actions 每 20 分钟更新）
├── data/fx.json                  # 美元/人民币汇率（由 GitHub Actions 每小时更新）
├── scripts/fetch-hot.mjs         # 抓取热榜的脚本
├── scripts/fetch-fx.mjs          # 抓取汇率的脚本
├── .github/workflows/update-hot.yml
├── .github/workflows/update-fx.yml
├── robots.txt / sitemap.xml
└── .nojekyll                     # 跳过 Jekyll，直接按静态文件发布
```

## 怎么改

| 想改什么 | 改哪里 |
| --- | --- |
| 名字 / 一句话介绍 | `index.html` 的 `.hero` 区块 |
| 关于我 | `index.html` 的 `#about`（有 `TODO` 注释） |
| 技能标签 | `index.html` 的 `.chips` |
| 项目卡片 | `index.html` 的 `#projects` |
| 美元汇率卡片 | `index.html` 的 `#fx`（数据在 `data/fx.json`） |
| 联系方式 / 邮箱 | `index.html` 的 `#contact`（邮箱目前是占位 `hello@example.com`） |
| 主题色 | `assets/style.css` 的 `--accent`（浅色 / 深色各一处） |

### 新增一篇文章

1. 复制 `posts/hello-world.html` 为 `posts/你的文件名.html`，改标题、日期和正文；
2. 在首页 `index.html` 的 `#writing` 里加一条链接；
3. 顺手把新地址加进 `sitemap.xml`。

## 热榜数据怎么来的

站点是纯静态的，浏览器的跨域限制让它没法直接请求热榜接口，所以用「GitHub Actions 抓取 → 写成同仓库的 JSON → 页面读取」的方式：

1. `.github/workflows/update-hot.yml` 每 20 分钟跑一次；
2. `scripts/fetch-hot.mjs` 请求热榜 API，把知乎 / 虎扑 / 微博 / 今日头条各前 20 条写进 `data/hot.json`；
3. 提交后 GitHub Pages 重新发布，页面拿到新数据（页面上会显示「更新于 …」）。

- 数据源：今日热榜 API `https://hot.baiwumm.com/api/<平台>`，可用仓库变量 `HOT_API_BASE` 换成自己的镜像；
- 单个平台失败时保留上次数据，不会整站失败；
- 手动刷新：Actions 页面点 `Run workflow`，或本地 `node scripts/fetch-hot.mjs` 后提交。

## 汇率数据怎么来的

首页的「美元兑人民币」卡片和热榜一样，走「Actions 抓取 → 写 JSON → 页面读取」：

1. `.github/workflows/update-fx.yml` 每小时（整点后第 7 分钟）跑一次；
2. `scripts/fetch-fx.mjs` 抓新浪财经实时外汇行情（`fx_susdcny`），写入 `data/fx.json`，包含最新价、昨收、涨跌额与涨跌幅；
3. 提交后 GitHub Pages 重新发布，卡片显示「更新于 …」与「数据来源」；
4. 页面拿不到 `data/fx.json` 时，`assets/main.js` 会直接向 `open.er-api.com` 取当日参考汇率兜底。

- 新浪抓取失败时保留旧数据，不会把线上文件写坏；
- 汇率没变化时不产生提交；
- 手动刷新：Actions 里点 `Run workflow`，或本地 `node scripts/fetch-fx.mjs` 后提交。

## 本地预览

```sh
python3 -m http.server 8000
# 打开 http://localhost:8000
```

带热榜、汇率数据的预览需要先跑一次 `node scripts/fetch-hot.mjs` 和 `node scripts/fetch-fx.mjs`（需要 Node 20+，无需安装依赖）。

## 部署

Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`。

## 待补充（占位内容）

- [ ] 姓名 / 昵称（当前用 `Easyfun2`）
- [ ] 职业身份与一句话自我介绍
- [ ] 真实邮箱（当前 `hello@example.com`）
- [ ] 项目描述按实际内容润色
- [ ] 如有个人域名，加 `CNAME` 并配置 DNS
