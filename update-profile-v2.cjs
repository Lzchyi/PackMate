const fs = require('fs');
const path = require('path');

const filePath = './src/components/ProfileView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const themeBlockRegex = /<div className="flex items-center justify-between">[\s\S]*?<Moon className="w-5 h-5" \/>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const notifBlockRegex = /<div className="flex items-center justify-between">[\s\S]*?<Bell className="w-5 h-5" \/>[\s\S]*?<\/div>\s*<\/button>\s*<\/div>/;
const langBlockRegex = /<div className="flex items-center justify-between">[\s\S]*?<Globe className="w-5 h-5" \/>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const themeMatch = content.match(themeBlockRegex);
const notifMatch = content.match(notifBlockRegex);
const langMatch = content.match(langBlockRegex);

if (themeMatch && notifMatch && langMatch) {
  // We want the order to be Theme, Language, Notification
  // Currently it's Theme, Notification, Language
  
  // Let's just replace the whole section
  const startIdx = content.indexOf(themeMatch[0]);
  const endIdx = content.indexOf(langMatch[0]) + langMatch[0].length;
  
  const originalSection = content.substring(startIdx, endIdx);
  
  const newSection = themeMatch[0] + '\n\n        ' + langMatch[0] + '\n\n        ' + notifMatch[0];
  
  content = content.replace(originalSection, newSection);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated ProfileView.tsx');
