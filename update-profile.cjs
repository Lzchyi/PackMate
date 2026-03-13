const fs = require('fs');
const path = require('path');

const filePath = './src/components/ProfileView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove 'system' from theme options
content = content.replace(/\(\['light', 'dark', 'system'\] as const\)/g, "(['light', 'dark'] as const)");
content = content.replace(/profile\?\.theme === tOption \|\| \(\!profile\?\.theme && tOption === 'system'\)/g, "profile?.theme === tOption || (!profile?.theme && tOption === 'light')");

// 2. Make theme buttons 30% smaller: px-4 py-1.5 text-sm -> px-3 py-1 text-xs
content = content.replace(/className=\{`px-4 py-1\.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap \$\{profile\?\.theme/g, "className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${profile?.theme");

// 3. Make language buttons 30% smaller: px-4 py-1.5 text-sm -> px-3 py-1 text-xs
content = content.replace(/className=\{`px-4 py-1\.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap \$\{i18n\.language/g, "className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${i18n.language");

// 4. Move Notification below Language option. Swap places.
// Let's find the blocks.
const themeBlockRegex = /<div className="flex items-center justify-between">[\s\S]*?<Moon className="w-5 h-5" \/>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const notifBlockRegex = /<div className="flex items-center justify-between">[\s\S]*?<Bell className="w-5 h-5" \/>[\s\S]*?<\/div>\s*<\/button>\s*<\/div>/;
const langBlockRegex = /<div className="flex items-center justify-between">[\s\S]*?<Globe className="w-5 h-5" \/>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const themeMatch = content.match(themeBlockRegex);
const notifMatch = content.match(notifBlockRegex);
const langMatch = content.match(langBlockRegex);

if (themeMatch && notifMatch && langMatch) {
  // We want the order to be Theme, Language, Notification
  // Currently it's Theme, Notification, Language
  
  const originalOrder = themeMatch[0] + '\n\n        ' + notifMatch[0] + '\n\n        ' + langMatch[0];
  const newOrder = themeMatch[0] + '\n\n        ' + langMatch[0] + '\n\n        ' + notifMatch[0];
  
  content = content.replace(originalOrder, newOrder);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated ProfileView.tsx');
