
---
created: 2026-08-04
tags:
  - vibecoding
  - spec
  - outpatient-scheduling
  - note
---

# 我要寫個門診排班網頁，提供我SPEC



以下是一份可直接開工的門診排班系統規格。先講關鍵假設：**主體是「醫師／跟診人員的門診班表管理」**（誰、什麼時段、在哪個診間看診），病患端的線上預約掛號列為第二階段選配模組，因為兩者的資料模型可以共用「診次（Clinic Session）」這個核心物件，但權限與法規要求差異很大[[1](https://www.ozchamp.com/insights/medical-website-design)]。

如果你的需求其實偏向病患預約，告訴我，我把重心調過去。

## 一、系統目標與成功指標

現況痛點在人工排班耗時、容易漏排與不公平。國內醫院實證案例顯示，導入電腦輔助排班並搭配統一排班原則後，門診跟診人員排班作業時間可從 11.2 個工作天縮短至 3.0 個工作天，同時提升正確率[[2](https://www.airitilibrary.com/Article/Detail/1819026x-201308-201309230009-201309230009-45-58)]。

驗收指標建議設定為：

- 單月班表產生時間 ≤ 30 分鐘（含人工微調）
- 排班衝突（同一人同時段重複、診間衝突）為 0
- 假日／夜間班點數標準差 ≤ 1.0（公平性）
- 調班申請到核准平均 ≤ 1 個工作日

## 二、角色與權限

| 角色 | 權限範圍 |
|---|---|
| 系統管理員 | 使用者、科別、診間、班別設定、稽核紀錄 |
| 排班管理者（主任／護理長／總醫師） | 產生班表、手動調整、核准請假與調班、發布班表 |
| 醫師／跟診人員 | 檢視個人班表、填寫排班偏好與預排、申請請假／換班 |
| 櫃台／行政 | 唯讀班表、匯出、列印、公告 |
| 病患（選配） | 僅查詢已發布的門診時間表、線上預約 |

權限採 RBAC，並在資料層加上「科別 scope」，避免跨科看到他人班表。已發布班表與草稿班表必須是兩個狀態，草稿不對外可見[[3](https://github.com/DavidLin729/NurseScheduler2/blob/main/%E6%96%B0%E6%89%8B%E4%BD%BF%E7%94%A8%E8%80%85%E6%89%8B%E5%86%8A.md)]。

## 三、核心資料模型

```sql
-- 人員
staff(id, name, employee_no, role, dept_id, specialties[],
      max_sessions_per_week, is_active)

-- 班別／時段（上午、下午、夜診、全日）
shift_type(id, code, name, start_time, end_time,
           point_weight, is_night, is_holiday_eligible)

-- 診間
room(id, code, name, dept_id, capacity, equipment[])

-- 門診代碼（號別、掛號費、看診人數上限）
clinic_code(id, code, name, reg_fee, quota, dept_id)

-- 診次：班表的最小單位
clinic_session(id, schedule_id, date, shift_type_id, room_id,
               staff_id, assistant_id, clinic_code_id,
               status)  -- draft/published/cancelled/substituted

-- 班表版本
schedule(id, dept_id, period_start, period_end, version,
         status, published_at, published_by)

-- 偏好與預排
preference(id, staff_id, period, date, shift_type_id,
           type)   -- prefer/avoid/fixed/unavailable

-- 請假
leave_request(id, staff_id, start_date, end_date, leave_type,
              days, status, approver_id, reason)

-- 調班／代診
swap_request(id, from_session_id, to_session_id, requester_id,
             target_staff_id, status, approver_id)

-- 稽核
audit_log(id, actor_id, action, entity, entity_id,
          before_json, after_json, created_at)
```

班別要支援上午、下午、全日、夜診等多時段，並在診次上帶診間、號別與掛號費，這是醫院排班系統的標準做法[[4](https://www.lonbon.com/yspbxt_gs/)]。請假天數計算要能設定「例假日不計入」這類規則[[3](https://github.com/DavidLin729/NurseScheduler2/blob/main/%E6%96%B0%E6%89%8B%E4%BD%BF%E7%94%A8%E8%80%85%E6%89%8B%E5%86%8A.md)]。

## 四、功能需求

**FR-1 基礎設定**
科別、診間、班別（含起訖時間與點數權重）、門診號別與掛號費、國定假日行事曆維護。假日表要能匯入，因為點數計算與連假前一天的加權都依賴它[[5](https://tsai.it/archives/2015/07/web-%E7%89%88%E6%8E%92%E7%8F%AD%E8%A1%A8%E5%B0%8F%E5%B7%A5%E5%85%B7/)]。

**FR-2 偏好收集（預排）**
開放期間內，人員可標記想排、避開、不可排（例如進修、值班衝突）。設截止日，逾期鎖定。管理者可看到填寫完成率。

**FR-3 自動排班引擎**
輸入：期間、人員清單、偏好、請假、規則參數。輸出：草稿班表 + 違規清單 + 公平性報表。允許「部分鎖定，其餘自動填」的混合模式，這是實務上最常用的流程：先把假日與夜診排定，剩下平日交給演算法[[5](https://tsai.it/archives/2015/07/web-%E7%89%88%E6%8E%92%E7%8F%AD%E8%A1%A8%E5%B0%8F%E5%B7%A5%E5%85%B7/)]。

**FR-4 手動調整**
月曆拖拉調整，即時顯示衝突提示（紅框 + 原因文字）。任何調整寫入 audit_log。

**FR-5 請假管理**
多假別（事假、病假、特休、婚假、喪假、產假、陪產假、其他）、批次 CSV 上傳、核准流程。請假期間必須被排班引擎視為最高優先的硬約束，不得排入[[3](https://github.com/DavidLin729/NurseScheduler2/blob/main/%E6%96%B0%E6%89%8B%E4%BD%BF%E7%94%A8%E8%80%85%E6%89%8B%E5%86%8A.md)]。

**FR-6 調班與代診**
發起換班 → 對方同意 → 管理者核准 → 班表更新 → 通知相關人。臨時停診／代診要保留原始紀錄與替代人員，不可直接覆寫[[4](https://www.lonbon.com/yspbxt_gs/)]。

**FR-7 檢視與匯出**
月曆檢視、人員橫式檢視（一列一人）、診間檢視、樞紐分析。匯出 CSV／Excel／列印用 PDF，支援以代碼替代班別名稱[[3](https://github.com/DavidLin729/NurseScheduler2/blob/main/%E6%96%B0%E6%89%8B%E4%BD%BF%E7%94%A8%E8%80%85%E6%89%8B%E5%86%8A.md)]。

**FR-8 通知**
班表發布、調班核准、代診指派時推播。管道建議 Email + LINE Notify／Messaging API，介面抽象成 NotificationChannel 以便替換。

**FR-9 統計與儀表板**
每人班數、點數、夜診數、連續上班天數、週工時、假日負擔分佈，並提供公平性指標視覺化[[6](https://ffffff.com.tw/solutions/doctor-scheduling/)]。

**FR-10 HIS 整合（選配）**
以 API 或中介檔（HL7／CSV）將已發布班表推送至 HIS 的門診主檔。整合可行性取決於你的 HIS 是否開放 API，這點要在規劃階段先確認[[1](https://www.ozchamp.com/insights/medical-website-design)]。

## 五、排班規則引擎規格

規則分兩類。**硬約束**違反即不可產生，**軟約束**以加權計分做最佳化。

硬約束：
- 請假期間不排班
- 同一人同時段不得有兩個診次
- 同一診間同時段不得有兩位醫師
- 不可排「不具該號別資格」的醫師（專長對應）
- 連續上班天數上限、夜診後間隔（QOD 類規則）[[5](https://tsai.it/archives/2015/07/web-%E7%89%88%E6%8E%92%E7%8F%AD%E8%A1%A8%E5%B0%8F%E5%B7%A5%E5%85%B7/)]

軟約束（可調權重）：
- 點數平均：假日 2 點、週五及連假前一日 1 點、平日 0 點，總點數與班數盡量均衡[[5](https://tsai.it/archives/2015/07/web-%E7%89%88%E6%8E%92%E7%8F%AD%E8%A1%A8%E5%B0%8F%E5%B7%A5%E5%85%B7/)]
- 個人偏好滿足率
- 同一醫師固定星期同時段（病患熟悉度）
- 診間移動最小化

演算法建議務實路線：先用 CP-SAT（OR-Tools）或整數規劃求解，規模不大時秒級可解；求解失敗時退回模擬退火／隨機重排並回報「無解原因」。實作經驗顯示，若預排本身已違反硬約束（例如預排就存在連值、超過上限），應在求解前就檢出並提示，避免無限重跑[[5](https://tsai.it/archives/2015/07/web-%E7%89%88%E6%8E%92%E7%8F%AD%E8%A1%A8%E5%B0%8F%E5%B7%A5%E5%85%B7/)]。

目標函數示意：

$\min \; w_1\sum_{i}(p_i-\bar{p})^2 + w_2\sum_{i}(n_i-\bar{n})^2 + w_3 \cdot U + w_4 \cdot M$

其中 $p_i$ 為第 i 人點數、$n_i$ 為班數、$U$ 為未滿足偏好數、$M$ 為診間移動次數。

**時段模板進階選項**：若你要延伸到病患預約層級，可導入依看診長度分配的模板（短診排前、長診排後），研究顯示遵循此模板時候診時間與診次總長度均顯著下降，但模板過於複雜會導致執行率下降，建議先簡化再上線[[7](https://pmc.ncbi.nlm.nih.gov/articles/PMC5977636/)]。Wave scheduling 也是提升彈性與容量的可行策略[[8](https://edhub.ama-assn.org/steps-forward/module/2810481)]。

## 六、API 設計（REST）

```
POST   /api/auth/login
GET    /api/schedules?dept=&period=            列出班表版本
POST   /api/schedules                          建立草稿
POST   /api/schedules/{id}/generate            執行自動排班
GET    /api/schedules/{id}/violations          規則檢查結果
PATCH  /api/sessions/{id}                      單一診次調整
POST   /api/schedules/{id}/publish             發布（不可逆，產生新版本）
GET    /api/schedules/{id}/export?format=csv

GET    /api/preferences?period=
PUT    /api/preferences/bulk

POST   /api/leaves            GET /api/leaves?status=
POST   /api/leaves/{id}/approve

POST   /api/swaps             POST /api/swaps/{id}/approve
GET    /api/stats/fairness?period=
GET    /api/audit-logs?entity=&from=&to=
```

回應統一格式，錯誤帶 `code` 與 `message`，衝突類錯誤回 409 並附衝突明細陣列。所有寫入端點需 CSRF 防護與冪等鍵（避免重複產生班表）。

## 七、畫面規格

- **登入頁**：帳密 + 選配 2FA
- **儀表板**：本月班表狀態、待審請假／調班數、公平性摘要
- **排班工作台**（核心）：左側人員清單（顯示已排班數／點數），中間月曆網格（列＝日期，欄＝時段或診間），右側規則違規面板。拖拉指派，Undo／Redo 必備
- **我的班表**：月曆 + 清單，可訂閱 iCal
- **請假申請／審核**
- **調班媒合**
- **統計報表**
- **設定區**

前端月曆可直接用 FullCalendar，樞紐分析用 PivotTable.js，這組合在同類系統中已被驗證可行[[3](https://github.com/DavidLin729/NurseScheduler2/blob/main/%E6%96%B0%E6%89%8B%E4%BD%BF%E7%94%A8%E8%80%85%E6%89%8B%E5%86%8A.md)]。

## 八、非功能需求

**安全與個資**
全站 HTTPS（HSTS）、資料庫敏感欄位加密、密碼 Argon2id、登入失敗鎖定、完整操作稽核。班表含人員姓名與工時，屬個人資料，須符合個資法；若延伸到病患預約，會涉及姓名、電話、症狀描述等個人健康資訊，加密傳輸與儲存是法律要求[[1](https://www.ozchamp.com/insights/medical-website-design)]。

要特別提醒：**任何對外開放的預約或查詢端點都必須有存取控制**。若你打算做「不需登入即可查詢班表」的公開頁，請只輸出醫師姓名與時段，不要帶出員編、聯絡方式或請假原因。

**無障礙**
字體 ≥ 16px、對比度符合 WCAG AA（4.5:1）、按鈕點擊區 ≥ 44px、完整鍵盤操作、表格用 `<th scope>` 與 `caption`、拖拉功能必須提供鍵盤／表單替代路徑。醫療網站使用者年齡層跨度大，這些原則更為關鍵[[1](https://www.ozchamp.com/insights/medical-website-design)]。完整的無障礙符合性仍需人工搭配輔助科技實測與專家審查才能確認。

**效能**
50 人 × 31 天 × 3 時段的自動排班在 10 秒內回應（超時改非同步 job + 進度條）。班表頁首次載入 < 2 秒。

**其他**
響應式（手機查班、桌機排班）、繁體中文為主並保留 i18n 結構、每日資料庫備份、班表版本可回溯。

## 九、技術選型建議

| 層 | 建議 |
|---|---|
| 前端 | React + TypeScript + Vite、TanStack Query、FullCalendar、Tailwind |
| 後端 | Node.js (NestJS) 或 Python (FastAPI) |
| 排班求解 | Python + OR-Tools CP-SAT，獨立成 solver service |
| 資料庫 | PostgreSQL（含 `EXCLUDE` 約束擋時段重疊） |
| 佇列 | Redis + BullMQ／Celery（長時間排班任務） |
| 部署 | Docker Compose 起步，之後上雲 |

若團隊只熟 JS，solver 可先用 JS 實作啟發式演算法，日後再抽換；把求解介面定義成「輸入 JSON 約束、輸出 JSON 指派」就能無痛替換。

## 十、里程碑

1. **M1（2 週）** 基礎設定 + 手動排班 + 月曆檢視 + 匯出。這階段就能取代 Excel。
2. **M2（2 週）** 請假管理 + 規則檢查 + 稽核 + 權限。
3. **M3（3 週）** 自動排班引擎 + 公平性報表。
4. **M4（2 週）** 調班媒合 + 通知推播。
5. **M5（視情況）** HIS 整合、病患線上預約與自動提醒[[9](https://www.supersaas.com/info/medical-professionals-appointment-scheduling)]。

先做 M1 就有可交付價值，別一開始就攻自動排班，因為規則往往要跑過一輪真實班表才會浮現。

---

要我接著動手嗎？我可以直接建出 M1 的可執行雛型（PostgreSQL schema + FastAPI／NestJS 骨架 + React 排班工作台），或者先把排班規則引擎的約束清單跟你逐條對齊。你們科的班別結構、人數、以及是否有夜診與跟診人員一起排，這三點會決定資料模型的細節。





# 繼續



接著把前一份規格裡最容易踩雷、也最難補的三塊補完：法規護欄、求解器實作、異常與上線流程。這三塊決定系統能不能真的取代 Excel，而不是變成另一個要人工對帳的地方。

## 十一、法規合規護欄（必須內建，不能靠人工檢查）

排班系統最大的價值不是排得快，而是把法規變成系統護欄，這比靠人逐一檢查可靠得多[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)]。以下規則建議全部做成可設定的硬約束，並在違反時直接鎖定送出。

| 代碼 | 規則 | 型別 | 說明 |
|---|---|---|---|
| C-01 | 輪班換班間隔連續 11 小時（經程序例外可 8 小時） | 硬 | 最常漏的情境是前一日夜診接隔日早診[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| C-02 | 以「勞工」為計算單位合計工時 | 硬 | 跨科、跨院區支援的時數必須合計，不可各單位各算[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| C-03 | 單日超過正常工時即計加班 | 硬 | 變形工時不得以週期平均抵免單日加班費[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| C-04 | 休息日／國定假日加成獨立計算 | 硬 | 不可套用平日標準，加成倍率須另設[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| C-05 | 每週、每月工時上限 | 硬 | 含正常工時、加班、休息日與假日工作[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| C-06 | 不可連續排班組合（夜接夜、夜接早） | 硬 | 以規則表列黑名單組合[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| C-07 | 跨單位調動須留同意紀錄 | 硬 | 電子簽核，對應調動五原則的舉證責任[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| C-08 | 完整排班表與變更紀錄留存 | 稽核 | 供內稽與勞動檢查查核[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |

輪班間隔的判定式（$e_{i,d}$ 為第 i 人第 d 天最後下班時刻，$b_{i,d+1}$ 為隔日最早上班時刻）：

$b_{i,d+1} - e_{i,d} \geq H_{\min}, \quad H_{\min} \in \{11\text{h}, 8\text{h}_{\text{例外}}\}$

**必備報表**：定期輸出「每週 × 每單位 × 每位人員」的工時報表，作為內部稽核與面對勞動檢查的準備文件[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)]。這張報表建議做成一鍵匯出，而不是等被要求才臨時撈資料。

另外提醒一句：合規參數（倍率、上限、例外門檻）務必做成設定值而非寫死在程式裡，法規與勞動部見解會變動，個案認定也建議另尋專業意見[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)]。

## 十二、排班求解器實作（CP-SAT）

護理排班是 CP-SAT 的經典題型：每天分成數個班別、每班指派一人、同一人一天不重複、期間內每人至少排到最低班數[[11](https://developers.google.com/optimization/scheduling/employee_scheduling?hl=zh-cn)]。門診排班只是把「班」換成「診次（日期 × 時段 × 診間 × 號別）」。

**決策變數**

$x_{i,j} \in \{0,1\}, \quad i \in \text{人員}, \; j \in \text{診次}$

**核心模型骨架**

```python
from ortools.sat.python import cp_model

m = cp_model.CpModel()
x = {(i, j): m.NewBoolVar(f"x_{i}_{j}")
     for i in staff for j in sessions}

# H1 每個診次恰好一位主治
for j in sessions:
    m.AddExactlyOne(x[i, j] for i in staff)

# H2 同一人同一天同時段只能一個診次
for i in staff:
    for (d, sh) in day_shift_pairs:
        m.AddAtMostOne(x[i, j] for j in sessions_of(d, sh))

# H3 請假 / 不可排 → 直接固定為 0
for (i, j) in unavailable_pairs:
    m.Add(x[i, j] == 0)

# H4 資格：不具該號別專長者不得指派
for (i, j) in unqualified_pairs:
    m.Add(x[i, j] == 0)

# H5 輪班間隔：違規的相鄰組合不可同時成立
for i in staff:
    for (j1, j2) in rest_violating_pairs:
        m.Add(x[i, j1] + x[i, j2] <= 1)

# H6 每人班數上下限
for i in staff:
    total = sum(x[i, j] for j in sessions)
    m.Add(total >= min_sessions[i])
    m.Add(total <= max_sessions[i])
```

**公平性目標**：用 min-max 收斂點數差距，比平方和更好求解也更好解釋。

```python
pts = {}
for i in staff:
    pts[i] = sum(weight[j] * x[i, j] for j in sessions)

hi = m.NewIntVar(0, MAX_PT, "hi")
lo = m.NewIntVar(0, MAX_PT, "lo")
for i in staff:
    m.Add(pts[i] <= hi)
    m.Add(pts[i] >= lo)

unmet = sum((1 - x[i, j]) for (i, j) in preferred_pairs)
m.Minimize(W1 * (hi - lo) + W2 * unmet + W3 * room_moves)
```

**求解與逾時策略**

```python
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 20.0
solver.parameters.num_search_workers = 8
status = solver.Solve(m)
```

`INFEASIBLE` 時不要只回「無解」。做法是把硬約束逐類改成帶懲罰的軟約束重跑一次（鬆弛診斷），回報「哪一天、哪個時段、缺哪種資格的人」，這樣管理者才知道要補人還是調預排。

**工作量分佈原則**：可把需求曲線設成白天多、夜間少、工作日多、假日少，讓各班工作量均衡，這是護理數位排班的建模基礎，門診同樣適用[[12](https://proxy3.xy3yy.com/news/zhxw/12429.html)]。若有掛號量歷史資料，把它轉成各時段人力需求曲線會比人工猜測準確得多[[13](https://aitools.aiting.com/tw/ai/rotageek)]。

## 十三、排班設定項目補充

實務上以下開關會被反覆要求，先做成設定比事後改架構省事[[14](https://alidocs.dingtalk.com/i/p/Y7kmbokZp3pgGLq2/docs/Y7kmb5eK72gVqXLq)]：

- 一天多次排班（早診 + 夜診同日）
- 臨時排班（已發布班表的插班）
- 入職前 / 離職後日期不允許排班
- 排班合規性檢查開關與嚴格度（警示 / 鎖定）
- 打卡與班表的綁定關係（若要串出勤）

## 十四、三層聯動與異常兜底

自動化最常失敗在「異常層」沒設計。把排班與診次派發的聯動拆成三層來配置[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)]：

**規則層**
不要做「人員—診次」一對一綁定，改成「人員 + 資格 + 時段」的三元組規則，再用優先序（號別等級、時效）二次過濾[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)]。

**資料層**
每日凌晨產生一份「可用資源快照」，內含班表、證照有效期、請假／出勤狀態、當前負荷四類資料，派發引擎以快照為基準運算[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)]。缺任何一類，聯動就會「看起來能通但實際沒法用」[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)]。同時用看板監控負載差異度，避免一人塞滿、另一人閒置[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)]。

**異常層**
臨時請假、緊急插診、設備停機時，系統不能卡住。必須有兜底路徑：匹配不到資源就自動退回調度池並通知管理者，或依替補規則（同資格組下一順位）觸發二次分配，並用異常表單記錄補派原因與耗時供後續優化[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)]。

| 聯動方式 | 複雜度 | 實時性 | 適用 |
|---|---|---|---|
| Excel 手動對應 | 低 | 無 | 極小團隊 |
| API 定時同步 + 規則引擎 | 中 | 準實時 | 一般醫院／診所群 |
| 單一平台內拖拉配置 | 中低 | 準實時至實時 | 需頻繁調整者 |

## 十五、導入流程（10 步）

參考成熟排班產品的落地順序，可直接當專案 WBS[[13](https://aitools.aiting.com/tw/ai/rotageek)]：

1. 建組織結構：科別、職位、班型、營運時段、最小／最大人力
2. 匯入人員資料：基本資料、資格證照、合約型態、可用時段
3. 設定規則與合規條件：工時、休息間隔、夜診限制、輪休、加班
4. 建需求模型：歷史掛號量／預約量轉為時段人力需求曲線
5. 收集偏好與申請：休假、偏好班型、不可排時段
6. 產生建議班表：引擎標註衝突與風險點
7. 審核微調：鎖定關鍵班別、替換人選、加備援、檢視合規
8. 發布與通知：一鍵發布，支援換班申請與主管審批
9. 即時調整：臨時缺勤用情境模擬快速重排
10. 分析優化：追蹤計畫 vs 實際、加班與成本，回頭修規則

## 十六、資料層關鍵約束

先在資料庫擋掉衝突，不要只靠應用層。資料建模的目的就是讓資訊在整個組織中被一致且有信心地使用[[16](https://www.sap.com/taiwan/resources/what-is-data-modeling)]，而治理則負責定義誰能改、怎麼改[[16](https://www.sap.com/taiwan/resources/what-is-data-modeling)]。

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE clinic_session
  ADD COLUMN tsr tstzrange
  GENERATED ALWAYS AS (
    tstzrange(date + start_time, date + end_time, '[)')
  ) STORED;

-- 同一診間時段不得重疊
ALTER TABLE clinic_session
  ADD CONSTRAINT no_room_overlap
  EXCLUDE USING gist (room_id WITH =, tsr WITH &&)
  WHERE (status <> 'cancelled');

-- 同一人時段不得重疊（跨科也擋，對應 C-02）
ALTER TABLE clinic_session
  ADD CONSTRAINT no_staff_overlap
  EXCLUDE USING gist (staff_id WITH =, tsr WITH &&)
  WHERE (status <> 'cancelled');
```

`schedule` 發布採 append-only 版本：發布時複製一份 immutable snapshot，之後的修改一律產生新版本並保留差異，這樣才滿足變更紀錄留存的稽核要求[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)][[13](https://aitools.aiting.com/tw/ai/rotageek)]。

## 十七、測試案例（驗收用）

| ID | 情境 | 期望結果 |
|---|---|---|
| T-01 | A 醫師 5/10 夜診，5/11 早診 | 阻擋並提示間隔不足 11 小時[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| T-02 | 同一人同時段跨兩科被排入 | 資料庫層擋下，工時合計正確[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| T-03 | 變形工時週期內平均未超，但單日 10 小時 | 仍標記單日加班[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| T-04 | 國定假日排班 | 套用假日倍率，非平日標準[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| T-05 | 請假期間 | 引擎絕不指派 |
| T-06 | 不具該號別資格者 | 不出現在候選 |
| T-07 | 50 人 × 31 天 × 3 時段 | 20 秒內回傳可行解或鬆弛診斷[[11](https://developers.google.com/optimization/scheduling/employee_scheduling?hl=zh-cn)] |
| T-08 | 人力不足致無解 | 回報缺口明細，非單純 INFEASIBLE |
| T-09 | 已發布班表臨時停診 | 保留原紀錄，新增代診紀錄[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)] |
| T-10 | 匹配不到替補 | 退回調度池並通知管理者[[15](https://qingflow.com/categories-content/article/result/article2026_33054.html)] |
| T-11 | 匯出每週每人工時報表 | 欄位齊備、可供勞檢[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |
| T-12 | 跨單位支援 | 要求電子簽核同意紀錄[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)] |

## 十八、預期效益與風險

效益面，同類系統上線後的實際成效包含人力資源運用合理化、按職上岗與按量統計，並提升工作效率與滿意度；湘雅三醫院的護理數位排班上線後全院 60 多個科室完成 390 次排班、涉及 903 人[[12](https://proxy3.xy3yy.com/news/zhxw/12429.html)]。

風險面則要誠實列給決策者[[13](https://aitools.aiting.com/tw/ai/rotageek)]：

- 初期資料蒐集與清理、規則設定的成本不可忽視
- 演算法結果仍需管理者審閱微調才貼合現場
- 與既有 HIS／HR 整合需 IT 參與與變更管理
- 需求預測與可用性資料品質差，班表品質就會差
- 高度不可預測的場域仍需保留即時指揮與備援機制

實務上最常見的三個失敗模式，也值得直接寫進專案風險清單：各單位各自管班不合計工時、把變形工時當成免加班費工具、跨單位調動沒走程序沒留紀錄[[10](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/)]。

---

規格到這裡已經可以發包或直接開發。接下來我可以做其中一項，你挑一個：

- 建 M1 可執行雛型：PostgreSQL schema（含上面的 EXCLUDE 約束）+ FastAPI 骨架 + React 排班工作台
- 先寫 solver service：把第十二節的 CP-SAT 模型做成可跑的 `POST /solve`，附一組假資料與測試
- 把 T-01 到 T-12 寫成實際的測試檔，當作後續開發的規格護欄

若要我直接動手，只需再確認三件事：班別結構（是否有夜診）、參與排班人數、跟診人員是否與醫師一起排。




## 参考资料

1. [醫療產業網站設計：診所、醫院官網的5 大必備功能 - 元伸科技](https://www.ozchamp.com/insights/medical-website-design) 
2. [縮短門診跟診人員排班作業時間之專案](https://www.airitilibrary.com/Article/Detail/1819026x-201308-201309230009-201309230009-45-58) 
3. [護理人員排班系統- 新手使用者手冊](https://github.com/DavidLin729/NurseScheduler2/blob/main/%E6%96%B0%E6%89%8B%E4%BD%BF%E7%94%A8%E8%80%85%E6%89%8B%E5%86%8A.md) 
4. [医院• 医生排班系统概述](https://www.lonbon.com/yspbxt_gs/) 
5. [Web 版排班表小工具](https://tsai.it/archives/2015/07/web-%E7%89%88%E6%8E%92%E7%8F%AD%E8%A1%A8%E5%B0%8F%E5%B7%A5%E5%85%B7/) 
6. [醫師排班系統 - 孚鴻創意資訊](https://ffffff.com.tw/solutions/doctor-scheduling/) 
7. [Evaluating and Improving an Outpatient Clinic Scheduling ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC5977636/) 
8. [Wave Scheduling: Optimize Clinic Flexibility and Efficiency](https://edhub.ama-assn.org/steps-forward/module/2810481) 
9. [Medical appointment scheduling software](https://www.supersaas.com/info/medical-professionals-appointment-scheduling) 
10. [多店面排班系統｜完整指南2026](https://king-fong-chufu.com.tw/multi-store-scheduling-system-2026/) 
11. [员工日程安排| OR-Tools](https://developers.google.com/optimization/scheduling/employee_scheduling?hl=zh-cn) 
12. [“护理数字排班+临床大首页”全面建成使用](https://proxy3.xy3yy.com/news/zhxw/12429.html) 
13. [Rotageek AI 智慧排班：自動產生公平班表，合規降本](https://aitools.aiting.com/tw/ai/rotageek) 
14. [排班规则](https://alidocs.dingtalk.com/i/p/Y7kmbokZp3pgGLq2/docs/Y7kmb5eK72gVqXLq) 
15. [派工系统排班模块怎么和工单派发自动联动配置](https://qingflow.com/categories-content/article/result/article2026_33054.html) 
16. [什麼是資料建模？定義、類型、層級和範例](https://www.sap.com/taiwan/resources/what-is-data-modeling) 
