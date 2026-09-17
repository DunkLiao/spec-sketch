@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM ============================================================
REM  SPEC 文件站 - 本機預覽啟動器
REM ------------------------------------------------------------
REM  [設定 1] python.exe 完整路徑
REM           不確定的話，先在 cmd 執行：  where python
REM ============================================================

REM  [設定 2] 網站連接埠（被占用時改成 8081 / 9000 等）
set "PORT=8080"

REM ============================================================
REM  以下不需修改
REM ============================================================
set "PYTHON_EXE="
if defined PYTHON_EXE (
    if exist "%PYTHON_EXE%" goto :RUN
    echo [!] 指定的路徑不存在：
    echo     %PYTHON_EXE%
    echo     改為自動偵測...
    echo.
)

:AUTO_DETECT
set "PYTHON_EXE="
for %%P in (python.exe) do if not "%%~$PATH:P"=="" set "PYTHON_EXE=%%~$PATH:P"
if defined PYTHON_EXE goto :RUN
for %%P in (py.exe) do if not "%%~$PATH:P"=="" set "PYTHON_EXE=%%~$PATH:P"
if defined PYTHON_EXE goto :RUN

for %%D in (
    "%LOCALAPPDATA%\Programs\Python"
    "%ProgramFiles%"
    "C:\"
    "D:\"
) do (
    if exist %%D (
        for /d %%F in ("%%~D\*ython*") do (
            if exist "%%~fF\python.exe" set "PYTHON_EXE=%%~fF\python.exe"
        )
    )
)
if defined PYTHON_EXE goto :RUN

where npx >nul 2>&1
if %errorlevel%==0 (
    echo [i] 未找到 Python，改用 Node.js 啟動...
    echo     請於瀏覽器開啟  http://localhost:%PORT%
    echo.
    npx --yes serve -l %PORT% .
    goto :END
)

echo.
echo ============================================================
echo  [X] 找不到 Python，也找不到 Node.js
echo ------------------------------------------------------------
echo  請用記事本開啟本檔案，修改 PYTHON_EXE 為實際路徑
echo  查詢方式：開啟 cmd 後輸入   where python
echo ============================================================
echo.
pause
goto :EOF

:RUN
echo.
echo ============================================================
echo   SPEC 文件站   本機預覽
echo ------------------------------------------------------------
echo   Python : %PYTHON_EXE%
echo   網址   : http://localhost:%PORT%
echo   目錄   : %CD%
echo ------------------------------------------------------------
echo   按 Ctrl+C 可停止服務，請勿關閉本視窗
echo ============================================================
echo.
start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:%PORT%"
"%PYTHON_EXE%" -m http.server %PORT%
if errorlevel 1 (
    echo.
    echo [X] 啟動失敗，可能原因：
    echo     1. 連接埠 %PORT% 已被占用  =^> 請修改上方 PORT 設定
    echo     2. Python 版本過舊         =^> 需 Python 3.x
    echo.
)
:END
echo.
pause
endlocal
