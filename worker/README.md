# 香蕉養鳥手冊：個人後端 MVP（Cloudflare Workers）

**目前狀態：原始碼與 React UI 已整合，等待 Cloudflare 帳戶完成部署。** 這份設定不會修改既有 MLB Worker。

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

## Cloudflare 第一次部署（跟 MLB 網站相同的方式）

**使用 Cloudflare Workers Builds 連接 GitHub 自動部署，不需要在本機執行 npm、Wrangler 登入或手動部署。**

1. 開啟 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**。
2. 選擇建立 Worker，使用 **Import a repository / Connect to Git**（不同介面版本名稱可能略有差異）。
3. 選擇 GitHub 帳戶以及 Repository **`b110212000/lovebird-guide`**，分支 **`main`**。
4. 在 Builds / Advanced settings 設定：

   | 選項 | 值 |
   |---|---|
   | Worker name | `banana-care-api` |
   | GitHub Repository | `b110212000/lovebird-guide` |
   | Production branch | `main` |
   | Root directory | `worker`（某些介面會顯示為 `/worker`） |
   | Build command | 留空；Cloudflare 會安裝依賴 |
   | Deploy command | `npx wrangler deploy` |

5. 等待 **首次部署完成**，Cloudflare 會提供實際的 Worker URL。後端名稱、子網域以 Cloudflare 顯示結果為準，**不要自行猜測 URL**。
6. 開啟實際的 `https://<Cloudflare 提供的網址>/health`，確認 API 回傳 `ok: true`。
7. 再把 **實際** HTTPS Worker 網址（不含尾端斜線）填入 `src/cloud-config.js` 的 `API_BASE`，提交 GitHub。React 會由 GitHub Actions 自動建置並發布至 GitHub Pages。網址確認前不要填入猜測的值。
8. 朋友在自己的 iPhone 主畫面 PWA 進入「設定 → 雲端同步與通知」，建立個人帳戶、妥善保存復原金鑰，再按「開啟推播通知」並授權。可將提醒時間調到幾分鐘後進行真機測試。

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

**目前尚未代你連接 Cloudflare 帳戶；這需要你在 Dashboard 完成第一次 GitHub 授權與專案建立。** Worker 原始碼／建置檢查完成並不等於已部署。

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

### PUT /api/feed 範例

```json
{"date":"2026-10-13","slot":"morning","done":true}
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
