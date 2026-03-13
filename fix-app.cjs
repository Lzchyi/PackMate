const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace('hover:bg-stone-50 dark:hover:bg-stone-800 dark:bg-stone-100 text-stone-700', 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700');
fs.writeFileSync('src/App.tsx', content, 'utf8');
