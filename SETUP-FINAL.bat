@echo off
cd /d "%~dp0"
if not exist .github mkdir .github
copy /Y copilot-instructions-temp.md .github\copilot-instructions.md >nul 2>&1
if exist .github\copilot-instructions.md (
    echo SUCCESS: Created .github\copilot-instructions.md
    echo.
    echo File is ready! Next steps:
    echo   git add .github\copilot-instructions.md
    echo   git commit -m "docs: add GitHub Copilot instructions"
    echo   git push origin main
) else (
    echo ERROR: Failed to create file
)
pause
