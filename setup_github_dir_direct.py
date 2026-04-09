#!/usr/bin/env python3
import os
import shutil

# Change to repo directory
repo_dir = r'C:\Users\keith\source\repos\ksksrbiz-arch\The-signal'
os.chdir(repo_dir)

# Create .github directory
github_dir = os.path.join(repo_dir, '.github')
os.makedirs(github_dir, exist_ok=True)
print(f"✓ Created .github directory at: {github_dir}")

# Copy the file
source_file = os.path.join(repo_dir, 'copilot-instructions-temp.md')
target_file = os.path.join(github_dir, 'copilot-instructions.md')

if os.path.exists(source_file):
    shutil.copy2(source_file, target_file)
    print(f"✓ Copied copilot-instructions-temp.md to .github/copilot-instructions.md")
else:
    print(f"✗ ERROR: Source file not found: {source_file}")
    exit(1)

# Verify
if os.path.exists(target_file):
    file_size = os.path.getsize(target_file)
    print(f"\n✅ SUCCESS! File exists at: {target_file}")
    print(f"   File size: {file_size} bytes")
else:
    print(f"✗ ERROR: File verification failed at: {target_file}")
    exit(1)
