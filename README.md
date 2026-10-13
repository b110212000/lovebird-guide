# 香蕉的养鸟手册 · React v2.3.0

免费 iPhone PWA，部署在 GitHub Pages：
https://b110212000.github.io/lovebird-guide/

## 技术架构

- 正式 React 19 + ReactDOM，使用 esbuild 编译为生产环境 JavaScript、CSS。
- `src/App.jsx`：页面、React hooks、本地喂食打卡、备份、Toast、帮助弹窗及抽屉菜单。
- `src/content.js`：从旧版保留的简体／繁体养鸟资料，包含喂养、月龄、行为、环境、健康与来源。
- `src/styles.css` 和 `src/chrome.css`：固定标题列、独立滑动区、底部导航、全屏抽屉、Modal、Toast，参考 MLB 记分板的设计逻辑。
- `src/index.html` 和 `src/sw.js`：GitHub Pages 静态入口和 PWA 离线缓存模板。
- `scripts/build.mjs`：esbuild 打包。
- `.github/workflows/build-react.yml`：main 更新源文件时安装依赖并生成正式 `index.html`、`sw.js`、`assets/app-2.3.0.js` 和 CSS。

## 主要功能

1. 五个 Tab：首页、指南、月龄、打卡、设置。首页不再塞满说明文字。
2. 右上角问号打开说明 Modal，操作结果使用约 2 秒 Toast，错误约 4 秒。
3. 小鸟名称、生日、早晚检查时间、每日六项检查、完成时间及观察日记只保存在 localStorage。沿用旧版 `ylg-` 数据键，升级不主动清理旧资料。
4. 保留 iPhone 日历重复提醒的 ICS 导出；**App 关闭后，纯前端网页无法可靠地后台准时推送**。
5. 安装分享、简繁切换、维基百科背景知识与 JSON 备份／恢复。

## 本地开发

```sh
npm install
npm run build
```

构建好的静态 `index.html`、`sw.js`、`assets` 可直接部署至 GitHub Pages 的 main 分支根目录。

## 注意

未断奶幼鸟需要鸟类兽医指导；每日两次勾选表示检查、补充主食，不代表限制鸟一天只能吃两次。
