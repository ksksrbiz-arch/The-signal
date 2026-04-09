import os
import shutil

# Create .github directory
github_dir = '.github'
if not os.path.exists(github_dir):
    os.makedirs(github_dir)
    print('Created .github directory')

# Move the file
source = 'copilot-instructions-temp.md'
target = os.path.join(github_dir, 'copilot-instructions.md')

if os.path.exists(source):
    shutil.move(source, target)
    print(f'Moved {source} to {target}')
    print('Setup complete!')
else:
    print('Source file not found')

# Cleanup
for file in ['setup-copilot-instructions.js', 'temp_create_dir.bat', 'setup.bat']:
    if os.path.exists(file):
        os.remove(file)
        print(f'Cleaned up {file}')

# Remove this script
if os.path.exists(__file__):
    os.remove(__file__)
