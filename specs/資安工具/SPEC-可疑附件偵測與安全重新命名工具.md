---
created: 2026-07-22
tags:
  - spec
  - vibecoding
  - security
  - python
  - cli
---

# SPEC.md

# 可疑附件偵測與安全重新命名工具

## 1. 文件資訊

* 專案名稱：Suspicious Attachment Scanner
* 建議 Git Repository：`suspicious-attachment-scanner`
* 技術棧：Python 3.11+
* 執行模式：命令列工具 CLI
* 主要用途：

  * 掃描指定檔案或目錄
  * 偵測可能具有執行能力或高風險的附件
  * 分析 ZIP 等壓縮檔內部內容
  * 將可疑檔案副檔名安全改為 `.txt`
  * 產生 JSON、CSV 或文字格式的稽核報告

---

## 2. 背景

企業郵件系統通常會阻擋具有執行能力的附件，例如：

* `.exe`
* `.bat`
* `.cmd`
* `.ps1`
* `.vbs`
* `.js`
* `.scr`
* `.com`
* `.msi`
* `.dll`
* `.jar`
* `.lnk`
* `.reg`

部分攻擊者會透過以下方式規避偵測：

* 將可執行檔包入 ZIP
* 使用雙重副檔名，例如 `invoice.pdf.exe`
* 將可執行檔改名為圖片或文件
* 使用大小寫混淆，例如 `.EXE`
* 使用尾端空白或特殊字元
* 建立多層壓縮檔
* 使用含密碼的壓縮檔隱藏內容

本工具需在不執行檔案的前提下，辨識可疑附件，並將其重新命名為無法直接執行的 `.txt` 檔案。

---

## 3. 專案目標

### 3.1 主要目標

1. 掃描單一檔案或整個目錄。
2. 根據副檔名辨識高風險檔案。
3. 根據檔案內容特徵辨識偽裝檔案。
4. 遞迴掃描 ZIP 壓縮檔內的項目。
5. 將可疑檔案安全重新命名為 `.txt`。
6. 避免覆蓋既有檔案。
7. 保留原始檔名、雜湊值及處理結果。
8. 提供 dry-run 模式，讓使用者先查看結果。
9. 產生可供稽核的掃描報告。

### 3.2 非目標

本工具不負責：

* 執行或測試附件
* 反編譯可執行檔
* 清除病毒
* 修復感染檔案
* 上傳檔案至外部防毒服務
* 破解壓縮檔密碼
* 自動寄送電子郵件
* 取代企業防毒或郵件閘道
* 判斷檔案是否百分之百為惡意程式

---

## 4. 使用情境

### 4.1 掃描郵件附件目錄

使用者將郵件附件下載至指定資料夾後，執行：

```bash
python -m attachment_scanner scan ./attachments
```

工具掃描所有附件，並回報可疑項目。

### 4.2 預覽但不修改檔案

```bash
python -m attachment_scanner scan ./attachments --dry-run
```

工具只產生結果，不重新命名任何檔案。

### 4.3 掃描並將可疑檔案改為 `.txt`

```bash
python -m attachment_scanner scan ./attachments --rename
```

例如：

```text
report.exe
```

重新命名為：

```text
report.exe.txt
```

### 4.4 掃描 ZIP 內部項目

若 `Rp.zip` 包含：

```text
Rp.zip
├── report.pdf
├── install.exe
└── script.ps1
```

工具應偵測：

* `install.exe`
* `script.ps1`

並將整個 `Rp.zip` 標記為可疑。

預設不得直接修改原始 ZIP。

使用 `--sanitize-archive` 時，工具可建立新的安全版本：

```text
Rp.sanitized.zip
```

內容變更為：

```text
Rp.sanitized.zip
├── report.pdf
├── install.exe.txt
└── script.ps1.txt
```

---

## 5. 安全原則

### 5.1 絕不執行檔案

工具不得使用下列方式處理待掃描附件：

* `subprocess` 執行附件
* `os.system` 執行附件
* `eval`
* `exec`
* 動態 import 待掃描檔案
* 啟動巨集
* 呼叫 Windows Shell 開啟附件

所有檔案只能以二進位唯讀模式開啟。

### 5.2 保留原始副檔名資訊

可疑檔案重新命名時，採用附加 `.txt` 的方式：

```text
invoice.exe → invoice.exe.txt
```

不得直接改成：

```text
invoice.txt
```

原因是必須保留原始副檔名，方便後續調查及稽核。

### 5.3 預設不刪除原始檔案

預設行為只能是：

* 報告
* 重新命名
* 搬移至隔離區
* 建立 sanitized 副本

不得直接永久刪除檔案。

### 5.4 防止路徑穿越

解壓縮 ZIP 時，必須阻擋以下項目：

```text
../../evil.exe
```

或：

```text
C:\Windows\System32\evil.exe
```

壓縮檔內的路徑必須經正規化，且解壓目的地必須限制於指定暫存目錄內。

### 5.5 防止 ZIP Bomb

掃描壓縮檔時必須限制：

* 最大壓縮檔大小
* 最大解壓後總容量
* 最大單一檔案容量
* 最大檔案數量
* 最大壓縮層數
* 最大壓縮比

---

## 6. 功能需求

## FR-001 掃描單一檔案

工具必須支援：

```bash
python -m attachment_scanner scan ./sample.exe
```

系統應回傳：

* 檔案名稱
* 完整路徑
* 檔案大小
* 副檔名
* SHA-256
* 判定結果
* 風險等級
* 判定原因
* 是否已重新命名

---

## FR-002 掃描目錄

工具必須支援遞迴掃描目錄：

```bash
python -m attachment_scanner scan ./attachments --recursive
```

預設：

* 掃描指定目錄
* 不掃描子目錄

指定 `--recursive` 後：

* 掃描所有子目錄

---

## FR-003 高風險副檔名偵測

系統必須維護可設定的阻擋清單。

初始阻擋清單：

```text
.exe
.com
.scr
.pif
.cpl
.msi
.msp
.mst
.bat
.cmd
.ps1
.ps2
.psm1
.vbs
.vbe
.js
.jse
.ws
.wsf
.wsh
.hta
.jar
.class
.dll
.sys
.drv
.ocx
.reg
.inf
.ins
.isp
.lnk
.url
.scf
.chm
.gadget
.application
.appref-ms
```

系統應忽略副檔名大小寫：

```text
TEST.EXE
test.ExE
test.exe
```

三者均應被判定為高風險。

---

## FR-004 可設定副檔名規則

使用者應能透過 YAML 設定檔修改規則：

```yaml
blocked_extensions:
  - .exe
  - .bat
  - .cmd
  - .ps1
  - .vbs
  - .js
  - .scr
  - .com
  - .msi
  - .dll
  - .jar
  - .lnk

archive_extensions:
  - .zip

document_extensions:
  - .pdf
  - .docx
  - .xlsx
  - .pptx
  - .txt
```

命令：

```bash
python -m attachment_scanner scan ./attachments \
  --config ./config/policy.yaml
```

---

## FR-005 雙重副檔名偵測

系統必須辨識雙重副檔名，例如：

```text
invoice.pdf.exe
resume.docx.scr
photo.jpg.js
statement.xlsx.cmd
```

若最後一個副檔名屬於阻擋清單，必須判定為高風險。

結果原因應包含：

```text
Double extension detected: .pdf.exe
```

---

## FR-006 偽裝檔案偵測

系統不得只依賴副檔名。

應讀取檔案前 4 KB 至 64 KB 的二進位內容，檢查常見檔案簽章。

初始支援：

| 類型         | 檔案簽章                |
| ---------- | ------------------- |
| Windows PE | `MZ`                |
| ELF        | `0x7F 45 4C 46`     |
| PDF        | `%PDF-`             |
| ZIP        | `PK\x03\x04`        |
| RAR        | `Rar!`              |
| 7-Zip      | `7z BC AF 27 1C`    |
| PNG        | `89 50 4E 47`       |
| JPEG       | `FF D8 FF`          |
| GIF        | `GIF87a` 或 `GIF89a` |

例如：

```text
invoice.pdf
```

若檔案內容以 `MZ` 開頭，應判定為：

```text
Extension/content mismatch
```

風險等級至少為 `HIGH`。

---

## FR-007 腳本內容偵測

對文字型檔案，可檢查首行或前段內容。

應辨識：

```text
#!/bin/bash
#!/usr/bin/env python
#!/usr/bin/env node
```

以及 Windows 指令碼常見內容：

```text
@echo off
powershell.exe
cmd.exe /c
wscript.exe
cscript.exe
```

注意：

* 此規則只能作為風險訊號。
* 不得因單一關鍵字直接判定為惡意。
* 應搭配副檔名、檔案位置、內容型態及其他訊號評分。

---

## FR-008 ZIP 壓縮檔掃描

系統必須支援 `.zip`。

處理流程：

1. 以唯讀模式開啟 ZIP。
2. 列出內部檔案。
3. 正規化檔案路徑。
4. 阻擋路徑穿越。
5. 檢查每個內部檔案名稱。
6. 必要時讀取部分內容。
7. 遞迴掃描內嵌 ZIP。
8. 不執行任何內部檔案。
9. 記錄壓縮層級。
10. 彙總 ZIP 整體風險。

若 ZIP 包含任一高風險檔案，ZIP 本身應標記為：

```text
SUSPICIOUS_ARCHIVE
```

---

## FR-009 壓縮檔深度限制

預設最大壓縮層級：

```text
3
```

可透過參數修改：

```bash
--max-archive-depth 5
```

超過限制時：

* 停止深入掃描
* 將該壓縮檔標記為 `REVIEW_REQUIRED`
* 記錄原因 `Archive depth limit exceeded`

---

## FR-010 加密 ZIP 偵測

若 ZIP 需要密碼，系統不得嘗試破解。

應回傳：

```text
status: REVIEW_REQUIRED
reason: Encrypted archive cannot be inspected
risk_level: MEDIUM
```

可透過政策設定將加密 ZIP 直接判為 `HIGH`。

---

## FR-011 ZIP Bomb 防護

預設限制：

```yaml
archive_limits:
  max_archive_size_mb: 100
  max_uncompressed_size_mb: 500
  max_single_file_size_mb: 100
  max_file_count: 1000
  max_depth: 3
  max_compression_ratio: 100
```

若超過限制：

* 停止處理
* 不完整解壓
* 將檔案標記為 `HIGH`
* 記錄觸發的限制條件

---

## FR-012 可疑檔案重新命名

使用 `--rename` 時：

```bash
python -m attachment_scanner scan ./attachments --rename
```

重新命名規則：

```text
original_name + ".txt"
```

範例：

```text
tool.exe → tool.exe.txt
script.ps1 → script.ps1.txt
invoice.pdf.exe → invoice.pdf.exe.txt
```

若目標檔名已存在：

```text
tool.exe.txt
```

則使用：

```text
tool.exe.1.txt
tool.exe.2.txt
tool.exe.3.txt
```

不得覆蓋既有檔案。

---

## FR-013 已重新命名檔案辨識

若檔案名稱為：

```text
tool.exe.txt
```

系統仍應辨識原始高風險副檔名 `.exe`。

判定結果：

```text
status: SANITIZED
risk_level: HIGH
reason: Suspicious original extension preserved before .txt
```

系統不應再次改名為：

```text
tool.exe.txt.txt
```

---

## FR-014 隔離模式

系統應提供隔離模式：

```bash
python -m attachment_scanner scan ./attachments \
  --quarantine ./quarantine
```

處理流程：

1. 建立隔離目錄。
2. 保留原始相對路徑。
3. 將可疑檔案搬移至隔離目錄。
4. 在隔離目錄中附加 `.txt`。
5. 產生 metadata JSON。
6. 記錄原始位置及隔離後位置。

範例：

```text
attachments/finance/Rp.exe
```

隔離後：

```text
quarantine/finance/Rp.exe.txt
quarantine/finance/Rp.exe.metadata.json
```

---

## FR-015 壓縮檔安全副本

指定：

```bash
--sanitize-archive
```

系統應：

1. 保留原始 ZIP 不變。
2. 建立新的 sanitized ZIP。
3. 將內部可疑檔案附加 `.txt`。
4. 保留安全檔案原名。
5. 建立 `SANITIZE_REPORT.json`。
6. 不保留危險的絕對路徑。
7. 不保留可能造成路徑穿越的項目。

範例：

```text
Rp.zip
Rp.sanitized.zip
```

---

## FR-016 Dry Run 模式

使用：

```bash
--dry-run
```

系統只能：

* 掃描
* 判定
* 顯示預計重新命名結果
* 產生報告

不得：

* 重新命名
* 搬移
* 刪除
* 建立 sanitized ZIP

---

## FR-017 SHA-256 計算

所有掃描檔案都應計算 SHA-256。

大檔案必須分塊讀取：

```text
chunk size: 1 MB
```

不得一次將完整大檔案載入記憶體。

---

## FR-018 掃描結果輸出

支援格式：

```text
console
json
csv
```

使用方式：

```bash
--output-format json
--output ./reports/scan-result.json
```

JSON 報告至少包含：

```json
{
  "scan_id": "uuid",
  "started_at": "2026-07-22T06:30:00+08:00",
  "completed_at": "2026-07-22T06:30:03+08:00",
  "target": "./attachments",
  "mode": "rename",
  "summary": {
    "total_files": 10,
    "safe_files": 7,
    "suspicious_files": 2,
    "review_required": 1,
    "renamed_files": 2,
    "errors": 0
  },
  "results": []
}
```

單一結果格式：

```json
{
  "path": "attachments/Rp.zip",
  "file_name": "Rp.zip",
  "size_bytes": 10524,
  "sha256": "abc123...",
  "detected_type": "zip",
  "status": "SUSPICIOUS_ARCHIVE",
  "risk_level": "HIGH",
  "reasons": [
    "Archive contains blocked extension: payload.exe"
  ],
  "archive_entries": [
    {
      "path": "payload.exe",
      "status": "SUSPICIOUS",
      "risk_level": "HIGH",
      "reasons": [
        "Blocked extension: .exe"
      ]
    }
  ],
  "action": "RENAMED",
  "original_path": "attachments/Rp.zip",
  "new_path": "attachments/Rp.zip.txt"
}
```

---

## 7. 風險分級

### SAFE

條件：

* 副檔名不在阻擋清單
* 檔案簽章與副檔名一致
* 不含可疑壓縮內容
* 未觸發異常規則

### LOW

條件範例：

* 無法辨識檔案類型
* 檔名包含特殊字元
* 副檔名缺失，但內容看似一般文字

### MEDIUM

條件範例：

* 加密 ZIP
* 多層壓縮
* 不常見腳本內容
* 副檔名與內容型態不完全一致
* 壓縮檔無法完整讀取

### HIGH

條件範例：

* 副檔名位於阻擋清單
* ZIP 內包含阻擋副檔名
* `.pdf`、`.jpg` 等文件或圖片實際為 PE 執行檔
* 雙重副檔名最後一層為可執行檔
* 觸發 ZIP Bomb 防護
* 路徑穿越
* Windows PE 檔案偽裝成其他格式

### CRITICAL

預設不使用 `CRITICAL`。

除非日後整合惡意程式指標、簽章比對或企業封鎖清單，否則本工具僅做靜態風險偵測，不應聲稱檔案已確認為惡意程式。

---

## 8. 判定狀態

系統支援以下狀態：

```text
SAFE
SUSPICIOUS
SUSPICIOUS_ARCHIVE
SANITIZED
REVIEW_REQUIRED
ERROR
SKIPPED
```

---

## 9. CLI 規格

### 9.1 基本命令

```bash
python -m attachment_scanner scan TARGET
```

### 9.2 完整參數

```text
usage:
  attachment-scanner scan TARGET [options]

positional arguments:
  TARGET
      要掃描的檔案或目錄

options:
  --recursive
      遞迴掃描子目錄

  --dry-run
      僅顯示結果，不修改檔案

  --rename
      將可疑檔案附加 .txt

  --quarantine PATH
      將可疑檔案移至隔離目錄

  --sanitize-archive
      建立安全化壓縮檔副本

  --config PATH
      指定 YAML 政策設定檔

  --output PATH
      指定報告輸出路徑

  --output-format console|json|csv
      指定報告格式

  --max-file-size SIZE
      最大掃描檔案容量

  --max-archive-depth INTEGER
      最大壓縮檔遞迴深度

  --include-hidden
      掃描隱藏檔案

  --follow-symlinks
      是否跟隨 symbolic link，預設關閉

  --log-level DEBUG|INFO|WARNING|ERROR
      日誌層級

  --fail-on HIGH|MEDIUM|NONE
      指定發現風險時的程式結束碼

  --version
      顯示版本
```

### 9.3 動作互斥

以下參數不可同時使用：

```text
--rename
--quarantine
```

`--sanitize-archive` 可搭配 `--rename` 或 `--quarantine`，但只作用於壓縮檔副本，不直接修改原始 ZIP 內容。

---

## 10. 程式結束碼

| Exit Code | 意義                       |
| --------: | ------------------------ |
|         0 | 掃描完成，未達失敗門檻              |
|         1 | 發現可疑檔案，達到 `--fail-on` 門檻 |
|         2 | 使用者參數錯誤                  |
|         3 | 檔案或目錄不存在                 |
|         4 | 權限不足                     |
|         5 | 掃描過程發生未預期錯誤              |
|         6 | 設定檔格式錯誤                  |

---

## 11. 建議專案結構

```text
suspicious-attachment-scanner/
├── README.md
├── SPEC.md
├── pyproject.toml
├── requirements.txt
├── .gitignore
├── config/
│   └── policy.yaml
├── src/
│   └── attachment_scanner/
│       ├── __init__.py
│       ├── __main__.py
│       ├── cli.py
│       ├── config.py
│       ├── models.py
│       ├── scanner.py
│       ├── detector.py
│       ├── signatures.py
│       ├── archive_scanner.py
│       ├── sanitizer.py
│       ├── quarantine.py
│       ├── hashing.py
│       ├── reporting.py
│       ├── path_security.py
│       ├── exceptions.py
│       └── logging_config.py
└── tests/
    ├── fixtures/
    │   ├── safe/
    │   ├── suspicious/
    │   ├── archives/
    │   └── malformed/
    ├── test_detector.py
    ├── test_scanner.py
    ├── test_archive_scanner.py
    ├── test_sanitizer.py
    ├── test_path_security.py
    ├── test_reporting.py
    └── test_cli.py
```

---

## 12. 核心資料模型

### ScanResult

```python
@dataclass
class ScanResult:
    path: str
    file_name: str
    size_bytes: int
    sha256: str
    extension: str
    detected_type: str | None
    status: str
    risk_level: str
    reasons: list[str]
    action: str
    original_path: str
    new_path: str | None
    archive_entries: list["ScanResult"]
    error_message: str | None
```

### ScanSummary

```python
@dataclass
class ScanSummary:
    scan_id: str
    started_at: datetime
    completed_at: datetime | None
    target: str
    total_files: int
    safe_files: int
    suspicious_files: int
    review_required: int
    renamed_files: int
    quarantined_files: int
    errors: int
```

---

## 13. 處理流程

```text
接收掃描目標
    ↓
驗證路徑及權限
    ↓
取得檔案資訊
    ↓
檢查 symbolic link
    ↓
計算 SHA-256
    ↓
分析檔名與副檔名
    ↓
分析檔案簽章
    ↓
判斷是否為壓縮檔
    ├── 否 → 風險評分
    └── 是 → 安全讀取壓縮內容
                ↓
             檢查路徑穿越
                ↓
             檢查 ZIP Bomb 限制
                ↓
             遞迴掃描內部項目
                ↓
             彙總壓縮檔風險
    ↓
依政策決定動作
    ├── 僅報告
    ├── 附加 .txt
    ├── 移至隔離區
    └── 建立 sanitized ZIP
    ↓
產生報告
    ↓
回傳 Exit Code
```

---

## 14. 重新命名規則

### 一般可疑檔案

```text
payload.exe
→ payload.exe.txt
```

### 雙重副檔名

```text
invoice.pdf.exe
→ invoice.pdf.exe.txt
```

### 已存在目標檔案

```text
payload.exe.txt 已存在
→ payload.exe.1.txt
```

### 已安全化檔案

```text
payload.exe.txt
→ 不再重新命名
```

### 無副檔名但內容為 PE

```text
payload
→ payload.txt
```

其 metadata 必須記錄：

```json
{
  "original_name": "payload",
  "detected_type": "windows_pe",
  "reason": "PE signature detected"
}
```

---

## 15. 檔名安全處理

系統必須處理：

* 大小寫混淆
* Unicode 正規化
* 尾端空白
* 尾端句點
* 控制字元
* Windows 保留名稱
* 過長檔名
* 相同檔名衝突

Windows 保留名稱包括：

```text
CON
PRN
AUX
NUL
COM1
COM2
COM3
COM4
COM5
COM6
COM7
COM8
COM9
LPT1
LPT2
LPT3
LPT4
LPT5
LPT6
LPT7
LPT8
LPT9
```

報告中應保留原始檔名，但實際輸出名稱應經安全化。

---

## 16. Symbolic Link 政策

預設：

```text
follow_symlinks: false
```

若遇到 symbolic link：

```text
status: SKIPPED
reason: Symbolic link scanning is disabled
```

只有使用者明確指定：

```bash
--follow-symlinks
```

才允許跟隨。

即使允許跟隨，也必須避免：

* 掃描循環
* 離開原始掃描根目錄
* 重複掃描相同 inode 或檔案

---

## 17. 日誌需求

日誌應記錄：

* 掃描開始與結束時間
* 掃描目標
* 使用的政策設定
* 掃描檔案數
* 可疑檔案數
* 每次重新命名
* 每次隔離
* 每個錯誤
* 壓縮檔限制觸發情況

日誌不得記錄：

* 檔案完整內容
* 使用者密碼
* 壓縮檔密碼
* 個人敏感資料內容

建議格式：

```text
2026-07-22 06:30:01 INFO scan_started target=./attachments
2026-07-22 06:30:01 WARNING suspicious_file path=Rp.exe reason=blocked_extension
2026-07-22 06:30:01 INFO file_renamed old=Rp.exe new=Rp.exe.txt
2026-07-22 06:30:03 INFO scan_completed total=10 suspicious=2 errors=0
```

---

## 18. 設定檔範例

```yaml
version: 1

blocked_extensions:
  - .exe
  - .com
  - .scr
  - .pif
  - .cpl
  - .msi
  - .bat
  - .cmd
  - .ps1
  - .vbs
  - .js
  - .jse
  - .wsf
  - .hta
  - .jar
  - .dll
  - .sys
  - .reg
  - .lnk
  - .chm

archive_extensions:
  - .zip

archive_limits:
  max_archive_size_mb: 100
  max_uncompressed_size_mb: 500
  max_single_file_size_mb: 100
  max_file_count: 1000
  max_depth: 3
  max_compression_ratio: 100

actions:
  default_mode: report
  append_txt: true
  preserve_original_extension: true
  overwrite_existing: false

risk_policy:
  encrypted_archive: MEDIUM
  extension_content_mismatch: HIGH
  path_traversal: HIGH
  archive_limit_exceeded: HIGH

scan:
  recursive: false
  include_hidden: false
  follow_symlinks: false
  hash_algorithm: sha256
  hash_chunk_size_bytes: 1048576

report:
  format: json
  include_archive_entries: true
  include_sha256: true
```

---

## 19. 相依套件

建議優先使用 Python 標準函式庫：

* `argparse`
* `pathlib`
* `zipfile`
* `hashlib`
* `json`
* `csv`
* `logging`
* `dataclasses`
* `mimetypes`
* `shutil`
* `tempfile`
* `uuid`
* `datetime`

第三方套件：

```text
PyYAML
python-magic
```

Windows 環境若 `python-magic` 安裝不便，可使用：

```text
python-magic-bin
```

開發及測試套件：

```text
pytest
pytest-cov
ruff
mypy
```

---

## 20. 非功能需求

### NFR-001 相容性

支援：

* Windows 10
* Windows 11
* Linux
* macOS

主要目標環境為 Windows。

### NFR-002 效能

對一般未壓縮檔案：

* 掃描 1,000 個小型附件時，應採串流方式處理。
* 單一檔案不得一次完整載入記憶體。
* SHA-256 必須分塊計算。

### NFR-003 穩定性

單一檔案掃描失敗時：

* 不得中止整批掃描
* 該檔案標記為 `ERROR`
* 繼續掃描其他檔案

### NFR-004 可稽核性

所有修改檔案名稱或位置的動作都必須留下：

* 原始路徑
* 新路徑
* SHA-256
* 時間
* 判定原因
* 執行模式

### NFR-005 最小權限

工具不應要求系統管理員權限。

若無法修改檔案：

* 回傳權限錯誤
* 不嘗試提升權限
* 不修改 ACL

### NFR-006 可測試性

核心偵測邏輯不得直接依賴 CLI。

以下元件應可獨立測試：

* 副檔名判斷
* 雙重副檔名判斷
* Magic bytes 判斷
* 路徑穿越判斷
* 重新命名邏輯
* ZIP 安全限制
* 報告輸出

---

## 21. 驗收標準

### AC-001 偵測 EXE

Given：

```text
sample.exe
```

When：

```bash
attachment-scanner scan sample.exe
```

Then：

* 狀態為 `SUSPICIOUS`
* 風險為 `HIGH`
* 原因包含 `Blocked extension: .exe`

---

### AC-002 重新命名 EXE

Given：

```text
sample.exe
```

When：

```bash
attachment-scanner scan sample.exe --rename
```

Then：

```text
sample.exe.txt
```

必須存在，且：

```text
sample.exe
```

不再存在。

---

### AC-003 Dry Run 不修改

Given：

```text
sample.exe
```

When：

```bash
attachment-scanner scan sample.exe --rename --dry-run
```

Then：

* 報告顯示預計改名為 `sample.exe.txt`
* 原始 `sample.exe` 仍存在
* 不得建立 `sample.exe.txt`

---

### AC-004 不重複附加 TXT

Given：

```text
sample.exe.txt
```

When：

```bash
attachment-scanner scan sample.exe.txt --rename
```

Then：

* 判定為 `SANITIZED`
* 不得建立 `sample.exe.txt.txt`

---

### AC-005 偵測雙重副檔名

Given：

```text
invoice.pdf.exe
```

Then：

* 判定為 `HIGH`
* 原因包含雙重副檔名
* `--rename` 後為 `invoice.pdf.exe.txt`

---

### AC-006 偵測偽裝 PE

Given：

```text
invoice.pdf
```

且內容以：

```text
MZ
```

開頭。

Then：

* 判定為 `HIGH`
* 原因包含 `Extension/content mismatch`
* 偵測類型為 `windows_pe`

---

### AC-007 掃描 ZIP 內的 EXE

Given：

```text
Rp.zip
└── payload.exe
```

Then：

* `Rp.zip` 判定為 `SUSPICIOUS_ARCHIVE`
* 風險為 `HIGH`
* 報告列出 `payload.exe`

---

### AC-008 建立 sanitized ZIP

Given：

```text
Rp.zip
├── readme.txt
└── payload.exe
```

When：

```bash
attachment-scanner scan Rp.zip --sanitize-archive
```

Then 建立：

```text
Rp.sanitized.zip
```

其內容為：

```text
readme.txt
payload.exe.txt
SANITIZE_REPORT.json
```

原始 `Rp.zip` 必須維持不變。

---

### AC-009 阻擋路徑穿越

Given ZIP 內容：

```text
../../payload.exe
```

Then：

* 不得將檔案寫出目標目錄
* ZIP 判定為 `HIGH`
* 原因包含 `Path traversal detected`

---

### AC-010 加密 ZIP

Given 加密 ZIP。

Then：

* 不嘗試破解密碼
* 狀態為 `REVIEW_REQUIRED`
* 原因包含 `Encrypted archive cannot be inspected`

---

### AC-011 避免覆蓋

Given：

```text
payload.exe
payload.exe.txt
```

When 使用 `--rename`。

Then：

```text
payload.exe
```

應改為：

```text
payload.exe.1.txt
```

不得覆蓋既有 `payload.exe.txt`。

---

### AC-012 單一錯誤不終止整批掃描

Given 目錄內含：

* 1 個無讀取權限的檔案
* 2 個正常檔案

Then：

* 無權限檔案標記為 `ERROR`
* 其他檔案仍完成掃描
* 報告 `errors` 為 1

---

## 22. 測試案例

| Test ID | 情境                 | 預期結果               |
| ------- | ------------------ | ------------------ |
| TC-001  | 掃描 `.exe`          | HIGH               |
| TC-002  | 掃描 `.EXE`          | HIGH               |
| TC-003  | 掃描 `.pdf.exe`      | HIGH               |
| TC-004  | 掃描 `.exe.txt`      | SANITIZED          |
| TC-005  | PDF 內容為真正 PDF      | SAFE               |
| TC-006  | PDF 內容為 PE         | HIGH               |
| TC-007  | ZIP 內含 EXE         | SUSPICIOUS_ARCHIVE |
| TC-008  | ZIP 內全為安全文件        | SAFE               |
| TC-009  | ZIP 內含雙層 ZIP 與 EXE | HIGH               |
| TC-010  | ZIP 超過最大層數         | REVIEW_REQUIRED    |
| TC-011  | ZIP 路徑穿越           | HIGH               |
| TC-012  | ZIP 壓縮比異常          | HIGH               |
| TC-013  | 加密 ZIP             | REVIEW_REQUIRED    |
| TC-014  | Dry run            | 不修改檔案              |
| TC-015  | 目標 TXT 已存在         | 自動流水號              |
| TC-016  | symbolic link      | 預設 SKIPPED         |
| TC-017  | 無權限檔案              | ERROR，但繼續          |
| TC-018  | 無副檔名 PE            | HIGH               |
| TC-019  | 空檔案                | LOW 或 SAFE         |
| TC-020  | 損壞 ZIP             | REVIEW_REQUIRED    |

---

## 23. 資安注意事項

1. 本工具不得將檔案上傳至網際網路。
2. 不得執行待掃描附件。
3. 不得自動信任 `.txt`。
4. `.exe.txt` 仍可能包含執行檔內容，只是降低誤觸執行風險。
5. Windows 若隱藏已知副檔名，使用者可能只看到 `payload.exe`，因此操作文件需提醒顯示完整副檔名。
6. 重新命名不是病毒清除。
7. 對加密或無法解析的壓縮檔，必須標記人工複核。
8. 所有壓縮檔內容必須在受控暫存目錄中處理。
9. 工具完成後應清理暫存資料。
10. 發生異常時，不得留下已部分解壓的可執行檔於一般工作目錄。

---

## 24. 第一階段 MVP

MVP 必須完成：

* 單一檔案掃描
* 目錄掃描
* 高風險副檔名偵測
* 大小寫忽略
* 雙重副檔名偵測
* PE `MZ` 簽章偵測
* ZIP 內部檔名掃描
* ZIP 路徑穿越防護
* `--dry-run`
* `--rename`
* 檔名衝突處理
* SHA-256
* JSON 報告
* 單元測試

---

## 25. 第二階段

第二階段可加入：

* sanitized ZIP
* 隔離目錄
* CSV 報告
* YAML 政策設定
* 加密 ZIP 偵測
* ZIP Bomb 防護
* 檔案內容與副檔名一致性判斷
* Windows GUI
* 拖放檔案
* 排程掃描
* REST API
* Outlook 附件匯出整合
* EML 郵件檔解析
* MSG 郵件檔解析

---

## 26. 第三階段

可評估：

* YARA 規則
* ClamAV 整合
* Windows Defender CLI 整合
* 企業雜湊封鎖清單
* 郵件閘道 API
* SIEM 日誌輸出
* Syslog
* OpenTelemetry
* Web 管理介面
* 檔案數位簽章驗證

上述功能必須維持本機處理及最小權限原則。

---

## 27. 完成定義

專案視為完成時，必須符合：

* 所有 MVP 功能完成
* 所有驗收條件通過
* 測試覆蓋率至少 80%
* `ruff` 檢查通過
* `mypy` 主要模組檢查通過
* 不執行任何待掃描檔案
* ZIP 路徑穿越測試通過
* ZIP Bomb 限制測試通過
* Dry run 保證不修改檔案
* 重新命名不覆蓋既有檔案
* README 提供 Windows 使用方式
* 提供範例政策設定檔
* 提供範例 JSON 報告
* 所有檔案修改都有稽核紀錄

---

## 28. 範例操作

### 預覽掃描

```bash
python -m attachment_scanner scan ./attachments \
  --recursive \
  --dry-run
```

### 掃描並重新命名

```bash
python -m attachment_scanner scan ./attachments \
  --recursive \
  --rename \
  --output-format json \
  --output ./reports/result.json
```

### 隔離可疑檔案

```bash
python -m attachment_scanner scan ./attachments \
  --recursive \
  --quarantine ./quarantine \
  --output ./reports/quarantine-result.json
```

### 建立安全壓縮檔副本

```bash
python -m attachment_scanner scan ./attachments/Rp.zip \
  --sanitize-archive \
  --output ./reports/rp-sanitize.json
```

---

## 29. 重要設計決策

### 決策一：附加 `.txt` 而非取代副檔名

採用：

```text
payload.exe.txt
```

不採用：

```text
payload.txt
```

原因：

* 保留原始副檔名
* 方便稽核
* 方便辨識原始風險
* 避免失去事件證據

### 決策二：預設不修改 ZIP

原始 ZIP 可能是事件證據，因此：

* 預設只掃描
* sanitized ZIP 必須另存新檔
* 原始 ZIP 不變

### 決策三：靜態分析不等於惡意程式判定

工具輸出應使用：

```text
可疑
高風險
需要人工複核
```

不得直接使用：

```text
確定是病毒
確定是木馬
```

除非已整合具有明確證據的防毒或惡意程式規則。

### 決策四：不自動解壓至原始目錄

所有壓縮內容只能：

* 直接從 ZIP stream 讀取
* 或解壓至受控暫存目錄

不得直接解壓至附件所在目錄。
