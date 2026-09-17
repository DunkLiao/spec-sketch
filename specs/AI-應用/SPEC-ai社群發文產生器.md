---
created: 2026-08-02
tags:
  - spec
  - vibecoding
  - nextjs
  - ai
  - social-media
  - openai
  - typescript
  - note
---

# AI Media Poster 規格書

## 1. 目標

AI Media Poster 是一個 Next.js MVP，目標是讓使用者輸入同一組社群行銷素材後，快速產生：

- 多平台、多口氣的繁體中文社群貼文。
- 單張可下載的社群圖片。

系統聚焦台灣繁體中文社群內容產製。第一版不處理登入、資料庫、排程發文、社群平台發文 API 串接、素材管理或多人協作。

## 2. 技術棧與執行環境

- Framework：Next.js 16.2.12，App Router。
- UI：React 19.2.4、Tailwind CSS 4。
- Language：TypeScript，`strict` 模式。
- Runtime：Node.js + npm。
- 測試：Node test runner + `tsx` 執行 TypeScript 測試。
- Lint：ESLint 9 + `eslint-config-next` core web vitals / TypeScript 規則。

專案規則：

- 此 repo 的 `AGENTS.md` 指出 Next.js 版本與既有慣例可能與舊版 Next 不同；修改 Next.js 行為前必須查閱 `node_modules/next/dist/docs/` 的相關文件。
- API key 僅允許在伺服端 route 與 server-side library 使用，不得送到瀏覽器。
- 回答與 repo 文件預設使用繁體中文。

## 3. 使用者流程

### 3.1 產生社群貼文

1. 使用者輸入貼文主題。
2. 使用者輸入目標受眾。
3. 使用者選擇貼文目標。
4. 使用者輸入重點，一行一個，最多取前 8 行。
5. 使用者可輸入 CTA。
6. 使用者選擇一個以上社群平台。
7. 使用者選擇至少五種口氣，可加一個自訂口氣。
8. 使用者選擇 hashtag 模式。
9. 使用者點擊「產生社群貼文」。
10. 系統回傳依平台與口氣分組的貼文卡片。
11. 使用者可複製單一結果卡內容。

### 3.2 產生社群圖片

1. 使用者沿用同一組主題、受眾、目標、重點與 CTA。
2. 使用者選擇圖片平台。
3. 使用者選擇圖片尺寸。
4. 使用者輸入圖片風格。
5. 使用者點擊「產生社群圖片」。
6. 系統每次只產生一張圖片，並以最新圖片覆蓋前一次圖片結果。
7. 使用者可下載 PNG。

## 4. 前端規格

主要頁面為 `app/page.tsx`，是一個 Client Component。

### 4.1 表單欄位

| 欄位 | 型別 | 預設 | 驗證 / 行為 |
| --- | --- | --- | --- |
| 貼文主題 | string | 空字串 | 至少 2 個字 |
| 目標受眾 | string | 空字串 | 至少 2 個字 |
| 貼文目標 | enum | `engagement` | 必須為支援值 |
| 重點 | textarea | 空字串 | 以換行切分，送出時移除空行 |
| CTA | string | 空字串 | 可空 |
| 平台 | multi-select buttons | 全部平台 | 至少選 1 個才能產生貼文 |
| 口氣 | multi-select buttons | 全部預設口氣 | 至少 5 種才能產生貼文 |
| 自訂口氣 | string | 空字串 | 非空時併入口氣 |
| Hashtag | enum | `light` | 必須為支援值 |
| 圖片平台 | enum | `instagram` | 單選 |
| 圖片尺寸 | enum | `square` | 單選 |
| 圖片風格 | string | `明亮、溫暖、生活感、適合社群首圖` | 空值由後端 fallback |

### 4.2 支援平台

平台定義在 `lib/social-posts.ts`：

- `facebook`
- `instagram`
- `threads`
- `reddit`
- `x`

各平台需有 label、shortLabel、字數建議上限與 prompt guidance。

### 4.3 支援貼文目標

貼文目標定義在 `lib/social-posts.ts`：

- `brand_awareness`：品牌曝光
- `engagement`：互動討論
- `traffic`：導流點擊
- `conversion`：促銷轉換
- `education`：知識教育

### 4.4 Hashtag 模式

- `none`：不使用 hashtag。
- `light`：少量 hashtag，prompt 要求 2 到 4 個。
- `rich`：豐富 hashtag，prompt 要求 5 到 8 個。

### 4.5 預設口氣

預設口氣定義在 `lib/social-posts.ts`：

- 專業可信
- 親切生活
- 幽默輕鬆
- 犀利觀點
- 故事敘事
- 促銷轉換

### 4.6 圖片尺寸

圖片尺寸定義在 `lib/social-images.ts`：

| UI 值 | 顯示 | OpenAI size | OpenRouter aspect_ratio |
| --- | --- | --- | --- |
| `square` | 正方形 1:1 | `1024x1024` | `1:1` |
| `portrait` | 直式 2:3 | `1024x1536` | `2:3` |
| `landscape` | 橫式 3:2 | `1536x1024` | `3:2` |

預設圖片尺寸為 `square`。

## 5. API 規格

### 5.1 `POST /api/generate`

用途：產生多平台、多口氣社群貼文。

Route：`app/api/generate/route.ts`

Request JSON：

```json
{
  "topic": "新開幕的咖啡訂閱服務",
  "audience": "台北上班族、自由工作者",
  "goal": "engagement",
  "keyPoints": ["每日烘豆", "免運門檻 600 元", "首月 85 折"],
  "cta": "留言 +1 索取試喝包",
  "platforms": ["facebook", "instagram"],
  "tones": ["專業可信", "親切生活", "幽默輕鬆", "犀利觀點", "故事敘事"],
  "language": "zh-TW",
  "hashtagMode": "light"
}
```

成功 Response：

```json
{
  "variants": [
    {
      "tone": "專業可信",
      "platform": "facebook",
      "title": "",
      "body": "貼文內容",
      "hashtags": ["#咖啡", "#訂閱"],
      "characterCount": 42,
      "warnings": []
    }
  ]
}
```

錯誤 Response：

- JSON 解析失敗：`400`
- 驗證失敗：`400`
- API key 缺失：`500`
- 外部 AI provider 失敗：`502`

### 5.2 `POST /api/generate-image`

用途：產生一張社群圖片。

Route：`app/api/generate-image/route.ts`

Request JSON：

```json
{
  "topic": "新開幕的咖啡訂閱服務",
  "audience": "台北上班族、自由工作者",
  "goal": "engagement",
  "keyPoints": ["每日烘豆", "免運門檻 600 元", "首月 85 折"],
  "cta": "留言 +1 索取試喝包",
  "platform": "instagram",
  "style": "明亮、溫暖、生活感、適合社群首圖",
  "format": "square",
  "language": "zh-TW"
}
```

成功 Response：

```json
{
  "image": {
    "mimeType": "image/png",
    "base64": "base64-image-data",
    "alt": "AI 產生的社群圖片"
  },
  "usage": {
    "totalTokens": 456,
    "cost": 0.04
  }
}
```

`usage.cost` 只在 provider 回傳成本資訊時存在。

錯誤 Response：

- JSON 解析失敗：`400`
- 驗證失敗：`400`
- API key 缺失：`500`
- 外部 AI provider 失敗：`502`

## 6. Server-side 生成規格

### 6.1 Provider 選擇

`AI_PROVIDER` 決定文字與圖片生成 provider：

- 未設定或非 `openrouter`：使用 OpenAI。
- `openrouter`：使用 OpenRouter。

### 6.2 OpenAI 文字生成

實作：`lib/openai-social-generator.ts`

- Endpoint：`https://api.openai.com/v1/responses`
- API key：`OPENAI_API_KEY`
- Model：`OPENAI_MODEL || "gpt-5-mini"`
- 使用 JSON schema structured output，schema 名稱為 `social_post_variants`。
- 回傳文字優先讀 `output_text`，否則合併 `output[].content[].text`。

### 6.3 OpenRouter 文字生成

實作：`lib/openai-social-generator.ts`

- Endpoint：`https://openrouter.ai/api/v1/chat/completions`
- API key：`OPENROUTER_API_KEY`
- Model：`OPENROUTER_MODEL || "~openai/gpt-latest"`
- Headers：
  - `Authorization`
  - `Content-Type`
  - `HTTP-Referer`，當 `OPENROUTER_SITE_URL` 存在時加入。
  - `X-OpenRouter-Title`，使用 `OPENROUTER_APP_NAME || "AI Media Poster"`。
- 使用 `response_format.type = "json_schema"` 要求符合 `social_post_variants` schema。
- 支援 OpenRouter error metadata raw JSON 解析。

### 6.4 OpenAI 圖片生成

實作：`lib/openai-image-generator.ts`、`lib/social-images.ts`

- Endpoint：`https://api.openai.com/v1/images/generations`
- API key：`OPENAI_API_KEY`
- Model：`OPENAI_IMAGE_MODEL || "gpt-image-1"`
- 固定 `n: 1`
- 固定 `quality: "medium"`
- 固定 `output_format: "png"`
- 尺寸依 `format` 對應。

### 6.5 OpenRouter 圖片生成

實作：`lib/openai-image-generator.ts`、`lib/social-images.ts`

- Endpoint：`https://openrouter.ai/api/v1/images`
- API key：`OPENROUTER_API_KEY`
- Model：`OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image"`
- 固定 `n: 1`
- 固定 `quality: "medium"`
- 固定 `output_format: "png"`
- 圖片比例依 `format` 對應 `aspect_ratio`。
- Headers 與 OpenRouter 文字生成一致。

## 7. 內容生成規則

### 7.1 貼文 prompt 規則

文字生成 prompt 必須要求：

- 角色為台灣市場資深社群內容策略師。
- 只產生繁體中文，不可混用簡體中文。
- 每個 tone 與每個 platform 產生一筆變體。
- 每個平台要依平台語境改寫，不可只複製同一段文字。
- Reddit 必須包含 `title` 與 `body`。
- 非 Reddit 平台的 `title` 填空字串。
- X / Twitter 優先控制在 280 字內。
- Threads 優先控制在 500 字內。
- Instagram 前 125 字要有 hook。
- `warnings` 只放真實限制提醒。
- `hashtags` 依 hashtagMode 產生。

### 7.2 圖片 prompt 規則

圖片 prompt 必須要求：

- 為台灣市場生成可直接用於社群貼文的圖片。
- 只生成一張圖片。
- 不要拼貼多張候選圖。
- 不要輸出版型說明。
- 不要在圖片中排版大量文字。
- 若需要文字，只能使用極短繁體中文關鍵字。
- 避免錯字、假字、浮水印、介面截圖、QR code、品牌商標與無意義文字。
- 包含社群平台、圖片主題、目標受眾、溝通目標、視覺風格、重點與 CTA 情境。

## 8. 資料驗證與正規化

### 8.1 貼文請求

`validateGenerateRequest` 必須：

- 拒絕非 object 或空值。
- trim `topic`、`audience`、`cta`。
- `topic` 至少 2 字。
- `audience` 至少 2 字。
- `goal` 必須為支援值。
- `language` 必須為 `zh-TW`。
- `hashtagMode` 必須為支援值。
- `platforms` 僅保留支援平台，去重。
- 至少保留 1 個平台。
- `tones` 僅保留非空 string，去重，最多取前 8 個。
- 至少保留 5 種口氣。
- `keyPoints` 僅保留非空 string，最多取前 8 個。

### 8.2 貼文回傳

`normalizeVariant` 必須：

- 不支援的平台 fallback 為 `facebook`。
- trim `tone`、`title`、`body`、`hashtags`、`warnings`。
- 空 title 轉為 `undefined`。
- 重新計算 `characterCount`。
- Reddit 有 title 時，以 `title + "\n" + body` 計字。
- 超過平台建議字數時追加 warning。

### 8.3 圖片請求

`validateImageRequest` 必須：

- 拒絕非 object 或空值。
- trim `topic`、`audience`、`cta`、`style`。
- `topic` 至少 2 字。
- `audience` 至少 2 字。
- `goal` 必須為支援值。
- `platform` 必須為單一支援平台。
- `format` 必須為支援值。
- `language` 必須為 `zh-TW`。
- `style` 空值時 fallback 為 `現代社群廣告視覺`。
- `keyPoints` 僅保留非空 string，最多取前 8 個。

### 8.4 圖片回傳

`normalizeGeneratedImage` 必須：

- 只讀取 `data[0].b64_json`。
- 若第一張圖片不存在，拋出圖片資料缺失錯誤。
- 回傳 `mimeType: "image/png"`。
- 回傳 alt：`AI 產生的社群圖片`。
- 僅在 provider 回傳 `total_tokens` 或 `cost` 為 number 時加入 usage 欄位內容。

## 9. 環境變數

| 變數 | 必填條件 | 預設 | 用途 |
| --- | --- | --- | --- |
| `AI_PROVIDER` | 否 | `openai` | 選擇 `openai` 或 `openrouter` |
| `OPENAI_API_KEY` | OpenAI provider 必填 | 無 | OpenAI 文字與圖片 API key |
| `OPENAI_MODEL` | 否 | `gpt-5-mini` | OpenAI 文字模型 |
| `OPENAI_IMAGE_MODEL` | 否 | `gpt-image-1` | OpenAI 圖片模型 |
| `OPENROUTER_API_KEY` | OpenRouter provider 必填 | 無 | OpenRouter API key |
| `OPENROUTER_MODEL` | 否 | `~openai/gpt-latest` | OpenRouter 文字模型 |
| `OPENROUTER_IMAGE_MODEL` | 否 | `google/gemini-2.5-flash-image` | OpenRouter 圖片模型 |
| `OPENROUTER_SITE_URL` | 否 | 無 | OpenRouter `HTTP-Referer` |
| `OPENROUTER_APP_NAME` | 否 | `AI Media Poster` | OpenRouter `X-OpenRouter-Title` |

## 10. UI 與視覺規格

- 頁面語言為 `zh-Hant-TW`。
- 主要文字語言使用繁體中文。
- 版面最大寬度為 `max-w-7xl`，桌面使用左表單、右結果的兩欄布局。
- 控制元件使用 8px 以下圓角的 restrained card / panel 風格。
- 主色使用 teal 系列：
  - `--accent: #0f766e`
  - `--accent-strong: #115e59`
  - `--accent-soft: #d9f3ef`
- 不使用登入狀態、側欄導覽或多頁流程。
- Loading 狀態以 skeleton 呈現。
- 文字結果卡需支援換行與長字串折行。
- 圖片使用 `next/image` 顯示 base64 data URL，並設定 `unoptimized`。

## 11. 測試與驗證

### 11.1 自動測試

測試檔：`lib/social-images.test.ts`

目前覆蓋：

- 圖片請求 trim、keyPoints 過濾與單一平台保留。
- OpenAI 圖片 payload 固定 `n: 1`、正方形尺寸與 PNG。
- OpenRouter 圖片 payload 固定 `n: 1`、直式比例與 PNG。
- 圖片回傳只取第一張。
- OpenRouter usage token 與 cost 正規化。
- 圖片 prompt 避免大量文字，並包含主題與受眾。

### 11.2 必跑命令

完成任何功能或規格修改後，至少執行：

```powershell
npm test
npm run lint
npm run build
```

預期結果：

- `npm test`：所有 Node test runner 測試通過。
- `npm run lint`：無 ESLint error。
- `npm run build`：Next production build 成功，包含 `/api/generate` 與 `/api/generate-image` route。

### 11.3 手動驗證

可透過：

```powershell
npm run dev
```

或在 Windows 直接執行：

```powershell
.\start-dev.bat
```

開啟 `http://localhost:3000` 後驗證：

- 必填欄位不足時按鈕 disabled。
- 產生貼文成功後右側出現結果卡。
- 結果卡可複製。
- 產生圖片成功後右側出現單張圖片。
- 再次產生圖片會覆蓋舊圖片。
- PNG 下載可用。

## 12. 已知限制

- 不保存任何產生結果；重新整理頁面會清空 state。
- 不支援登入、權限、帳號、資料庫或歷史紀錄。
- 不串接社群平台發文 API。
- 不做圖片上傳、參考圖、圖片編輯或多張批次生圖。
- 不提供模型選擇 UI；模型透過環境變數設定。
- 不在前端顯示 token usage 或 cost。
- OpenRouter 文字模型必須支援 JSON schema structured output，否則可能失敗。
- 圖片生成會消耗外部 API 額度；真實 UAT 需在有預算控制時執行。
- `npm audit` 目前可能回報 Next 依賴鏈中的 high severity 問題；若修正方案要求破壞性降版，不應直接執行 `npm audit fix --force`，需另行評估。

## 13. 變更守則

- 修改 Next.js route、Server/Client Component 邊界、Image 或 App Router 行為前，先查閱 `node_modules/next/dist/docs/`。
- 新增行為時優先補測試，尤其是 request validation、payload mapping、provider 分流與回傳正規化。
- 不要把 API key、provider response raw body 或使用者剪貼簿內容輸出到前端或 log。
- 不要改動使用者未追蹤或未提交檔案，除非該檔案是本次需求的明確範圍。
- README、`.env.example` 與本 SPEC 的 provider/model 設定需保持一致。
