@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."

REM ============================================================
REM  SPEC index generator
REM ------------------------------------------------------------
REM  Set PYTHON_EXE to the full path of the Python executable.
REM  Example: C:\Users\User\AppData\Local\Programs\Python\Python312\python.exe
REM ============================================================
set "PYTHON_EXE=C:\Path\To\Python\python.exe"

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

echo Using Python: %PYTHON_EXE%
echo.
"%PYTHON_EXE%" "%~dp0gen_index.py"
if errorlevel 1 (
    echo.
    echo [ERROR] The index generator failed.
    echo.
)

:END
echo.
pause
endlocal
