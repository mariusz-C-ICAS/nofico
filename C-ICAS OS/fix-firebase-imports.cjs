const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  // Replace direct imports of firebase.ts
  newContent = newContent.replace(/['"]\.\.\/\.\.\/firebase['"]/g, "'../../shared/lib/firebase'");
  newContent = newContent.replace(/['"]\.\.\/firebase['"]/g, "'../shared/lib/firebase'");
  newContent = newContent.replace(/['"]\.\.\/\.\.\/\.\.\/firebase['"]/g, "'../../../shared/lib/firebase'");
  
  // Fix imports of i18n
  newContent = newContent.replace(/['"]\.\/i18n['"]/g, "'./app/i18n'");
  
  // Fix import of StatusPage in App.tsx
  if (filePath.endsWith('App.tsx')) {
    newContent = newContent.replace(/['"]\.\.\/StatusPage['"]/g, "'./StatusPage'");
  }

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walk('./src');
