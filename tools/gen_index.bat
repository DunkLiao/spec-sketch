@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

REM ============================================================
REM  SPEC 索引產生器
REM  [設定] python.exe 完整路徑（與 start_server.bat 相同）
REM ============================================================
set "PYTHON_EXE="

if defined PYTHON_EXE if exist "%PYTHON_EXE%" goto :RUN
for %%P in (python.exe) do if not "%%~$PATH:P"=="" set "PYTHON_EXE=%%~$PATH:P"
if defined PYTHON_EXE goto :RUN

echo [i] 未找到 Python，改用 PowerShell 版本產生索引...
powershell -ExecutionPolicy Bypass -File "%~dp0gen_index.ps1"
echo.
pause
goto :EOF

:RUN
echo 使用 Python: %PYTHON_EXE%
echo.
"%PYTHON_EXE%" "%~dp0gen_index.py"
echo.
pause
endlocal
