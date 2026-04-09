# Setup Instructions for Copilot Instructions

## Quick Setup (30 seconds)

PowerShell is not configured on this system, so please complete these simple steps manually:

### Option 1: Using Command Prompt (Fastest)
```cmd
cd "C:\Users\keith\source\repos\ksksrbiz-arch\The-signal"
mkdir .github
move copilot-instructions-temp.md .github\copilot-instructions.md
del setup-copilot-instructions.js setup.bat setup.py temp_create_dir.bat SETUP-README.md
```

### Option 2: Using File Explorer
1. Open File Explorer to: `C:\Users\keith\source\repos\ksksrbiz-arch\The-signal`
2. Create a new folder named `.github` (yes, with the dot)
3. Move `copilot-instructions-temp.md` into the `.github` folder
4. Rename it to `copilot-instructions.md`
5. Delete these temp files:
   - `setup-copilot-instructions.js`
   - `setup.bat`
   - `setup.py`
   - `temp_create_dir.bat`
   - `SETUP-README.md` (this file)

## What's Been Created

The `.github/copilot-instructions.md` file includes:
- ✅ Project overview and architecture
- ✅ Static site structure (no build process)
- ✅ Netlify Functions patterns
- ✅ CSS/JavaScript architecture
- ✅ Development workflow and deployment
- ✅ Mobile-first responsive design conventions
- ✅ Testing checklists
- ✅ Common tasks and debugging guides
- ✅ AI assistant best practices

This file will help future GitHub Copilot sessions work effectively in this repository by providing context about the vanilla JS architecture, Netlify deployment, and key conventions.

## Done!

Once you've moved the file, the `.github/copilot-instructions.md` will be in place and ready to use.
