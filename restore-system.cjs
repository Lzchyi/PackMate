const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

content = content.replace(
  "{(['light', 'dark'] as const).map((tOption) => (",
  "{(['light', 'dark', 'system'] as const).map((tOption) => ("
);
content = content.replace(
  "profile?.theme === tOption || (!profile?.theme && tOption === 'light')",
  "profile?.theme === tOption || (!profile?.theme && tOption === 'system')"
);

fs.writeFileSync('src/components/ProfileView.tsx', content, 'utf8');
