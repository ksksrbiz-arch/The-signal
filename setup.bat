@echo off
echo Creating .github directory...
if not exist .github mkdir .github

if exist copilot-instructions-temp.md (
    echo Moving copilot-instructions.md to .github directory...
    move /Y copilot-instructions-temp.md .github\copilot-instructions.md
    echo.
    echo SUCCESS! Created .github\copilot-instructions.md
    echo.
    echo Next steps:
    echo 1. Review the file: .github\copilot-instructions.md
    echo 2. Commit: git add .github\copilot-instructions.md
    echo 3. Push: git commit -m "docs: add GitHub Copilot instructions" ^&^& git push
    echo.
) else (
    echo ERROR: Source file copilot-instructions-temp.md not found
    exit /b 1
)

echo Cleaning up temporary files...
if exist setup-copilot-instructions.js del setup-copilot-instructions.js
if exist temp_create_dir.bat del temp_create_dir.bat
if exist create_github_dir.bat del create_github_dir.bat

echo.
echo Setup complete!
pause
