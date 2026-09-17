---
type: permanent-note
created: 2026-07-15
date: 2026-07-15
tags:
  - tech-stack
  - nodejs
  - csharp
  - java
  - golang
  - web-scraping
status: processed
graduated-from: "[[Ideas/非Python技術棧選型]]"
---

## For future Claude

Permanent note comparing non-Python tech stacks for Google News scraping. Covers Node.js (Playwright/Puppeteer), C# (.NET), Java (Selenium/Jsoup), Go (Colly/chromedp), and no-code alternatives. Recommends RSS as the most stable cross-language approach.

# 爬取 Google 新聞功能 — 非 Python 技術棧選型指南

> 功能目標：爬取 Google 新聞搜尋結果（標題、來源、日期、摘要、連結）→ 輸出成表格（Excel / CSV）。
> 本文整理除 Python 以外的可行技術棧，依語言／執行環境分類，方便依團隊技能與部署環境選擇。

---

## 一、JavaScript / Node.js（最推薦的替代方案）

目前爬取「動態網頁」最成熟的生態，尤其適合 Google 這種 JS 動態載入的頁面。

| 用途 | 技術／套件 | 說明 |
|------|-----------|------|
| 瀏覽器自動化 | Puppeteer、Playwright | 直接驅動 Chrome/Chromium 執行 JS，等同 Python 的 Selenium，但速度與穩定性更好 |
| 輕量 HTTP 爬取 | axios / node-fetch + Cheerio | 抓 HTML 後用類 jQuery 語法解析（適合靜態或 RSS）|
| 爬蟲框架 | Crawlee（Apify 出品）| 內建佇列、重試、反爬處理，適合大規模爬取 |
| 輸出 Excel | ExcelJS、SheetJS (xlsx) | 寫出 .xlsx 檔 |

**推薦：** Playwright 跨瀏覽器、內建自動等待、反偵測能力強，是 Selenium 的現代化替代品。

---

## 二、C# / .NET（適合 Windows 企業環境）

若以 Windows／微軟技術棧為主（很符合企業內部工具情境），這是很自然的選擇。

| 用途 | 技術／套件 |
|------|-----------|
| 瀏覽器自動化 | Selenium WebDriver (.NET)、Playwright for .NET |
| HTML 解析 | HtmlAgilityPack、AngleSharp |
| 輸出 Excel | ClosedXML、EPPlus、NPOI |
| GUI（取代 tkinter）| WPF、WinForms |

**優點：** 可打包成單一 .exe，非技術人員雙擊即用，非常適合內部發佈。

---

## 三、Java（適合大型、長期維護專案）

| 用途 | 技術／套件 |
|------|-----------|
| 瀏覽器自動化 | Selenium (Java)、Playwright for Java |
| 靜態 HTML 解析 | Jsoup（最經典好用）|
| 爬蟲框架 | WebMagic、Crawler4j |
| 輸出 Excel | Apache POI |

---

## 四、Go（適合高效能、高併發爬取）

| 用途 | 技術／套件 |
|------|-----------|
| 爬蟲框架 | Colly（輕量高效）、GoQuery（類 jQuery 解析）|
| 瀏覽器自動化 | chromedp（驅動 Chrome，處理動態頁面）|
| 輸出 Excel | Excelize |

**優點：** 編譯成單一執行檔、跨平台、記憶體占用低，適合部署到伺服器排程。

---

## 五、完全不寫程式（低程式碼 / No-Code）

若目標是「快速拿到資料」而非開發產品，可考慮：

- **Power Automate（微軟）** — 企業環境可用「桌面流程」自動開瀏覽器擷取資料，並直接寫入 Excel / SharePoint，幾乎不用寫程式。
- **Octoparse、ParseHub、Web Scraper（Chrome 擴充）** — 視覺化點選要抓的欄位即可匯出 CSV/Excel。
- **Google Apps Script** — 用 IMPORTXML 或搭配 RSS，直接把結果寫進 Google Sheets。

---

## 六、最穩定的做法：改用 RSS（跨語言通用）

無論用哪種語言，Google News 提供官方 RSS（news.google.com/rss/search?q=關鍵字），回傳乾淨的 XML：

- 不受版面／class 改版影響（先前用 Selenium 一直踩到的坑）
- 不需要瀏覽器自動化，任何語言用 HTTP + XML 解析即可
- 速度快、幾乎不會被反爬機制封鎖

任何語言（Node.js、C#、Java、Go，甚至 Excel Power Query）都能輕鬆解析 RSS。

---

## 七、快速選型建議

| 你的情境 | 推薦技術棧 |
|----------|-----------|
| 想要現代化、好維護 | Node.js + Playwright |
| Windows 企業內部工具、要做成 .exe | C# / .NET + Playwright + ClosedXML |
| 完全不想寫程式 | Power Automate 或 RSS + Excel Power Query |
| 要高效能、伺服器排程 | Go + Colly |
| 一勞永逸、最穩定 | 任何語言 + Google News RSS ✅ |

---

*文件產生日期：2026/07/15*
