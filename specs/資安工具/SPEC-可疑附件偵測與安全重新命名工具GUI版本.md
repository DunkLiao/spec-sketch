---
created: 2026-07-22
tags:
  - spec
  - vibecoding
  - security
  - python
  - gui
---

# SPEC.md

# 可疑附件偵測與副檔名安全化工具

## 1. 專案概述

### 專案名稱

Suspicious Attachment Scanner

### 建議 Repository 名稱

```text
suspicious-attachment-scanner
```

### 技術棧

* Python 3.11+
* Tkinter
* `tkinter.ttk`
* Python 標準函式庫
* PyYAML，可選

### 執行環境

* Windows 10
* Windows 11

### 專案目的

建立一套桌面圖形介面工具，讓使用者選擇檔案或資料夾，偵測可能具有執行能力的可疑附件。

當工具發現可疑檔案時，可將檔名附加 `.txt`，降低使用者誤觸執行的風險。

例如：

```text
Rp.exe
```

改名為：

```text
Rp.exe.txt
```

工具只進行靜態檢查，不得執行任何待掃描檔案。

---

## 2. 核心功能

工具必須提供：

1. 選擇單一檔案。
2. 選擇整個資料夾。
3. 遞迴掃描子資料夾。
4. 依副檔名偵測可疑檔案。
5. 偵測雙重副檔名。
6. 掃描 ZIP 內的檔名。
7. 偵測偽裝成文件的 Windows 執行檔。
8. 顯示掃描結果。
9. 將可疑檔案附加 `.txt`。
10. 匯出 JSON 掃描報告。
11. 提供預覽模式，避免直接修改檔案。

---

## 3. 非目標

本工具不負責：

* 執行附件
* 清除病毒
* 修復感染檔案
* 破解 ZIP 密碼
* 反編譯程式
* 上傳檔案至網路
* 取代防毒軟體
* 判斷檔案是否百分之百為惡意程式

工具只能將檔案標示為：

* 安全
* 可疑
* 需要人工確認
* 掃描失敗

---

## 4. 圖形介面需求

## 4.1 主視窗

主視窗使用：

```python
tkinter.Tk
tkinter.ttk
```

視窗標題：

```text
可疑附件偵測工具
```

建議預設尺寸：

```text
1000 × 650
```

最小尺寸：

```text
800 × 500
```

---

## 4.2 主畫面配置

主畫面分成四個區域：

### A. 掃描目標區

元件：

* 目標路徑輸入框
* 「選擇檔案」按鈕
* 「選擇資料夾」按鈕
* 「清除」按鈕

使用元件：

```text
ttk.Entry
ttk.Button
ttk.LabelFrame
```

---

### B. 掃描設定區

提供以下選項：

* 遞迴掃描子資料夾
* 預覽模式，不修改檔案
* 掃描 ZIP 內容
* 計算 SHA-256

使用元件：

```text
ttk.Checkbutton
```

預設值：

```text
遞迴掃描：啟用
預覽模式：啟用
掃描 ZIP：啟用
計算 SHA-256：啟用
```

---

### C. 操作按鈕區

提供：

* 開始掃描
* 將選取項目改為 `.txt`
* 將所有可疑項目改為 `.txt`
* 匯出 JSON 報告
* 結束程式

掃描進行期間：

* 禁用開始掃描按鈕
* 顯示進度條
* 不得讓介面停止回應

使用元件：

```text
ttk.Button
ttk.Progressbar
```

掃描工作必須使用背景執行緒。

背景執行緒不得直接更新 Tkinter 元件，必須透過：

```python
root.after()
```

或執行緒安全的訊息佇列更新畫面。

---

### D. 掃描結果區

使用：

```text
ttk.Treeview
```

欄位包含：

| 欄位   | 說明              |
| ---- | --------------- |
| 狀態   | 安全、可疑、需確認、錯誤    |
| 風險   | LOW、MEDIUM、HIGH |
| 檔案名稱 | 原始檔名            |
| 類型   | 偵測到的檔案類型        |
| 原因   | 判定原因            |
| 大小   | 檔案大小            |
| 完整路徑 | 檔案所在位置          |
| 處理結果 | 未處理、已改名、失敗      |

支援：

* 點選單筆結果
* 多選結果
* 雙擊開啟檔案所在資料夾
* 欄位排序
* 垂直捲軸
* 水平捲軸

不得直接開啟或執行可疑檔案。

---

## 5. 可疑副檔名規則

初始阻擋清單：

```text
.exe
.com
.scr
.pif
.cpl
.msi
.msp
.bat
.cmd
.ps1
.psm1
.vbs
.vbe
.js
.jse
.wsf
.wsh
.hta
.jar
.class
.dll
.sys
.ocx
.reg
.inf
.lnk
.url
.scf
.chm
```

副檔名比對必須忽略大小寫。

以下檔案判定結果相同：

```text
test.exe
test.EXE
test.ExE
```

---

## 6. 雙重副檔名偵測

工具必須偵測：

```text
invoice.pdf.exe
photo.jpg.scr
report.docx.js
salary.xlsx.cmd
```

如果最後一個副檔名位於阻擋清單，判定為：

```text
狀態：可疑
風險：HIGH
原因：偵測到高風險雙重副檔名
```

---

## 7. 已安全化檔案判斷

以下檔案：

```text
payload.exe.txt
script.ps1.txt
```

仍應顯示原始可疑副檔名資訊。

判定為：

```text
狀態：已安全化
風險：HIGH
原因：原始高風險副檔名已附加 .txt
```

工具不得再次改名為：

```text
payload.exe.txt.txt
```

---

## 8. 檔案內容偵測

工具不得只依賴副檔名。

至少讀取檔案前 8 KB，檢查常見檔案簽章。

| 類型         | 簽章                  |
| ---------- | ------------------- |
| Windows PE | `MZ`                |
| PDF        | `%PDF-`             |
| ZIP        | `PK\x03\x04`        |
| PNG        | `89 50 4E 47`       |
| JPEG       | `FF D8 FF`          |
| GIF        | `GIF87a` 或 `GIF89a` |
| ELF        | `7F 45 4C 46`       |

例如：

```text
invoice.pdf
```

如果內容以 `MZ` 開頭，判定為：

```text
狀態：可疑
風險：HIGH
原因：副檔名與實際檔案類型不符，偵測到 Windows PE
```

---

## 9. ZIP 掃描

工具至少支援 `.zip`。

例如：

```text
Rp.zip
├── document.pdf
├── install.exe
└── script.ps1
```

工具應將 ZIP 判定為：

```text
狀態：可疑
風險：HIGH
原因：ZIP 內含可疑檔案 install.exe、script.ps1
```

結果列表中應同時顯示：

* ZIP 主檔
* ZIP 內部的可疑項目

ZIP 內部項目的路徑格式：

```text
Rp.zip::install.exe
```

---

## 10. ZIP 安全限制

掃描 ZIP 時必須限制：

```text
最大檔案數：1000
最大解壓後總容量：500 MB
最大單一檔案：100 MB
最大遞迴深度：3
最大壓縮比：100
```

工具應盡量直接從 ZIP 串流讀取，不應將內容解壓至原始資料夾。

若 ZIP：

* 已加密
* 已損壞
* 超過限制
* 無法解析

判定為：

```text
狀態：需要人工確認
風險：MEDIUM 或 HIGH
```

工具不得嘗試破解密碼。

---

## 11. 路徑安全

ZIP 內若出現：

```text
../../evil.exe
```

或：

```text
C:\Windows\System32\evil.exe
```

必須判定為：

```text
狀態：可疑
風險：HIGH
原因：偵測到路徑穿越
```

不得將此類檔案寫入磁碟。

---

## 12. 重新命名規則

## 12.1 基本規則

可疑檔案重新命名時，附加 `.txt`：

```text
payload.exe
→ payload.exe.txt
```

```text
invoice.pdf.exe
→ invoice.pdf.exe.txt
```

不可直接取代原始副檔名：

```text
payload.exe
→ payload.txt
```

此方式不允許，因為會失去原始副檔名資訊。

---

## 12.2 名稱衝突

若：

```text
payload.exe.txt
```

已存在，則使用：

```text
payload.exe.1.txt
```

若仍存在：

```text
payload.exe.2.txt
```

依序增加。

不得覆蓋任何現有檔案。

---

## 12.3 ZIP 處理方式

MVP 不直接修改 ZIP 內部內容。

若 ZIP 內含可疑檔案：

* 標記 ZIP 為可疑
* 顯示 ZIP 內部可疑項目
* 可將整個 ZIP 改名為：

```text
Rp.zip.txt
```

原始 ZIP 內容不變。

---

## 13. 預覽模式

預覽模式預設啟用。

在預覽模式下：

* 可以掃描
* 可以查看判定結果
* 可以顯示預計的新檔名
* 不得修改任何檔案

使用者執行重新命名前，若預覽模式仍啟用，應顯示提示：

```text
目前為預覽模式，不會修改任何檔案。
```

---

## 14. 修改確認

當使用者點擊：

```text
將選取項目改為 .txt
```

或：

```text
將所有可疑項目改為 .txt
```

若預覽模式未啟用，必須顯示確認對話框：

```text
確定要將 5 個可疑檔案附加 .txt 嗎？

此操作會修改檔名，但不會修改檔案內容。
```

使用：

```python
tkinter.messagebox.askyesno
```

使用者確認後才可執行。

---

## 15. SHA-256

工具應計算每個實體檔案的 SHA-256。

必須使用分塊方式讀取：

```text
chunk size：1 MB
```

不得將大型檔案一次全部載入記憶體。

ZIP 內部項目的 SHA-256 可列為第二階段功能。

---

## 16. 掃描結果資料模型

```python
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ScanResult:
    path: Path
    display_path: str
    file_name: str
    size_bytes: int
    extension: str
    detected_type: str | None
    sha256: str | None
    status: str
    risk_level: str
    reasons: list[str] = field(default_factory=list)
    action: str = "NONE"
    new_path: Path | None = None
    is_archive_entry: bool = False
    parent_archive: Path | None = None
    error_message: str | None = None
```

---

## 17. 狀態定義

```text
SAFE
SUSPICIOUS
SANITIZED
REVIEW_REQUIRED
ERROR
```

### SAFE

未發現明顯風險。

### SUSPICIOUS

符合高風險副檔名、雙重副檔名或偽裝檔案規則。

### SANITIZED

原始高風險副檔名後已附加 `.txt`。

### REVIEW_REQUIRED

檔案無法完整檢查，例如加密或損壞的 ZIP。

### ERROR

發生權限、讀取或系統錯誤。

---

## 18. 風險等級

### LOW

* 無副檔名
* 無法辨識格式
* 空檔案

### MEDIUM

* 加密 ZIP
* 損壞 ZIP
* 無法完整掃描
* 多層壓縮達限制

### HIGH

* 高風險副檔名
* 高風險雙重副檔名
* ZIP 內含可疑附件
* 文件實際為 Windows PE
* ZIP 路徑穿越
* ZIP 超過安全限制

---

## 19. JSON 報告

使用者可選擇儲存位置，匯出 JSON 報告。

報告格式：

```json
{
  "scan_id": "UUID",
  "started_at": "2026-07-22T10:00:00+08:00",
  "completed_at": "2026-07-22T10:00:05+08:00",
  "target": "C:\\Attachments",
  "settings": {
    "recursive": true,
    "dry_run": true,
    "scan_zip": true,
    "calculate_sha256": true
  },
  "summary": {
    "total": 10,
    "safe": 6,
    "suspicious": 3,
    "sanitized": 0,
    "review_required": 1,
    "errors": 0
  },
  "results": [
    {
      "file_name": "Rp.zip",
      "path": "C:\\Attachments\\Rp.zip",
      "size_bytes": 10240,
      "sha256": "abc123...",
      "detected_type": "zip",
      "status": "SUSPICIOUS",
      "risk_level": "HIGH",
      "reasons": [
        "ZIP 內含可疑檔案 payload.exe"
      ],
      "action": "NONE",
      "new_path": null
    }
  ]
}
```

---

## 20. 狀態列

主視窗底部加入狀態列，顯示：

```text
準備完成
正在掃描：25 / 100
掃描完成：安全 80、可疑 15、需確認 3、錯誤 2
已重新命名 5 個檔案
```

使用：

```text
ttk.Label
```

---

## 21. 建議選單

主選單可包含：

```text
檔案
├── 選擇檔案
├── 選擇資料夾
├── 匯出報告
└── 結束

設定
├── 可疑副檔名清單
└── 恢復預設設定

說明
├── 使用說明
└── 關於
```

MVP 可先不實作「設定」選單中的規則編輯功能。

---

## 22. 錯誤處理

以下情況不得造成程式直接關閉：

* 檔案不存在
* 目錄不存在
* 權限不足
* 檔案正被其他程式使用
* ZIP 損壞
* ZIP 加密
* 檔名過長
* 無法重新命名
* JSON 報告無法寫入

單一檔案失敗時：

* 將該項目標記為 `ERROR`
* 顯示錯誤原因
* 繼續掃描其他檔案

---

## 23. 安全要求

工具必須遵守：

1. 不執行任何附件。
2. 不使用 `os.system` 開啟附件。
3. 不使用 `subprocess` 執行附件。
4. 不使用 `eval` 或 `exec` 處理附件內容。
5. 不將附件上傳至網路。
6. 不直接解壓至原始資料夾。
7. 不覆蓋現有檔案。
8. 不自動刪除檔案。
9. 不要求系統管理員權限。
10. 不將「可疑」描述成「已確認為病毒」。

重新命名為 `.txt` 只能降低誤觸風險，不代表檔案已經安全。

---

## 24. 建議專案結構

```text
suspicious-attachment-scanner/
├── README.md
├── SPEC.md
├── requirements.txt
├── pyproject.toml
├── src/
│   └── attachment_scanner/
│       ├── __init__.py
│       ├── __main__.py
│       ├── app.py
│       ├── ui.py
│       ├── scanner.py
│       ├── detector.py
│       ├── archive_scanner.py
│       ├── sanitizer.py
│       ├── hashing.py
│       ├── models.py
│       ├── reporting.py
│       └── constants.py
└── tests/
    ├── fixtures/
    ├── test_detector.py
    ├── test_archive_scanner.py
    ├── test_sanitizer.py
    └── test_scanner.py
```

---

## 25. 模組責任

### `app.py`

* 建立 Tkinter 主視窗
* 啟動應用程式

### `ui.py`

* 建立 ttk 介面
* 管理按鈕、表格、進度條
* 顯示訊息對話框
* 接收背景掃描結果

### `scanner.py`

* 掃描檔案與資料夾
* 整合各偵測模組
* 回傳 `ScanResult`

### `detector.py`

* 副檔名檢查
* 雙重副檔名檢查
* `.exe.txt` 檢查
* Magic bytes 檢查

### `archive_scanner.py`

* ZIP 內容掃描
* ZIP 安全限制
* 路徑穿越檢查

### `sanitizer.py`

* 附加 `.txt`
* 避免重複附加
* 處理檔名衝突

### `hashing.py`

* 分塊計算 SHA-256

### `reporting.py`

* 匯出 JSON 報告

### `constants.py`

* 可疑副檔名清單
* ZIP 限制
* 狀態及風險常數

---

## 26. MVP 驗收條件

### AC-001 選擇檔案

使用者點擊「選擇檔案」後，可選擇一個檔案並顯示完整路徑。

### AC-002 選擇資料夾

使用者可選擇資料夾並掃描其中檔案。

### AC-003 偵測 EXE

掃描：

```text
sample.exe
```

結果必須為：

```text
狀態：可疑
風險：HIGH
```

### AC-004 忽略大小寫

以下檔案皆判定為可疑：

```text
sample.exe
sample.EXE
sample.ExE
```

### AC-005 偵測雙重副檔名

```text
invoice.pdf.exe
```

必須判定為高風險。

### AC-006 偵測已安全化檔案

```text
sample.exe.txt
```

顯示為已安全化，且不得再附加 `.txt`。

### AC-007 偵測偽裝 PE

副檔名為 `.pdf`，但內容以 `MZ` 開頭時，判定為高風險。

### AC-008 ZIP 內含 EXE

ZIP 內含：

```text
payload.exe
```

ZIP 必須判定為高風險。

### AC-009 預覽模式

預覽模式啟用時，不得修改任何檔案。

### AC-010 重新命名

```text
sample.exe
```

重新命名後：

```text
sample.exe.txt
```

### AC-011 避免覆蓋

若 `sample.exe.txt` 已存在，應產生：

```text
sample.exe.1.txt
```

### AC-012 介面不凍結

掃描大量檔案時：

* 視窗仍可移動
* 進度條持續更新
* 系統不顯示「沒有回應」

### AC-013 單一錯誤不中止掃描

單一檔案讀取失敗時，其他檔案仍應繼續掃描。

### AC-014 匯出報告

掃描完成後可產生有效的 JSON 報告。

---

## 27. 測試案例

| 編號     | 測試內容          | 預期結果            |
| ------ | ------------- | --------------- |
| TC-001 | 掃描 `.exe`     | HIGH            |
| TC-002 | 掃描 `.EXE`     | HIGH            |
| TC-003 | 掃描 `.pdf.exe` | HIGH            |
| TC-004 | 掃描 `.exe.txt` | SANITIZED       |
| TC-005 | 真正 PDF        | SAFE            |
| TC-006 | 偽裝成 PDF 的 PE  | HIGH            |
| TC-007 | ZIP 內含 EXE    | HIGH            |
| TC-008 | ZIP 內皆為安全文件   | SAFE            |
| TC-009 | 加密 ZIP        | REVIEW_REQUIRED |
| TC-010 | 損壞 ZIP        | REVIEW_REQUIRED |
| TC-011 | ZIP 路徑穿越      | HIGH            |
| TC-012 | 預覽模式          | 不修改檔案           |
| TC-013 | TXT 名稱衝突      | 自動增加流水號         |
| TC-014 | 無權限檔案         | ERROR，繼續掃描      |
| TC-015 | 大量檔案掃描        | GUI 不凍結         |
| TC-016 | 匯出 JSON       | 報告格式正確          |

---

## 28. 第一階段開發範圍

第一階段只完成：

* Tkinter ttk 圖形介面
* 選擇單一檔案
* 選擇資料夾
* 遞迴掃描
* 可疑副檔名偵測
* 雙重副檔名偵測
* `.exe.txt` 判斷
* Windows PE `MZ` 偵測
* ZIP 內部檔名掃描
* 預覽模式
* 附加 `.txt`
* 檔名衝突處理
* SHA-256
* Treeview 結果列表
* 背景執行緒
* 進度條
* JSON 報告
* 單元測試

---

## 29. 第二階段功能

後續可加入：

* 可疑副檔名規則編輯畫面
* YAML 設定檔
* 拖放檔案
* 隔離資料夾
* CSV 報告
* EML 郵件檔解析
* Outlook MSG 解析
* RAR 與 7-Zip 掃描
* YARA 規則
* Windows Defender 整合
* ClamAV 整合
* 封裝為 Windows EXE

---

## 30. 完成定義

專案完成時必須符合：

* GUI 可正常啟動
* 掃描時介面不凍結
* 可掃描檔案及資料夾
* 可辨識阻擋副檔名
* 可辨識雙重副檔名
* 可辨識 `.exe.txt`
* 可辨識偽裝 PE
* 可掃描 ZIP 內部檔名
* 預覽模式不修改檔案
* 重新命名不覆蓋檔案
* 不執行任何附件
* 可匯出 JSON 報告
* 單一檔案錯誤不影響整批掃描
* 核心測試全部通過
* README 包含 Windows 啟動與打包方式
