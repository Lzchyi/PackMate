const fs = require('fs');
const path = require('path');

const filePath = './src/components/ProfileView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const notifRegex = /<div className="flex items-center justify-between">\s*<div className="flex items-center gap-3">\s*<div className=\{`p-2 rounded-lg \$\{profile\?\.masterNotificationsEnabled !== false \? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 '\}`\}>[\s\S]*?<\/button>\s*<\/div>/;
const langRegex = /<div className="flex items-center justify-between">\s*<div className="flex items-center gap-3">\s*<div className="p-2 bg-blue-100 text-blue-600 rounded-lg">\s*<Globe className="w-5 h-5" \/>[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/;

const notifMatch = content.match(notifRegex);
const langMatch = content.match(langRegex);

if (notifMatch && langMatch) {
  const notifStr = notifMatch[0];
  const langStr = langMatch[0];
  
  // Find the exact string that contains both
  const startIdx = content.indexOf(notifStr);
  const endIdx = content.indexOf(langStr) + langStr.length;
  
  if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    const originalSection = content.substring(startIdx, endIdx);
    const newSection = langStr + '\n\n        ' + notifStr;
    content = content.replace(originalSection, newSection);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Swapped successfully!');
  } else {
    console.log('Indices are wrong.');
  }
} else {
  console.log('Could not find individual blocks.');
}
