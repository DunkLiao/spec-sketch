---
created: 2026-07-19
tags:
  - spec
  - vibecoding
  - project
  - fullstack
  - fastapi
  - python
  - nodejs
  - express
  - sqlite
  - todo
  - neon
  - note
---

好的，Michael 編譯器已收到您的專案需求。

- **專案類型**: 🌐 全端 (Fullstack)
- **技術棧 (自動對應)**:
  - **前端**: Node.js + Express + HTML/CSS/JS
  - **後端**: Python FastAPI
  - **資料庫**: SQLite
- **專案名稱**: 炫光霓虹待辦清單 (Cyber-Neon Todo List)
- **核心功能**: 建立、讀取、刪除待辦事項 (CRUD)

正在根據您的需求進行編譯...

編譯完成。以下是為您的「炫光霓虹待辦清單」專案量身打造的 P0~P6 Cursor Prompt Pack。請依序貼入 Cursor 執行。

---

## P0：【專案初始化與守門規則】

### 【目標】
在當前目錄初始化「炫光霓虹待辦清單」全端專案，建立符合規範的基礎環境與資料夾結構。

### 【實作要求】

**環境錨定（必做）：**

Mac/Linux:
```bash
echo "========== 環境錨定 =========="
echo "📍 當前目錄: $(pwd)"
ls -la
echo "================================"
```

Windows (CMD):
```bat
echo ========== 環境錨定 ==========
echo 📍 當前目錄: %CD%
dir
echo ================================
```

**專案初始化指令：**

Mac/Linux:
```bash
# 建立目錄結構
mkdir -p frontend/public/{css,js/components,pages}
mkdir -p backend/app/{models,schemas,routers,services}
mkdir -p backend/data

# 初始化前端
cd frontend
npm init -y
npm install express cors
cd ..

# 初始化後端
cd backend
uv init
uv add fastapi uvicorn sqlalchemy aiosqlite python-multipart
cd ..
```

Windows (CMD):
```bat
:: 建立目錄結構
mkdir frontend\public\css
mkdir frontend\public\js\components
mkdir frontend\public\pages
mkdir backend\app\models
mkdir backend\app\schemas
mkdir backend\app\routers
mkdir backend\app\services
mkdir backend\data

:: 初始化前端
cd frontend
call npm init -y
call npm install express cors
cd ..

:: 初始化後端
cd backend
call uv init
call uv add fastapi uvicorn sqlalchemy aiosqlite python-multipart
cd ..
```

### 【不可做】
- 不可使用 `pip install` 或 `python -m venv`。
- 不可建立 `src/` 或其他不符合規範的巢狀資料夾。

### 【驗收方式】
- 執行後，`frontend` 和 `backend` 資料夾結構正確建立。
- `frontend/package.json` 和 `backend/pyproject.toml` 檔案存在。

### 【完成後回報】
回報「P0 完成」並列出建立的完整檔案目錄結構。

---

## P1：【資料模型/型別定義】

### 【目標】
定義專案核心的「待辦事項 (Todo)」資料模型，包含資料庫連線、SQLAlchemy 模型與 Pydantic 驗證 Schema。

### 【範圍/允許修改】
- `backend/app/`

### 【輸出檔案】

**1. 資料庫連線設定** (`backend/app/database.py`)
```python
# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 確保 data 目錄存在 (相對於 backend 目錄)
os.makedirs("data", exist_ok=True)

SQLALCHEMY_DATABASE_URL = "sqlite:///./data/app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**2. SQLAlchemy 模型** (`backend/app/models/todo.py`)
```python
# backend/app/models/todo.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Todo(Base):
    __tablename__ = "todos"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String(100), nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**3. Pydantic 驗證 Schema** (`backend/app/schemas/todo.py`)
```python
# backend/app/schemas/todo.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class TodoBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=100, description="待辦事項內容")
    is_completed: bool = False

class TodoCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=100)

class TodoUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=100)
    is_completed: Optional[bool] = None

class TodoResponse(TodoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
```

**4. 模型匯出索引** (`backend/app/models/__init__.py`)
```python
# backend/app/models/__init__.py
# 讓 main.py 可以一次性匯入所有 Model 來建立資料表
from app.models.todo import Todo
```

### 【實作要求】
- `Todo` 模型需包含 `id`, `content`, `is_completed`, `created_at`, `updated_at` 欄位。
- `content` 欄位長度限制為 100。
- Schema 需拆分為 `Create`, `Update`, `Response` 三種用途。

### 【不可做】
- 不要在 `database.py` 中硬編碼絕對路徑。

### 【驗收方式】
- 確保所有 Python 檔案語法正確，import 不會報錯。

### 【完成後回報】
回報「P1 完成」並列出建立的 4 個 Python 檔案路徑。

---

## P2：【資料夾骨架與基礎檔案】

### 【目標】
建立專案的前後端伺服器入口、HTML 模板、API 封裝以及一鍵啟動腳本，完成專案骨架。

### 【範圍/允許修改】
- 專案根目錄
- `frontend/`
- `backend/app/`

### 【輸出檔案】

**1. 後端 FastAPI 入口** (`backend/app/main.py`)
```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.routers import todo # 預先引入，P3 會建立它

# 匯入所有 models 以便 create_all 能偵測到
from app.models import *

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時建立資料表
    async with engine.connect() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ 資料庫資料表已建立")
    yield
    # 關閉時清理（如需要）

app = FastAPI(
    title="炫光霓虹待辦清單 API",
    description="一個充滿未來科技感的待辦事項應用程式 API。",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 引入路由
app.include_router(todo.router, prefix="/api/todos", tags=["Todos"])

@app.get("/")
def root():
    return {"message": "API 運行中", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

**2. 前端 Express 伺服器** (`frontend/server.js`)
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 前端伺服器運行於 http://localhost:${PORT}`);
});
```

**3. 前端 API 封裝** (`frontend/public/js/api.js`)
```javascript
const API_BASE = 'http://localhost:8000';

const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.detail || 'An unknown error occurred.');
            }
            if (response.status === 204) return null; // Handle No Content response
            return response.json();
        } catch (error) {
            console.error(`API Error on ${options.method || 'GET'} ${url}:`, error);
            throw error;
        }
    },
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    },
    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
};
```

**4. 啟動腳本 (Mac/Linux)** (`start_all.sh`)
```bash
#!/bin/bash
chmod +x start_all.sh # 確保腳本有執行權限

echo "=========================================="
echo "🚀 啟動全端開發環境"
echo "=========================================="

# 啟動後端
echo "📦 啟動後端 (FastAPI on port 8000)..."
(cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!

sleep 3

# 啟動前端
echo "🎨 啟動前端 (Express on port 3000)..."
(cd frontend && node server.js) &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "✅ 服務已啟動！"
echo ""
echo "🎨 前端: http://localhost:3000"
echo "⚙️  後端: http://localhost:8000"
echo "📚 API 文件: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服務"
echo "=========================================="

# 清理函式
cleanup() {
    echo "🛑 正在停止所有服務..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM
wait
```

**5. 啟動腳本 (Windows)** (`start_all.bat`)
```bat
@echo off
chcp 65001 >nul
echo ==========================================
echo 🚀 啟動全端開發環境
echo ==========================================

SET PYTHONIOENCODING=utf-8

echo 📦 啟動後端 (FastAPI on port 8000)...
start "Backend-FastAPI" cmd /k "cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo 🎨 啟動前端 (Express on port 3000)...
start "Frontend-Express" cmd /k "cd frontend && node server.js"

echo.
echo ==========================================
echo ✅ 服務已啟動！
echo.
echo 🎨 前端: http://localhost:3000
echo ⚙️  後端: http://localhost:8000
echo 📚 API 文件: http://localhost:8000/docs
echo.
echo 關閉自動開啟的 CMD 視窗即可停止對應服務。
echo ==========================================
```

### 【實作要求】
- `main.py` 需設定好 CORS，允許 `localhost:3000` 存取。
- `main.py` 需使用 lifespan 事件在啟動時自動建立資料庫資料表。
- 啟動腳本需同時啟動前後端服務。

### 【不可做】
- 在 `api.js` 中硬編碼完整的 URL，應使用 `API_BASE` 變數。

### 【驗收方式】
- `tree` 或 `dir /s` 確認檔案結構完整。
- 執行 `start_all.sh` 或 `start_all.bat` 後，能夠成功訪問 `http://localhost:3000` 和 `http://localhost:8000/docs`。

### 【完成後回報】
回報「P2 完成」並確認啟動腳本已建立。

---

## P3：【逐模組實作 - Todo 模組】

### 【目標】
實作「待辦事項 (Todo)」模組的後端 CRUD API 路由邏輯。

### 【範圍/允許修改】
- `backend/app/routers/`
- (確認 `backend/app/main.py` 已引入此路由)

### 【輸出檔案】

**1. Todo Router** (`backend/app/routers/todo.py`)
```python
# backend/app/routers/todo.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.todo import Todo
from app.schemas.todo import TodoCreate, TodoResponse, TodoUpdate

router = APIRouter()

@router.get("/", response_model=List[TodoResponse])
def get_all_todos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """取得所有待辦事項"""
    todos = db.query(Todo).order_by(Todo.created_at.desc()).offset(skip).limit(limit).all()
    return todos

@router.post("/", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
def create_todo(todo_data: TodoCreate, db: Session = Depends(get_db)):
    """新增待辦事項"""
    new_todo = Todo(**todo_data.model_dump())
    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)
    return new_todo

@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    """刪除指定待辦事項"""
    todo_to_delete = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="待辦事項不存在")
    
    db.delete(todo_to_delete)
    db.commit()
    return

# 如果未來需要更新功能，可以取消註解
# @router.put("/{todo_id}", response_model=TodoResponse)
# def update_todo(todo_id: int, todo_data: TodoUpdate, db: Session = Depends(get_db)):
#     """更新指定待辦事項"""
#     todo_query = db.query(Todo).filter(Todo.id == todo_id)
#     db_todo = todo_query.first()
#     if not db_todo:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="待辦事項不存在")
    
#     update_data = todo_data.model_dump(exclude_unset=True)
#     todo_query.update(update_data)
#     db.commit()
#     db.refresh(db_todo)
#     return db_todo
```

### 【實作要求】
- 實作 `GET /` (取得所有), `POST /` (新增), `DELETE /{id}` (刪除) 三個 API 端點。
- 路由檔案只負責 HTTP 請求與回應，不包含複雜的商業邏輯。
- 刪除操作返回 `204 No Content` 狀態碼。
- 所有查詢、新增、刪除操作都應透過 SQLAlchemy Session 進行。

### 【不可做】
- 在 Router 中直接執行 SQL 字串。

### 【驗收方式】
1. 重新啟動後端服務。
2. 訪問 `http://localhost:8000/docs`。
3. 測試 "Todos" 標籤下的三個 API 端點：
   - `POST`: 建立一筆新的待辦。
   - `GET`: 應能看到剛建立的待辦。
   - `DELETE`: 刪除該筆待辦，再次 `GET` 應為空。

### 【完成後回報】
回報「P3 完成」並確認 API 在 Swagger UI (/docs) 中測試通過。

---

## P4：【逐場景串接 - 炫光待辦 UI】

### 【目標】
根據場景需求，一次性建立完整的前端 HTML 結構、CSS 樣式和 JavaScript 互動邏輯，串接 P3 完成的後端 API。

### 【範圍/允許修改】
- `frontend/public/`

### 【輸入】
- **場景需求**: 實現待辦清單的顯示、新增、刪除功能，並應用指定的「炫光霓虹」視覺風格與動效。
- **使用 API**:
  - `GET /api/todos`
  - `POST /api/todos`
  - `DELETE /api/todos/{id}`

### 【輸出檔案】

**1. 主要 HTML 頁面** (`frontend/public/index.html`)
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>炫光霓虹待辦清單</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div id="app-background"></div>
    <div id="app">
        <header>
            <h1 class="neon-text">我的待辦</h1>
            <button id="add-todo-btn" class="neon-border-btn">＋ 新增待辦</button>
        </header>

        <main id="main-content">
            <div id="loader" class="loader-container">
                <div class="scan-line"></div>
                <p>正在同步數據...</p>
            </div>
            <div id="todo-list-container"></div>
            <div id="empty-state" class="empty-state hidden">
                <div class="empty-illustration"></div>
                <p>目前沒有待辦事項</p>
                <button id="add-first-todo-btn" class="cta-btn">✨ 新增第一筆待辦</button>
            </div>
            <div id="error-state" class="error-state hidden">
                <p>數據同步失敗</p>
                <button id="retry-btn">重試</button>
            </div>
        </main>
    </div>

    <!-- 新增待辦 Modal -->
    <div id="add-modal" class="modal-overlay hidden">
        <div class="modal-content glassmorphism">
            <h2 class="neon-text">新增待辦</h2>
            <form id="add-todo-form">
                <div class="input-wrapper">
                    <input type="text" id="todo-input" placeholder="輸入待辦內容..." maxlength="100" autocomplete="off">
                    <p id="form-error" class="form-error hidden"></p>
                </div>
                <div class="button-group">
                    <button type="button" id="cancel-add-btn" class="btn-secondary">取消</button>
                    <button type="submit" id="submit-add-btn" class="btn-primary">新增</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 刪除確認 Modal -->
    <div id="delete-modal" class="modal-overlay hidden">
        <div class="modal-content glassmorphism-alert">
            <div class="alert-header"></div>
            <h3>確定刪除嗎？</h3>
            <p id="delete-confirm-text"></p>
            <div class="button-group">
                <button type="button" id="cancel-delete-btn" class="btn-secondary">取消</button>
                <button type="button" id="confirm-delete-btn" class="btn-danger">確定刪除</button>
            </div>
        </div>
    </div>

    <!-- Toast 通知 -->
    <div id="toast-container"></div>

    <script src="/js/api.js"></script>
    <script src="/js/main.js"></script>
</body>
</html>
```

**2. 主要 CSS 樣式** (`frontend/public/css/style.css`)
```css
/* 全局與主題變數 */
:root {
    --bg-start: #0d0d12;
    --bg-end: #1a1a2e;
    --text-color: #e0e0e0;
    --primary-glow: #00ffff;
    --secondary-glow: #9f00ff;
    --error-glow: #ff3333;
    --glass-bg: rgba(255, 255, 255, 0.05);
}

/* 基本樣式 */
body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: var(--bg-end);
    color: var(--text-color);
    margin: 0;
    overflow-x: hidden;
}

#app-background {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: linear-gradient(135deg, var(--bg-start), var(--bg-end));
    z-index: -1;
    /* 可選：六角網格背景 */
    background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 30px 30px;
}

#app { max-width: 800px; margin: 40px auto; padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }

/* 霓虹與光暈效果 */
.neon-text {
    background-image: linear-gradient(90deg, var(--primary-glow), var(--secondary-glow));
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    text-shadow: 0 0 5px var(--primary-glow), 0 0 10px var(--secondary-glow);
}
.neon-border-btn {
    border: 2px solid var(--primary-glow);
    background: transparent;
    color: var(--primary-glow);
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-shadow: 0 0 3px var(--primary-glow);
    box-shadow: 0 0 5px var(--primary-glow), inset 0 0 5px var(--primary-glow);
}
.neon-border-btn:hover {
    box-shadow: 0 0 15px var(--primary-glow), inset 0 0 10px var(--primary-glow);
    transform: scale(1.05);
}

/* 載入與狀態 */
.loader-container { text-align: center; }
.scan-line { width: 100%; height: 2px; background: var(--primary-glow); box-shadow: 0 0 10px var(--primary-glow); animation: scan 2s infinite linear; }
@keyframes scan { 0% { transform: translateY(-20px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(20px); opacity: 0; } }

.hidden { display: none !important; }

/* 待辦列表與卡片 */
.todo-item {
    display: flex;
    align-items: center;
    padding: 20px;
    margin-bottom: 15px;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.3s;
    animation: fadeIn 0.5s ease-out forwards;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.todo-item.exiting { animation: fadeOut 0.3s ease-in forwards; }
@keyframes fadeOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-50px); } }

.status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary-glow); box-shadow: 0 0 8px var(--primary-glow); margin-right: 15px; }
.todo-content { flex-grow: 1; word-break: break-all; }
.delete-btn { background: none; border: none; cursor: pointer; color: #888; font-size: 20px; transition: all 0.3s; }
.delete-btn:hover { color: var(--error-glow); text-shadow: 0 0 5px var(--error-glow); transform: scale(1.2); }

/* 空狀態 */
.empty-state { text-align: center; padding: 40px; }
.empty-illustration { width: 150px; height: 150px; margin: 0 auto 20px; /* 待 JS/AI 產生 SVG 或圖片 */ background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M20 30h60v50H20z' fill='none' stroke='%23333' stroke-width='2'/%3E%3Cpath d='M30 40h40' stroke='%23333' stroke-width='2'/%3E%3C/svg%3E") center/contain no-repeat; border: 2px dashed #444; border-radius: 8px; }
.cta-btn { /* 沿用 neon-border-btn 樣式 */ }

/* Modal 樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { width: 90%; max-width: 500px; padding: 30px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.2); animation: modal-pop 0.3s ease-out; }
.glassmorphism { background: var(--glass-bg); backdrop-filter: blur(15px); }
.glassmorphism-alert { background: rgba(255, 50, 50, 0.1); backdrop-filter: blur(15px); }
.alert-header { height: 4px; background: var(--error-glow); border-radius: 2px; margin: -30px -30px 20px; box-shadow: 0 0 10px var(--error-glow); }
@keyframes modal-pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* 表單 */
#add-todo-form input { width: 100%; background: rgba(0,0,0,0.3); border: 2px solid #444; color: var(--text-color); padding: 12px; border-radius: 5px; transition: border-color 0.3s, box-shadow 0.3s; }
#add-todo-form input:focus { outline: none; border-color: var(--primary-glow); box-shadow: 0 0 10px var(--primary-glow); }
#add-todo-form input.invalid { border-color: var(--error-glow) !important; animation: shake 0.3s; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
.form-error { color: var(--error-glow); font-size: 14px; margin-top: 5px; }

/* 按鈕組 */
.button-group { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-primary { background: linear-gradient(90deg, var(--primary-glow), var(--secondary-glow)); color: white; border: none; }
.btn-secondary { background: transparent; border: 1px solid #555; color: #aaa; }
.btn-danger { background: var(--error-glow); color: white; border: none; box-shadow: 0 0 10px var(--error-glow); }
.button-group button { padding: 10px 20px; border-radius: 5px; cursor: pointer; transition: transform 0.2s; }
.button-group button:hover { transform: translateY(-2px); }

/* Toast 通知 */
#toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 200; }
.toast { padding: 15px; border-radius: 5px; margin-top: 10px; color: white; opacity: 0; transform: translateY(20px); animation: toast-in 0.3s forwards; }
.toast.success { background: #28a745; }
.toast.error { background: #dc3545; }
@keyframes toast-in { to { opacity: 1; transform: translateY(0); } }
```

**3. 主要 JavaScript 邏輯** (`frontend/public/js/main.js`)
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const elements = {
        loader: document.getElementById('loader'),
        listContainer: document.getElementById('todo-list-container'),
        emptyState: document.getElementById('empty-state'),
        errorState: document.getElementById('error-state'),
        retryBtn: document.getElementById('retry-btn'),
        addTodoBtn: document.getElementById('add-todo-btn'),
        addFirstTodoBtn: document.getElementById('add-first-todo-btn'),
        // Add Modal
        addModal: document.getElementById('add-modal'),
        addTodoForm: document.getElementById('add-todo-form'),
        todoInput: document.getElementById('todo-input'),
        formError: document.getElementById('form-error'),
        cancelAddBtn: document.getElementById('cancel-add-btn'),
        submitAddBtn: document.getElementById('submit-add-btn'),
        // Delete Modal
        deleteModal: document.getElementById('delete-modal'),
        deleteConfirmText: document.getElementById('delete-confirm-text'),
        cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
        confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
        // Toast
        toastContainer: document.getElementById('toast-container'),
    };

    let todos = [];
    let todoIdToDelete = null;

    // ----- 渲染函式 -----
    const renderTodos = () => {
        elements.listContainer.innerHTML = '';
        if (todos.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.listContainer.classList.add('hidden');
        } else {
            elements.emptyState.classList.add('hidden');
            elements.listContainer.classList.remove('hidden');
            todos.forEach(todo => {
                const todoEl = document.createElement('div');
                todoEl.className = 'todo-item';
                todoEl.dataset.id = todo.id;
                todoEl.innerHTML = `
                    <div class="status-dot"></div>
                    <p class="todo-content">${escapeHtml(todo.content)}</p>
                    <button class="delete-btn" title="刪除">🗑️</button>
                `;
                elements.listContainer.appendChild(todoEl);
            });
        }
    };

    // ----- API 呼叫與狀態管理 -----
    const loadTodos = async () => {
        elements.loader.classList.remove('hidden');
        elements.listContainer.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
        elements.errorState.classList.add('hidden');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // 模擬載入感
            todos = await api.get('/api/todos');
            renderTodos();
        } catch (error) {
            elements.errorState.classList.remove('hidden');
            showToast('載入失敗，請檢查後端連線', 'error');
        } finally {
            elements.loader.classList.add('hidden');
        }
    };

    const handleAddTodo = async (e) => {
        e.preventDefault();
        const content = elements.todoInput.value.trim();
        
        if (content.length === 0 || content.length > 100) {
            elements.todoInput.classList.add('invalid');
            elements.formError.textContent = '內容不可為空，且長度需在 1-100 字之間';
            elements.formError.classList.remove('hidden');
            return;
        }

        elements.submitAddBtn.disabled = true;
        elements.submitAddBtn.textContent = '新增中...';
        
        try {
            const newTodo = await api.post('/api/todos', { content });
            todos.unshift(newTodo); // 加到最前面
            renderTodos();
            closeAddModal();
            showToast('新增成功！');
        } catch (error) {
            showToast(`新增失敗: ${error.message}`, 'error');
        } finally {
            elements.submitAddBtn.disabled = false;
            elements.submitAddBtn.textContent = '新增';
        }
    };

    const handleDeleteTodo = async () => {
        if (!todoIdToDelete) return;

        elements.confirmDeleteBtn.disabled = true;
        elements.confirmDeleteBtn.textContent = '刪除中...';

        try {
            await api.delete(`/api/todos/${todoIdToDelete}`);
            const todoEl = document.querySelector(`.todo-item[data-id='${todoIdToDelete}']`);
            if (todoEl) {
                todoEl.classList.add('exiting');
                todoEl.addEventListener('animationend', () => {
                    todos = todos.filter(t => t.id !== todoIdToDelete);
                    renderTodos();
                });
            }
            closeDeleteModal();
            showToast('刪除成功');
        } catch (error) {
            showToast(`刪除失敗: ${error.message}`, 'error');
        } finally {
            elements.confirmDeleteBtn.disabled = false;
            elements.confirmDeleteBtn.textContent = '確定刪除';
            todoIdToDelete = null;
        }
    };

    // ----- Modal 控制 -----
    const openAddModal = () => { elements.addModal.classList.remove('hidden'); elements.todoInput.focus(); };
    const closeAddModal = () => {
        elements.addModal.classList.add('hidden');
        elements.addTodoForm.reset();
        elements.todoInput.classList.remove('invalid');
        elements.formError.classList.add('hidden');
    };
    const openDeleteModal = (id) => {
        todoIdToDelete = id;
        const todo = todos.find(t => t.id === id);
        if(todo) {
            elements.deleteConfirmText.textContent = `待辦內容: "${truncate(todo.content, 30)}"`;
        }
        elements.deleteModal.classList.remove('hidden');
    };
    const closeDeleteModal = () => {
        elements.deleteModal.classList.add('hidden');
        todoIdToDelete = null;
    };

    // ----- 事件監聽 -----
    [elements.addTodoBtn, elements.addFirstTodoBtn].forEach(btn => btn.addEventListener('click', openAddModal));
    elements.cancelAddBtn.addEventListener('click', closeAddModal);
    elements.addTodoForm.addEventListener('submit', handleAddTodo);
    elements.retryBtn.addEventListener('click', loadTodos);

    elements.listContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const todoItem = e.target.closest('.todo-item');
            const id = parseInt(todoItem.dataset.id, 10);
            openDeleteModal(id);
        }
    });

    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', handleDeleteTodo);

    // ----- 輔助函式 -----
    const escapeHtml = (unsafe) => unsafe.replace(/[&<"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);
    const truncate = (str, len) => str.length > len ? str.substring(0, len) + '...' : str;
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };

    // ----- 初始化 -----
    loadTodos();
});
```

### 【實作要求】
- **HTML**:
  - 待辦卡片必須包含一個 `data-id` 屬性，其值為待辦的 ID。
  - 包含主列表、新增 Modal、刪除確認 Modal、載入中、空狀態、錯誤狀態的完整結構。
- **CSS**:
  - 實現深色漸層背景、玻璃擬態卡片、霓虹文字與按鈕光暈效果。
  - 為卡片的進場 (fade-in) 與退場 (fade-out + slide-out) 製作動畫。
  - 為輸入框錯誤狀態製作紅色邊框和震動動畫。
- **JavaScript**:
  - 頁面載入時自動呼叫 `GET /api/todos` 並顯示載入動畫。
  - 點擊「新增待辦」按鈕，顯示 Modal；提交表單時進行前端驗證（非空、1-100字），通過後呼叫 `POST /api/todos`，成功後更新 UI 並顯示成功 Toast。
  - 點擊刪除圖示，顯示確認 Modal；確認後呼叫 `DELETE /api/todos/{id}`，成功後從 UI 移除該卡片並顯示成功 Toast。
  - 所有使用者輸入的內容在渲染到 HTML 前必須經過 `escapeHtml` 處理以防止 XSS。

### 【驗收方式】
1. 啟動全端服務 (`start_all.sh` / `start_all.bat`)。
2. 開啟 `http://localhost:3000`，應看到載入動畫，然後顯示空狀態。
3. 新增一筆待辦，確認成功後卡片出現。
4. 刪除該筆待辦，確認跳出確認框，確認後卡片消失。
5. 重新整理頁面，確認資料持久化狀態正確。
6. 所有 UI 元素和動效符合場景描述。

### 【完成後回報】
回報「P4 完成」，並簡述三個主要場景（載入、新增、刪除）的測試結果。

---

## P5：【整體驗收與收尾】

### 【目標】
確保專案完整可運行，並產出最終的 `README.md` 專案說明文件。

### 【範圍/允許修改】
- 專案根目錄

### 【輸出檔案】

**1. 專案說明文件** (`README.md`)
```markdown
# 炫光霓虹待辦清單 (Cyber-Neon Todo List)

> 一個充滿未來科技感的待辦事項應用程式，前端使用原生 JS+CSS 打造霓虹光暈與玻璃擬態視覺效果，後端由 Python FastAPI 提供高效能 API 服務。

## 🚀 快速開始

### 環境需求
- Node.js 18+ (下載: https://nodejs.org/)
- Python 3.10+ (下載: https://www.python.org/)
- uv (Python 套件管理器, 安裝: `pip install uv` 或 `curl -LsSf https://astral.sh/uv/install.sh | sh`)

### 安裝與啟動

**1. Clone 專案**
```bash
git clone <your-repo-url>
cd <project-folder>
```

**2. 安裝後端依賴 (使用 uv)**
```bash
cd backend
uv sync
cd ..
```

**3. 安裝前端依賴 (使用 npm)**
```bash
cd frontend
npm install
cd ..
```

**4. 啟動服務**

在專案根目錄執行：

**Mac/Linux:**
```bash
chmod +x start_all.sh
./start_all.sh
```

**Windows:**
```bat
start_all.bat
```

### 存取網址
| 服務 | 網址 |
|------|------|
| 🎨 前端應用 | http://localhost:3000 |
| ⚙️ 後端 API 根目錄 | http://localhost:8000 |
| 📚 API swagger 文件 | http://localhost:8000/docs |

## 📁 專案結構
```
project-root/
├── frontend/
│   ├── server.js
│   ├── package.json
│   └── public/
│       ├── index.html
│       ├── css/style.css
│       └── js/main.js, api.js
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/todo.py
│   │   ├── schemas/todo.py
│   │   └── routers/todo.py
│   ├── data/app.db
│   └── pyproject.toml
├── README.md
├── start_all.sh
└── start_all.bat
```

## 🛠 技術棧
- **前端**: Node.js + Express (靜態伺服器), HTML5, CSS3, JavaScript (ES6+)
- **後端**: Python 3.10+, FastAPI
- **資料庫**: SQLite
- **套件管理**: npm (前端) / uv (後端)
- **核心依賴**: `express`, `cors`, `fastapi`, `uvicorn`, `sqlalchemy`, `aiosqlite`

## 📝 API 端點
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/todos` | 取得所有待辦事項 |
| POST | `/api/todos` | 新增一筆待辦事項 |
| DELETE| `/api/todos/{id}` | 刪除指定的待辦事項 |

## ❓ 常見問題
**Q: 啟動後端出現 "uv: command not found"**
A: 請確認已全域安裝 uv。執行 `pip install uv` 或參考官方文件 https://github.com/astral-sh/uv。

**Q: 前端畫面顯示 "載入失敗"**
A: 請確認後端服務已在 8000 port 正常運行，並檢查瀏覽器開發者工具的 Console 視窗是否有 CORS 或網路錯誤。
```

### 【驗收清單】
```markdown
## 驗收清單

### 環境
- [ ] 後端可透過 `uv run ...` 正常啟動，無錯誤。
- [ ] 前端可透過 `node server.js` 正常啟動，無錯誤。
- [ ] 執行 `start_all` 腳本後，前後端服務皆運行。
- [ ] API 文件 `http://localhost:8000/docs` 可正常存取。

### 功能
- [ ] (Create) 新增待辦功能正常，資料存入 `backend/data/app.db`。
- [ ] (Read) 開啟/重整頁面，能正確載入所有待辦。
- [ ] (Delete) 刪除待辦功能正常，資料庫中對應資料被移除。
- [ ] (UI) 所有動效、狀態（載入、空、錯誤）顯示正常。

### 文件
- [ ] `README.md` 內容完整，包含安裝、啟動、API 說明。
- [ ] `start_all.sh` 和 `start_all.bat` 腳本可直接運行。
```

### 【完成後回報】
回報「P5 完成」並確認 `README.md` 已建立，驗收清單中的項目均已通過。

---

## P6：【最終自我驗證與修正】

### 【目標】
執行最終的自動化驗證腳本，確保專案所有檔案、結構和規範都符合要求，並根據結果進行自動修復。

### 【範圍/允許修改】
- 整個專案

### 【輸出檔案】

**1. 驗證腳本 (Mac/Linux)** (`verify.sh`)
```bash
#!/bin/bash
echo "=========================================="
echo "🔍 P6 最終自我驗證"
echo "=========================================="

ERRORS=0
WARNINGS=0

# 1. 目錄結構檢查
echo ""
echo "📁 [1/6] 目錄結構檢查"
if [ -d "./frontend" ] && [ -d "./backend" ]; then
    echo "✅ 全端專案結構正確"
else
    echo "❌ 目錄結構不正確，應為全端結構"
    ERRORS=$((ERRORS + 1))
fi

# 2. 依賴檔案檢查
echo ""
echo "📦 [2/6] 依賴檔案檢查"
if [ -f "./frontend/package.json" ]; then
    echo "✅ frontend/package.json 存在"
else
    echo "❌ frontend/package.json 不存在"
    ERRORS=$((ERRORS + 1))
fi
if [ -f "./backend/pyproject.toml" ]; then
    echo "✅ backend/pyproject.toml 存在"
else
    echo "❌ backend/pyproject.toml 不存在"
    ERRORS=$((ERRORS + 1))
fi

# 3. pip 使用檢查
echo ""
echo "🐍 [3/6] Python 套件管理檢查"
PIP_USAGE=$(grep -r "pip install" . --exclude-dir=node_modules --exclude-dir=.venv 2>/dev/null || true)
if [ -n "$PIP_USAGE" ]; then
    echo "❌ 發現使用 pip，應改為 uv"
    echo "$PIP_USAGE"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ 未發現 pip（正確使用 uv）"
fi

# 4. 啟動腳本檢查
echo ""
echo "🚀 [4/6] 啟動腳本檢查"
if [ -f "./start_all.sh" ] && [ -f "./start_all.bat" ]; then
    echo "✅ start_all.sh 與 start_all.bat 存在"
else
    echo "❌ 缺少全端啟動腳本"
    ERRORS=$((ERRORS + 1))
fi

# 5. README 檢查
echo ""
echo "📖 [5/6] README 檢查"
if [ -f "./README.md" ]; then
    if grep -q "localhost:3000" ./README.md && grep -q "localhost:8000" ./README.md; then
        echo "✅ README 包含前後端啟動網址"
    else
        echo "⚠️ README 缺少 localhost 網址"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "❌ README.md 不存在"
    ERRORS=$((ERRORS + 1))
fi

# 6. SQLite 資料庫目錄
echo ""
echo "💾 [6/6] 資料庫目錄檢查"
if [ -d "./backend/data" ]; then
    echo "✅ backend/data 目錄存在"
else
    echo "⚠️ backend/data 目錄不存在（啟動時會自動建立）"
    WARNINGS=$((WARNINGS + 1))
fi

# 總結
echo ""
echo "=========================================="
echo "📊 驗證結果"
echo "=========================================="
echo "❌ 錯誤: $ERRORS"
echo "⚠️ 警告: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "🛑 驗證失敗！請根據下方自動修復規則進行修正。"
    exit 1
else
    echo ""
    echo "✅ 驗證通過！專案已準備就緒。"
fi
echo "=========================================="
```

**2. 驗證腳本 (Windows)** (`verify.bat`)
```bat
@echo off
chcp 65001 >nul
echo ==========================================
echo 🔍 P6 最終自我驗證
echo ==========================================

SET ERRORS=0
SET WARNINGS=0

:: 1. 目錄結構檢查
echo.
echo 📁 [1/6] 目錄結構檢查
if exist "frontend" if exist "backend" (
    echo ✅ 全端專案結構正確
) else (
    echo ❌ 目錄結構不正確，應為全端結構
    SET /A ERRORS+=1
)

:: 2. 依賴檔案檢查
echo.
echo 📦 [2/6] 依賴檔案檢查
if exist "frontend\package.json" (
    echo ✅ frontend/package.json 存在
) else (
    echo ❌ frontend/package.json 不存在
    SET /A ERRORS+=1
)
if exist "backend\pyproject.toml" (
    echo ✅ backend/pyproject.toml 存在
) else (
    echo ❌ backend/pyproject.toml 不存在
    SET /A ERRORS+=1
)

:: 3. 啟動腳本檢查
echo.
echo 🚀 [3/6] 啟動腳本檢查
if exist "start_all.bat" if exist "start_all.sh" (
    echo ✅ start_all.sh 與 start_all.bat 存在
) else (
    echo ❌ 缺少全端啟動腳本
    SET /A ERRORS+=1
)

:: 4. README 檢查
echo.
echo 📖 [4/6] README 檢查
if exist "README.md" (
    findstr /C:"localhost:3000" README.md >nul 2>&1 && findstr /C:"localhost:8000" README.md >nul 2>&1
    if %ERRORLEVEL%==0 (
        echo ✅ README 包含前後端啟動網址
    ) else (
        echo ⚠️ README 缺少 localhost 網址
        SET /A WARNINGS+=1
    )
) else (
    echo ❌ README.md 不存在
    SET /A ERRORS+=1
)

:: 5. 資料庫目錄檢查
echo.
echo 💾 [5/6] 資料庫目錄檢查
if exist "backend\data\" (
    echo ✅ backend/data 目錄存在
) else (
    echo ⚠️ backend/data 目錄不存在（啟動時會自動建立）
    SET /A WARNINGS+=1
)

:: 總結
echo.
echo ==========================================
echo 📊 驗證結果
echo ==========================================
echo ❌ 錯誤: %ERRORS%
echo ⚠️ 警告: %WARNINGS%

if %ERRORS% GTR 0 (
    echo.
    echo 🛑 驗證失敗！請根據自動修復規則進行修正。
) else (
    echo.
    echo ✅ 驗證通過！專案已準備就緒。
)
echo ==========================================
```

### 【自動修復規則】
| 問題 | 修復動作 |
|------|----------|
| 目錄結構錯誤 | 重新執行 P0 的初始化指令。 |
| 缺少 `package.json` | 進入 `frontend` 目錄執行 `npm init -y`。 |
| 缺少 `pyproject.toml` | 進入 `backend` 目錄執行 `uv init`。 |
| 使用 `pip` | 全域查找 `pip install` 並替換為對應的 `uv add` 或 `uv sync`。 |
| 缺少啟動腳本 | 重新執行 P2 建立 `start_all.sh` 和 `start_all.bat`。 |
| README 不完整 | 重新執行 P5 建立 `README.md`。 |
| `backend/data` 目錄不存在 | 執行 `mkdir backend\data` (Windows) 或 `mkdir -p backend/data` (Mac/Linux)。 |


### 【完成後回報】
「✅ 專案建置完成，已通過自我驗證，確認符合需求與技術規範」