---
created: 2026-08-23
tags:
  - vibecoding
  - spec
  - robot-exhibit
  - ai
  - landing-page
---

# 2026 台北自動化大展銀行 AI Landing Page 執行計畫

## 目標

建立一個可本機啟動、可收集下載名單、可提供完整資料包下載的銀行 AI landing page。訪客填寫表單後，資料需寫入 Google Sheet；只有成功記錄後才開放下載連結。

## 架構

- 前端：Vite + React + TypeScript。
- UI：單頁式 landing page，包含主視覺、展會趨勢、銀行 use case、目標架構、導入路線圖與下載表單。
- 名單記錄：前端用 hidden iframe POST 到 Google Apps Script Web App。
- 後端：Google Apps Script 寫入 Google Sheet，並用 `postMessage` 回傳成功或失敗狀態。
- 下載檔：`public/downloads/2026-automation-taipei-bank-ai-package.zip`。

## 技術棧

- React 19
- TypeScript
- Vite
- Vitest
- Testing Library
- lucide-react
- Google Apps Script
- Google Sheet

## 全域限制

- 回答與文件使用繁體中文。
- `.env` 不進版控，僅保留 `.env.example`。
- `doc/` 是原始文件來源，`public/downloads/` 是使用者實際下載檔案位置。
- 目前資料夾不是 Git repo，不能依賴 `git diff --check` 作為唯一驗證。
- 修改 `google-apps-script/Code.gs` 後，必須在 Apps Script 後台重新部署 Web App 新版本。

## 檔案職責

- `src/App.tsx`：landing page 內容、下載表單、Google Sheet 回傳狀態處理、下載連結。
- `src/styles.css`：頁面版面與響應式樣式。
- `src/App.test.tsx`：表單成功與失敗狀態的前端測試。
- `google-apps-script/Code.gs`：接收表單資料、驗證欄位、寫入 Google Sheet、回傳 postMessage。
- `GOOGLE_SHEET_SETUP.md`：Google Sheet 與 Apps Script 設定說明。
- 知識庫永久筆記：[[Google Sheet + Apps Script Web App 名單收集設定]]（官方 Web App / Properties / iframe 規則 + 本專案 hidden iframe POST 實作）。
- `doc/`：原始文件與報告。
- `public/downloads/2026-automation-taipei-bank-ai-package.zip`：使用者下載的完整資料包。
- `restart-site.bat`：Windows 本機重啟網站服務。
- `.gitignore`：排除本機環境、依賴與建置產物。
- `README.md`：使用者操作手冊。

## 任務

### 1. 建立與維護 Landing Page

- [x] 檔案：`src/App.tsx`, `src/styles.css`, `index.html`
- [x] 介面需呈現展會趨勢、銀行 AI use case、導入架構與路線圖。
- [x] 下載區需提供姓名、公司或單位、Email、關注場景欄位。
- [x] 表單送出時需顯示記錄中狀態。
- [x] Google Sheet 回傳成功前不得顯示下載連結。

測試指令：

```powershell
npm test
```

預期結果：`src/App.test.tsx` 全部通過。

### 2. 串接 Google Sheet 名單記錄

- [x] 檔案：`google-apps-script/Code.gs`, `.env.example`, `GOOGLE_SHEET_SETUP.md`
- [x] Apps Script 需驗證必填欄位與 Email 格式。
- [x] Apps Script 需自動建立或修正 header row。
- [x] Apps Script 需使用 `SPREADSHEET_ID` 與 `SHEET_NAME` script properties。
- [x] 前端需讀取 `VITE_GOOGLE_SHEET_WEB_APP_URL`。
- [x] Apps Script 回傳需同時通知 `window.parent` 與 `window.top`。

手動驗收：

1. 在 `.env` 填入有效 Web App URL。
2. 重新啟動 `npm run dev`。
3. 送出表單。
4. 確認 Google Sheet 出現新資料列。
5. 確認前端顯示下載連結。

### 3. 維護完整資料包

- [x] 檔案：`doc/`, `public/downloads/2026-automation-taipei-bank-ai-package.zip`
- [x] 資料包需包含 `doc/` 內全部檔案。
- [x] 資料包需包含 `bank-ai-adoption-report.docx`。
- [x] 前端下載連結需指向 zip，而不是單一 docx。

重新打包指令：

```powershell
Compress-Archive -Path '.\doc\*' -DestinationPath '.\public\downloads\2026-automation-taipei-bank-ai-package.zip' -CompressionLevel Optimal -Force
```

檢查指令：

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path '.\public\downloads\2026-automation-taipei-bank-ai-package.zip')).Entries | Select-Object FullName,Length
```

預期結果：zip 內容列出 `doc/` 內全部文件。

### 4. 補齊專案維護文件

- [x] 檔案：`.gitignore`, `README.md`, `PLAN.md`, `LANDING_PAGE_HANDOFF_SUMMARY.md`
- [x] `.gitignore` 排除 `.env`, `node_modules/`, `dist/`, log, coverage 與編輯器暫存檔。
- [x] `README.md` 說明快速開始、表單流程、資料包維護、Google Sheet 設定與常見問題。
- [x] `PLAN.md` 保留後續維護與驗證依據。
- [x] 交付摘要記錄已完成工作、主要檔案、驗證結果與缺口。

驗證指令：

```powershell
Get-Content -Raw -Encoding UTF8 README.md
Get-Content -Raw -Encoding UTF8 PLAN.md
Get-Content -Raw -Encoding UTF8 LANDING_PAGE_HANDOFF_SUMMARY.md
```

預期結果：繁體中文內容正常顯示。

## 最終驗證

每次交付前執行：

```powershell
npm test
npm run build
```

補充檢查：

```powershell
Select-String -Path .\README.md,.\PLAN.md,.\LANDING_PAGE_HANDOFF_SUMMARY.md -Pattern '[ \t]+$'
```

預期結果：

- 單元測試通過。
- production build 成功。
- Markdown 無行尾空白。
- 若資料夾仍非 Git repo，需明確記錄 `git diff --check` 無法有效執行。
