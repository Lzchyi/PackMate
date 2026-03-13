const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Fix bg-stone-X /Y
  content = content.replace(/bg-stone-(\d+)\s+\/(\d+)/g, 'bg-stone-$1/$2');
  content = content.replace(/bg-white\s+\/(\d+)/g, 'bg-white/$1');
  content = content.replace(/text-stone-(\d+)\s+\/(\d+)/g, 'text-stone-$1/$2');
  content = content.replace(/border-stone-(\d+)\s+\/(\d+)/g, 'border-stone-$1/$2');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed opacity in ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir('./src/components');
processFile('./src/App.tsx');
