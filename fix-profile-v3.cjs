const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

const regex = /<div className="flex items-center justify-between">\s*<div className="flex items-center gap-3">\s*<div className=\{`p-2 rounded-lg \$\{profile\?\.masterNotificationsEnabled !== false \? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 '\}`\}>\s*\{profile\?\.masterNotificationsEnabled !== false \? <Bell className="w-5 h-5" \/> : <BellOff className="w-5 h-5" \/>\}\s*<\/div>\s*<div>\s*<div className="flex items-center gap-2">\s*<h3 className="font-semibold">\{t\('profile\.notifications'\)\}<\/h3>\s*<button \s*onClick=\{[^}]+\}\s*className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"\s*>\s*<Info className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<\/div>\s*<div className="flex items-center justify-between">\s*<button\s*onClick=\{[^}]+\}\s*className="flex items-center gap-3 flex-1 text-left p-0"\s*>\s*<div className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg">\s*<Shield className="w-5 h-5" \/>\s*<\/div>\s*<h3 className="font-semibold">\{t\('profile\.privacy'\)\}<\/h3>\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

const replacement = `<div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={\`p-2 rounded-lg \${profile?.masterNotificationsEnabled !== false ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 '}\`}>
              {profile?.masterNotificationsEnabled !== false ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{t('profile.notifications')}</h3>
                <button 
                  onClick={() => setShowNotificationInfo(true)}
                  className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 ">{t('profile.notificationsDescription')}</p>
            </div>
          </div>
          <button
            onClick={handleToggleMasterNotifications}
            className={\`w-12 h-6 rounded-full transition-colors relative \${profile?.masterNotificationsEnabled !== false ? 'bg-emerald-500' : 'bg-stone-300'}\`}
          >
            <div className={\`absolute top-1 w-4 h-4 bg-white dark:bg-stone-900 rounded-full transition-all \${profile?.masterNotificationsEnabled !== false ? 'right-1' : 'left-1'}\`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowPrivacy(true)}
            className="flex items-center gap-3 flex-1 text-left p-0"
          >
            <div className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">{t('profile.privacy')}</h3>
          </button>
        </div>
      </div>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/ProfileView.tsx', content, 'utf8');
  console.log('Fixed successfully!');
} else {
  console.log('Regex did not match.');
}
