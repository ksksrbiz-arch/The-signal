import os
import shutil

os.chdir(r'C:\Users\keith\source\repos\ksksrbiz-arch\The-signal')
os.makedirs('.github', exist_ok=True)
if os.path.exists('copilot-instructions-temp.md'):
    shutil.move('copilot-instructions-temp.md', '.github/copilot-instructions.md')
    print('SUCCESS: Created .github/copilot-instructions.md')
else:
    print('ERROR: copilot-instructions-temp.md not found')

# Verify
if os.path.exists('.github/copilot-instructions.md'):
    print('VERIFIED: .github/copilot-instructions.md exists')
else:
    print('VERIFIED: File does not exist')
