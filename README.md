# 香蕉的养鸟手册 🐤

**v1.1.0｜牡丹鹦鹉新手养护攻略（简体中文为默认，支持繁体中文）**

這個專案可直接使用 **GitHub Pages** 部署，完全免費、不需要後端、建置流程或 API Key。

## 網頁

- 網址：<https://b110212000.github.io/lovebird-guide/>
- 首頁：`index.html`（單檔版，包含 HTML、CSS、JavaScript 與內嵌插畫）
- 程式碼：[GitHub 專案](https://github.com/b110212000/lovebird-guide)

## 主要功能

- 全站简体／繁体中文切换（默认简体），并记住语言偏好。
- 牡丹鸚鵡到家第一週照顧建議、飲食與禁忌、月齡照顧指南、行為判讀、居家安全與疾病警訊。
- 小鳥名字、出生日期與月齡顯示。
- 每日照顧清單與簡易飼養日誌。
- 免費 [MediaWiki API](https://www.mediawiki.org/wiki/API:Cross-site_requests) 取得維基百科相關百科摘要；如果網路或 API 無法使用，就顯示備用介紹或快取。

使用者輸入、清單與日誌只存於目前瀏覽器的 **localStorage**，**不會跨裝置同步**。清除瀏覽資料可能導致紀錄消失。


## iPhone PWA（v1.1.0）

- Safari 打开网页 → 分享 → **添加到主屏幕**，即可像 App 一样独立打开。
- 已设置 iPhone 主屏幕图标、App 名称、独立运行模式、安全区与版本更新提示。
- `manifest.webmanifest`：PWA 配置；`sw.js`：离线缓存（优先联网读取最新内容，断网时读取缓存）。
- `icons/banana.svg`：黄色牡丹鹦鹉图标源文件；GitHub Actions 自动生成 180、192、512 px PNG。
- 日志和每日打卡保存于本机浏览器，不会同步云端。重装 App 前请在每日打卡中点击 **导出备份 JSON**，安装新 App 后再 **导入备份**；删除 PWA 可能删除本地记录。
- Safari/iOS 有时会缓存主屏幕图标。如果新图标没有改变，可先刷新或重启 App；需要重新添加图标时，请**先备份数据**再处理。
- Wikipedia API 为在线摘要；离线时显示内置简介或先前获得的缓存。离线照护知识不等于实时健康监测。

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
*当前版本：v1.1.0｜iPhone PWA、香蕉鸟图标、离线缓存、更新提示和养鸟记录备份／还原。*

<!-- GitHub Pages 發布檢查：啟用 Pages 後重新提交以觸發 main 分支部署。 -->
