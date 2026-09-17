---
created: 2026-07-14
tags:
  - spec
  - indexeddb
  - frontend
  - offline
  - pwa
---

# 專案需求規格書 (Specification)

> 版本：v1.1｜文件狀態：Draft｜最後更新：2026-07-14

---

## 1. 專案概述

| 項目 | 內容 |
| :--- | :--- |
| **專案名稱** | 純前端離線小工具 (Local Widget) |
| **技術棧** | HTML5 / CSS3 / 原生 JavaScript (ES6+) / IndexedDB |
| **執行環境** | 現代瀏覽器（無需後端、無需建置工具） |

### 1.1 核心目標
建立一個**完全在瀏覽器本地端運行**的輕量化工具，利用 IndexedDB 提供大容量、結構化的離線資料儲存能力，確保使用者在**無網路環境**下仍可正常操作，且資料**絕不上傳伺服器**，以保障隱私。

### 1.2 專案範圍 (In Scope)
- 本地資料的新增、讀取、更新、刪除 (CRUD)
- 關鍵字搜尋與分類篩選
- 資料匯出 / 匯入（JSON 備份與還原）
- 響應式 UI 與操作回饋

### 1.3 非目標 (Out of Scope)
- 多人協作、雲端同步、跨裝置同步
- 使用者帳號 / 登入驗證
- 伺服器端資料處理或 API 串接
- 第三方框架（React/Vue 等）與打包工具依賴

---

## 2. 系統架構與技術特點

- **無伺服器架構 (Serverless)**：完全依賴靜態 HTML/JS 運行，可直接以 `file://` 雙擊開啟，或部署於 GitHub Pages 等靜態託管平台。
- **非同步資料庫操作**：使用瀏覽器原生 `indexedDB` API，所有讀寫皆透過非同步 `Transaction`（交易）機制處理，避免阻塞 UI 執行緒。
- **Promise 化封裝**：將 IndexedDB 的事件回呼（callback）統一封裝為 `Promise`，使業務邏輯可使用 `async/await`，提升可讀性與錯誤處理一致性。
- **單頁應用 (SPA)**：透過 JavaScript 動態渲染 DOM，提供流暢的互動體驗。
- **零外部相依**：不引入任何 CDN / npm 套件，確保純離線可用。

> ⚠️ **相容性提醒**：部分瀏覽器在 `file://` 協定下對 IndexedDB 有安全限制（如 Firefox）。建議以本地 HTTP 伺服器（`python -m http.server`）或靜態託管方式執行以確保完整功能。

---

## 3. 功能需求 (Functional Requirements)

### 3.1 資料儲存管理 (CRUD)
- **新增 (Create)**：提供表單介面，輸入資料後即時寫入 IndexedDB，並在畫面即時追加該筆項目。
- **讀取 (Read)**：
  - 初始化時自動從資料庫載入歷史資料並渲染。
  - 提供**關鍵字搜尋**與**分類篩選**（利用 IndexedDB Index 進行查詢優化）。
- **更新 (Update)**：點擊項目可切換狀態（pending / completed）或編輯內容，並同步更新 `updatedAt`。
- **刪除 (Delete)**：支援單筆刪除，及「一鍵清空」（需二次確認）。

### 3.2 資料備份與還原
- **匯出**：將 `items` 全部資料序列化為 JSON，下載為 `backup.json`。匯出檔案應包含 metadata（如 `schemaVersion`、`exportedAt`）以利日後相容。
- **匯入**：透過檔案上傳讀取 JSON 備份檔，**驗證格式與 schema 版本**後寫入本地 IndexedDB。
  - 需提供「覆蓋 (Replace)」或「合併 (Merge)」兩種模式選擇。
  - 匯入失敗（格式錯誤、欄位缺漏）時不得破壞既有資料，並以 Toast 明確告知原因。

### 3.3 UI/UX 介面設計
- **響應式佈局 (Responsive)**：支援行動裝置與桌上型螢幕（建議斷點：≤ 640px / > 640px）。
- **狀態提示 (Feedback)**：資料庫讀取失敗、寫入成功、匯入錯誤等情境，需以 **Toast** 提示。
- **空狀態 (Empty State)**：無資料時顯示引導文字，而非空白畫面。
- **無障礙 (a11y)**：互動元素具備適當的 `aria-label` 與鍵盤操作支援。

---

## 4. 資料庫設計 (IndexedDB Schema)

- **資料庫名稱**：`LocalWidgetDB`
- **版本號**：`1`

### 4.1 Object Store：`items`

| 欄位 (Key) | 型態 (Type) | 索引 (Index) | 說明 |
| :--- | :--- | :--- | :--- |
| `id` | Number | 主鍵 (KeyPath) | 自動遞增 (`autoIncrement: true`) |
| `title` | String | 是 (`unique: false`) | 項目主要標題 / 內容 |
| `category` | String | 是 (`unique: false`) | 分類標籤（工作 / 生活 / 財務） |
| `status` | String | 否 | 狀態（`pending` / `completed`） |
| `updatedAt` | Number | 否 | 時間戳記 (Epoch ms) |

### 4.2 資料庫升級策略 (Migration)
- 所有 schema 變更（新增 store / index）**必須**在 `onupgradeneeded` 中依 `oldVersion` 判斷後執行。
- 提升版本號時，需保留舊資料相容性，禁止直接刪除既有 Object Store。

---

## 5. 核心 JavaScript 邏輯實作規劃

### 5.1 資料庫初始化（Promise 化）

```javascript
const DB_NAME = "LocalWidgetDB";
const DB_VERSION = 1;
const STORE = "items";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("title", "title", { unique: false });
        store.createIndex("category", "category", { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}
```

### 5.2 核心操作函式（存根規格）

| 函式 | 交易模式 | 說明 |
| :--- | :--- | :--- |
| `addData(item)` | `readwrite` | 寫入新物件，回傳新 `id` |
| `loadData(filter)` | `readonly` | 取全部或以 `index`/`openCursor` 條件篩選 |
| `updateData(id, fields)` | `readwrite` | 先 `get(id)`，合併欄位後 `put()` |
| `deleteData(id)` | `readwrite` | 刪除指定 `id` |
| `clearAll()` | `readwrite` | 清空 store（需二次確認） |
| `exportToJSON()` | `readonly` | 序列化並觸發 `backup.json` 下載 |
| `importFromJSON(file)` | `readwrite` | 驗證後寫入（覆蓋 / 合併） |

> **通用規範**：每個函式皆回傳 `Promise`；交易需綁定 `transaction.onerror` 與 `transaction.oncomplete`，並在失敗時 reject 具描述性的錯誤訊息供上層顯示 Toast。

---

## 6. 錯誤處理與邊界情境

| 情境 | 預期行為 |
| :--- | :--- |
| IndexedDB 無法開啟（隱私模式 / 不支援） | 顯示明確錯誤，並降級提示使用者更換瀏覽器或環境 |
| 交易失敗 / 配額超出 (QuotaExceededError) | 回滾交易，Toast 告知並保留原資料 |
| 匯入檔非 JSON 或欄位不符 | 中止匯入，不影響既有資料 |
| 重複清空 / 空資料操作 | 阻擋並提示無資料可操作 |

---

## 7. 非功能需求 (Non-Functional Requirements)

- **效能**：首次頁面載入並顯示資料 (FCP) < 1.5 秒；單筆 CRUD 操作 UI 回應 < 100ms。
- **相容性**：支援最新兩個主版本的 Chrome、Edge、Safari、Firefox。
- **安全性與隱私**：遵循同源政策 (Same-Origin Policy)，資料僅存於當前網域本地沙盒，外部無法跨網域存取。
- **可維護性**：邏輯層（IndexedDB 封裝）與視圖層（DOM 渲染）分離。
- **可攜性**：單一 HTML 檔或少量靜態檔即可運行，無需安裝步驟。

---

## 8. 驗收標準 (Acceptance Criteria)

- [ ] 可新增、讀取、更新、刪除項目，重新整理後資料仍存在。
- [ ] 關鍵字搜尋與分類篩選結果正確。
- [ ] 匯出 `backup.json`，於清空後可完整還原。
- [ ] 匯入格式錯誤檔案時不破壞既有資料並顯示錯誤 Toast。
- [ ] 於行動裝置與桌機皆正常顯示與操作。
- [ ] 全程無任何網路請求（可於 DevTools Network 驗證）。

---

## 9. 測試計畫 (Test Plan)

- **單元測試**：對 `addData` / `updateData` / `deleteData` / `import` 進行邏輯驗證。
- **手動測試**：涵蓋第 8 節所有驗收項目。
- **離線測試**：於斷網狀態驗證全功能可用。
- **相容性測試**：於四大主流瀏覽器各執行一輪冒煙測試。
