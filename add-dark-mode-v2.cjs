const fs = require('fs');
const path = require('path');

const darkMap = {
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
  'text-white': 'dark:text-stone-900', // We will only apply this if bg-stone-900 is present
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Find all className="..." or className={`...`}
  content = content.replace(/className=(["'])(.*?)\1|className=\{`([^`]*?)`\}/g, (match, quote, str1, str2) => {
    let isTemplate = match.startsWith('className={`');
    let classStr = isTemplate ? str2 : str1;
    
    // Split by whitespace
    let classes = classStr.split(/\s+/);
    let newClasses = [];
    
    let hasBgStone900 = classes.includes('bg-stone-900');
    
    for (let cls of classes) {
      newClasses.push(cls);
      
      // If the class has a dark mapping, add it
      if (darkMap[cls]) {
        // Special case for text-white
        if (cls === 'text-white') {
          if (hasBgStone900) {
            newClasses.push(darkMap[cls]);
          }
        } else {
          newClasses.push(darkMap[cls]);
        }
      }
      
      // Handle opacity like bg-stone-900/50
      let matchOpacity = cls.match(/^(bg-stone-\d+|bg-white|text-stone-\d+|border-stone-\d+)\/(\d+)$/);
      if (matchOpacity) {
        let baseClass = matchOpacity[1];
        let opacity = matchOpacity[2];
        if (darkMap[baseClass]) {
          newClasses.push(`${darkMap[baseClass]}/${opacity}`);
        }
      }
    }
    
    // Remove duplicates
    newClasses = [...new Set(newClasses)];
    
    let newClassStr = newClasses.join(' ');
    if (isTemplate) {
      return `className={\`${newClassStr}\`}`;
    } else {
      return `className=${quote}${newClassStr}${quote}`;
    }
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
