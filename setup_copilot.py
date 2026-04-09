import os
import shutil

# Change to repository directory
os.chdir(r'C:\Users\keith\source\repos\ksksrbiz-arch\The-signal')

# Create .github directory if it doesn't exist
os.makedirs('.github', exist_ok=True)
print('✓ Created .github directory')

# Move copilot-instructions-temp.md to .github/copilot-instructions.md
if os.path.exists('copilot-instructions-temp.md'):
    shutil.move('copilot-instructions-temp.md', '.github/copilot-instructions.md')
    print('✓ Moved copilot-instructions.md to .github directory')
    print('\nSUCCESS! Created .github/copilot-instructions.md')
else:
    print('ERROR: Source file copilot-instructions-temp.md not found')
    exit(1)

# Clean up temporary files
temp_files = ['setup-copilot-instructions.js', 'temp_create_dir.bat', 'create_github_dir.bat']
for f in temp_files:
    if os.path.exists(f):
        os.remove(f)
        print(f'✓ Removed {f}')

print('\n✅ Setup complete!')
print('\nNext steps:')
print('1. Review the file: .github/copilot-instructions.md')
print('2. Commit: git add .github/copilot-instructions.md')
print('3. Push: git commit -m "docs: add GitHub Copilot instructions" && git push')
