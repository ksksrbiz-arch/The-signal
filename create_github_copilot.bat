@echo off
cd /d "C:\Users\keith\source\repos\ksksrbiz-arch\The-signal"
if not exist .github mkdir .github
copy /Y copilot-instructions-temp.md .github\copilot-instructions.md
if exist .github\copilot-instructions.md (
    echo SUCCESS: File created at .github\copilot-instructions.md
    dir ".github\copilot-instructions.md"
) else (
    echo ERROR: File not created
    exit /b 1
)
