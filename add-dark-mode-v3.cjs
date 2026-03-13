const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-white': 'dark:bg-stone-900',
  'bg-stone-50': 'dark:bg-stone-950',
  'bg-stone-100': 'dark:bg-stone-800',
  'bg-stone-200': 'dark:bg-stone-700',
  'bg-stone-800': 'dark:bg-stone-100',
  'bg-stone-900': 'dark:bg-stone-50',
  'text-stone-900': 'dark:text-stone-50',
  'text-stone-800': 'dark:text-stone-100',
  'text-stone-700': 'dark:text-stone-200',
  'text-stone-600': 'dark:text-stone-300',
  'text-stone-500': 'dark:text-stone-400',
  'text-stone-400': 'dark:text-stone-500',
  'border-stone-100': 'dark:border-stone-800',
  'border-stone-200': 'dark:border-stone-700',
  'border-stone-300': 'dark:border-stone-600',
  'hover:bg-stone-50': 'dark:hover:bg-stone-800',
  'hover:bg-stone-100': 'dark:hover:bg-stone-700',
  'hover:text-stone-700': 'dark:hover:text-stone-200',
  'hover:text-stone-600': 'dark:hover:text-stone-300',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Replace base classes
  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(`(?<!dark\\:)\\b${key.replace(/:/g, '\\:')}\\b(?!\\s+dark\\:)`, 'g');
    content = content.replace(regex, `${key} ${val}`);
  }
  
  // Replace opacity classes
  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(`(?<!dark\\:)\\b${key.replace(/:/g, '\\:')}\\/(\\d+)\\b(?!\\s+dark\\:)`, 'g');
    content = content.replace(regex, `${key}/$1 ${val}/$1`);
  }
  
  // Replace text-white on bg-stone-900
  // We can just look for bg-stone-900 and text-white in the same line
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('bg-stone-900') && lines[i].includes('text-white')) {
      lines[i] = lines[i].replace(/\btext-white\b(?!\s+dark\:)/g, 'text-white dark:text-stone-900');
    }
  }
  content = lines.join('\n');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
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
