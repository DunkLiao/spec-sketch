---
created: 2026-07-14
tags:
  - spec
  - rust
  - tauri
  - desktop-app
---

# 專案規格書 (Project Specification): {{應用程式名稱}}

> 版本: v0.1.0 ｜ 最後更新: {{YYYY-MM-DD}} ｜ 維護者: {{負責人 / 團隊}}
> 狀態: `Draft` ｜ `In Review` ｜ `Approved`

---

## 1. 專案概述 (Overview)

| 項目 | 說明 |
| :--- | :--- |
| **目標** | 使用 **Tauri v2** 框架打造高效、輕量、跨平台的桌面應用程式。 |
| **核心價值** | 結合前端現代化 UI 體驗，搭配 Rust 的極致效能、記憶體安全與低資源耗用。 |
| **主要功能** | {{例如：跨平台 Markdown 筆記軟體 / 本地圖片批次壓縮工具 / API 測試客戶端}} |
| **目標使用者** | {{例如：需要離線、注重隱私與效能的個人或企業使用者}} |
| **平台範圍** | Windows 10/11、macOS 12+、Linux (Debian/Ubuntu 系) |

### 1.1 名詞定義 (Glossary)
* **IPC (Inter-Process Communication)**: 前端 (Webview) 與後端 (Rust) 之間的通訊機制。
* **Command**: Rust 端以 `#[tauri::command]` 標註、供前端 `invoke` 呼叫的函數。
* **Capability**: Tauri v2 的權限設定單位，用於精細控管視窗可存取的 API。

---

## 2. 技術選型 (Tech Stack)

### 2.1 後端核心 (Backend)
* **語言**: Rust (MSRV: 1.77+)
* **主框架**: **Tauri v2**（支援多視窗、行動端擴充與細緻化權限模型）
* **非同步執行期**: `tokio`（處理 I/O 密集與並行任務）
* **資料序列化**: `serde` / `serde_json`（Rust 與前端 IPC 資料交換）
* **錯誤處理**: `thiserror`（定義錯誤型別）、`anyhow`（應用層錯誤傳遞）
* **日誌**: `tracing` + `tracing-subscriber`，或 `tauri-plugin-log`

### 2.2 前端介面 (Frontend)
* **框架**: {{請挑選：React / Vue 3 / Svelte / SolidJS}}
* **語言**: TypeScript（強制型別檢查）
* **建構工具**: Vite
* **樣式庫**: Tailwind CSS
* **狀態管理**: {{例如：Zustand / Pinia / Svelte Store}}

### 2.3 本地儲存 (Storage)
依需求勾選（可複選）：
* [ ] **Tauri Plugin Stronghold**: 加密安全儲存（適合密碼、API Key、Token）。
* [ ] **SQLite + `sqlx`**: 結構化關聯資料，支援編譯期 SQL 檢查。
* [ ] **Local Files (JSON/TOML)**: 輕量設定檔與使用者偏好。
* [ ] **`tauri-plugin-store`**: 簡易鍵值對持久化。

### 2.4 打包與發佈 (Packaging)
* **打包工具**: Tauri Bundler
* **產出格式**: Windows `.msi` / `.exe`(NSIS)、macOS `.dmg` / `.app`、Linux `.deb` / `.AppImage`
* **自動更新**: {{是否採用 `tauri-plugin-updater`：是 / 否}}
* **程式碼簽章**: {{Windows Authenticode / macOS Notarization：是 / 否}}

---

## 3. 架構設計與 IPC 機制 (Architecture & IPC)

應用程式採用 **前後端分離架構**：前端負責 UI 渲染與事件觸發，Rust 後端負責核心邏輯、檔案系統操作與系統級 API。所有跨界呼叫皆須經過 Command 白名單與參數驗證。

```
┌────────────────────────┐        invoke / event         ┌────────────────────────┐
│   Frontend (Webview)   │  ───────────────────────────▶ │      Rust Backend      │
│  UI / State / Events   │  ◀─────────────────────────── │  Commands / Core Logic │
└────────────────────────┘        Result / emit          └───────────┬────────────┘
                                                                      │
                                                     ┌────────────────┼────────────────┐
                                                     ▼                ▼                ▼
                                                 File System      Database         System API
```

### 3.1 核心通訊設計 (IPC Commands)
前端透過 `@tauri-apps/api/core` 的 `invoke` 呼叫 Rust 函數。所有命令回傳型別建議統一為 `Result<T, AppError>`，前端以 try/catch 接收。

| Command | 用途 | 簽章 (示意) |
| :--- | :--- | :--- |
| `get_app_config` | 前端初始化時讀取本地設定檔 | `fn get_app_config() -> Result<AppConfig, AppError>` |
| `save_app_config` | 前端更動設定後寫入本地 | `fn save_app_config(config: AppConfig) -> Result<(), AppError>` |
| `{{process_file}}` | {{自訂命令：處理檔案}} | `fn process_file(path: String) -> Result<String, AppError>` |

### 3.2 事件通訊 (Events)
* 後端長時間任務透過 `app_handle.emit()` 主動推送進度事件。
* 前端以 `listen()` 訂閱，例如 `task://progress`、`task://done`。

---

## 4. 核心功能需求 (Functional Requirements)

### 4.1 視窗管理
* 支援自訂標題列 (Custom Titlebar)，達成無邊框現代感 UI，並保留拖曳、最小化、最大化、關閉行為。
* 支援視窗大小與位置記憶（重啟後自動還原），可搭配 `tauri-plugin-window-state`。

### 4.2 系統整合
* **系統托盤 (System Tray)**: 點擊關閉按鈕時最小化至托盤而非退出；右鍵選單包含「顯示主視窗」、「設定」、「完全退出」。
* **檔案拖曳 (File Drop)**: 支援將本地檔案拖入視窗，前端接收路徑後交由 Rust 處理（須於 capabilities 開啟拖放權限）。
* **全域快捷鍵**: {{選填，例如 Ctrl/Cmd+Shift+N 快速開啟}}。

### 4.3 本地隔離與安全通訊
* 啟用 **Isolation Pattern**，前端不直接暴露 `window.__TAURI__` 全域物件。
* 僅透過白名單 Commands 進行跨界通訊，所有輸入參數於 Rust 端進行驗證與清理。

---

## 5. 非功能需求 (Non-Functional Requirements)

### 5.1 效能
* **記憶體控制**: 閒置時記憶體佔用控制在 **80MB – 120MB**（以 Webview 核心耗用為準）。
* **啟動時間**: 冷啟動 < 2 秒（一般硬體）。
* **套件體積**: 安裝檔目標 < 15MB（不含大型內嵌資源）。

### 5.2 安全權限 (Capabilities)
* 於 `capabilities/*.json` 中採 **最小權限原則**，僅開放專案必要之 API 與資料夾範圍。
* 嚴禁使用 `fs:allow-all` 等寬鬆權限；檔案存取限縮於 `$APPDATA`、`$DOCUMENT` 等指定範圍。
* 設定嚴格的 **CSP (Content Security Policy)**，禁止載入未授權外部資源。

### 5.3 相容性
* **Windows 10/11**: WebView2 (Evergreen Runtime)
* **macOS 12+**: WKWebView (WebKit)
* **Linux**: WebKitGTK

### 5.4 可觀測性 (Observability)
* 統一日誌等級 (`trace` / `debug` / `info` / `warn` / `error`)。
* 日誌輸出至檔案（依平台存於使用者資料夾）並支援輪替。
* {{選填：整合當機回報 / 匿名遙測（需明確告知使用者並取得同意）}}。

---

## 6. 測試策略 (Testing Strategy)
* **Rust 單元測試**: `cargo test`，涵蓋核心邏輯與 Command 純函數。
* **前端測試**: {{例如 Vitest（單元）、Testing Library（元件）}}。
* **端對端 (E2E)**: 使用 `tauri-driver` + WebDriver 驗證關鍵使用者流程。
* **驗收標準**: 主要流程測試覆蓋率 ≥ {{80%}}，CI 綠燈方可合併。

---

## 7. 開發與打包里程碑 (Milestones)

| 階段 | 目標 | 完成標準 (DoD) | 狀態 |
| :--- | :--- | :--- | :--- |
| **Phase 1** | 使用 Vite + Tauri v2 建立基礎鷹架 | 前後端雙向 IPC (`invoke`/`emit`) 可正常運作 | [ ] |
| **Phase 2** | 自訂標題列與系統托盤 | 無邊框視窗 + 托盤選單功能完成 | [ ] |
| **Phase 3** | Rust 核心資料處理模組 | 本地檔案讀寫 / 資料庫 CRUD 完成並通過測試 | [ ] |
| **Phase 4** | 前端 UI 改版與整合 Tailwind CSS | 主要頁面與元件完成、響應式排版 | [ ] |
| **Phase 5** | 生產環境權限與跨平台打包 | `cargo tauri build` 於三平台成功產出安裝檔 | [ ] |

---

## 8. 風險與待決事項 (Risks & Open Questions)
* {{例如：Linux 各發行版 WebKitGTK 版本差異導致的相容性問題}}
* {{例如：自動更新伺服器架設與簽章憑證來源}}
* {{待確認：是否需支援行動端 (iOS/Android)}}

---

## 9. 參考資源 (References)
* Tauri v2 官方文件: https://v2.tauri.app/
* Tauri Security / Capabilities: https://v2.tauri.app/security/
* Vite: https://vitejs.dev/
* Tailwind CSS: https://tailwindcss.com/
