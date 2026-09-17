---
type: permanent-note
created: 2026-07-15
date: 2026-07-15
tags:
  - spec
  - rss
  - newshub
  - fastapi
status: processed
graduated-from: "[[Ideas/SPEC-RSS新聞查詢平台技術規格書]]"
---

## For future Claude

NewsHub SPEC — a RSS-based news aggregation and search platform. Architecture: FastAPI + SQLite/PostgreSQL + Redis + Vue3. Covers RSS collection pipeline, dedup, AI analysis (summary/NER/sentiment), REST API, deployment, and 6-phase milestone plan.

# 新聞查詢平台技術規格書 (SPEC)

> 專案代號：**NewsHub**
> 版本：v1.0
> 文件狀態：Draft
> 最後更新：2026-07-15

---

## 目錄

1. [專案概述](#1-專案概述)
2. [設計原則](#2-設計原則)
3. [系統範圍](#3-系統範圍)
4. [整體架構](#4-整體架構)
5. [資料來源層](#5-資料來源層)
6. [RSS 採集模組](#6-rss-採集模組)
7. [資料清洗與標準化](#7-資料清洗與標準化)
8. [去重複機制](#8-去重複機制)
9. [儲存層](#9-儲存層)
10. [搜尋引擎](#10-搜尋引擎)
11. [AI 分析層](#11-ai-分析層)
12. [API 設計](#12-api-設計)
13. [前端架構](#13-前端架構)
14. [推薦技術棧](#14-推薦技術棧)
15. [部署方式](#15-部署方式)
16. [非功能性需求](#16-非功能性需求)
17. [可擴充性設計](#17-可擴充性設計)
18. [設定檔範例](#18-設定檔範例)
19. [資料庫 Schema](#19-資料庫-schema)
20. [目錄結構](#20-目錄結構)
21. [開發里程碑](#21-開發里程碑)
22. [授權與法律注意事項](#22-授權與法律注意事項)

---

## 1. 專案概述

NewsHub 是一套以 **RSS 為核心** 的新聞聚合與查詢平台，目標是提供：

- 免費（不依賴付費 API / API Key）
- 可長期維護
- 容易擴充新的新聞來源
- 支援 AI 摘要與 RAG 檢索

### 主要用途

| 用途 | 說明 |
|------|------|
| 新聞搜尋 | 依關鍵字、來源、時間範圍查詢 |
| 輿情監控 | 品牌 / 產業 / 競品追蹤 |
| 金融情資 | 個股、產業、總經新聞聚合 |
| AI Agent 資料源 | 提供 Copilot / ChatBot / RAG 使用 |

---

## 2. 設計原則

| 原則 | 說明 |
|------|------|
| **免費優先** | 僅使用公開、免費、免 API Key 的 RSS 來源 |
| **模組化** | 採集、清洗、儲存、AI、API 各自獨立 |
| **可擴充** | 新增來源只需新增設定，不需改核心程式 |
| **輕量啟動** | MVP 可用 SQLite 單機跑起來 |
| **可升級** | 需要規模化時可平滑切換 PostgreSQL / Elasticsearch |
| **不儲存全文** | 僅保留標題、摘要、連結，降低授權風險 |

---

## 3. 系統範圍

### In Scope（涵蓋）

- RSS 抓取與排程
- 資料清洗與標準化
- 新聞去重複
- 關鍵字 / 條件搜尋
- AI 摘要、NER、情緒分析
- REST API
- 前端 Dashboard

### Out of Scope（不涵蓋）

- 新聞全文爬蟲與轉載
- 付費新聞牆內容
- 影音新聞下載
- 使用者帳號 / 金流系統（可後續擴充）

---

## 4. 整體架構

```text
                 ┌─────────────┐
                 │ Web UI      │
                 │ ChatBot     │
                 │ Copilot     │
                 └──────┬──────┘
                        │
                        ▼
             ┌────────────────────┐
             │ News Search API    │
             │ (FastAPI)          │
             └─────────┬──────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
 ┌───────────┐  ┌───────────┐  ┌───────────┐
 │ RSS層     │  │ 儲存層    │  │ AI引擎    │
 └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
       │              │              │
       ▼              ▼              ▼
 Google News     SQLite/PG      LLM摘要
 Reuters         Redis          NER
 CNA                            情緒分析
 TechCrunch                     RAG / Embedding
 Hacker News
```

### 資料流

```text
排程觸發 → RSS抓取 → 清洗 → 去重 → 入庫 → (AI摘要) → 提供API查詢
```

---

## 5. 資料來源層

### Level 1：主來源（必備）

**Google News RSS**

```text
https://news.google.com/rss/search?q={keyword}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant
```

進階語法：

```text
AI when:1d
台積電 when:7d
NVIDIA site:reuters.com
GenAI OR LLM
台積電 -股票
```

特性：

- 已聚合 Reuters、AP、Bloomberg、CNA、UDN、自由時報等數千家媒體
- 單次查詢約上限 100 筆、無分頁
- link 為 Google Redirect 網址

### Level 2：補充來源

| 分類 | 來源 | RSS URL |
|------|------|---------|
| 台灣 | 中央社 CNA | `https://www.cna.com.tw/rss.aspx` |
| 台灣 | 自由時報 | `https://news.ltn.com.tw/rss/all.xml` |
| 台灣 | 聯合新聞網 | `https://udn.com/rssfeed/news` |
| 台灣 | ETtoday | `https://feeds.feedburner.com/ettoday/realtime` |
| 國際 | BBC | `https://feeds.bbci.co.uk/news/rss.xml` |
| 國際 | DW | `https://rss.dw.com/rdf/rss-en-top` |
| 國際 | Al Jazeera | `https://www.aljazeera.com/xml/rss/all.xml` |
| 科技 | TechCrunch | `https://techcrunch.com/feed/` |
| 科技 | The Verge | `https://www.theverge.com/rss/index.xml` |
| 科技 | Hacker News | `https://hnrss.org/frontpage` |

### 最小推薦組合（免費 + 好維護）

```text
Google News RSS + 中央社 RSS + TechCrunch RSS + Hacker News RSS
```

可涵蓋約 90% 公開新聞需求。

---

## 6. RSS 採集模組

### 職責

- 依設定定時抓取各 RSS
- 解析 XML
- 送往清洗模組

### 排程策略

| 來源類型 | 頻率 |
|----------|------|
| 熱門關鍵字 | 每 5 分鐘 |
| 一般來源 | 每 15 分鐘 |
| 低頻來源 | 每 30~60 分鐘 |

### 建議工具

- `feedparser`（解析 RSS）
- `httpx` / `requests`（抓取）
- `APScheduler`（排程）

### 抓取失敗處理

- Retry 3 次（指數退避）
- 失敗記錄至 `feed_status`
- 連續失敗 N 次發出告警

---

## 7. 資料清洗與標準化

原始 RSS：

```xml
<item>
  <title>台積電法說會 ...</title>
  <link>...</link>
  <description>...</description>
  <pubDate>...</pubDate>
  <source>...</source>
</item>
```

標準化後（統一 Schema）：

```json
{
  "title": "台積電法說會...",
  "url": "https://...",
  "source": "Reuters",
  "summary": "200字內摘要",
  "publish_time": "2026-07-15T10:00:00Z",
  "language": "zh-TW",
  "keyword": "台積電"
}
```

清洗步驟：

1. 去除 HTML tag
2. 統一時間格式為 ISO8601 (UTC)
3. 標題 / 摘要去除多餘空白
4. 補齊來源名稱
5. 語言偵測

---

## 8. 去重複機制

新聞常被多家轉載（Reuters / Yahoo / 鉅亨 / MoneyDJ 可能同一篇）。

| 方法 | 說明 | 適用 |
|------|------|------|
| URL Hash | `sha256(normalized_url)` | 精準比對 |
| 標題 Hash | `sha256(title)` | 轉載偵測 |
| 相似度比對 | Embedding + Cosine | 語意去重 |

相似度門檻：

```text
Cosine Similarity >= 0.90 → 視為同一則新聞
```

去重流程：

```text
新資料 → URL去重 → 標題去重 → (可選)語意去重 → 入庫
```

---

## 9. 儲存層

### MVP：SQLite

```text
news.db
```

- 單檔、零設定
- 內建 FTS 全文搜尋
- 適合個人 / 部門工具

### 正式版：PostgreSQL

- 支援大量並發
- 支援 `pg_trgm`、`tsvector` 全文搜尋
- 可搭配 `pgvector` 做向量檢索

### 快取：Redis

| 用途 | 說明 |
|------|------|
| 熱門查詢快取 | 降低重複抓取 |
| 搜尋結果快取 | 提升回應速度 |
| AI 摘要快取 | 避免重複呼叫 LLM |

---

## 10. 搜尋引擎

### 關鍵字搜尋

```text
台積電
美國升息
AI PC
```

### 多條件搜尋

```json
{
  "keyword": "台積電",
  "source": "Reuters",
  "days": 7
}
```

### 全文搜尋

| 階段 | 技術 |
|------|------|
| MVP | SQLite FTS5 |
| 正式 | PostgreSQL tsvector / Elasticsearch |

---

## 11. AI 分析層

### 新聞摘要

```text
輸入：2000字全文/描述
輸出：100字摘要
```

### 關鍵事件抽取

```json
{
  "event": "台積電法說會",
  "company": "TSMC",
  "impact": "正向"
}
```

### 實體識別 (NER)

辨識：公司 / 人物 / 產品 / 國家

### 情緒分析

```text
正面 / 中立 / 負面
```

### RAG / 向量檢索

- Embedding 模型：可用開源（bge, e5）或 Azure OpenAI
- 向量庫：pgvector / FAISS / Chroma

---

## 12. API 設計

### 搜尋新聞

```http
GET /api/news?keyword=AI&days=7&source=Google
```

回傳：

```json
{
  "count": 100,
  "items": [
    {
      "id": "a1b2c3",
      "title": "...",
      "source": "Reuters",
      "publish_time": "2026-07-15T10:00:00Z",
      "url": "...",
      "summary": "..."
    }
  ]
}
```

### 熱門新聞

```http
GET /api/news/trending
```

### AI 摘要

```http
POST /api/news/summary
Content-Type: application/json

{ "id": "a1b2c3" }
```

### 新聞詳情

```http
GET /api/news/{id}
```

### 來源管理

```http
GET  /api/sources
POST /api/sources
```

---

## 13. 前端架構

技術：**Vue3**（或 React）

畫面結構：

```text
首頁
 ├─ 搜尋列
 ├─ 熱門新聞
 ├─ 最新新聞
 ├─ 新聞來源篩選
 └─ 關鍵字標籤
```

功能：

- 關鍵字搜尋
- 來源 / 時間篩選
- 卡片式新聞列表
- 點擊跳原始新聞
- AI 摘要展開

---

## 14. 推薦技術棧

### 輕量版（MVP）

```text
Python + FastAPI
SQLite
Redis
Vue3
feedparser + APScheduler
```

適合：個人專案、部門工具、Copilot Plugin

### 企業版

```text
Python + FastAPI
PostgreSQL (+ pgvector)
Redis
Elasticsearch
Kafka
Azure OpenAI / OpenAI
React
```

適合：輿情監控平台、新聞情資中心、金融研究系統

---

## 15. 部署方式

### 本地端

```bash
uvicorn app.main:app --reload
```

### Docker Compose

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - redis
  redis:
    image: redis:7
  # 企業版可加入 postgres / elasticsearch
```

---

## 16. 非功能性需求

| 項目 | 目標 |
|------|------|
| 回應時間 | 搜尋 API < 500ms（快取命中） |
| 可用性 | 99% |
| 抓取延遲 | 新聞入庫 < 15 分鐘 |
| 擴充性 | 新增來源不需改核心程式 |
| 成本 | RSS 來源零授權費 |
| 維運 | MVP 單機可運行 |

---

## 17. 可擴充性設計

- **來源設定化**：新增來源＝新增 YAML 一筆設定
- **Adapter 模式**：不同來源可用不同 parser plugin
- **可插拔儲存**：Repository 介面隔離 SQLite / PostgreSQL
- **可插拔 AI**：摘要 / 情緒可切換不同模型
- **水平擴充**：採集器可多實例，透過佇列分工

```text
新增來源流程：
1. 在 feeds.yaml 新增一筆
2. (可選)撰寫對應 parser adapter
3. 重新載入設定即可
```

---

## 18. 設定檔範例

`config/feeds.yaml`

```yaml
feeds:
  - name: google-news-ai
    type: google_news
    query: "AI"
    lang: zh-TW
    interval: 300

  - name: google-news-tsmc
    type: google_news
    query: "台積電"
    lang: zh-TW
    interval: 300

  - name: cna
    type: rss
    url: "https://www.cna.com.tw/rss.aspx"
    interval: 900

  - name: techcrunch
    type: rss
    url: "https://techcrunch.com/feed/"
    interval: 900

  - name: hackernews
    type: rss
    url: "https://hnrss.org/frontpage"
    interval: 900
```

`config/app.yaml`

```yaml
storage:
  driver: sqlite      # sqlite | postgres
  dsn: "news.db"

cache:
  redis: "redis://localhost:6379/0"

ai:
  provider: azure_openai   # openai | azure_openai | local
  summary_enabled: true
  sentiment_enabled: true
```

---

## 19. 資料庫 Schema

```sql
-- 新聞主表
CREATE TABLE news (
    id            TEXT PRIMARY KEY,        -- hash id
    title         TEXT NOT NULL,
    url           TEXT NOT NULL,
    url_hash      TEXT NOT NULL UNIQUE,
    title_hash    TEXT NOT NULL,
    source        TEXT,
    summary       TEXT,
    language      TEXT,
    keyword       TEXT,
    sentiment     TEXT,                    -- positive | neutral | negative
    publish_time  TIMESTAMP,
    insert_time   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_publish ON news(publish_time);
CREATE INDEX idx_news_keyword ON news(keyword);
CREATE INDEX idx_news_source  ON news(source);

-- 來源表
CREATE TABLE sources (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT UNIQUE,
    type      TEXT,        -- google_news | rss
    url       TEXT,
    interval  INTEGER,
    enabled   INTEGER DEFAULT 1
);

-- 抓取狀態
CREATE TABLE feed_status (
    source_name   TEXT,
    last_run      TIMESTAMP,
    last_success  TIMESTAMP,
    fail_count    INTEGER DEFAULT 0,
    last_error    TEXT
);

-- 標籤（可選）
CREATE TABLE tags (
    news_id  TEXT,
    tag      TEXT
);
```

---

## 20. 目錄結構

```text
newshub/
├── app/
│   ├── main.py              # FastAPI 進入點
│   ├── api/                 # API 路由
│   │   ├── news.py
│   │   └── sources.py
│   ├── collectors/          # RSS 採集
│   │   ├── base.py
│   │   ├── google_news.py
│   │   └── rss.py
│   ├── pipeline/            # 清洗 / 去重
│   │   ├── clean.py
│   │   └── dedup.py
│   ├── storage/             # 儲存 (Repository)
│   │   ├── base.py
│   │   ├── sqlite_repo.py
│   │   └── postgres_repo.py
│   ├── ai/                  # 摘要 / NER / 情緒
│   │   ├── summary.py
│   │   └── sentiment.py
│   └── scheduler.py         # 排程
├── config/
│   ├── app.yaml
│   └── feeds.yaml
├── frontend/                # Vue3
├── tests/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── SPEC.md
```

---

## 21. 開發里程碑

| 階段 | 內容 | 產出 |
|------|------|------|
| M1 | RSS 採集 + 清洗 + SQLite 入庫 | 可抓 Google News + CNA |
| M2 | 去重複 + 搜尋 API | `/api/news` 可用 |
| M3 | 前端 Dashboard | 可搜尋、可篩選 |
| M4 | AI 摘要 + 情緒分析 | `/api/news/summary` |
| M5 | RAG / 向量檢索 | 支援語意搜尋 |
| M6 | 企業版升級 | PostgreSQL + Redis + Docker |

---

## 22. 授權與法律注意事項

| 項目 | 說明 |
|------|------|
| RSS 訂閱 | ✅ 免費、公開 |
| 標題 / 摘要 / 連結 | ✅ 一般可聚合顯示 |
| 全文轉載 | ⚠️ 可能涉及各媒體授權 |
| 建立全文資料庫並出售 | ⚠️ 高風險，需授權 |

### 最佳實務

> 僅保留「標題、摘要、來源、連結」，全文一律導回原始媒體閱覽。
> 這是 RSS Reader / News Aggregator 的標準且最安全做法。

---

*文件結束 — NewsHub SPEC v1.0*
