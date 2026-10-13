# 香蕉養鳥手冊：個人後端 MVP（Cloudflare Workers）

**部署狀態（2026-10-13）：Cloudflare Workers Builds 已由使用者回報部署成功，React 也已將實際網址 `https://banana-care-api.b110212000.workers.dev` 寫入 `src/cloud-config.js`。** 真實的帳戶／iPhone 背景推播仍需要實機驗證。這個 Worker 與 MLB Worker 完全獨立。

## 架構

```text
React PWA (GitHub Pages)
  ├─ 未啟用雲端：舊版 localStorage 繼續工作
  └─ 使用者主動啟用雲端
        │ JSON API + x-account-id + Bearer accessKey
        ▼
    banana-care-api (獨立 Cloudflare Worker)
        ├─ BirdAccount Durable Object（每個 accountId 一個）
        │    ├─ 自己的小鳥名稱、IANA 時區、兩次提醒時間
        │    ├─ 自己的早晚餵食完成紀錄（最多查 90 筆）
        │    ├─ 自己的 Web Push 訂閱與每天發送去重
        │    └─ Durable Object Alarm（僅排下次提醒，不用 1 分鐘輪詢）
        └─ PushService Durable Object（全域 VAPID 金鑰）
               └─ web-push → Apple/Android 瀏覽器推播服務
```

**每個人獨立**：不同使用者的 BirdAccount 狀態隔離，沒有共同小鳥或彼此查看功能。accountId 不足以存取資料，API 每次驗證 256-bit 隨機金鑰的 SHA-256。金鑰由使用者自行保存為復原碼；遺失且沒有備份將無法恢復。初版沒有電子郵件/密碼登入，也沒有後端帳號找回服務。

## Cloudflare 第一次部署（已實際操作成功的 GitHub 自動部署流程）

這個專案使用 **Cloudflare Workers Builds → 連接 GitHub**，後端直接由 Cloudflare 編譯與部署；**不需要使用者在自己的電腦安裝 Node.js、登入 Wrangler 或手動推送**。

1. 開啟 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**，新增 Worker 並選擇從 GitHub Repository 匯入。
2. 選擇 `b110212000/lovebird-guide`，使用 `main` 分支。
3. 在 **Set up your application** 與展開的 **Advanced settings**，照下表填入（這些是實際操作時的畫面名稱）：

   | Cloudflare 欄位 | 實際設定 |
   |---|---|
   | GitHub repository | `b110212000/lovebird-guide` |
   | Project name | `banana-care-api` |
   | Build command | `npm ci` |
   | Deploy command | `npx wrangler deploy` |
   | Preview command | `npx wrangler preview`（當前建立畫面要求必填） |
   | Advanced settings → Path | `/worker` |
   | API token | `Create new token` |
   | API token name | `banana-care-deploy` |

4. 點擊 **Deploy** 並確認 Cloudflare 的部署結果為成功。第一次連接 GitHub 與建立 API Token 時，請依畫面完成授權。
5. 部署成功後，Cloudflare 會顯示實際 Workers URL，例如 `https://<你的帳戶所顯示的 workers.dev 網址>`。**這裡不能猜測網址，也不要將上面的範例字串當成真實網址。**
6. 以瀏覽器開啟 `<實際 Worker URL>/health`，應看到 JSON，包含 `"ok":true`。
7. 在 React 專案 `src/cloud-config.js` 將 `API_BASE` 從空字串改成**實際 Worker 的 HTTPS 網址**（不加尾端斜線），推送 GitHub 後 GitHub Actions 會自動發布前端。
8. 朋友在 iPhone 主畫面 PWA，透過「設定 → 雲端同步與通知」建立自己的帳戶，保存復原金鑰並在系統授權後開啟推播。建議用幾分鐘後的提醒時間測試。

> **重要**：設定了 `Advanced settings → Path: /worker`，Build／Deploy／Preview 指令就直接在 `worker` 執行，**不需要額外寫 `cd worker`**。以上是首次設定時使用者回報成功的流程；各 Cloudflare 帳戶的介面用語可能有所調整。

### 目前狀態與尚待完成

- [x] 建立獨立的 `banana-care-api` Cloudflare Workers Builds 專案（使用者回報部署成功）。
- [x] `worker/wrangler.jsonc` 設定 BirdAccount／PushService Durable Objects。
- [x] `worker/package-lock.json` 已提交，Wrangler 乾跑打包檢查通過。
- [ ] 取得並驗證 Cloudflare 實際 Worker URL 與 `/health`。
- [ ] 將實際 Worker URL 寫入 `src/cloud-config.js`，啟用 React 雲端功能。
- [ ] 在 iPhone PWA 實際測試帳戶建立、同步、推播權限及背景通知。

### GitHub 推送後會發生什麼？

```text
GitHub push
   ├── 前端 src/ 修改 → GitHub Actions 編譯 React → GitHub Pages
   └── worker/ 修改 → Cloudflare Workers Builds → npx wrangler deploy
```

與 MLB 相同，Cloudflare 後端專案**只要第一次連上 GitHub，往後就自動部署**；**不用每次手動重新部署**，也**不會更動 MLB 的 Worker**。

### Workers Builds 必須注意的 lockfile

MLB 後端會提交 `worker/package-lock.json`，Cloudflare 才能穩定執行 `npm ci`。

本專案另有 GitHub Actions `Validate Banana Cloudflare Worker`：若 `worker/package-lock.json` 尚未存在，會自動建立並提交；若套件清單變動，也會更新 lockfile。連接 Cloudflare Builds **之前先確認 GitHub 上已有 `worker/package-lock.json`**。

Cloudflare Worker 使用 SQLite-backed Durable Objects，依照 MLB 現行的 `wrangler.jsonc` 做法以 `exports` 宣告 `BirdAccount` 與 `PushService`。Cloudflare Workers Free 可使用 SQLite-backed Durable Objects，但需留意用量上限。

### 推播的必要條件

- 使用者已安裝至 iPhone 主畫面並允許 Web Push。
- Cloudflare Worker 已成功部署，React 已設定正確的 API URL。
- 有有效訂閱、排程時間到達且使用者尚未打勾。
- 背景推播仍可能因網路與 iOS 系統設定延遲，不能保證每次準點送達。

**Cloudflare 首次部署已由使用者回報成功；後續仍須驗證 API 網址，接上前端並完成 iPhone 實機測試。**

## API

| Method | Endpoint | 功能 |
|---|---|---|
| GET | `/health` | 公開健康檢查 |
| GET | `/api/push/public-key` | VAPID 公鑰 |
| POST | `/api/accounts` | 建立帳戶，回傳 accountId、accessKey（僅這次顯示） |
| GET | `/api/state?date=YYYY-MM-DD` | 自己的小鳥資料與當日餵食 |
| PATCH | `/api/account` | 修改名稱、時區、早晚時間、推播開關 |
| GET | `/api/feed?date=YYYY-MM-DD` | 查詢當天紀錄 |
| PUT | `/api/feed` | 設定某日某時段完成／取消 |
| GET | `/api/history?days=30` | 近 1–90 筆餵食歷史 |
| PUT | `/api/subscription` | 儲存推播訂閱並開啟提醒 |
| DELETE | `/api/subscription` | 移除推播訂閱 |

除建立帳戶及公鑰外，私有 API 必須帶：
`x-account-id: <accountId>` 以及 `Authorization: Bearer <accessKey>`。
Worker 的瀏覽器 CORS 限定 `https://b110212000.github.io`，但**CORS 不是驗證**，實際授權靠高熵金鑰。請不要把 accessKey 印到伺服器日誌、放在公開 repo 或傳給別人。後端未暴露查詢其他帳號的介面。

### v2.5.0：餵食實際完成時間

`PUT /api/feed` 可提供 `completedAt`，格式為帶 `Z` 的 ISO 8601 UTC 時間（例如 `2026-10-13T00:12:00.000Z`）；Worker 會在驗證後儲存此時間，而不是以「連上網路的同步時刻」代替。可接受距現在 90 天內的既有完成時刻，不可超過現在五分鐘以上。省略時維持舊版以伺服器當下時間記錄，向下相容。

使用者直接在 React「打卡」頁修改兩個預定時間時會更新帳戶 `times`，並重新安排 Durable Object Alarm。若先前已手動將 `.ics` 加入 iPhone 行事曆，**編輯 App 時間不會自動改寫行事曆中的既有事件**，需要自行修改或重新匯入並移除舊事件。

### PUT /api/feed 範例

```json
{"date":"2026-10-13","slot":"morning","done":true,"completedAt":"2026-10-13T00:12:00.000Z"}
```

## 儲存與離線策略

- 未開啟雲端：沿用 `ylg-*` 本機資料。
- 啟用雲端：會先將**今天**已打勾的兩個餵食時段和早晚時間寫進專屬帳戶；之後餵食打卡採樂觀本地更新，操作排入 `ylg-cloud-pending-v1`，連線恢復再同步。
- 雲端資料不會自動上傳全部既有日記、六項檢查及其他歷史；後端 MVP **僅儲存餵食紀錄、名稱、提醒和訂閱**。
- 備份 JSON 可保留原有 `ylg-` 資料；包含金鑰的備份檔需特別保護。
- iPhone Web Push 需要 iOS/iPadOS 16.4 以上、主畫面 PWA、使用者在 App 內授權、有效訂閱及網路連線。OS 仍可能依系統設定延遲或抑制通知，不能保證每次準點送達。
- Alarm 使用帳戶的 IANA 時區處理 DST；跳過不存在的 DST 時間。初版單帳戶只保存**一個** PushSubscription；最後註冊的裝置會覆蓋先前裝置，未來再擴充多裝置。
- 推播內容只包含小鳥名稱與檢查提醒，不會傳出完整日記或健康資料。

## 免費方案與營運前必做

使用 Workers Free 計畫、SQLite-backed Durable Objects 與 GitHub Pages，少量朋友使用預計可保持免費，但應留意官方用量上限。正式提供給陌生使用者前需要加上建帳濫用防護（如 Turnstile／Rate Limiting）、資料刪除與帳號金鑰輪替功能，並訂出簡短隱私說明。初版依賴復原碼，**不是完整的多裝置身份系統**。

本 Worker 為個人養鳥後端，**與 MLB score notify 完全獨立**。

## v2.5.1 推播語言

建立帳戶時可傳入 `language: "hant" | "hans"`（未傳入時預設繁體）；`PATCH /api/account` 也可隨著 React 的裝置語言或使用者手動設定更新 `language`，帳戶狀態回傳 `language`。

- 繁體時送出「餵食提醒／時間到了，記得確認飼料與清水」。
- 簡體時送出「喂食提醒／时间到了，记得检查饲料和清水」。
- 舊帳戶沒有 `language` 欄位時以繁體相容，不需要重新註冊。
- 初版每個帳戶只有單一推播訂閱，所以**通知語言跟隨帳戶最後同步的語言**，不是依所有裝置分別設定；若未來支援同帳戶多裝置通知需改為訂閱層級儲存語言。

## v2.6.0 可增減餵食時段 API

`PATCH /api/account` 現在支援 **`slots` 完整列表**：

```json
{
  "slots": [
    {"id":"morning","time":"08:00"},
    {"id":"meal-0123456789abcdef0123456789abcdef","time":"12:30"},
    {"id":"evening","time":"18:00"}
  ]
}
```

- 每位帳戶可自行使用 1～12 個時段，時段 ID 只能為 `morning`／`evening` 或 `meal-` 加 32 位十六進位識別碼；24 小時制 `HH:mm`、同帳戶 ID 不可重複。
- 既有帳戶無 `slots` 時讀取原 `times` 作為早晚時段；舊版 `PATCH times` 僅更新既有舊時段，不會清除額外餐次。
- `GET /api/state` 的 `account.slots` 提供排序後的時段列表；`PUT /api/feed` 的 `slot` 可傳新 ID，完成時間 `completedAt` 行為不變。
- 刪除時段會停止該時段未來排程，不會刪除過去的 `feed:YYYY-MM-DD` 紀錄。歷史紀錄仍可查詢所有曾使用的時段。
- Durable Object Alarm 依各時段分別計算當地日期時間與 DST，推播文案依帳戶的簡／繁語言設定顯示「第 N 餐」；每個時段每日最多一次成功發送。
- 勿自行設定具體幼鳥灌食頻率：餵食間隔與方式應由鳥類獸醫依狀況決定。

**發布確認：** GitHub Actions 前端／Worker dry-run 成功後，還要在 Cloudflare Dashboard 確認 Workers Builds 已部署至正式環境，並以 iPhone 主畫面 PWA 測試背景通知。未驗證之前不可宣稱推播實機成功。
