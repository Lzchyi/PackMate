const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-white': 'bg-white dark:bg-stone-900',
  'bg-stone-50': 'bg-stone-50 dark:bg-stone-950',
  'bg-stone-100': 'bg-stone-100 dark:bg-stone-800',
  'bg-stone-200': 'bg-stone-200 dark:bg-stone-700',
  'bg-stone-800': 'bg-stone-800 dark:bg-stone-100',
  'bg-stone-900': 'bg-stone-900 dark:bg-stone-50',
  'text-stone-900': 'text-stone-900 dark:text-stone-50',
  'text-stone-800': 'text-stone-800 dark:text-stone-100',
  'text-stone-700': 'text-stone-700 dark:text-stone-200',
  'text-stone-600': 'text-stone-600 dark:text-stone-300',
  'text-stone-500': 'text-stone-500 dark:text-stone-400',
  'text-stone-400': 'text-stone-400 dark:text-stone-500',
  'border-stone-100': 'border-stone-100 dark:border-stone-800',
  'border-stone-200': 'border-stone-200 dark:border-stone-700',
  'border-stone-300': 'border-stone-300 dark:border-stone-600',
  'hover:bg-stone-50': 'hover:bg-stone-50 dark:hover:bg-stone-800',
  'hover:bg-stone-100': 'hover:bg-stone-100 dark:hover:bg-stone-700',
  'hover:text-stone-700': 'hover:text-stone-700 dark:hover:text-stone-200',
  'hover:text-stone-600': 'hover:text-stone-600 dark:hover:text-stone-300',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Create a regex that matches any of the keys, but only if they are not preceded by dark:
  // and not followed by dark:
  const keys = Object.keys(replacements).map(k => k.replace(/:/g, '\\:'));
  const regex = new RegExp(`(?<!dark\\:)\\b(${keys.join('|')})\\b(?!\\s+dark\\:)`, 'g');
  
  content = content.replace(regex, (match) => {
    return replacements[match] || match;
  });
  
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
