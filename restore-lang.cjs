const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

// Restore language buttons
content = content.replace(
  "className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${i18n.language === 'en-GB'",
  "className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${i18n.language === 'en-GB'"
);
content = content.replace(
  "className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${i18n.language === 'zh-CN'",
  "className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${i18n.language === 'zh-CN'"
);

fs.writeFileSync('src/components/ProfileView.tsx', content, 'utf8');
