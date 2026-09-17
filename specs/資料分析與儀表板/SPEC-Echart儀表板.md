---
created: 2026-07-14
tags:
  - spec
  - echarts
  - dashboard
  - visualization
  - offline
---

# SPEC.md — ECharts 本地離線視覺化儀表板網頁

## 1. 專案概述（Overview）

本專案為**純前端、可完全離線執行**的資料視覺化儀表板網頁，使用 **Apache ECharts** 繪圖，搭配原生 **HTML / CSS / JavaScript**。使用者可**上傳 CSV 或 Excel 檔案**，系統自動解析欄位情境並建置 **10 種圖表**。

> **核心原則：零外部依賴（Zero External Dependency）**
> 所有函式庫（ECharts、PapaParse、SheetJS）皆**本地內嵌**，不使用任何 CDN 或線上資源，**在無網路 / 內網封閉環境**中亦可完整運作。

| 項目 | 內容 |
|------|------|
| **專案名稱** | ECharts Offline Smart Dashboard |
| **類型** | 純前端、離線單頁應用（Standalone Static Web） |
| **核心技術** | HTML5、CSS3、JavaScript (ES6+)、Apache ECharts |
| **資料來源** | CSV 檔（.csv）／ Excel 檔（.xlsx, .xls） |
| **執行環境** | **本地端 / 內網 / 無網路環境** |
| **外部依賴** | **無**（所有函式庫本地內嵌） |
| **瀏覽器支援** | Chrome、Edge、Firefox（現代瀏覽器） |

---

## 2. 目標與範圍（Goals & Scope）

### 2.1 目標
- **完全離線執行**：不連任何外部網路即可使用。
- **零安裝**：雙擊 `index.html` 或透過本地簡易伺服器即可開啟。
- 上傳 CSV / Excel 自動生成 10 種情境圖表。
- 適用於**內網封閉 / 資安管制**環境（如金融、政府單位）。

### 2.2 範圍內（In Scope）
- 本地內嵌所有函式庫（ECharts / PapaParse / SheetJS）。
- CSV / Excel 解析、欄位型別偵測、情境圖表推薦。
- 10 種 ECharts 圖表與互動。
- 離線部署與 `file://` 相容性處理。

### 2.3 範圍外（Out of Scope）
- 後端伺服器、資料庫、API。
- 線上資源載入（字型、圖磚、CDN）。
- 使用者帳號 / 權限管理。

---

## 3. 本地離線執行原則（Offline Execution Principles）

### 3.1 零外部依賴
| 資源 | 傳統做法（禁用） | 本規格做法（採用） |
|------|-------------------|---------------------|
| ECharts | CDN 引入 | `lib/echarts.min.js` 本地檔 |
| CSV 解析 | CDN PapaParse | `lib/papaparse.min.js` 本地檔 |
| Excel 解析 | CDN SheetJS | `lib/xlsx.full.min.js` 本地檔 |
| 字型 | Google Fonts | 系統內建字型 / 本地字型檔 |
| 地圖 GeoJSON | 線上下載 | `data/geo/*.json` 本地檔 |
| 圖示 | 線上圖庫 | 本地 SVG / Base64 內嵌 |

### 3.2 執行方式（兩種）

**方式 A：直接雙擊開啟（`file://`）**
- 直接以瀏覽器開啟 `index.html`。
- 限制：部分瀏覽器在 `file://` 下對本地檔案讀取（如 `fetch` 載入 GeoJSON）有 CORS 限制。
- 對策：地圖 GeoJSON 等資源改以 `<script>` 內嵌或 Base64 / JS 變數方式載入，避免 `fetch`。

**方式 B：本地簡易伺服器（建議）**
- 使用不需安裝額外套件的方式啟動，例如：
  - Python（多數環境內建）：`python -m http.server 8000`
  - VS Code Live Server 擴充套件
- 以 `http://localhost:8000` 開啟，**完全避開 `file://` 限制**，功能最完整。

> **建議**：一般圖表在 `file://` 即可正常運作；**若需使用地圖（第 10 種圖表）**，建議採用方式 B 或將 GeoJSON 內嵌為 JS 變數。

### 3.3 單一檔案封裝（可選進階模式）
- 提供**「All-in-One 單檔版」**：將 CSS、JS、函式庫全部內嵌進單一 `dashboard.html`。
- 優點：只需傳遞**一個檔案**即可在任何電腦離線執行，適合封閉環境交付。
- 缺點：檔案較大（含函式庫約 2–4 MB），維護性較低。

---

## 4. 系統架構（Architecture）

```
+------------------------------------------------------+
|              瀏覽器 (Client) — 完全離線               |
|                                                      |
|  [檔案上傳]  -->  [檔案解析層 (本地函式庫)]           |
|  CSV / Excel      PapaParse / SheetJS (local)        |
|                          |                           |
|                          v                           |
|              [資料分析層 (Data Profiler)]            |
|              欄位型別偵測 + 情境判斷                  |
|                          |                           |
|                          v                           |
|              [圖表推薦引擎 (Chart Mapper)]           |
|                          |                           |
|                          v                           |
|              [ECharts 渲染層 (local lib)]           |
|                                                      |
|      ✱ 所有資源皆來自本地，無任何外部網路請求 ✱      |
+------------------------------------------------------+
```

---

## 5. 目錄結構（Directory Structure）

```
dashboard/
├── index.html                  # 主頁面（本地引用所有資源）
├── css/
│   └── style.css               # 全域樣式（本地）
├── js/
│   ├── main.js                 # 主程式進入點
│   ├── parser/
│   │   ├── csvParser.js         # CSV 解析
│   │   └── excelParser.js       # Excel 解析
│   ├── analyzer/
│   │   ├── dataProfiler.js      # 欄位型別偵測
│   │   └── chartMapper.js       # 情境 -> 圖表映射
│   ├── charts/
│   │   ├── lineChart.js         # 1. 折線圖
│   │   ├── barChart.js          # 2. 長條圖
│   │   ├── pieChart.js          # 3. 圓餅圖
│   │   ├── scatterChart.js      # 4. 散佈圖
│   │   ├── gaugeChart.js        # 5. 儀表板圖
│   │   ├── radarChart.js        # 6. 雷達圖
│   │   ├── heatmapChart.js      # 7. 熱力圖
│   │   ├── funnelChart.js       # 8. 漏斗圖
│   │   ├── boxplotChart.js      # 9. 箱型圖
│   │   └── mapChart.js          # 10. 地圖
│   └── utils/
│       └── resize.js           # 響應式縮放
├── lib/                        # ★ 本地內嵌函式庫（離線核心）
│   ├── echarts.min.js          # ECharts（本地）
│   ├── papaparse.min.js        # CSV 解析庫（本地）
│   └── xlsx.full.min.js        # Excel 解析庫（本地）
├── data/
│   └── geo/
│       └── taiwan.js           # ★ 地圖 GeoJSON（以 JS 變數內嵌，避免 fetch）
└── sample/
    ├── sample.csv              # 範例 CSV
    └── sample.xlsx             # 範例 Excel
```

> ★ 標示為離線關鍵資源，交付時**必須一併打包**，不可遺漏。

---

## 6. 函式庫本地引入規範（Local Library Loading）

### 6.1 HTML 引用（全部指向本地 `lib/`）
```html
<!-- 禁止使用 CDN -->
<!-- <script src="https://cdn.jsdelivr.net/..."></script> -->

<!-- 一律使用本地檔案 -->
<script src="lib/echarts.min.js"></script>
<script src="lib/papaparse.min.js"></script>
<script src="lib/xlsx.full.min.js"></script>
```

### 6.2 函式庫取得方式（離線前置作業）
> 在**有網路的環境**先行下載，放入 `lib/` 後即可攜至封閉環境使用。

| 函式庫 | 檔名 | 說明 |
|--------|------|------|
| Apache ECharts | `echarts.min.js` | 官方 dist 版 |
| PapaParse | `papaparse.min.js` | CSV 解析 |
| SheetJS (xlsx) | `xlsx.full.min.js` | Excel 解析（含完整功能） |

### 6.3 地圖資源離線處理
```html
<!-- 以 JS 變數方式內嵌，避免 file:// 下 fetch 失敗 -->
<script src="data/geo/taiwan.js"></script>
<!-- taiwan.js 內容：var TAIWAN_GEO = { ... GeoJSON ... }; -->
```
```javascript
// 註冊本地地圖，不使用線上載入
echarts.registerMap('taiwan', TAIWAN_GEO);
```

---

## 7. 資料來源與解析（Data Source & Parsing）

### 7.1 支援格式
| 格式 | 副檔名 | 本地解析函式庫 |
|------|--------|--------------|
| CSV | `.csv` | PapaParse（本地） |
| Excel | `.xlsx`, `.xls` | SheetJS（本地） |

### 7.2 解析輸出統一格式
```json
{
  "columns": ["日期", "地區", "產品", "銷售額", "數量"],
  "rows": [
    { "日期": "2026-01-01", "地區": "台北", "產品": "A", "銷售額": 12000, "數量": 30 }
  ]
}
```

### 7.3 CSV 解析（本地 PapaParse）
```javascript
Papa.parse(file, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: (results) => handleData(results.data)
});
```

### 7.4 Excel 解析（本地 SheetJS）
```javascript
const reader = new FileReader();
reader.onload = (e) => {
  const workbook = XLSX.read(e.target.result, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  handleData(XLSX.utils.sheet_to_json(sheet));
};
reader.readAsArrayBuffer(file);
```
> 檔案讀取皆透過瀏覽器原生 `FileReader`，**完全在本地記憶體處理，不上傳任何伺服器**。

---

## 8. 欄位型別偵測（Data Profiling）

| 型別 | 判斷規則 | 範例 |
|------|----------|------|
| **數值 (Numeric)** | 可轉為數字且非日期 | 銷售額、數量 |
| **類別 (Category)** | 字串且不重複值有限 | 地區、產品 |
| **日期 (Date)** | 符合日期格式 | 2026-01-01 |
| **地理 (Geo)** | 對應本地 GeoJSON 行政區 | 台北、高雄 |

分析結果範例：
```json
{
  "日期":   { "type": "date",     "unique": 90 },
  "地區":   { "type": "category", "unique": 5 },
  "產品":   { "type": "category", "unique": 8 },
  "銷售額": { "type": "numeric",  "min": 500, "max": 50000 },
  "數量":   { "type": "numeric",  "min": 1,   "max": 200 }
}
```

---

## 9. 情境判斷 -> 10 種圖表映射（Chart Mapping）

| # | 圖表類型 | 觸發情境（欄位組合） | 分析用途 | 離線注意事項 |
|---|----------|---------------------|----------|------------|
| 1 | 折線圖 Line | 日期 + 數值 | 時間序列趨勢變化 | 無 |
| 2 | 長條圖 Bar | 類別 + 數值 | 類別間數量比較 | 無 |
| 3 | 圓餅圖 Pie | 類別 + 數值 | 組成佔比結構 | 無 |
| 4 | 散佈圖 Scatter | 數值 + 數值 | 兩變數相關性 | 無 |
| 5 | 儀表板圖 Gauge | 單一數值 vs 目標 | 達成率 / 進度 | 無 |
| 6 | 雷達圖 Radar | 多數值 | 多維度能力比較 | 無 |
| 7 | 熱力圖 Heatmap | 類別 × 類別 + 數值 | 交叉分布 | 無 |
| 8 | 漏斗圖 Funnel | 類別(階段) + 數值 | 轉換流程 / 階段遞減 | 無 |
| 9 | 箱型圖 Boxplot | 類別 + 數值 | 分布 / 離群值 | 無 |
| 10 | 地圖 Map | 地理欄位 + 數值 | 地區分布 | **需本地 GeoJSON，建議用本地伺服器** |

### 推薦邏輯（虛擬碼）
```javascript
function recommendCharts(profile) {
  const charts = [];
  const dates      = getColumns(profile, 'date');
  const categories = getColumns(profile, 'category');
  const numerics   = getColumns(profile, 'numeric');
  const geos       = getColumns(profile, 'geo');

  if (dates.length && numerics.length)           charts.push('line');
  if (categories.length && numerics.length)      charts.push('bar', 'pie');
  if (numerics.length >= 2)                      charts.push('scatter');
  if (numerics.length)                           charts.push('gauge');
  if (numerics.length >= 3)                      charts.push('radar');
  if (categories.length >= 2 && numerics.length) charts.push('heatmap');
  if (categories.length && numerics.length)      charts.push('funnel', 'boxplot');
  if (geos.length && numerics.length)            charts.push('map');

  return charts;
}
```

> 欄位不足時**優雅降級**，隱藏該圖表並顯示提示（例如「無地理欄位，地圖已略過」）。

---

## 10. 功能需求（Functional Requirements）

| 編號 | 功能 | 說明 | 優先級 |
|------|------|------|--------|
| F-01 | 離線執行 | 無網路環境完整運作 | **高** |
| F-02 | 本地函式庫 | 所有依賴本地內嵌 | **高** |
| F-03 | 檔案上傳 | CSV / Excel 拖放與選檔 | 高 |
| F-04 | 工作表切換 | Excel 多 Sheet 切換 | 中 |
| F-05 | 欄位型別偵測 | 自動分類欄位 | 高 |
| F-06 | 情境圖表推薦 | 建置 10 種圖表 | 高 |
| F-07 | 欄位手動指定 | 調整 X/Y 軸欄位 | 中 |
| F-08 | 互動 tooltip | 懸停顯示數值 | 高 |
| F-09 | 資料篩選 | 類別 / 日期動態更新 | 高 |
| F-10 | 響應式版面 | 自動 resize | 高 |
| F-11 | 圖表匯出 | 另存 PNG（本地產生） | 低 |

---

## 11. 版面配置（Layout）

```
+------------------------------------------------------+
|         頁首 (標題 + 檔案上傳 + Sheet + 篩選)         |
+------------------------------------------------------+
|                  資料摘要 / KPI 卡片                  |
+---------------------------+--------------------------+
| 1. 折線圖                 | 2. 長條圖                |
+---------------------------+--------------------------+
| 3. 圓餅圖                 | 4. 散佈圖                |
+---------------------------+--------------------------+
| 5. 儀表板圖               | 6. 雷達圖                |
+---------------------------+--------------------------+
| 7. 熱力圖                 | 8. 漏斗圖                |
+---------------------------+--------------------------+
| 9. 箱型圖                 | 10. 地圖                 |
+---------------------------+--------------------------+
```

- 採 CSS Grid 雙欄佈局，手機自動堆疊為單欄。

---

## 12. 效能與相容性（Performance & Compatibility）

| 項目 | 規範 |
|------|------|
| **外部請求** | **0 次**（完全離線） |
| **檔案大小** | 上傳檔 ≤ 10 MB |
| **資料筆數** | 超過 1 萬筆啟用 `dataZoom` 與 `sampling` |
| **圖表實例** | 10 個，卸載時 `dispose()` |
| **首次渲染** | < 3 秒（中等資料量） |
| **瀏覽器** | Chrome / Edge 90+、Firefox 88+ |

---

## 13. 資安與隱私（Security & Privacy）

> 離線執行的重要優勢，特別適合**金融 / 內網管制**環境：

- **資料不出本機**：所有 CSV / Excel 僅在瀏覽器記憶體處理，**不上傳任何伺服器**。
- **無外部連線**：不發送任何網路請求，杜絕資料外洩風險。
- **可離線稽核**：整包檔案可離線審查，無隱藏的外部呼叫。

---

## 14. 部署與交付（Deployment & Delivery）

### 14.1 交付內容
- 完整 `dashboard/` 資料夾（含 `lib/` 本地函式庫、`data/geo/` 地圖檔）。
- 或 **All-in-One 單一 `dashboard.html`**（進階封裝模式）。

### 14.2 啟動方式
| 方式 | 指令 / 操作 | 適用 |
|------|-------------|------|
| 直接開啟 | 雙擊 `index.html` | 一般圖表（不含地圖） |
| 本地伺服器 | `python -m http.server 8000` | **完整功能（含地圖）** |
| VS Code | Live Server 擴充 | 開發階段 |

---

## 15. 開發規範（Coding Standards）

- **命名**：camelCase（變數/函式）、UPPER_SNAKE_CASE（常數）。
- **模組化**：每種圖表獨立模組，匯出 `renderXxxChart(data)`。
- **零外部引用**：程式碼中**禁止**出現任何 `http://` / `https://` 外部資源。
- **相對路徑**：所有資源引用一律使用**相對路徑**（確保 `file://` 可運作）。
- **解耦**：解析、分析、渲染三層職責分離。
- **錯誤處理**：檔案格式錯誤、空資料、欄位不足時顯示友善提示。

---

## 16. 測試計畫（Testing）

| 測試類型 | 內容 |
|----------|------|
| **離線測試** | **關閉網路後功能完整運作** |
| **file:// 測試** | 直接雙擊開啟各圖表正常（地圖除外提示） |
| 本地伺服器測試 | localhost 下含地圖全功能正常 |
| 檔案解析 | CSV / Excel（多 Sheet）正確讀取 |
| 型別偵測 | 欄位分類正確 |
| 圖表推薦 | 各情境正確觸發 |
| 邊界測試 | 空檔、缺欄位、極大值、負值 |
| 相容性 | 跨瀏覽器驗證 |

---

## 17. 未來擴充（Future Enhancements）
- 提供**離線安裝包（PWA）**，可加入桌面離線使用。
- 內建**多套本地 GeoJSON**（縣市 / 鄉鎮層級）。
- 匯出整份儀表板為**離線 HTML 報告**或 **PDF**。
- 支援**多檔案比較**與資料合併。
- 加入 **AI 自動洞察摘要**（自動描述圖表趨勢）。
