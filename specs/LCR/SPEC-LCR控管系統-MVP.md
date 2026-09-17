---
created: 2026-07-25
tags:
  - spec
  - vibecoding
  - lcr
  - mvp
  - nextjs
  - supabase
  - finance
---

# SPEC — LCR 月底預估值試算資料控管系統（MVP 版）

## 1. 文件資訊

| 項目 | 內容 |
|------|------|
| 文件名稱 | LCR 試算資料控管系統 MVP 技術規格書 |
| 產品階段 | MVP（最小可行產品，快速驗證） |
| 版本 | v1.0 |
| 建立日期 | 2026-07-24 |
| 文件狀態 | 草稿 |
| 設計原則 | 快速開發、最少維運、單一整合技術棧、優先驗證核心價值 |

---

## 2. MVP 目標與範圍

### 2.1 MVP 想驗證的核心價值
> 「用一個線上系統，取代 Email + Excel 人工催件，讓資料彙整窗口能**即時看到誰交了、誰逾期、哪筆資料有問題**。」

### 2.2 MVP 必做（In Scope）
- 線上資料填報表單（財務部 / 風管部）。
- 提供狀態儀表板（已提供 / 未提供 / 逾期）。
- 基本檢核（基準日、必填、預估標記）。
- 缺漏 / 異常清單自動列出。
- 一鍵匯出彙整資料（Excel / CSV）。
- Email 期限提醒（自動）。

### 2.3 MVP 先不做（Out of Scope，留待後續版本）
- 與 BIS / 核心系統自動介接。
- 複雜 RBAC 與多層審批流。
- Teams 推播、進階 BI 報表。
- 高可用叢集、微服務拆分。

---

## 3. 技術棧選型（快速開發導向）

> 核心策略：**用全端框架 + BaaS，一個人／小團隊兩到三週可上線**，不自建伺服器、不自寫登入系統、不管理資料庫維運。

### 3.1 推薦組合（主推）

| 層級 | 技術 | 為何選它（MVP 觀點） |
|------|------|----------------------|
| **全端框架** | **Next.js（React + API Routes，TypeScript）** | 前後端一套搞定，免分別部署；生態成熟、範例多 |
| **後端即服務（BaaS）** | **Supabase**（PostgreSQL + Auth + Storage） | 免自建資料庫與登入；內建使用者驗證、檔案儲存、即時資料，省下大量後端工 |
| **UI 元件** | **shadcn/ui + Tailwind CSS** | 直接複製貼上高質感元件，表單/表格/日期選擇即用 |
| **表單驗證** | **React Hook Form + Zod** | 前後端共用驗證 schema，檢核規則寫一次 |
| **Email 提醒** | **Resend** 或 SMTP（Exchange） | 幾行程式送信；排程用 Supabase Cron / Vercel Cron |
| **匯出 Excel** | **SheetJS (xlsx)** | 前端直接產出 .xlsx，免後端 |
| **部署** | **Vercel**（對外）或 **內網 Docker 一鍵部署** | 依行內資安要求，可全數搬到內網自架 |

### 3.2 更輕量替代方案（若團隊偏好 Python / 純內部工具）

| 選項 | 技術 | 適用情境 |
|------|------|----------|
| Python 派 | **Streamlit** 或 **NiceGUI** + SQLite/PostgreSQL | 資料人員熟 Python，想幾天內生出可用內部工具 |
| 低程式碼派 | **Microsoft Power Apps + SharePoint List + Power Automate** | 完全不寫程式、貼合行內既有 M365 授權（若不想寫 code，這是最快的） |

> **建議**：若有前端/JS 基礎 → 選 **Next.js + Supabase**；若團隊是資料/Python 背景 → 選 **Streamlit**；若完全不想開發 → 用 **Power Platform**。

---

## 4. 系統架構（MVP 極簡版）

```
[使用者瀏覽器]
      │ HTTPS
┌─────▼──────────────────────────┐
│  Next.js 全端應用                │
│  - 填報頁 / 儀表板 / 檢核清單     │
│  - API Routes（伺服器邏輯）       │
└─────┬──────────────────────────┘
      │ SDK
┌─────▼──────────────────────────┐
│  Supabase (BaaS)                │
│  - PostgreSQL 資料庫             │
│  - Auth 登入驗證                 │
│  - Storage 附件儲存              │
│  - Cron 排程（期限提醒）          │
└────────────────────────────────┘
      │
┌─────▼─────┐
│ Email 服務 │  Resend / Exchange SMTP
└───────────┘
```

一個應用 + 一個 BaaS，**沒有獨立後端伺服器、沒有獨立資料庫維運**。

---

## 5. 資料模型（MVP 精簡 3 張表）

**period_task（期別任務）**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid (PK) | 任務代碼 |
| period | text | 期別（如 11507） |
| base_date | date | 資料基準日 |
| due_at | timestamptz | 提供期限 |
| status | text | open / closed |
| created_at | timestamptz | 建立時間 |

**submission（資料提交）**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid (PK) | 提交代碼 |
| task_id | uuid (FK) | 對應期別任務 |
| dept | text | 財務部 / 風管部 |
| data_name | text | 資料名稱 |
| base_date | date | 提交資料標示之基準日 |
| is_estimate | bool | 是否預估數 |
| assumption | text | 預估假設 |
| file_url | text | 附件連結（Supabase Storage） |
| submit_status | text | 已提供 / 未提供 / 逾期 |
| submitted_at | timestamptz | 提交時間 |

**check_result（檢核 / 缺漏異常）**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid (PK) | 檢核代碼 |
| submission_id | uuid (FK) | 對應提交 |
| check_type | text | 基準日 / 必填 / 預估標記 |
| result | text | pass / fail |
| remark | text | 異常說明 |

> MVP 稽核軌跡先用 Supabase 內建的 `created_at` 與資料列版本即可，不另建完整 audit log。

---

## 6. 功能需求（MVP）

| 編號 | 功能 | 說明 |
|------|------|------|
| FR-01 | 建立期別任務 | 窗口設定期別、基準日、期限；系統寄出通知信 |
| FR-02 | 線上填報 | 單位填報資料名稱、基準日、預估標記、假設、上傳附件 |
| FR-03 | 狀態儀表板 | 即時顯示各單位已提供 / 未提供 / 逾期 |
| FR-04 | 自動檢核 | 基準日是否符合、必填是否齊全、預估是否標記 |
| FR-05 | 缺漏異常清單 | 自動列出未通過項目，供窗口追蹤 |
| FR-06 | Email 期限提醒 | 期限前自動提醒未交單位、逾期通知窗口 |
| FR-07 | 匯出彙整資料 | 一鍵匯出 Excel / CSV 供 LCR 試算 |

---

## 7. 非功能需求（MVP 版，務實從簡）

| 類別 | MVP 需求 |
|------|----------|
| 安全性 | Supabase Auth 登入 + Row Level Security；HTTPS |
| 效能 | 使用者數少（<50），一般操作 < 2 秒即可 |
| 可用性 | 上班時段可用即可，不需高可用叢集 |
| 部署 | 若資安要求資料不出行內 → 改為內網 Docker 自架 Supabase + Next.js |
| 可維護性 | 檢核規則寫成單一 Zod schema，集中修改 |

---

## 8. 開發時程（快速）

| 週次 | 內容 | 產出 |
|------|------|------|
| W1 | 建 Supabase 資料表 + Auth；Next.js 專案初始化；填報表單 | 可填報 |
| W2 | 儀表板 + 檢核邏輯 + 缺漏清單 + Email 提醒 | 核心可用 |
| W3 | 匯出功能 + 試辦一個期別 + 修正 | MVP 上線試辦 |

> 預估 **2–3 週**由 1–2 人完成可試辦版本。

---

## 9. 驗收標準（MVP）

| 編號 | 驗收標準 |
|------|----------|
| AC-01 | 可建立期別任務並自動寄出通知信 |
| AC-02 | 兩單位可線上完成填報並上傳附件 |
| AC-03 | 儀表板正確顯示三種提交狀態 |
| AC-04 | 基準日不符 / 缺漏 / 未標預估可被檢核出並列入清單 |
| AC-05 | 期限前自動寄出提醒信 |
| AC-06 | 可一鍵匯出彙整 Excel 供試算使用 |

---

## 10. MVP 之後的演進方向

- 加入 Teams 推播、進階 BI 儀表板。
- 完整 RBAC 與多層審批。
- 與 BIS / 核心系統自動介接（此時再評估是否升級為方案三自建架構）。
- 完整稽核軌跡與歷史趨勢分析。

---

## 11. 待確認事項

| 項目 | 說明 |
|------|------|
| 資料是否可放雲端 | 決定用 Vercel+Supabase 雲端 或 內網自架 |
| 技術棧最終選定 | Next.js+Supabase / Streamlit / Power Platform |
| 兩單位填報欄位明細 | 待與財務部、風管部確認 |
| 檢核規則（基準日容忍值、必填清單） | 待確認 |
| Email 寄送管道 | Resend 或行內 Exchange SMTP |

---

## 12. 版本紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| v1.0 | 2026-07-24 | 依 MVP 快速開發原則，重寫技術規格，改採 Next.js + Supabase 全端輕量架構 |
