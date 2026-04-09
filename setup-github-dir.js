const fs = require('fs');
const path = require('path');

// Create .github directory
const githubDir = '.github';
if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir);
    console.log('✓ Created .github directory');
} else {
    console.log('✓ .github directory already exists');
}

// Move copilot-instructions-temp.md to .github/copilot-instructions.md
const source = 'copilot-instructions-temp.md';
const dest = path.join(githubDir, 'copilot-instructions.md');

if (fs.existsSync(source)) {
    fs.renameSync(source, dest);
    console.log('✓ Moved copilot-instructions.md to .github directory');
    console.log('\n✅ SUCCESS! Created .github/copilot-instructions.md\n');
} else {
    console.log('✗ ERROR: Source file copilot-instructions-temp.md not found');
    process.exit(1);
}

// Clean up temporary files
const tempFiles = ['setup-copilot-instructions.js', 'temp_create_dir.bat', 'create_github_dir.bat', 'setup_copilot.py', 'setup_dirs.py', 'SETUP-INSTRUCTIONS.md'];
tempFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`✓ Removed ${file}`);
    }
});

console.log('\n📝 Next steps:');
console.log('1. git add .github/copilot-instructions.md');
console.log('2. git commit -m "docs: add GitHub Copilot instructions"');
console.log('3. git push origin main');
