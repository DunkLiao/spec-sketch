---
created: 2026-09-06
tags:
  - vibecoding
  - spec
  - go
  - cli
  - data-processing
  - offline
---

# Go Data Engine — SPEC

## 1. 專案定位

**Go Data Engine** 是一個以 Go 開發的本機 CLI 資料處理工具，執行檔名稱為 `gde.exe`。

核心定位：

> 將 CSV / JSON 檔案丟進 CLI，直接完成檢視、驗證、篩選、欄位處理、排序、去重、聚合、比對與轉檔。

本專案第一版聚焦於單機、單一執行檔、免額外 runtime 的資料處理需求。MVP 不提供 Web UI、REST API、資料庫服務、雲端服務或 AI 功能。

## 2. 目前版本狀態

目前版本：`0.1.0`

目前狀態：MVP 已實作並通過 UAT。

已完成能力：

- CSV 讀取
- JSON 讀取
- CSV 匯出
- JSON 匯出
- 資料型別轉換
- 欄位型別推測
- config-based validation
- filter
- select
- rename
- sort
- dedupe
- group
- aggregate
- compare
- convert
- version
- Windows 批次建置檔 `build.bat`
- UAT 測試資料與驗收清單

尚未納入第一版：

- SQLite import / query
- Pipeline
- Stream mode 的 CLI 操作
- 統計報表型 inspect 輸出

## 3. 設計原則

系統必須維持以下原則：

- 使用 Go 開發。
- 可在 Windows 編譯為單一 `gde.exe`。
- 不依賴 Python。
- 不依賴 Node.js。
- 不需要安裝資料庫 server。
- 不綁定特定產業。
- 核心邏輯不得寫死特定欄位名稱。
- 核心邏輯不得寫死特定業務規則。
- 一般資料錯誤應回傳 error，不得用 panic 處理。
- CLI 預設輸出應能被人讀取，也應保留可被自動化處理的格式。

## 4. 技術棧

Go 版本：

```text
Go 1.25+
```

目前開發與驗收環境：

```text
go1.26.5 windows/amd64
```

主要套件：

```text
encoding/csv
encoding/json
log/slog
github.com/spf13/cobra
github.com/spf13/viper
```

目前未使用：

```text
database/sql
modernc.org/sqlite
```

SQLite 相關套件保留到第二階段再導入。

## 5. 專案結構

目前專案結構：

```text
go-data-engine/
├─ cmd/
│  └─ gde/
│     ├─ main.go
│     └─ cli_test.go
├─ internal/
│  ├─ config/
│  │  └─ config.go
│  ├─ data/
│  │  ├─ dataset.go
│  │  └─ dataset_test.go
│  ├─ ops/
│  │  ├─ ops.go
│  │  └─ ops_test.go
│  ├─ reader/
│  │  ├─ reader.go
│  │  └─ reader_test.go
│  ├─ validator/
│  │  ├─ validator.go
│  │  └─ validator_test.go
│  └─ writer/
│     ├─ writer.go
│     └─ writer_test.go
├─ UAT/
│  ├─ UAT_CHECKLIST.md
│  ├─ config.yaml
│  ├─ duplicate.csv
│  ├─ filtered.csv
│  ├─ roundtrip.csv
│  ├─ sales.csv
│  ├─ sales.json
│  ├─ sales.txt
│  └─ today.csv
├─ .gitignore
├─ build.bat
├─ config.yaml
├─ go.mod
├─ go.sum
├─ README.md
└─ SPEC.md
```

Package 職責：

- `cmd/gde`：CLI entrypoint 與 Cobra command wiring。
- `internal/data`：通用資料模型、型別轉換、型別推測、dataset 複製。
- `internal/reader`：CSV / JSON 讀取與格式判斷。
- `internal/writer`：CSV / JSON 寫出與格式判斷。
- `internal/validator`：required 與 type validation。
- `internal/config`：透過 Viper 載入 YAML config。
- `internal/ops`：資料操作邏輯，包含 filter、select、rename、sort、dedupe、group、aggregate、compare。

## 6. 通用資料模型

Record：

```go
type Record map[string]any
```

Dataset：

```go
type Dataset struct {
    Columns []string
    Rows    []Record
}
```

規則：

- `Columns` 保存欄位順序。
- `Rows` 保存資料列。
- 核心處理邏輯不得假設固定欄位存在。
- CSV 讀入後的值以 string 保存。
- JSON 讀入後依 Go JSON decoder 規則保存，例如 number 為 `float64`、boolean 為 `bool`。

## 7. Reader 規格

CSV reader：

```go
func ReadCSV(path string) (*data.Dataset, error)
func ReadCSVFrom(r io.Reader) (*data.Dataset, error)
```

CSV reader 必須支援：

- header row。
- UTF-8。
- UTF-8 BOM。
- 空值。
- 不固定欄位數。

CSV 欄位數處理規則：

- 資料列欄位少於 header 時，缺少欄位補空字串。
- 資料列欄位多於 header 時，多出的欄位忽略。

Stream reader：

```go
func StreamCSV(path string, handler func(data.Record) error) error
```

目前 stream mode 僅提供內部 API，尚未提供 CLI command。

JSON reader：

```go
func ReadJSON(path string) (*data.Dataset, error)
```

JSON reader 支援格式：

```json
[
  {
    "name": "A",
    "amount": 100
  }
]
```

格式自動判斷：

```go
func ReadDataset(path string) (*data.Dataset, error)
```

目前僅支援：

- `.csv`
- `.json`

其他副檔名應回傳不支援格式錯誤。

## 8. Writer 規格

CSV writer：

```go
func WriteCSV(dataset *data.Dataset, path string) error
func WriteCSVTo(dataset *data.Dataset, out io.Writer) error
```

JSON writer：

```go
func WriteJSON(dataset *data.Dataset, path string) error
func WriteJSONTo(dataset *data.Dataset, out io.Writer) error
```

格式自動判斷：

```go
func WriteDataset(dataset *data.Dataset, path string) error
```

目前僅支援：

- `.csv`
- `.json`

CSV 輸出規則：

- header 順序依 `Dataset.Columns`。
- nil 輸出為空字串。
- `float64` 輸出時移除多餘小數零。

JSON 輸出規則：

- 輸出 `Dataset.Rows`。
- 使用縮排格式，方便人工檢查。

## 9. 型別轉換與推測

型別轉換介面：

```go
func ConvertValue(value any, targetType string) (any, error)
```

支援型別：

```text
string
int
float
bool
date
null
```

轉換規則：

- `string`：使用字串表示。
- `int`：轉為 `int64`。
- `float`：轉為 `float64`。
- `bool`：僅接受 `true` 或 `false`。
- `date`：接受 `YYYY-MM-DD`，轉為 `time.Time`。
- `null`：空字串或 `null` 視為 nil。

型別推測介面：

```go
func InferColumnTypes(ds *Dataset) map[string]string
```

推測規則：

- 空值不主導欄位型別。
- int 與 float 混用時推為 float。
- 任一非數值、非布林、非日期值會使欄位推為 string。

## 10. Validation 規格

設定檔範例：

```yaml
validation:
  required:
    - id
    - amount
  types:
    amount: float
    active: bool
    date: date
```

設定載入：

```go
func Load(path string) (config.File, error)
```

驗證介面：

```go
func Validate(ds *data.Dataset, cfg validator.Config) []ValidationError
```

ValidationError：

```go
type ValidationError struct {
    Row     int    `json:"row"`
    Column  string `json:"column"`
    Value   any    `json:"value"`
    Message string `json:"message"`
}
```

規則：

- Row 使用 1-based data row index，不包含 header。
- required 欄位不存在或空字串時回傳錯誤。
- types 欄位非空時才檢查型別。
- 沒有錯誤時 CLI 必須輸出 `[]`，不得輸出 `null`。
- validation 規則只能來自設定檔或 CLI 參數，不得寫死業務欄位。

## 11. 資料操作規格

### 11.1 Filter

介面：

```go
func Filter(ds *data.Dataset, expression string) (*data.Dataset, error)
```

支援 operator：

```text
=
!=
>
>=
<
<=
contains
startsWith
endsWith
```

目前 expression 格式：

```text
<column> <operator> <value>
```

範例：

```powershell
.\gde.exe filter .\UAT\sales.csv --where "amount > 100"
```

數值比較會將左右值轉為 float；字串 operator 使用 Go 字串比對。

### 11.2 Select

介面：

```go
func Select(ds *data.Dataset, columns []string) *data.Dataset
```

CLI：

```powershell
.\gde.exe select .\UAT\sales.csv --columns department,amount
```

輸出只保留指定欄位，欄位順序依 `--columns`。

### 11.3 Rename

介面：

```go
func Rename(ds *data.Dataset, from, to string) *data.Dataset
```

CLI：

```powershell
.\gde.exe rename .\UAT\sales.csv --from amount --to total
```

輸出會將 header 與每筆 row 的 key 從 `from` 改為 `to`。

### 11.4 Sort

介面：

```go
func Sort(ds *data.Dataset, column string, desc bool) (*data.Dataset, error)
```

CLI：

```powershell
.\gde.exe sort .\UAT\sales.csv --by amount
.\gde.exe sort .\UAT\sales.csv --by amount --desc
```

排序規則：

- 若左右值都可轉為 float，使用數值排序。
- 否則使用字串排序。
- 排序必須是 stable sort。

### 11.5 Dedupe

介面：

```go
func Dedupe(ds *data.Dataset, columns []string) *data.Dataset
```

CLI：

```powershell
.\gde.exe dedupe .\UAT\duplicate.csv --by id,department,amount
```

規則：

- 使用 `--by` 指定的一個或多個欄位組成 key。
- 第一筆出現的資料保留。
- 後續相同 key 的資料移除。

### 11.6 Group

介面：

```go
func Group(ds *data.Dataset, columns []string) *data.Dataset
```

CLI：

```powershell
.\gde.exe group .\UAT\sales.csv --by department
```

目前 group 行為等同依指定欄位去重，輸出每個 group key 的第一筆資料。

### 11.7 Aggregate

介面：

```go
type AggregateSpec struct {
    GroupBy []string
    Count   bool
    Sum     []string
    Avg     []string
    Min     []string
    Max     []string
}

func Aggregate(ds *data.Dataset, spec AggregateSpec) (*data.Dataset, error)
```

CLI：

```powershell
.\gde.exe aggregate .\UAT\sales.csv --group-by department --count --sum amount --avg amount
```

支援聚合：

- count
- sum
- avg
- min
- max

輸出欄位命名：

- `count`
- `sum_<column>`
- `avg_<column>`
- `min_<column>`
- `max_<column>`

數值聚合欄位必須可轉為 float，否則回傳錯誤。

### 11.8 Compare

介面：

```go
type CompareSummary struct {
    Added   int `json:"added"`
    Removed int `json:"removed"`
    Changed int `json:"changed"`
}

type FieldChange struct {
    Old any `json:"old"`
    New any `json:"new"`
}

type RowChange struct {
    Key     string                 `json:"key"`
    Changes map[string]FieldChange `json:"changes"`
}

type CompareResult struct {
    Summary CompareSummary `json:"summary"`
    Added   []data.Record  `json:"added_rows"`
    Removed []data.Record  `json:"removed_rows"`
    Changed []RowChange    `json:"changed_rows"`
}

func Compare(oldDS, newDS *data.Dataset, keyColumn string) (CompareResult, error)
```

CLI 預設表格輸出：

```powershell
.\gde.exe compare .\UAT\sales.csv .\UAT\today.csv --key id
```

輸出格式：

```text
Summary
added  removed  changed
1      2        1

Added
...

Removed
...

Changed
key  column  old  new
1    amount  100  150
```

JSON 輸出：

```powershell
.\gde.exe compare .\UAT\sales.csv .\UAT\today.csv --key id --format json
```

規則：

- old 中沒有、新資料中存在者為 added。
- old 中存在、新資料中沒有者為 removed。
- key 相同但非 key 欄位值不同者為 changed。
- changed 必須列出實際變動欄位與 old/new 值。
- CLI `--format` 目前支援 `table` 與 `json`。

## 12. CLI 規格

Root command：

```powershell
.\gde.exe
```

目前支援 command：

```text
inspect
validate
filter
select
rename
sort
dedupe
group
aggregate
compare
convert
version
```

全域參數：

```text
--config <path>
```

處理型指令輸出規則：

- `filter`
- `select`
- `rename`
- `sort`
- `dedupe`
- `group`
- `aggregate`

預設輸出 CSV 到 stdout。

若指定：

```text
--out <path>
```

則依輸出檔副檔名寫入 `.csv` 或 `.json`。

`compare` 不使用 `--out`，預設輸出表格，支援 `--format json`。

`convert` 一律使用輸入與輸出路徑：

```powershell
.\gde.exe convert .\input.csv .\output.json
.\gde.exe convert .\input.json .\output.csv
```

## 13. Inspect 規格

CLI：

```powershell
.\gde.exe inspect .\UAT\sales.csv
```

輸出內容：

- File
- Rows
- Columns count
- Columns list
- Types list

目前 inspect 不輸出完整統計資訊。

第二階段可擴充：

- null count
- distinct count
- min
- max
- average

## 14. Config 規格

預設 `config.yaml`：

```yaml
input:
  encoding: utf-8
  delimiter: ","

validation:
  required: []
  types: {}

output:
  format: csv
```

目前實作使用：

- `validation.required`
- `validation.types`

目前保留但尚未實作：

- `input.encoding`
- `input.delimiter`
- `output.format`

## 15. Logging 與錯誤處理

CLI 使用 `log/slog` 將 command error 寫到 stderr。

規則：

- command 成功時資料輸出寫到 stdout 或指定 output file。
- command 失敗時回傳非 0 exit code。
- command 失敗時錯誤訊息透過 slog 寫到 stderr。
- 一般資料錯誤不得 panic。

## 16. Build 規格

手動建置：

```powershell
go test ./...
go vet ./...
go build -o gde.exe ./cmd/gde
```

批次建置：

```powershell
.\build.bat
```

`build.bat` 必須：

- 檢查 Go 是否存在於 PATH。
- 顯示 Go version。
- 執行 `go test ./...`。
- 執行 `go vet ./...`。
- 編譯 `gde.exe`。
- 任一步驟失敗時以非 0 exit code 結束。

## 17. 測試規格

測試命令：

```powershell
go test ./...
go vet ./...
gofmt -l .\cmd .\internal
```

測試涵蓋：

- CSV reader。
- JSON reader。
- StreamCSV。
- type conversion。
- type inference。
- validation。
- CSV writer。
- JSON writer。
- filter。
- select。
- rename。
- sort。
- dedupe。
- aggregate。
- compare。
- CLI integration。
- validate 空錯誤輸出 `[]`。
- compare 預設 table 與 `--format json`。

## 18. UAT 規格

UAT 目錄：

```text
UAT/
```

UAT 清單：

```text
UAT/UAT_CHECKLIST.md
```

UAT 測試資料：

```text
UAT/sales.csv
UAT/today.csv
UAT/duplicate.csv
UAT/config.yaml
UAT/sales.txt
```

UAT 產出資料：

```text
UAT/filtered.csv
UAT/sales.json
UAT/roundtrip.csv
```

目前 UAT 結果：

```text
通過
```

驗收日期：

```text
2026-09-06
```

驗收重點：

- MVP 指令可在 PowerShell 執行。
- `inspect`、`filter`、`aggregate`、`compare` 核心流程符合需求。
- `validate`、`select`、`rename`、`sort`、`dedupe`、`convert` 可正常使用。
- stdout 與 `--out` 輸出正常。
- CSV / JSON 互轉後仍可讀取。
- 錯誤輸入會回傳錯誤，不會 panic。
- compare 預設表格輸出可讀。
- compare `--format json` 可輸出 JSON 結構。

## 19. MVP 非目標

第一版不做：

```text
Web UI
REST API
Wails
AI
LLM
n8n
Excel XLSX
PDF
Kafka
Redis
Cloud
Microservices
Authentication
SQLite
Pipeline
```

## 20. 第二階段候選功能

第二階段可依優先順序加入：

1. SQLite import / query。
2. Pipeline YAML 執行。
3. inspect 統計資訊。
4. CSV delimiter 設定。
5. 更完整的 expression parser。
6. 大檔案 streaming CLI。
7. compare 結果輸出到檔案。
8. aggregate 多欄位 UAT 擴充。

SQLite 預期 command：

```powershell
.\gde.exe import .\data.csv --db .\data.db --table sales
.\gde.exe query .\data.db "SELECT * FROM sales LIMIT 10"
```

Pipeline 預期 command：

```powershell
.\gde.exe run .\pipeline.yaml
```

第二階段功能不得破壞第一版既有 CLI 行為。

## 21. 驗收完成定義

本專案 MVP 可視為完成，需同時滿足：

- `go test ./...` 通過。
- `go vet ./...` 通過。
- `gofmt -l .\cmd .\internal` 無輸出。
- `.\build.bat` 可成功產生 `gde.exe`。
- `UAT/UAT_CHECKLIST.md` 標示通過。
- README 指令與實際 CLI 行為一致。
- SPEC 與目前實作一致。

