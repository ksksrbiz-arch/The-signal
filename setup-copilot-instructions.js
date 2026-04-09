const fs = require('fs');
const path = require('path');

// Create .github directory
const githubDir = path.join(__dirname, '.github');
if (!fs.existsSync(githubDir)) {
  fs.mkdirSync(githubDir, { recursive: true });
  console.log('Created .github directory');
}

// Move the file
const sourcePath = path.join(__dirname, 'copilot-instructions-temp.md');
const targetPath = path.join(githubDir, 'copilot-instructions.md');

if (fs.existsSync(sourcePath)) {
  fs.renameSync(sourcePath, targetPath);
  console.log('Moved copilot-instructions-temp.md to .github/copilot-instructions.md');
  console.log('Setup complete!');
} else {
  console.error('Source file not found');
}
