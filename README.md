# 小黃的生活手冊 🐤

**v1.0.0｜黃色牡丹鸚鵡新手飼養指南（繁體／簡體中文）**

這個專案可直接使用 **GitHub Pages** 部署，完全免費、不需要後端、建置流程或 API Key。

## 網頁

- 網址：<https://b110212000.github.io/lovebird-guide/>
- 首頁：`index.html`（單檔版，包含 HTML、CSS、JavaScript 與內嵌插畫）
- 程式碼：[GitHub 專案](https://github.com/b110212000/lovebird-guide)

## 主要功能

- 全站繁體／簡體中文切換，並記住語言偏好。
- 牡丹鸚鵡到家第一週照顧建議、飲食與禁忌、月齡照顧指南、行為判讀、居家安全與疾病警訊。
- 小鳥名字、出生日期與月齡顯示。
- 每日照顧清單與簡易飼養日誌。
- 免費 [MediaWiki API](https://www.mediawiki.org/wiki/API:Cross-site_requests) 取得維基百科相關百科摘要；如果網路或 API 無法使用，就顯示備用介紹或快取。

使用者輸入、清單與日誌只存於目前瀏覽器的 **localStorage**，**不會跨裝置同步**。清除瀏覽資料可能導致紀錄消失。

## GitHub Pages 開啟方式

1. 在本 Repository 開啟 **Settings → Pages**。
2. 在 **Build and deployment** 選擇 **Deploy from a branch**。
3. **Branch** 選 `main`，資料夾選 `/(root)`，按 **Save**。
4. 等待 GitHub Pages 發布完成，使用 <https://b110212000.github.io/lovebird-guide/> 瀏覽。

之後修改 `index.html` 並提交到 `main`，Pages 就會重新發布。

## 資料來源與飼養安全

- 網站的 Wiki 部分使用維基百科摘要（外部 API），一般飼養建議則是靜態人工整理，**不會讓 API 自動改寫健康建議**。
- 封面照片資料來源及授權連結顯示於網頁；若無法載入外部照片，會顯示內建插畫。
- **黃色是羽色，不一定等於某個特定牡丹鸚鵡物種；不可以只靠羽色判定性別。**
- **尚未斷奶的幼鳥**不應依月份自行停奶或在無訓練下強灌餵食。
- 若有持續不吃、衰弱、呼吸困難等徵兆，應儘速聯絡鳥類獸醫；本站不能取代診斷。

---
*第一版：v1.0.0。*
