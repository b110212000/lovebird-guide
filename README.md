# 香蕉的养鸟手册 · React v2.6.0

免费 iPhone PWA，部署在 GitHub Pages：
https://b110212000.github.io/lovebird-guide/

## 技术架构

- 正式 React 19 + ReactDOM，使用 esbuild 编译为生产环境 JavaScript、CSS。
- `src/App.jsx`：页面、React hooks、本地喂食打卡、备份、Toast、帮助弹窗及抽屉菜单。
- `src/content.js`：从旧版保留的简体／繁体养鸟资料，包含喂养、月龄、行为、环境、健康与来源。
- `src/styles.css` 和 `src/chrome.css`：固定标题列、独立滑动区、底部导航、全屏抽屉、Modal、Toast，参考 MLB 记分板的设计逻辑。
- `src/index.html` 和 `src/sw.js`：GitHub Pages 静态入口和 PWA 离线缓存模板。
- `scripts/build.mjs`：esbuild 打包。
- `.github/workflows/build-react.yml`：main 更新源文件时安装依赖并生成正式 `index.html`、`sw.js`、`assets/app-2.6.0.js` 和 CSS。

## 主要功能

1. 五个 Tab：首页、指南、月龄、打卡、设置。首页不再塞满说明文字。
2. 右上角问号打开说明 Modal，操作结果使用约 2 秒 Toast，错误约 4 秒。
3. 小鸟名称、生日、早晚检查时间、每日六项检查、完成时间及观察日记可先保存在 localStorage；开启个人云端账号后，鸟名、早晚提醒、餵食打卡可同步到独立的 Cloudflare 后端，其余内容仍留在本机。沿用 `ylg-` 数据键，不主动清理旧资料。
4. 保留 iPhone 日历重复提醒的 ICS 导出；已实现 Cloudflare Web Push 后端。**实际推送必须先连接真实 Worker URL、开启云端并取得 iPhone 通知授权；尚未完成实机验证。**
5. 安装分享、简繁切换、维基百科背景知识与 JSON 备份／恢复。

## 本地开发

```sh
npm install
npm run build
```

构建好的静态 `index.html`、`sw.js`、`assets` 可直接部署至 GitHub Pages 的 main 分支根目录。

## 注意

未断奶幼鸟需要鸟类兽医指导；每日两次勾选表示检查、补充主食，不代表限制鸟一天只能吃两次。


## v2.4.0 — 个人养鸟云端后端

独立 Cloudflare Workers + Durable Objects 后端，支持个人账号恢复密钥、鸟名、喂食打卡、早晚提醒、Web Push 订阅与历史查询。React 设置新增「云端同步与通知」。

**部署进度（2026-10-13）：** Cloudflare Workers Builds 已由使用者在控制台设置并反馈首次部署成功；**真正的 Worker URL 尚未接入 React**，所以目前 App 仍默认使用本地模式。

### 后端自动部署（已成功使用的 Cloudflare 网页流程）

| Cloudflare 设置项 | 值 |
|---|---|
| GitHub Repository | `b110212000/lovebird-guide` |
| Project name | `banana-care-api` |
| Build command | `npm ci` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| Advanced settings → Path | `/worker` |
| API token | `Create new token` |
| API token name | `banana-care-deploy` |

首次通过 Cloudflare Workers Builds 连接 GitHub，之后 `worker/` 更新可由 Cloudflare 自动部署；React 前端仍由 GitHub Actions 构建为 GitHub Pages。**两套部署相互独立，不影响 MLB 比分网站。**

接下来需要在 Cloudflare 找到实际 Worker HTTPS 网址，访问 `/health` 验证，再填写 `src/cloud-config.js` 中的 `API_BASE`。不要凭空猜测 Worker URL。

完整操作、API、安全限制与 iPhone 推播说明：[worker/README.md](./worker/README.md)。

## v2.5.0 — 自訂餵食時間與實際餵食打卡

- 「打卡 → 餵食確認」直接顯示**早上及晚上預定餵食時間**，可在卡片內使用 iPhone 時間選擇器修改。
- 明確區分「尚未到時間、快到時間、該餵食了、已完成」；首頁可見下一次尚未確認的預定時間。
- 按「確認已餵」時以裝置當下時間記錄 `completedAt`，成功 Toast 顯示實際完成時間；卡片保留時刻，可取消勾選後重做。
- 「最近 7 天餵食紀錄」預設折疊，能查詢先前本機完成時刻；已連接雲端者也能在雲端歷史看到時刻。
- 修改餵食時間會更新 `ylg-feed-schedule-v1`，並在已連接雲端時同步到 Cloudflare Worker 的推播排程。
- `PUT /api/feed` 新增可選 `completedAt`（ISO 8601）欄位，**離線後再同步也保留實際按下打卡的時間**；舊版客戶端不傳此欄位仍相容。
- 早晚兩個時段是提醒檢查及補充食物，**不是每天只能讓鳥吃兩次**；健康已斷奶鳥需持續供應適當主食及清水。

## v2.5.1 — 跟隨裝置語言

- 新安裝或沒有既有語言偏好時，預設 `auto`，依裝置主要語言 `navigator.languages[0]` / `navigator.language` 自動決定：`zh-TW / zh-HK / zh-MO / zh-Hant` 使用繁體中文，`zh-CN / zh-SG / zh-Hans` 使用簡體中文。
- **設定 → 語言** 提供「跟隨裝置語言／简体中文／繁體中文」。既有已明確選定的簡體或繁體偏好保留，不會自動覆蓋；使用者可切回跟隨裝置。
- iPhone 主畫面 Web App 返回前景或裝置語言更新時會重新偵測，在 auto 模式下自動切換介面。不支援的裝置語言暫以繁體中文呈現（現階段尚未提供英文、日文翻譯）。
- 雲端帳戶的推播文案也同步使用目前選定的簡／繁中文（單帳戶目前只儲存一個 Web Push 訂閱，最後啟用裝置的語言設定會生效）。
- 附 Node.js 單元測試，GitHub Actions 先測試語言對照與手動覆蓋，再編譯 PWA。

## 開發流程：Issue-first（自 2026-10-13 起）

**每次程式、UI、後端、設定或文件的修改，必須先建立 GitHub Issue，再開始動手。** 規則由 [Issue #1](https://github.com/b110212000/lovebird-guide/issues/1) 開始執行。

1. **先建 Issue**：一件工作建立一個 Issue，寫明需求／問題、影響範圍和驗收條件；開始前先查詢避免重複。獨立的問題另開 Issue，同一工作內的修正則可續用原 Issue。
2. **再修改並追蹤**：相關 Commit 訊息須包含 `#IssueNumber`；遵循既有版號規則（新增功能次版 +1、純 UI 或修錯補丁版 +1，主版僅在明確要求時調整）。文件或開發流程的小幅異動可不升 App 版本，但仍需 Issue。
3. **最後驗證及回報**：依修改範圍檢查測試、React GitHub Actions、GitHub Pages 和 Cloudflare Workers Builds；在 Issue 記錄版本、Commit、部署與實機測試狀態。尚未完成必要驗證的 Issue 保持開啟，完成後才關閉。

**禁止直接修改而不建立 Issue。** 此規則適用未來所有對本專案的改動。

## v2.6.0 — 自訂每日多餐時段（[Issue #2](https://github.com/b110212000/lovebird-guide/issues/2)）

- 原先固定早／晚兩個時段，現在可在「打卡 → 餵食」直接新增、編輯、刪除餐次，上限 12 個；餐次會依時間排序，顯示為第 1 餐、第 2 餐……，每餐都有獨立預定時間、實際完成時間及提醒狀態。
- 「設定 → 餵食提醒」也能管理所有時段；匯出的 iPhone 行事曆 ICS 現在包含所有時段。**舊有 ICS 行事曆事件不會自動修改或刪除**，調整餐次後需要手動清除舊事件並重新匯入。
- 首次開啟自動從既有 `ylg-feed-schedule-v1` 遷移至 `ylg-feed-slots-v2`，保留原先 `morning` / `evening` 固定 ID 與歷史打卡。新時段使用獨立 UUID，刪除時段後仍保留已產生的歷史打卡。
- 當天餵食進度和首頁圓環依實際時段數計算，原有每日六項照顧清單不變。
- Cloudflare `PATCH /api/account` 支援 `slots: [{id,time}]`，存於使用者自己的 Durable Object；各時段獨立 Alarm、Web Push 和打卡歷史。舊有帳戶沒有 slots 時從 times 自動讀取，`PATCH times` 保留舊版客戶端相容性。
- 新增前端與 Worker 排程驗證測試，App `v2.6.0`、Worker API `0.2.0`。
- **餵食頻率需按鳥兒年齡、斷奶與健康狀態，遵循鳥類獸醫或有經驗的合格專業者指引。** App 不假設幼鳥／成鳥每天只能吃兩次。
