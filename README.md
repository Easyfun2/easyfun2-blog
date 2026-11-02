# easyfun2-blog

Easyfun2 的个人主页与博客 —— 纯静态站点，托管在 GitHub Pages。

- 站点地址：<https://easyfun2.github.io/easyfun2-blog/>
- 仓库：<https://github.com/Easyfun2/easyfun2-blog>

## 结构

```text
.
├── index.html                    # 首页：关于 / 技能 / 项目 / 文章 / 联系
├── posts/                        # 文章（每篇一个 HTML 文件）
│   ├── hello-world.html
│   └── build-with-github-pages.html
├── assets/
│   ├── style.css                 # 全站样式（改 :root 里的变量即可换色）
│   └── main.js                   # 深色模式切换 + 页脚年份
├── .nojekyll                     # 跳过 Jekyll，直接按静态文件发布
└── README.md
```

## 怎么改

需要改的都是静态文件，改完 `git push` 即可生效：

| 想改什么 | 改哪里 |
| --- | --- |
| 名字 / 一句话介绍 | `index.html` 的 `#top` 区块 |
| 关于我 | `index.html` 的 `#about` 区块（有 `TODO` 注释） |
| 技能标签 | `index.html` 的 `.chips` 列表 |
| 项目卡片 | `index.html` 的 `#projects` 里的 `.card` |
| 联系方式 / 邮箱 | `index.html` 的 `#contact`（邮箱是占位 `hello@example.com`） |
| 主题色 | `assets/style.css` 的 `--accent`（浅色/深色各一处） |
| 页脚 | 所有页面的 `.site-footer` |

### 新增一篇文章

1. 复制 `posts/hello-world.html` 为 `posts/你的文件名.html`，改标题、日期和正文；
2. 在首页 `index.html` 的 `#writing` 列表里加一条链接，页脚年份会自动更新。

## 本地预览

```sh
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 部署

仓库 Settings → Pages → Build and deployment → Source 选 `Deploy from a branch`，
分支 `main`、目录 `/ (root)`，保存后等一两分钟即可。

## 待补充（占位内容）

- [ ] 姓名 / 昵称（当前用 `Easyfun2`）
- [ ] 职业身份与一句话自我介绍
- [ ] 真实邮箱（当前 `hello@example.com`）
- [ ] 项目列表（当前按公开仓库挑选，描述可再润色）
- [ ] 如有个人域名，加 `CNAME` 文件并配置 DNS
