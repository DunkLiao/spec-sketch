@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM ============================================================
REM  SPEC documentation site - local preview launcher
REM ------------------------------------------------------------
REM  Set PYTHON_EXE to the full path of the Python executable.
REM  Example: C:\Users\User\AppData\Local\Programs\Python\Python312\python.exe
REM ============================================================
set "PYTHON_EXE=C:\Path\To\Python\python.exe"

REM  Set the website port here if port 8080 is already in use.
set "PORT=8080"

if not exist "%PYTHON_EXE%" (
    echo.
    echo ============================================================
    echo  [ERROR] The configured Python executable was not found:
    echo          %PYTHON_EXE%
    echo ------------------------------------------------------------
    echo  Edit PYTHON_EXE in this file and run it again.
    echo ============================================================
    echo.
    pause
    goto :END
)

echo.
echo ============================================================
echo   SPEC documentation site - local preview
echo ------------------------------------------------------------
echo   Python : %PYTHON_EXE%
echo   URL    : http://localhost:%PORT%
echo   Folder : %CD%
echo ------------------------------------------------------------
echo   Press Ctrl+C to stop the server.
echo ============================================================
echo.
start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:%PORT%"
"%PYTHON_EXE%" -m http.server %PORT%
if errorlevel 1 (
    echo.
    echo [ERROR] The server failed to start.
    echo Check whether port %PORT% is already in use.
    echo.
)

:END
echo.
pause
endlocal
